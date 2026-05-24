export const INLINE_EDIT_BLOCK_TYPES = new Set(["text", "link", "button"]);

export function supportsInlineBlockEdit(blockType) {
  return INLINE_EDIT_BLOCK_TYPES.has(blockType);
}

export function findBlockInPageData(pageData, blockId) {
  if (!pageData?.sections || !blockId) return null;

  for (const sectionItem of pageData.sections) {
    for (const block of sectionItem.blocks || []) {
      if (String(block.id) === String(blockId)) {
        return block;
      }
    }
  }

  return null;
}

export function mergeBlockUpdate(existingBlock, updatedBlock) {
  if (!existingBlock) {
    return updatedBlock;
  }

  return {
    ...existingBlock,
    ...updatedBlock,
    title: updatedBlock.title ?? existingBlock.title,
    content: {
      ...(existingBlock.content || {}),
      ...(updatedBlock.content || {}),
    },
    settings: {
      ...(existingBlock.settings || {}),
      ...(updatedBlock.settings || {}),
      position: {
        ...(existingBlock.settings?.position || {}),
        ...(updatedBlock.settings?.position || {}),
      },
    },
  };
}
