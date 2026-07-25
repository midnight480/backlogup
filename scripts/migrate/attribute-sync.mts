import type * as backlogjs from "backlog-js";

export interface AttributeSyncResult {
  typeMap: Map<number, number>; // sourceIssueTypeId -> targetIssueTypeId
  categoryMap: Map<number, number>; // sourceCategoryId -> targetCategoryId
  versionMap: Map<number, number>; // sourceVersionId -> targetVersionId
}

export async function syncAttributes(
  targetBacklog: backlogjs.Backlog,
  targetProjectId: number,
  sourceIssueTypes: Array<any>,
  sourceCategories: Array<any>,
  sourceVersions: Array<any>,
  withRetry: <T>(fn: () => Promise<T>) => Promise<T>,
): Promise<AttributeSyncResult> {
  const typeMap = new Map<number, number>();
  const categoryMap = new Map<number, number>();
  const versionMap = new Map<number, number>();

  // ========================================
  // 1. 種別 (Issue Types) の同調
  // ========================================
  console.log("--- 種別 (Issue Types) 同調開始 ---");
  const targetIssueTypes = await withRetry(() => targetBacklog.getIssueTypes(targetProjectId));
  const targetTypeByName = new Map<string, any>(targetIssueTypes.map((t: any) => [t.name.trim().toLowerCase(), t]));

  for (const st of sourceIssueTypes) {
    const sNameLower = st.name.trim().toLowerCase();
    if (targetTypeByName.has(sNameLower)) {
      const matched = targetTypeByName.get(sNameLower)!;
      typeMap.set(st.id, matched.id);
      console.log(`[種別] 既存利用: '${st.name}' (ID: ${st.id} -> ${matched.id})`);
    } else {
      try {
        const created = await withRetry(() =>
          targetBacklog.postIssueType(targetProjectId, {
            name: st.name,
            color: st.color || "#e30000",
          }),
        );
        typeMap.set(st.id, created.id);
        console.log(`[種別] 新規作成: '${st.name}' (新ID: ${created.id})`);
      } catch (e: any) {
        console.warn(`[種別] 作成失敗: '${st.name}'. デフォルトの種別を割り当てます。`, e?.message || e);
        if (targetIssueTypes.length > 0) {
          typeMap.set(st.id, targetIssueTypes[0].id);
        }
      }
    }
  }

  // ========================================
  // 2. カテゴリー (Categories) の同調
  // ========================================
  console.log("--- カテゴリー (Categories) 同調開始 ---");
  const targetCategories = await withRetry(() => targetBacklog.getCategories(targetProjectId));
  const targetCatByName = new Map<string, any>(targetCategories.map((c: any) => [c.name.trim().toLowerCase(), c]));

  for (const sc of sourceCategories) {
    const sNameLower = sc.name.trim().toLowerCase();
    if (targetCatByName.has(sNameLower)) {
      const matched = targetCatByName.get(sNameLower)!;
      categoryMap.set(sc.id, matched.id);
      console.log(`[カテゴリー] 既存利用: '${sc.name}' (ID: ${sc.id} -> ${matched.id})`);
    } else {
      try {
        const created = await withRetry(() => targetBacklog.postCategory(targetProjectId, { name: sc.name }));
        categoryMap.set(sc.id, created.id);
        console.log(`[カテゴリー] 新規作成: '${sc.name}' (新ID: ${created.id})`);
      } catch (e: any) {
        console.warn(`[カテゴリー] 作成失敗: '${sc.name}'`, e?.message || e);
      }
    }
  }

  // ========================================
  // 3. バージョン・マイルストーン (Versions) の同調
  // ========================================
  console.log("--- バージョン・マイルストーン 同調開始 ---");
  const targetVersions = await withRetry(() => targetBacklog.getVersions(targetProjectId));
  const targetVerByName = new Map<string, any>(targetVersions.map((v: any) => [v.name.trim().toLowerCase(), v]));

  for (const sv of sourceVersions) {
    const sNameLower = sv.name.trim().toLowerCase();
    if (targetVerByName.has(sNameLower)) {
      const matched = targetVerByName.get(sNameLower)!;
      versionMap.set(sv.id, matched.id);
      console.log(`[バージョン] 既存利用: '${sv.name}' (ID: ${sv.id} -> ${matched.id})`);
    } else {
      try {
        const created = await withRetry(() =>
          targetBacklog.postVersion(targetProjectId, {
            name: sv.name,
            description: sv.description || undefined,
            startDate: sv.startDate || undefined,
            releaseDueDate: sv.releaseDueDate || undefined,
          }),
        );
        versionMap.set(sv.id, created.id);
        console.log(`[バージョン] 新規作成: '${sv.name}' (新ID: ${created.id})`);
      } catch (e: any) {
        console.warn(`[バージョン] 作成失敗: '${sv.name}'`, e?.message || e);
      }
    }
  }

  return { typeMap, categoryMap, versionMap };
}
