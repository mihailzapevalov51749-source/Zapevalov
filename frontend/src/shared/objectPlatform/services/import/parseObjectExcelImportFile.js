const XLSX_ACCEPT = ".xlsx";

function normalizeHeaderCell(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

function rowHasData(cells) {
  return (Array.isArray(cells) ? cells : []).some((cell) => {
    const text = String(cell ?? "").trim();
    return text !== "";
  });
}

/**
 * @param {File} file
 * @param {string | null | undefined} preferredSheetName
 */
export async function parseObjectExcelImportFile(file, preferredSheetName = null) {
  const fileName = String(file?.name || "").trim().toLowerCase();

  if (!fileName.endsWith(".xlsx")) {
    throw new Error("Поддерживается только формат .xlsx");
  }

  let workbook;

  try {
    const XLSX = await import("xlsx");
    const buffer = await file.arrayBuffer();
    workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  } catch {
    throw new Error("Не удалось прочитать Excel-файл");
  }

  const sheetNames = Array.isArray(workbook.SheetNames) ? workbook.SheetNames : [];

  if (!sheetNames.length) {
    throw new Error("Не удалось прочитать Excel-файл");
  }

  const selectedSheetName =
    preferredSheetName && sheetNames.includes(preferredSheetName)
      ? preferredSheetName
      : sheetNames.length === 1
        ? sheetNames[0]
        : preferredSheetName || sheetNames[0];

  const sheet = workbook.Sheets[selectedSheetName];

  if (!sheet) {
    throw new Error("Не удалось прочитать Excel-файл");
  }

  const XLSX = await import("xlsx");
  const matrix = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    raw: false,
  });

  if (!Array.isArray(matrix) || matrix.length === 0) {
    throw new Error("В файле не найдены заголовки колонок");
  }

  const headerRow = Array.isArray(matrix[0]) ? matrix[0] : [];
  const headers = headerRow
    .map((cell, index) => ({
      index,
      label: normalizeHeaderCell(cell),
    }))
    .filter((item) => item.label);

  if (!headers.length) {
    throw new Error("В файле не найдены заголовки колонок");
  }

  /** @type {Array<{ rowNumber: number, values: Record<number, unknown> }>} */
  const rows = [];

  for (let rowIndex = 1; rowIndex < matrix.length; rowIndex += 1) {
    const cells = Array.isArray(matrix[rowIndex]) ? matrix[rowIndex] : [];

    if (!rowHasData(cells)) {
      continue;
    }

    const values = {};

    for (const header of headers) {
      values[header.index] = cells[header.index] ?? "";
    }

    rows.push({
      rowNumber: rowIndex + 1,
      values,
    });
  }

  return {
    sheetNames,
    selectedSheetName,
    headers,
    rows,
    accept: XLSX_ACCEPT,
  };
}
