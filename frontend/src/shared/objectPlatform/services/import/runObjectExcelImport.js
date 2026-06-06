import { runtimeWriteGateway } from "../../../../modules/runtimeWriteGateway";

export const OBJECT_EXCEL_IMPORT_CHUNK_SIZE = 50;

function chunkRows(rows, chunkSize) {
  const chunks = [];

  for (let index = 0; index < rows.length; index += chunkSize) {
    chunks.push(rows.slice(index, index + chunkSize));
  }

  return chunks;
}

/**
 * @param {{
 *   tenantId: number,
 *   objectTypeKey: string,
 *   validRows: Array<{ rowNumber: number, values: Record<string, unknown> }>,
 *   chunkSize?: number,
 * }} params
 */
export async function runObjectExcelImport({
  tenantId,
  objectTypeKey,
  validRows = [],
  chunkSize = OBJECT_EXCEL_IMPORT_CHUNK_SIZE,
}) {
  const normalizedTenantId = Number(tenantId);
  const normalizedObjectTypeKey = String(objectTypeKey || "").trim();
  const rows = Array.isArray(validRows) ? validRows : [];

  if (!normalizedTenantId || !normalizedObjectTypeKey) {
    throw new Error("import context is incomplete");
  }

  if (!rows.length) {
    throw new Error("Нет строк для импорта");
  }

  let createdCount = 0;
  let failedCount = 0;
  /** @type {Array<{ rowNumber: number, message: string }>} */
  const failures = [];

  for (const chunk of chunkRows(rows, chunkSize)) {
    const results = await Promise.all(
      chunk.map(async (row) => {
        try {
          await runtimeWriteGateway.createEntity({
            tenantId: normalizedTenantId,
            objectTypeKey: normalizedObjectTypeKey,
            values: row.values,
          });

          return { ok: true, rowNumber: row.rowNumber };
        } catch (error) {
          return {
            ok: false,
            rowNumber: row.rowNumber,
            message:
              error instanceof Error
                ? error.message
                : "Не удалось создать запись",
          };
        }
      }),
    );

    for (const result of results) {
      if (result.ok) {
        createdCount += 1;
      } else {
        failedCount += 1;
        failures.push({
          rowNumber: result.rowNumber,
          message: result.message || "Не удалось создать запись",
        });
      }
    }
  }

  return {
    createdCount,
    failedCount,
    skippedCount: 0,
    failures,
  };
}
