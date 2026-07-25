import type * as backlogjs from "backlog-js";
import { readFile } from "fs/promises";
import { resolve } from "path";

export interface UserMatchResult {
  userMap: Map<number, number>; // sourceUserId -> targetUserId
  unmappedUsers: Array<{ id: number; name: string; mailAddress?: string }>;
}

export async function matchUsers(
  sourceUsers: Array<{ id: number; name: string; mailAddress?: string; userId?: string }>,
  targetUsers: Array<backlogjs.Entity.User>,
  distConfigsDir: string,
  defaultTargetUserId: number,
): Promise<UserMatchResult> {
  const userMap = new Map<number, number>();
  const unmappedUsers: Array<{ id: number; name: string; mailAddress?: string }> = [];

  // 1. 手動オーバーライド用 user-mapping.json の読み込みを試行
  let manualMapping: Record<string, string | number> = {};
  try {
    const mappingJsonPath = resolve(distConfigsDir, "..", "user-mapping.json");
    const content = await readFile(mappingJsonPath, "utf-8");
    manualMapping = JSON.parse(content);
    console.log(`[ユーザー照合] 手動マッピングファイル 'user-mapping.json' を読み込みました。`);
  } catch (e) {
    // ファイルが存在しない場合は自動照合のみ進行
  }

  // ターゲットユーザーのインデックス化
  const targetByEmail = new Map<string, backlogjs.Entity.User>();
  const targetByName = new Map<string, backlogjs.Entity.User>();
  const targetByUserId = new Map<string, backlogjs.Entity.User>();

  for (const tu of targetUsers) {
    if (tu.mailAddress) {
      targetByEmail.set(tu.mailAddress.trim().toLowerCase(), tu);
    }
    if (tu.name) {
      targetByName.set(tu.name.trim().toLowerCase(), tu);
    }
    if (tu.userId) {
      targetByUserId.set(tu.userId.trim().toLowerCase(), tu);
    }
  }

  for (const su of sourceUsers) {
    const srcEmail = (su.mailAddress || "").trim().toLowerCase();
    const srcName = (su.name || "").trim().toLowerCase();
    const srcUserIdStr = (su.userId || "").trim().toLowerCase();
    const srcIdStr = String(su.id);

    // A. 手動マッピング指定
    const manualTarget = manualMapping[srcEmail] || manualMapping[srcName] || manualMapping[srcIdStr];
    if (manualTarget) {
      const matched = targetUsers.find(
        (tu) =>
          tu.id === Number(manualTarget) ||
          (tu.mailAddress && tu.mailAddress.toLowerCase() === String(manualTarget).toLowerCase()) ||
          tu.name.toLowerCase() === String(manualTarget).toLowerCase(),
      );
      if (matched) {
        userMap.set(su.id, matched.id);
        console.log(`[ユーザー照合] ${su.name} -> ${matched.name} (手動指定)`);
        continue;
      }
    }

    // B. メールアドレス一致（信頼度 1.0）
    if (srcEmail && targetByEmail.has(srcEmail)) {
      const matched = targetByEmail.get(srcEmail)!;
      userMap.set(su.id, matched.id);
      console.log(`[ユーザー照合] ${su.name} (${su.mailAddress}) -> ${matched.name} (メールアドレス完全一致)`);
      continue;
    }

    // C. 名前またはユーザーID一致（信頼度 0.85）
    if (srcName && targetByName.has(srcName)) {
      const matched = targetByName.get(srcName)!;
      userMap.set(su.id, matched.id);
      console.log(`[ユーザー照合] ${su.name} -> ${matched.name} (名前一致)`);
      continue;
    }
    if (srcUserIdStr && targetByUserId.has(srcUserIdStr)) {
      const matched = targetByUserId.get(srcUserIdStr)!;
      userMap.set(su.id, matched.id);
      console.log(`[ユーザー照合] ${su.name} (ID: ${su.userId}) -> ${matched.name} (ユーザーID一致)`);
      continue;
    }

    // D. マッチしなかった場合：デフォルト（実行ユーザー）を割り当て
    userMap.set(su.id, defaultTargetUserId);
    unmappedUsers.push(su);
    console.warn(`[ユーザー照合] 警告: ${su.name} の一致ユーザーが移行先で見つかりません。デフォルトユーザーを割り当てます。`);
  }

  return { userMap, unmappedUsers };
}
