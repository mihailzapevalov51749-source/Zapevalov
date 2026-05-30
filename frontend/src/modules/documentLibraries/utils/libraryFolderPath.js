export async function resolveFolderPath({
  libraryId,
  targetFolderId,
  getDocumentById,
}) {
  if (targetFolderId == null) {
    return {
      folderPath: [],
      currentFolderId: null,
    };
  }

  const chain = [];
  let currentId = targetFolderId;
  const seen = new Set();

  while (currentId != null) {
    if (seen.has(currentId)) {
      throw new Error("Обнаружен цикл в пути к папке");
    }

    seen.add(currentId);

    const item = await getDocumentById(currentId);
    if (!item || Number(item.library_id) !== Number(libraryId)) {
      throw new Error("Папка не найдена в этой библиотеке");
    }

    if (!item.is_folder) {
      throw new Error("Целевой элемент не является папкой");
    }

    chain.unshift({
      id: item.id,
      title: item.title,
    });

    currentId = item.parent_id ?? null;
  }

  return {
    folderPath: chain,
    currentFolderId: targetFolderId,
  };
}
