import { Copy, Pencil, Plus } from "lucide-react";

import { EntityCardInlineField } from "../../../shared/entityCardShell";
import ObjectEntityChecklist from "../../objectEntities/components/ObjectEntityChecklist.jsx";
import { getPlanEntityFieldValue } from "./planEntityUtils.js";

function DetailRow({ label, value, children }) {
  return (
    <div className="object-plan-view__detail-row">
      <span className="object-plan-view__detail-label">{label}</span>
      {children ? (
        <div className="object-plan-view__detail-value">{children}</div>
      ) : (
        <span className="object-plan-view__detail-value">{value}</span>
      )}
    </div>
  );
}

export default function PlanDetailPanel({
  node = null,
  issues = [],
  issuesLoading = false,
  showIssues = false,
  statusField = null,
  statusOptions = [],
  onStatusChange,
  statusSaving = false,
  previewMode = false,
  descriptionFieldKey = null,
  onDescriptionChange,
  descriptionSaving = false,
  onCreateSubtask,
  onEditRecord,
  canCreateSubtask = false,
  emptyMessage = "Выберите элемент плана",
}) {
  if (!node) {
    return (
      <div className="object-plan-view__detail-empty">
        <p>{emptyMessage}</p>
      </div>
    );
  }

  const readiness = Number(node.readiness) || 0;
  const currentStatusValue = statusField?.key
    ? getPlanEntityFieldValue(node.entity, statusField.key)
    : node.statusLabel;

  const descriptionValue = descriptionFieldKey
    ? getPlanEntityFieldValue(node.entity, descriptionFieldKey)
    : node.description;

  async function handleCopyId() {
    try {
      await navigator.clipboard?.writeText(String(node.id));
    } catch {
      // ignore clipboard errors
    }
  }

  return (
    <div className="object-plan-view__detail">
      <header className="object-plan-view__detail-header">
        <h3 className="object-plan-view__detail-title">{node.title}</h3>
        {!previewMode ? (
          <div className="object-plan-view__detail-toolbar">
            {canCreateSubtask ? (
              <button
                type="button"
                className="object-plan-view__detail-action object-plan-view__detail-action--primary"
                onClick={onCreateSubtask}
              >
                <Plus size={14} aria-hidden="true" />
                Подпункт
              </button>
            ) : null}
            <button
              type="button"
              className="object-plan-view__detail-action"
              onClick={onEditRecord}
            >
              <Pencil size={14} aria-hidden="true" />
              Редактировать
            </button>
          </div>
        ) : null}
      </header>

      <div className="object-plan-view__detail-summary">
        <DetailRow label="Статус">
          {!previewMode && statusOptions.length ? (
            <select
              className="object-plan-view__status-select"
              value={String(currentStatusValue ?? "")}
              disabled={statusSaving}
              onChange={(event) => {
                void onStatusChange?.(event.target.value);
              }}
            >
              {!String(currentStatusValue ?? "").trim() ? (
                <option value="">—</option>
              ) : null}
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : (
            <span>{node.statusLabel || "—"}</span>
          )}
        </DetailRow>

        <DetailRow label="Готовность">
          <div className="object-plan-view__progress-wrap">
            <div className="object-plan-view__progress">
              <div
                className="object-plan-view__progress-bar"
                style={{ width: `${Math.max(0, Math.min(100, readiness))}%` }}
              />
            </div>
            <span className="object-plan-view__progress-label">{readiness}%</span>
          </div>
        </DetailRow>

        <DetailRow label="ID записи">
          <span className="object-plan-view__id-row">
            <code className="object-plan-view__id-code">{node.id}</code>
            <button
              type="button"
              className="object-plan-view__copy-btn"
              aria-label="Копировать ID"
              onClick={() => {
                void handleCopyId();
              }}
            >
              <Copy size={14} />
            </button>
          </span>
        </DetailRow>

        <DetailRow
          label="Родитель"
          value={node.parentTitle || "Корневая запись"}
        />
      </div>

      <section className="object-plan-view__detail-section">
        <h4 className="object-plan-view__section-title">Описание</h4>
        {!previewMode && descriptionFieldKey ? (
          <EntityCardInlineField
            value={descriptionValue != null ? String(descriptionValue) : ""}
            multiline
            placeholder="Описание не указано"
            readOnly={descriptionSaving}
            onSave={(nextValue) => {
              void onDescriptionChange?.(nextValue);
            }}
            style={{
              width: "100%",
              minHeight: 72,
              fontSize: 14,
              lineHeight: 1.5,
              color: "#334155",
            }}
          />
        ) : node.description ? (
          <p className="object-plan-view__detail-text">{String(node.description)}</p>
        ) : (
          <p className="object-plan-view__detail-muted">Описание не указано</p>
        )}
      </section>

      {!previewMode ? (
        <section className="object-plan-view__detail-section">
          <h4 className="object-plan-view__section-title">Шаги</h4>
          <ObjectEntityChecklist runtimeEntityId={node.id} />
        </section>
      ) : null}

      {showIssues ? (
        <section className="object-plan-view__detail-section">
          <h4 className="object-plan-view__section-title">Проблемы</h4>
          {issuesLoading ? (
            <p className="object-plan-view__detail-muted">Загрузка проблем…</p>
          ) : issues.length ? (
            <ul className="object-plan-view__issues-list">
              {issues.map((issue) => (
                <li key={issue.id} className="object-plan-view__issue-item">
                  <div className="object-plan-view__issue-title">{issue.title}</div>
                  <div className="object-plan-view__issue-meta">
                    {issue.severityLabel ? (
                      <span
                        className={`object-plan-view__issue-badge object-plan-view__issue-badge--${
                          issue.severityLabel.toLowerCase().includes("выс")
                            ? "high"
                            : "medium"
                        }`}
                      >
                        {issue.severityLabel}
                      </span>
                    ) : null}
                    <span>{issue.statusLabel || "—"}</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="object-plan-view__detail-muted">Связанных проблем нет</p>
          )}
        </section>
      ) : null}
    </div>
  );
}
