import { collectUnmappedRequiredImportFields } from "../services/import/collectUnmappedRequiredImportFields.js";
import { IMPORT_REVIEW_ZERO_ROWS_MESSAGE } from "../services/import/importReviewConstants.js";

/**
 * @param {{
 *   validation: {
 *     totalRows: number,
 *     importableCount: number,
 *     errorCount: number,
 *     skippedEmptyRows: number,
 *     errors: Array<{ rowNumber: number, column: string, message: string, value: string }>,
 *   },
 * }} props
 */
export default function ObjectExcelImportReviewPanel({ validation }) {
  const unmappedRequiredFields = collectUnmappedRequiredImportFields(validation.errors);
  const hasZeroImportableRows = validation.importableCount <= 0;

  return (
    <>
      <div className="object-excel-import__summary">
        <div>Всего строк: {validation.totalRows}</div>
        <div>Будет импортировано: {validation.importableCount}</div>
        <div>Ошибок: {validation.errorCount}</div>
        <div>Пустых строк пропущено: {validation.skippedEmptyRows}</div>
      </div>

      {hasZeroImportableRows ? (
        <p className="object-excel-import__review-hint">{IMPORT_REVIEW_ZERO_ROWS_MESSAGE}</p>
      ) : null}

      {unmappedRequiredFields.length ? (
        <div className="object-excel-import__review-alert">
          <p className="object-excel-import__review-alert-title">
            Нужно сопоставить обязательные поля
          </p>
          <p className="object-excel-import__review-alert-label">Поля:</p>
          <ul className="object-excel-import__unmapped-fields">
            {unmappedRequiredFields.map((fieldLabel) => (
              <li key={fieldLabel}>{fieldLabel}</li>
            ))}
          </ul>
          <p className="object-excel-import__review-alert-hint">
            Вернитесь к шагу «Колонки» и выберите соответствующие колонки Excel.
          </p>
        </div>
      ) : null}

      {validation.errors.length ? (
        <div className="object-excel-import__table-wrap">
          <table className="object-excel-import__table">
            <thead>
              <tr>
                <th>Строка</th>
                <th>Колонка</th>
                <th>Ошибка</th>
                <th>Значение</th>
              </tr>
            </thead>
            <tbody>
              {validation.errors.map((item, index) => (
                <tr key={`${item.rowNumber}-${item.column}-${index}`}>
                  <td>{item.rowNumber}</td>
                  <td>{item.column}</td>
                  <td>{item.message}</td>
                  <td>{item.value || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </>
  );
}
