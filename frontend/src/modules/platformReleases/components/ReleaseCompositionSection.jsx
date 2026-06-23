import {
  countSelectedFiles,
  mapDiffElementsToRows,
  mapSavedElementsToRows,
} from "../utils/releaseComposition";

function ReleaseCompositionSummary({ elementsCount, filesCount, showRoute = true }) {
  return (
    <div className="platform-releases__composition-summary">
      <p>
        Элементов:
        {" "}
        <strong>{elementsCount}</strong>
      </p>
      <p>
        Файлов:
        {" "}
        <strong>{filesCount ?? "—"}</strong>
      </p>
      {showRoute ? (
        <p className="platform-releases__composition-route">DEV → TEMPLATE</p>
      ) : null}
    </div>
  );
}

export default function ReleaseCompositionSection({
  diffResult,
  selectedKeys,
  onToggle,
  readOnly = false,
  savedElementKeys = [],
}) {
  const hasCompare = Boolean(diffResult);
  const noChanges = hasCompare && !diffResult?.has_changes;
  const interactive = !readOnly && hasCompare && diffResult?.has_changes;

  const rows = interactive
    ? mapDiffElementsToRows(diffResult.elements)
    : mapSavedElementsToRows(savedElementKeys);

  const elementsCount = interactive
    ? selectedKeys.length
    : savedElementKeys.length;

  const filesCount = interactive
    ? countSelectedFiles(diffResult.elements, selectedKeys)
    : null;

  if (!hasCompare && !readOnly && savedElementKeys.length === 0) {
    return (
      <div className="platform-releases__composition">
        <strong>Состав релиза</strong>
        <p className="platform-releases__status">
          Выполните сравнение DEV и TEMPLATE, чтобы увидеть изменённые элементы архитектуры.
        </p>
      </div>
    );
  }

  if (noChanges && !readOnly) {
    return (
      <div className="platform-releases__composition">
        <strong>Состав релиза</strong>
        <p className="platform-releases__compare-summary">
          {diffResult.message || "DEV и TEMPLATE совпадают. Нет изменений для публикации."}
        </p>
      </div>
    );
  }

  if (readOnly && savedElementKeys.length === 0) {
    return (
      <div className="platform-releases__composition">
        <strong>Состав релиза</strong>
        <p className="platform-releases__status">Архитектурные элементы не зафиксированы.</p>
      </div>
    );
  }

  return (
    <div className="platform-releases__composition">
      <strong>Состав релиза</strong>
      <ul className="platform-releases__composition-list">
        {rows.map((row) => (
          <li key={row.componentKey} className="platform-releases__composition-item">
            {interactive ? (
              <label className="platform-releases__composition-label">
                <input
                  type="checkbox"
                  checked={selectedKeys.includes(row.componentKey)}
                  onChange={() => onToggle(row.componentKey)}
                />
                <span className="platform-releases__composition-title">{row.title}</span>
              </label>
            ) : (
              <span className="platform-releases__composition-title">{row.title}</span>
            )}
            <span className="platform-releases__composition-meta">
              {row.registryLabel}
              {row.filesCount != null ? (
                <>
                  {" · "}
                  {row.filesCount}
                  {" "}
                  {row.filesCount === 1 ? "файл" : row.filesCount < 5 ? "файла" : "файлов"}
                </>
              ) : null}
            </span>
          </li>
        ))}
      </ul>

      {(interactive || readOnly) && elementsCount > 0 ? (
        <ReleaseCompositionSummary
          elementsCount={elementsCount}
          filesCount={filesCount}
          showRoute={interactive || Boolean(diffResult)}
        />
      ) : null}

      {interactive && rows.length > 0 && selectedKeys.length === 0 ? (
        <p className="platform-releases__status">
          Выберите хотя бы один элемент для создания релиза.
        </p>
      ) : null}
    </div>
  );
}
