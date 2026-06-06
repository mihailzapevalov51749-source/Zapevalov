import { useEffect, useMemo, useRef, useState } from "react";
import { FileSpreadsheet } from "lucide-react";

import PlatformModal from "../../platformModal/PlatformModal";
import { showPlatformNotification } from "../../platformNotification/PlatformNotification.js";
import { buildObjectExcelColumnMappings, updateObjectExcelColumnMapping } from "../services/import/buildObjectExcelColumnMappings.js";
import { assignRequiredFieldToExcelColumn } from "../services/import/defaultValues/assignRequiredFieldToExcelColumn.js";
import { buildImportDefaultValues } from "../services/import/defaultValues/buildImportDefaultValues.js";
import { ensureImportDefaultFieldRules } from "../services/import/defaultValues/ensureImportDefaultFieldRules.js";
import {
  IMPORT_DATA_SOURCE_EXCEL_COLUMN,
} from "../services/import/defaultValues/importDefaultValueConstants.js";
import { mergeImportDefaultValues } from "../services/import/defaultValues/mergeImportDefaultValues.js";
import { syncImportDefaultValuesWithMappings } from "../services/import/defaultValues/syncImportDefaultValuesWithMappings.js";
import { updateImportDefaultValueRule } from "../services/import/defaultValues/updateImportDefaultValueRule.js";
import { validateImportDefaultFieldRules } from "../services/import/defaultValues/validateImportDefaultFieldRules.js";
import { getCurrentUserId } from "../../communication/domain/messageItemUtils.js";
import { IMPORT_SKIP_FIELD_VALUE } from "../services/import/importFieldTypeSupport.js";
import { loadImportUsersIndex } from "../services/import/loadImportUsersIndex.js";
import { parseObjectExcelImportFile } from "../services/import/parseObjectExcelImportFile.js";
import { runObjectExcelImport } from "../services/import/runObjectExcelImport.js";
import { validateObjectExcelImportRows } from "../services/import/validateObjectExcelImportRows.js";
import { importValueMappingsNeedUserInput } from "../services/import/valueMapping/applyImportValueMappings.js";
import { buildImportValueMappings } from "../services/import/valueMapping/buildImportValueMappings.js";
import { loadImportUsersForSelect } from "../services/import/valueMapping/loadImportUsersForSelect.js";
import { formatImportFileSize } from "./formatImportFileSize.js";
import ObjectExcelImportDefaultValuesPanel from "./ObjectExcelImportDefaultValuesPanel.jsx";
import ObjectExcelImportReviewPanel from "./ObjectExcelImportReviewPanel.jsx";
import ObjectExcelImportStepper from "./ObjectExcelImportStepper.jsx";
import ObjectExcelImportValueMappingPanel from "./ObjectExcelImportValueMappingPanel.jsx";

import "./objectExcelImport.css";

const MODAL_KEY = "object-excel-import";

const STEP_DEFAULT_BOUNDS = {
  mapping: { width: 800, height: 720 },
  valueMapping: { width: 760, height: 560 },
  review: { width: 760, height: 620 },
  result: { width: 560, height: 360 },
};

const UNSUPPORTED_FILE_MESSAGE = "Поддерживается только формат .xlsx";

const FILE_STEP_CONTENT_STYLE = {
  flex: "0 1 auto",
  minHeight: 0,
  overflowY: "auto",
  padding: "8px 20px 12px",
};

function isSupportedXlsxFile(file) {
  return String(file?.name || "").trim().toLowerCase().endsWith(".xlsx");
}

function resolveFileStepBounds(file, headersLength) {
  if (!file) {
    return { width: 600, height: 268 };
  }

  let height = 330;

  if (headersLength > 0) {
    height += 64 + Math.min(headersLength, 8) * 6;
  }

  return { width: 640, height: Math.min(420, height) };
}

/**
 * @param {{
 *   open: boolean,
 *   onClose: () => void,
 *   snapshot?: Record<string, unknown> | null,
 * }} props
 */
export default function ObjectExcelImportModal({
  open,
  onClose,
  snapshot = null,
}) {
  const fileInputRef = useRef(null);
  const [step, setStep] = useState("file");
  const [file, setFile] = useState(null);
  const [sheetNames, setSheetNames] = useState([]);
  const [selectedSheetName, setSelectedSheetName] = useState("");
  const [headers, setHeaders] = useState([]);
  const [rows, setRows] = useState([]);
  const [mappings, setMappings] = useState([]);
  const [validation, setValidation] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [usersIndex, setUsersIndex] = useState(null);
  const [importUserOptions, setImportUserOptions] = useState([]);
  const [valueMappingRules, setValueMappingRules] = useState([]);
  const [importDefaultValues, setImportDefaultValues] = useState([]);
  const [valueMappingStepUsed, setValueMappingStepUsed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [parsingFile, setParsingFile] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState("");

  const importableFields = useMemo(
    () =>
      Array.isArray(snapshot?.importableFields) ? snapshot.importableFields : [],
    [snapshot?.importableFields],
  );

  const fieldOptions = useMemo(
    () => [
      { value: IMPORT_SKIP_FIELD_VALUE, label: "Не импортировать" },
      ...importableFields.map((field) => ({
        value: String(field.key || "").trim(),
        label: String(field.label || field.key || "").trim(),
      })),
    ],
    [importableFields],
  );

  const objectName = String(snapshot?.objectName || "Объект").trim() || "Объект";
  const fileSizeLabel = formatImportFileSize(file?.size);
  const fileStepBounds = useMemo(
    () => resolveFileStepBounds(file, headers.length),
    [file, headers.length],
  );
  const canProceedFromFile =
    Boolean(file) &&
    Boolean(selectedSheetName) &&
    headers.length > 0 &&
    rows.length > 0 &&
    !parsingFile;

  const resetParsedData = () => {
    setSheetNames([]);
    setSelectedSheetName("");
    setHeaders([]);
    setRows([]);
    setMappings([]);
    setImportDefaultValues([]);
  };

  const importContext = useMemo(() => {
    const rawUserId = Number(getCurrentUserId());

    return {
      currentUserId: Number.isFinite(rawUserId) && rawUserId > 0 ? rawUserId : null,
    };
  }, [open]);

  const mappingDefaultWarnings = useMemo(
    () =>
      step === "mapping"
        ? validateImportDefaultFieldRules(
            importDefaultValues,
            mappings,
            importableFields,
            importContext,
          )
        : [],
    [step, importDefaultValues, mappings, importableFields, importContext],
  );

  const applyColumnMappings = (nextMappings) => {
    setMappings(nextMappings);
    setImportDefaultValues((current) =>
      syncImportDefaultValuesWithMappings(
        mergeImportDefaultValues(
          current.length
            ? current
            : buildImportDefaultValues(importableFields, nextMappings),
          buildImportDefaultValues(importableFields, nextMappings),
        ),
        nextMappings,
      ),
    );
  };

  const handleAssignRequiredExcelColumn = (fieldKey, columnIndex) => {
    const nextMappings = assignRequiredFieldToExcelColumn(mappings, fieldKey, columnIndex);

    setMappings(nextMappings);
    setImportDefaultValues((current) =>
      syncImportDefaultValuesWithMappings(
        updateImportDefaultValueRule(
          mergeImportDefaultValues(
            current.length
              ? current
              : buildImportDefaultValues(importableFields, nextMappings),
            buildImportDefaultValues(importableFields, nextMappings),
          ),
          fieldKey,
          { source: IMPORT_DATA_SOURCE_EXCEL_COLUMN },
        ),
        nextMappings,
      ),
    );
  };

  useEffect(() => {
    if (step !== "mapping" || !importableFields.length || !mappings.length) {
      return;
    }

    setImportDefaultValues((current) =>
      ensureImportDefaultFieldRules(current, importableFields, mappings),
    );
  }, [step, importableFields, mappings]);

  useEffect(() => {
    if (!open) {
      return;
    }

    setStep("file");
    setFile(null);
    resetParsedData();
    setValidation(null);
    setImportResult(null);
    setValueMappingRules([]);
    setImportDefaultValues([]);
    setValueMappingStepUsed(false);
    setImportUserOptions([]);
    setError("");
    setLoading(false);
    setParsingFile(false);
    setIsDragOver(false);

    void loadImportUsersForSelect()
      .then(({ index, options }) => {
        setUsersIndex(index);
        setImportUserOptions(options);
      })
      .catch(() => {
        setUsersIndex(null);
        setImportUserOptions([]);
      });
  }, [open, snapshot?.tenantId, snapshot?.objectTypeKey]);

  const handleClose = () => {
    if (loading || parsingFile) {
      return;
    }

    onClose?.();
  };

  const processSelectedFile = async (nextFile) => {
    setError("");

    if (!nextFile) {
      setFile(null);
      resetParsedData();
      return;
    }

    if (!isSupportedXlsxFile(nextFile)) {
      showPlatformNotification({
        message: UNSUPPORTED_FILE_MESSAGE,
        variant: "warning",
      });
      return;
    }

    setFile(nextFile);
    setParsingFile(true);

    try {
      const parsed = await parseObjectExcelImportFile(nextFile);
      setSheetNames(parsed.sheetNames);
      setSelectedSheetName(parsed.selectedSheetName);
      setHeaders(parsed.headers);
      setRows(parsed.rows);
      applyColumnMappings(
        buildObjectExcelColumnMappings(
          parsed.headers,
          parsed.rows,
          importableFields,
        ),
      );
    } catch (parseError) {
      setError(
        parseError instanceof Error
          ? parseError.message
          : "Не удалось прочитать Excel-файл",
      );
      resetParsedData();
    } finally {
      setParsingFile(false);
    }
  };

  const handleFileInputChange = async (event) => {
    const nextFile = event.target.files?.[0] || null;
    await processSelectedFile(nextFile);
    event.target.value = "";
  };

  const handleDrop = async (event) => {
    event.preventDefault();
    setIsDragOver(false);

    const droppedFile = event.dataTransfer?.files?.[0] || null;

    if (!droppedFile) {
      return;
    }

    await processSelectedFile(droppedFile);
  };

  const reloadSheet = async (sheetName) => {
    if (!file) {
      return;
    }

    setParsingFile(true);

    try {
      const parsed = await parseObjectExcelImportFile(file, sheetName);
      setSelectedSheetName(parsed.selectedSheetName);
      setHeaders(parsed.headers);
      setRows(parsed.rows);
      applyColumnMappings(
        buildObjectExcelColumnMappings(
          parsed.headers,
          parsed.rows,
          importableFields,
        ),
      );
      setError("");
    } catch (parseError) {
      setError(
        parseError instanceof Error
          ? parseError.message
          : "Не удалось прочитать Excel-файл",
      );
    } finally {
      setParsingFile(false);
    }
  };

  const handleNextFromFile = () => {
    if (!canProceedFromFile) {
      setError("Выберите Excel-файл");
      return;
    }

    setError("");
    setStep("mapping");
  };

  const runValidation = (rules = valueMappingRules) => {
    const resolvedDefaultRules = ensureImportDefaultFieldRules(
      importDefaultValues,
      importableFields,
      mappings,
    );

    setImportDefaultValues(resolvedDefaultRules);

    const result = validateObjectExcelImportRows(
      rows,
      mappings,
      importableFields,
      usersIndex,
      rules,
      resolvedDefaultRules,
      importContext,
    );

    setValidation(result);
    setStep("review");
  };

  const handleProceedFromMapping = () => {
    const collected = buildImportValueMappings(
      rows,
      mappings,
      importableFields,
      usersIndex,
      valueMappingRules,
      importDefaultValues,
    );

    setValueMappingRules(collected.mappings);
    setError("");

    if (collected.needsUserMapping) {
      setValueMappingStepUsed(true);
      setStep("valueMapping");
      return;
    }

    runValidation(collected.mappings);
  };

  const handleFixMapping = () => {
    setError("");
    setStep("mapping");
  };

  const handleProceedFromValueMapping = () => {
    if (importValueMappingsNeedUserInput(valueMappingRules)) {
      setError("Сопоставьте все значения или выберите «Не импортировать значение»");
      return;
    }

    setError("");
    runValidation(valueMappingRules);
  };

  const handleImport = async () => {
    if (!validation?.validRows?.length) {
      setError("Нет строк для импорта");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await runObjectExcelImport({
        tenantId: Number(snapshot?.tenantId),
        objectTypeKey: String(snapshot?.objectTypeKey || "").trim(),
        validRows: validation.validRows,
      });

      setImportResult({
        ...result,
        skippedCount: validation?.errorCount ?? 0,
      });
      setStep("result");

      if (result.createdCount > 0) {
        await snapshot?.onImported?.();
        showPlatformNotification({
          message: `Импорт завершён. Создано записей: ${result.createdCount}`,
          variant: "info",
        });
      }

      if (result.failedCount > 0) {
        setError("Не удалось импортировать часть строк");
      }
    } catch (importError) {
      setError(
        importError instanceof Error
          ? importError.message
          : "Не удалось импортировать часть строк",
      );
    } finally {
      setLoading(false);
    }
  };

  const footer = (() => {
    if (step === "file") {
      return (
        <div className="object-excel-import__footer object-excel-import__footer--end">
          <div className="object-excel-import__footer-actions">
            <button type="button" className="object-excel-import__btn object-excel-import__btn--ghost" onClick={handleClose}>
              Отмена
            </button>
            <button
              type="button"
              className="object-excel-import__btn object-excel-import__btn--primary"
              onClick={handleNextFromFile}
              disabled={!canProceedFromFile}
            >
              Далее →
            </button>
          </div>
        </div>
      );
    }

    if (step === "mapping") {
      return (
        <div className="object-excel-import__footer object-excel-import__footer--end">
          <div className="object-excel-import__footer-actions">
            <button type="button" className="object-excel-import__btn object-excel-import__btn--ghost" onClick={() => setStep("file")}>
              Назад
            </button>
            <button type="button" className="object-excel-import__btn object-excel-import__btn--primary" onClick={handleProceedFromMapping}>
              Далее →
            </button>
          </div>
        </div>
      );
    }

    if (step === "valueMapping") {
      return (
        <div className="object-excel-import__footer object-excel-import__footer--end">
          <div className="object-excel-import__footer-actions">
            <button type="button" className="object-excel-import__btn object-excel-import__btn--ghost" onClick={() => setStep("mapping")}>
              Назад
            </button>
            <button
              type="button"
              className="object-excel-import__btn object-excel-import__btn--primary"
              onClick={handleProceedFromValueMapping}
              disabled={importValueMappingsNeedUserInput(valueMappingRules)}
            >
              Проверить
            </button>
          </div>
        </div>
      );
    }

    if (step === "review") {
      return (
        <div className="object-excel-import__footer object-excel-import__footer--end">
          <div className="object-excel-import__footer-actions">
            <button
              type="button"
              className="object-excel-import__btn object-excel-import__btn--ghost"
              onClick={() => setStep(valueMappingStepUsed ? "valueMapping" : "mapping")}
            >
              Назад
            </button>
            <button
              type="button"
              className="object-excel-import__btn object-excel-import__btn--secondary"
              onClick={handleFixMapping}
            >
              Исправить сопоставление
            </button>
            <button
              type="button"
              className="object-excel-import__btn object-excel-import__btn--primary"
              onClick={handleImport}
              disabled={loading || !validation?.validRows?.length}
            >
              {loading ? "Импорт..." : "Импортировать валидные строки"}
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="object-excel-import__footer">
        <span />
        <div className="object-excel-import__footer-actions">
          <button type="button" className="object-excel-import__btn object-excel-import__btn--primary" onClick={handleClose}>
            Закрыть
          </button>
        </div>
      </div>
    );
  })();

  return (
    <PlatformModal
      modalKey={MODAL_KEY}
      open={open}
      onClose={handleClose}
      title="Импорт Excel"
      subtitle={objectName}
      headerDensity={step === "file" ? "compact" : "default"}
      canCustomizeLayout
      defaultBounds={
        step === "file" ? fileStepBounds : STEP_DEFAULT_BOUNDS[step] || fileStepBounds
      }
      contentStyle={step === "file" ? FILE_STEP_CONTENT_STYLE : null}
      footer={footer}
    >
      <div className={`object-excel-import${step === "file" ? " object-excel-import--file-step" : ""}`}>
        <ObjectExcelImportStepper activeStep={step} />

        {error ? <p className="object-excel-import__error">{error}</p> : null}

        {step === "file" ? (
          <>
            {!file ? (
              <div
                  className={`object-excel-import__dropzone${isDragOver ? " is-dragover" : ""}`}
                  onDragEnter={(event) => {
                    event.preventDefault();
                    setIsDragOver(true);
                  }}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setIsDragOver(true);
                  }}
                  onDragLeave={(event) => {
                    event.preventDefault();
                    if (event.currentTarget.contains(event.relatedTarget)) {
                      return;
                    }
                    setIsDragOver(false);
                  }}
                  onDrop={handleDrop}
                >
                  <FileSpreadsheet
                    className="object-excel-import__dropzone-icon"
                    size={24}
                    strokeWidth={1.75}
                    aria-hidden
                  />
                  <p className="object-excel-import__dropzone-title">
                    Перетащите Excel-файл
                  </p>
                  <p className="object-excel-import__dropzone-hint">или</p>
                  <button
                    type="button"
                    className="object-excel-import__btn object-excel-import__btn--primary"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={parsingFile}
                  >
                    Выбрать файл
                  </button>
                  <input
                    ref={fileInputRef}
                    id="object-excel-import-file"
                    className="object-excel-import__file-input"
                    type="file"
                    accept=".xlsx"
                    onChange={handleFileInputChange}
                  />
                </div>
            ) : (
              <div className="object-excel-import__file-card">
                <div className="object-excel-import__file-card-row">
                  <FileSpreadsheet
                    className="object-excel-import__file-card-icon"
                    size={22}
                    strokeWidth={1.75}
                    aria-hidden
                  />
                  <div className="object-excel-import__file-card-body">
                    <div className="object-excel-import__file-card-name">{file.name}</div>
                    <div className="object-excel-import__file-card-meta">
                      <span>Листов: {sheetNames.length || "—"}</span>
                      {fileSizeLabel ? <span>Размер: {fileSizeLabel}</span> : null}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  className="object-excel-import__btn object-excel-import__btn--secondary"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={parsingFile}
                >
                  Выбрать другой файл
                </button>
                <input
                  ref={fileInputRef}
                  className="object-excel-import__file-input"
                  type="file"
                  accept=".xlsx"
                  onChange={handleFileInputChange}
                />
              </div>
            )}

            {file && selectedSheetName ? (
              <div className="object-excel-import__sheet-block">
                <div className="object-excel-import__field">
                  <label className="object-excel-import__label" htmlFor="object-excel-import-sheet">
                    Лист
                  </label>
                  <select
                    id="object-excel-import-sheet"
                    className="object-excel-import__select"
                    value={selectedSheetName}
                    disabled={parsingFile || sheetNames.length <= 1}
                    onChange={(event) => {
                      const nextSheet = event.target.value;
                      setSelectedSheetName(nextSheet);
                      void reloadSheet(nextSheet);
                    }}
                  >
                    {sheetNames.map((sheetName) => (
                      <option key={sheetName} value={sheetName}>
                        {sheetName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="object-excel-import__sheet-stats">
                  <span>Строк данных: {rows.length}</span>
                  <span>Колонок: {headers.length}</span>
                </div>
              </div>
            ) : null}

            {headers.length > 0 ? (
              <div className="object-excel-import__columns-block">
                <p className="object-excel-import__columns-title">Обнаружены колонки</p>
                <div className="object-excel-import__column-tags">
                  {headers.map((header) => (
                    <span key={header.index} className="object-excel-import__column-tag">
                      {header.label}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </>
        ) : null}

        {step === "valueMapping" ? (
          <ObjectExcelImportValueMappingPanel
            rules={valueMappingRules}
            importableFields={importableFields}
            userOptions={importUserOptions}
            onRulesChange={setValueMappingRules}
          />
        ) : null}

        {step === "mapping" ? (
          <>
          <div className="object-excel-import__table-wrap">
            <table className="object-excel-import__table">
              <thead>
                <tr>
                  <th>Колонка Excel</th>
                  <th>Пример значения</th>
                  <th>Поле объекта</th>
                </tr>
              </thead>
              <tbody>
                {mappings.map((mapping) => (
                  <tr key={mapping.columnIndex}>
                    <td>{mapping.excelHeader}</td>
                    <td>{mapping.sampleValue || "—"}</td>
                    <td>
                      <select
                        className="object-excel-import__select"
                        value={mapping.fieldKey || IMPORT_SKIP_FIELD_VALUE}
                        onChange={(event) =>
                          applyColumnMappings(
                            updateObjectExcelColumnMapping(
                              mappings,
                              mapping.columnIndex,
                              event.target.value,
                            ),
                          )
                        }
                      >
                        {fieldOptions.map((option) => (
                          <option key={`${mapping.columnIndex}-${option.value}`} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ObjectExcelImportDefaultValuesPanel
            rules={importDefaultValues}
            importableFields={importableFields}
            mappings={mappings}
            userOptions={importUserOptions}
            warnings={mappingDefaultWarnings}
            onRulesChange={setImportDefaultValues}
            onAssignExcelColumn={handleAssignRequiredExcelColumn}
          />
          </>
        ) : null}

        {step === "review" && validation ? (
          <ObjectExcelImportReviewPanel validation={validation} />
        ) : null}

        {step === "result" && importResult ? (
          <div className="object-excel-import__result">
            <h3 className="object-excel-import__result-title">Импорт завершён</h3>
            <div>Создано записей: {importResult.createdCount}</div>
            <div>Пропущено строк: {importResult.skippedCount}</div>
            <div>Ошибок: {importResult.failedCount}</div>
          </div>
        ) : null}
      </div>
    </PlatformModal>
  );
}
