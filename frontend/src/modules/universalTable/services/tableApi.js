const API_BASE_URL = "http://127.0.0.1:8010";

function getToken() {
  return localStorage.getItem("token");
}

async function request(url, options = {}) {
  const token = getToken();

  const response = await fetch(`${API_BASE_URL}${url}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Ошибка запроса к API таблиц");
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

async function uploadRequest(url, formData) {
  const token = getToken();

  const response = await fetch(`${API_BASE_URL}${url}`, {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Ошибка загрузки файла");
  }

  return response.json();
}

function normalizeLookupOption(option) {
  if (!option || typeof option !== "object") {
    return null;
  }

  const rowId =
    option.row_id ??
    option.rowId ??
    option.id ??
    option.value ??
    null;

  if (rowId === null || rowId === undefined || rowId === "") {
    return null;
  }

  return {
    ...option,
    row_id: rowId,
    label:
      option.label ??
      option.title ??
      option.name ??
      option.value_label ??
      `Строка ${rowId}`,
  };
}

/* ------------------------
   UNIVERSAL TABLES
------------------------ */

export async function createTableForBlock(blockId) {
  return request(`/universal-tables`, {
    method: "POST",
    body: JSON.stringify({
      block_id: blockId,
      title: "Таблица",
    }),
  });
}

export async function getTable(tableId) {
  return request(`/universal-tables/${tableId}`);
}

export async function getTableByBlock(blockId) {
  return request(`/universal-tables/by-block/${blockId}`);
}

export async function updateTable(tableId, data) {
  return request(`/universal-tables/${tableId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

/* ------------------------
   COLUMNS
------------------------ */

export async function createTableColumn(tableId, data) {
  return request(`/universal-tables/${tableId}/columns`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateTableColumn(columnId, data) {
  return request(`/universal-tables/columns/${columnId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteTableColumn(columnId) {
  return request(`/universal-tables/columns/${columnId}`, {
    method: "DELETE",
  });
}

/* ------------------------
   ROWS
------------------------ */

export async function createTableRow(tableId, data = { values: {} }) {
  return request(`/universal-tables/${tableId}/rows`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateTableRow(rowId, data) {
  return request(`/universal-tables/rows/${rowId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteTableRow(rowId) {
  return request(`/universal-tables/rows/${rowId}`, {
    method: "DELETE",
  });
}

/* ------------------------
   FILES
------------------------ */

export async function uploadTableFile(file) {
  const formData = new FormData();
  formData.append("file", file);

  return uploadRequest(`/universal-tables/files/upload`, formData);
}

/* ------------------------
   LOOKUP
------------------------ */

export async function getLookupSources() {
  return request(`/universal-tables/lookup-sources`);
}

/** Список всех Universal Tables (тот же endpoint, что и lookup-sources). */
export async function listUniversalTables() {
  return getLookupSources();
}

export async function getLookupOptions(sourceTableId, displayColumnId) {
  const params = new URLSearchParams({
    source_table_id: String(sourceTableId),
    display_column_id: String(displayColumnId),
  });

  const data = await request(
    `/universal-tables/lookup-options?${params.toString()}`
  );

  if (!Array.isArray(data)) {
    return [];
  }

  return data.map(normalizeLookupOption).filter(Boolean);
}

/* ------------------------
   TASK VIEW COLUMNS
------------------------ */

export async function getTaskViewColumns(viewKey = "default") {
  return request(`/tasks/views/${viewKey}/columns`);
}

export async function saveTaskViewColumns(viewKey = "default", columns = []) {
  return request(`/tasks/views/${viewKey}/columns`, {
    method: "PUT",
    body: JSON.stringify({
      columns,
    }),
  });
}

export async function createTaskViewColumn(viewKey = "default", data) {
  return request(`/tasks/views/${viewKey}/columns`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateTaskViewColumn(columnId, data) {
  return request(`/tasks/views/columns/${columnId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteTaskViewColumn(columnId) {
  return request(`/tasks/views/columns/${columnId}`, {
    method: "DELETE",
  });
}

export async function reorderTaskViewColumns(viewKey = "default", columnIds = []) {
  return request(`/tasks/views/${viewKey}/columns/reorder`, {
    method: "PATCH",
    body: JSON.stringify({
      column_ids: columnIds,
    }),
  });
}