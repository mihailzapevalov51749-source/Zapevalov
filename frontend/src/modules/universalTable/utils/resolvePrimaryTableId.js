import { getTableByBlock } from "../services/tableApi";

import { resolveBlockTableId } from "./resolveBlockTableId";

export function findFirstUniversalTableBlock(pageData) {
  if (!Array.isArray(pageData?.sections)) return null;

  for (const sectionItem of pageData.sections) {
    const blocks = Array.isArray(sectionItem?.blocks) ? sectionItem.blocks : [];

    for (const block of blocks) {
      if (block?.type === "universal_table") {
        return block;
      }
    }
  }

  return null;
}

export function resolvePrimaryTableIdFromPage(pageData) {
  const block = findFirstUniversalTableBlock(pageData);
  if (!block) return null;

  return resolveBlockTableId(block);
}

export async function resolvePrimaryTableIdForPage(pageData) {
  const fromContent = resolvePrimaryTableIdFromPage(pageData);
  if (fromContent) return fromContent;

  const block = findFirstUniversalTableBlock(pageData);
  if (!block?.id) return null;

  try {
    const tableData = await getTableByBlock(block.id);
    return tableData?.id || null;
  } catch {
    return null;
  }
}

export function isUniversalTableNavigationItem(navigationItem) {
  return (
    navigationItem?.type === "universal_table" ||
    navigationItem?.type === "table"
  );
}
