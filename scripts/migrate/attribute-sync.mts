import type * as backlogjs from "backlog-js";

export interface AttributeSyncResult {
  typeMap: Map<number, number>; // sourceIssueTypeId -> targetIssueTypeId
  categoryMap: Map<number, number>; // sourceCategoryId -> targetCategoryId
  versionMap: Map<number, number>; // sourceVersionId -> targetVersionId
}

interface SourceIssueType {
  id: number;
  name: string;
  color?: string;
}

interface SourceCategory {
  id: number;
  name: string;
}

interface SourceVersion {
  id: number;
  name: string;
  description?: string;
  startDate?: string;
  releaseDueDate?: string;
}

interface TargetAttribute {
  id: number;
  name: string;
  [key: string]: unknown;
}

export async function syncAttributes(
  targetBacklog: backlogjs.Backlog,
  targetProjectId: number,
  sourceIssueTypes: Array<SourceIssueType>,
  sourceCategories: Array<SourceCategory>,
  sourceVersions: Array<SourceVersion>,
  withRetry: <T>(fn: () => Promise<T>) => Promise<T>,
): Promise<AttributeSyncResult> {
  const typeMap = new Map<number, number>();
  const categoryMap = new Map<number, number>();
  const versionMap = new Map<number, number>();

  // ========================================
  // 1. 種別 (Issue Types) の同調
  // ========================================
  console.log("--- 種別 (Issue Types) 同調開始 ---");
  const targetIssueTypes = (await withRetry(() => targetBacklog.getIssueTypes(targetProjectId))) as unknown as TargetAttribute[];
  const targetTypeByName = new Map<string, TargetAttribute>(targetIssueTypes.map((t) => [t.name.trim().toLowerCase(), t]));

  for (const st of sourceIssueTypes) {
    const sNameLower = st.name.trim().toLowerCase();
    const matched = targetTypeByName.get(sNameLower);
    if (matched) {
      typeMap.set(st.id, matched.id);
      console.log(`[種別] 既存利用: '${st.name}' (ID: ${st.id} -> ${matched.id})`);
    } else {
      try {
        const colorVal = (st.color || "#e30000") as backlogjs.Option.Issue.IssueTypeColor;
        const created = (await withRetry(() =>
          targetBacklog.postIssueType(targetProjectId, {
            name: st.name,
            color: colorVal,
          }),
        )) as unknown as TargetAttribute;
        typeMap.set(st.id, created.id);
        console.log(`[種別] 新規作成: '${st.name}' (新ID: ${created.id})`);
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.warn(`[種別] 作成失敗: '${st.name}'. デフォルトの種別を割り当てます。`, errMsg);
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
  const targetCategories = (await withRetry(() => targetBacklog.getCategories(targetProjectId))) as unknown as TargetAttribute[];
  const targetCatByName = new Map<string, TargetAttribute>(targetCategories.map((c) => [c.name.trim().toLowerCase(), c]));

  for (const sc of sourceCategories) {
    const sNameLower = sc.name.trim().toLowerCase();
    const matched = targetCatByName.get(sNameLower);
    if (matched) {
      categoryMap.set(sc.id, matched.id);
      console.log(`[カテゴリー] 既存利用: '${sc.name}' (ID: ${sc.id} -> ${matched.id})`);
    } else {
      try {
        const created = (await withRetry(() =>
          targetBacklog.postCategories(targetProjectId, { name: sc.name }),
        )) as unknown as TargetAttribute;
        categoryMap.set(sc.id, created.id);
        console.log(`[カテゴリー] 新規作成: '${sc.name}' (新ID: ${created.id})`);
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.warn(`[カテゴリー] 作成失敗: '${sc.name}'`, errMsg);
      }
    }
  }

  // ========================================
  // 3. バージョン・マイルストーン (Versions) の同調
  // ========================================
  console.log("--- バージョン・マイルストーン 同調開始 ---");
  const targetVersions = (await withRetry(() => targetBacklog.getVersions(targetProjectId))) as unknown as TargetAttribute[];
  const targetVerByName = new Map<string, TargetAttribute>(targetVersions.map((v) => [v.name.trim().toLowerCase(), v]));

  for (const sv of sourceVersions) {
    const sNameLower = sv.name.trim().toLowerCase();
    const matched = targetVerByName.get(sNameLower);
    if (matched) {
      versionMap.set(sv.id, matched.id);
      console.log(`[バージョン] 既存利用: '${sv.name}' (ID: ${sv.id} -> ${matched.id})`);
    } else {
      try {
        const created = (await withRetry(() =>
          targetBacklog.postVersions(targetProjectId, {
            name: sv.name,
            description: sv.description || undefined,
            startDate: sv.startDate || undefined,
            releaseDueDate: sv.releaseDueDate || undefined,
          }),
        )) as unknown as TargetAttribute;
        versionMap.set(sv.id, created.id);
        console.log(`[バージョン] 新規作成: '${sv.name}' (新ID: ${created.id})`);
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.warn(`[バージョン] 作成失敗: '${sv.name}'`, errMsg);
      }
    }
  }

  return { typeMap, categoryMap, versionMap };
}
