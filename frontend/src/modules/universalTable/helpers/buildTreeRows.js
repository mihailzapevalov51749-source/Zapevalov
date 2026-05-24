export function buildTreeRows(rows = []) {
  const map = new Map();

  rows.forEach((row) => {
    map.set(row.id, {
      ...row,
      children: [],
    });
  });

  const rootRows = [];

  rows.forEach((row) => {
    const parentId =
      row.parent_row_id ||
      row.parentId ||
      row.parent_id;

    const current = map.get(row.id);

    if (parentId && map.has(parentId)) {
      map.get(parentId).children.push(current);
    } else {
      rootRows.push(current);
    }
  });

  return rootRows;
}