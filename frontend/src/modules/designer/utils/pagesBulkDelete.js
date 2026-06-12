export function splitPagesForBulkDelete(selectedPages) {
  const deletablePages = [];
  const protectedPages = [];

  for (const page of selectedPages) {
    if (page?.is_protected) {
      protectedPages.push(page);
    } else {
      deletablePages.push(page);
    }
  }

  return { deletablePages, protectedPages };
}

export function buildBulkDeleteNotice({ deletedCount = 0, skipped = [] } = {}) {
  const skippedTitles = (skipped || [])
    .map((item) => item?.title)
    .filter(Boolean);

  if (deletedCount <= 0 && skippedTitles.length) {
    return "Выбраны только системные страницы. Их нельзя удалить.";
  }

  if (deletedCount > 0 && skippedTitles.length) {
    return `Удалено: ${deletedCount}. Пропущены системные страницы: ${skippedTitles.join(", ")}.`;
  }

  if (deletedCount > 0) {
    return `Удалено: ${deletedCount}.`;
  }

  return "Страницы для удаления не найдены.";
}
