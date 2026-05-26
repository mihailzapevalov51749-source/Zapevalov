let existingTablesList = [];

const listeners = new Set();

export function getExistingTablesList() {
  return existingTablesList;
}

export function setExistingTablesList(nextList) {
  existingTablesList = Array.isArray(nextList) ? nextList : [];
  listeners.forEach((listener) => listener(existingTablesList));
}

export function updateExistingTableTitleInList(tableId, title) {
  const normalizedTitle = String(title || "").trim();

  if (!tableId || !normalizedTitle) return;

  setExistingTablesList(
    existingTablesList.map((table) =>
      String(table.id) === String(tableId)
        ? {
            ...table,
            title: normalizedTitle,
            label: normalizedTitle,
          }
        : table
    )
  );
}

export function subscribeExistingTablesList(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
