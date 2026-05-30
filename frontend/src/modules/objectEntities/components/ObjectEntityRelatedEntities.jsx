import { useEffect, useMemo, useState } from "react";

import { queryRuntimeEntities } from "../../designer/api/runtimeQueryApi";
import { findCatalogObjectType } from "../../objectViews/table/services/adapters/ObjectTypeTableAdapter";
import { resolveEntityTitle } from "../services/resolveEntityTitle";
import {
  entityCardSubtasksEmptyStyle,
  entityCardSubtasksListStyle,
  entityCardSubtasksStyle,
  entityCardSubtaskMetaItemStyle,
  entityCardSubtaskTitleStyle,
  getEntityCardRelatedRowStyle,
} from "../../../shared/entityCardShell/styles/entityCardSubtasksStyles";

const groupHeaderStyle = {
  padding: "8px 12px 4px",
  fontSize: 12,
  fontWeight: 700,
  color: "#64748B",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const toolbarStyle = {
  display: "flex",
  justifyContent: "flex-end",
  padding: "0 6px 8px",
};

const actionButtonStyle = {
  border: "1px solid #CBD5E1",
  borderRadius: 10,
  background: "#fff",
  padding: "6px 12px",
  fontSize: 12,
  fontWeight: 600,
  color: "#0F172A",
  cursor: "pointer",
};

const formStyle = {
  margin: "0 6px 12px",
  padding: "12px",
  border: "1px solid #E2E8F0",
  borderRadius: 12,
  background: "#F8FAFC",
  display: "grid",
  gap: 10,
};

const fieldLabelStyle = {
  display: "grid",
  gap: 6,
  fontSize: 12,
  fontWeight: 600,
  color: "#334155",
};

const fieldControlStyle = {
  width: "100%",
  minHeight: 36,
  border: "1px solid #CBD5E1",
  borderRadius: 10,
  background: "#fff",
  padding: "8px 10px",
  fontSize: 13,
  color: "#0F172A",
  boxSizing: "border-box",
};

const formActionsStyle = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 8,
};

const mutationErrorStyle = {
  margin: "0 6px 10px",
  padding: "8px 10px",
  borderRadius: 10,
  background: "#FEF2F2",
  color: "#B91C1C",
  fontSize: 12,
  fontWeight: 600,
};

const deleteButtonStyle = {
  width: 28,
  height: 28,
  border: "1px solid #FECACA",
  borderRadius: 8,
  background: "#FFF1F2",
  color: "#BE123C",
  fontSize: 14,
  fontWeight: 700,
  lineHeight: 1,
  cursor: "pointer",
};

function DirectionLabel({ direction }) {
  if (direction === "incoming") {
    return " · входящая";
  }

  if (direction === "outgoing") {
    return " · исходящая";
  }

  return "";
}

function resolvePeerEntityLabel(catalog, objectTypeKey, entity) {
  const objectType = findCatalogObjectType(catalog, objectTypeKey);
  const fields = Array.isArray(objectType?.fields) ? objectType.fields : [];
  const titleField = fields.find((field) => field?.is_title || field?.isTitle);
  const titleFieldKey = String(titleField?.key || titleField?.field_key || "").trim();
  const values =
    entity?.values && typeof entity.values === "object" ? entity.values : {};
  const title = resolveEntityTitle(values, titleFieldKey);

  if (title) {
    return title;
  }

  return String(entity?.id || "Запись");
}

function AddRelationForm({
  tenantId,
  entityId,
  catalog,
  options = [],
  creating = false,
  onSubmit,
  onCancel,
}) {
  const [selectedOptionKey, setSelectedOptionKey] = useState("");
  const [selectedPeerEntityId, setSelectedPeerEntityId] = useState("");
  const [peerEntities, setPeerEntities] = useState([]);
  const [peerLoading, setPeerLoading] = useState(false);
  const [peerError, setPeerError] = useState("");

  const selectedOption = useMemo(
    () => options.find((option) => option.relationKey === selectedOptionKey) || null,
    [options, selectedOptionKey],
  );

  useEffect(() => {
    if (!selectedOption || !tenantId) {
      setPeerEntities([]);
      setPeerError("");
      setSelectedPeerEntityId("");
      return undefined;
    }

    let cancelled = false;

    async function loadPeerEntities() {
      setPeerLoading(true);
      setPeerError("");
      setSelectedPeerEntityId("");

      try {
        const response = await queryRuntimeEntities(
          tenantId,
          selectedOption.peerObjectTypeKey,
          {
            limit: 50,
            offset: 0,
            sort: "created_at",
            order: "desc",
          },
        );

        if (cancelled) {
          return;
        }

        const items = Array.isArray(response?.items) ? response.items : [];
        const normalizedEntityId = String(entityId ?? "").trim();

        setPeerEntities(
          items.filter((item) => String(item?.id ?? "").trim() !== normalizedEntityId),
        );
      } catch (err) {
        if (!cancelled) {
          setPeerEntities([]);
          setPeerError(
            err?.response?.data?.detail ||
              err?.message ||
              "Не удалось загрузить записи",
          );
        }
      } finally {
        if (!cancelled) {
          setPeerLoading(false);
        }
      }
    }

    void loadPeerEntities();

    return () => {
      cancelled = true;
    };
  }, [selectedOption, tenantId, entityId]);

  return (
    <form
      style={formStyle}
      onSubmit={(event) => {
        event.preventDefault();

        if (!selectedOption) {
          return;
        }

        onSubmit?.({
          relationKey: selectedOption.relationKey,
          currentRole: selectedOption.currentRole,
          peerEntityId: selectedPeerEntityId,
        });
      }}
    >
      <label style={fieldLabelStyle}>
        Тип связи
        <select
          value={selectedOptionKey}
          onChange={(event) => setSelectedOptionKey(event.target.value)}
          style={fieldControlStyle}
          disabled={creating}
        >
          <option value="">Выберите тип связи</option>
          {options.map((option) => (
            <option key={`${option.relationKey}-${option.direction}`} value={option.relationKey}>
              {option.label}
              {option.direction === "incoming" ? " (входящая)" : ""}
            </option>
          ))}
        </select>
      </label>

      <label style={fieldLabelStyle}>
        Связанная запись
        <select
          value={selectedPeerEntityId}
          onChange={(event) => setSelectedPeerEntityId(event.target.value)}
          style={fieldControlStyle}
          disabled={creating || !selectedOption || peerLoading}
        >
          <option value="">
            {peerLoading
              ? "Загрузка записей…"
              : selectedOption
                ? "Выберите запись"
                : "Сначала выберите тип связи"}
          </option>
          {peerEntities.map((entity) => (
            <option key={entity.id} value={entity.id}>
              {resolvePeerEntityLabel(catalog, selectedOption?.peerObjectTypeKey, entity)}
            </option>
          ))}
        </select>
      </label>

      {peerError ? (
        <div style={mutationErrorStyle} role="alert">
          {peerError}
        </div>
      ) : null}

      <div style={formActionsStyle}>
        <button
          type="button"
          style={actionButtonStyle}
          onClick={onCancel}
          disabled={creating}
        >
          Отмена
        </button>
        <button
          type="submit"
          style={{
            ...actionButtonStyle,
            background: "#1D4ED8",
            borderColor: "#1D4ED8",
            color: "#fff",
          }}
          disabled={
            creating || !selectedOptionKey || !selectedPeerEntityId || peerLoading
          }
        >
          {creating ? "Создание…" : "Создать связь"}
        </button>
      </div>
    </form>
  );
}

function LoadingState() {
  return (
    <div style={entityCardSubtasksEmptyStyle}>Загрузка связей…</div>
  );
}

function EmptyState() {
  return (
    <div style={entityCardSubtasksEmptyStyle} role="status">
      Нет связанных записей
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <>
      <div style={entityCardSubtasksEmptyStyle} role="alert">
        {message || "Не удалось загрузить связи"}
      </div>
      {typeof onRetry === "function" ? (
        <button type="button" onClick={onRetry} style={actionButtonStyle}>
          Повторить
        </button>
      ) : null}
    </>
  );
}

export default function ObjectEntityRelatedEntities({
  loading = false,
  error = "",
  groups = [],
  currentObjectTypeKey = null,
  tenantId = null,
  entityId = null,
  catalog = null,
  creatableRelationOptions = [],
  creating = false,
  deletingInstanceId = "",
  mutationError = "",
  onOpenRelatedEntity = null,
  onReload = null,
  onCreateRelation = null,
  onDeleteRelation = null,
}) {
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const canManageRelations =
    creatableRelationOptions.length > 0 &&
    typeof onCreateRelation === "function" &&
    typeof onDeleteRelation === "function";

  async function handleCreateRelation(payload) {
    const created = await onCreateRelation?.(payload);

    if (created) {
      setIsAddFormOpen(false);
    }
  }

  return (
    <div style={entityCardSubtasksStyle}>
      {canManageRelations ? (
        <div style={toolbarStyle}>
          {!isAddFormOpen ? (
            <button
              type="button"
              style={actionButtonStyle}
              onClick={() => setIsAddFormOpen(true)}
              disabled={creating || Boolean(deletingInstanceId)}
            >
              Добавить связь
            </button>
          ) : null}
        </div>
      ) : null}

      {isAddFormOpen ? (
        <AddRelationForm
          tenantId={tenantId}
          entityId={entityId}
          catalog={catalog}
          options={creatableRelationOptions}
          creating={creating}
          onCancel={() => setIsAddFormOpen(false)}
          onSubmit={handleCreateRelation}
        />
      ) : null}

      {mutationError ? (
        <div style={mutationErrorStyle} role="alert">
          {mutationError}
        </div>
      ) : null}

      {loading ? <LoadingState /> : null}

      {!loading && error ? (
        <ErrorState message={error} onRetry={onReload} />
      ) : null}

      {!loading && !error && !groups.length ? <EmptyState /> : null}

      {!loading && !error && groups.length ? (
        <>
          {groups.map((group) => (
            <div key={`${group.relationKey}-${group.direction}`}>
              <div style={groupHeaderStyle}>
                {group.title}
                <DirectionLabel direction={group.direction} />
              </div>

              <div style={entityCardSubtasksListStyle}>
                {group.items.map((item) => {
                  const isDisabled = !item.canOpen;
                  const isDeleting =
                    deletingInstanceId &&
                    deletingInstanceId === item.relationInstanceId;
                  const hint = isDisabled
                    ? item.objectTypeKey === currentObjectTypeKey
                      ? "Сущность недоступна"
                      : `Открытие типа «${item.objectTypeLabel || item.objectTypeKey}» будет добавлено позже`
                    : "Открыть карточку";

                  return (
                    <div
                      key={
                        item.relationInstanceId ||
                        `${item.entityId}-${group.relationKey}`
                      }
                      style={{
                        ...getEntityCardRelatedRowStyle(
                          canManageRelations
                            ? "minmax(150px, 1fr) 110px 72px 36px"
                            : "minmax(150px, 1fr) 110px 72px",
                        ),
                        opacity: isDisabled ? 0.55 : 1,
                      }}
                    >
                      <button
                        type="button"
                        style={{
                          display: "contents",
                          border: "none",
                          background: "transparent",
                          padding: 0,
                          margin: 0,
                          cursor: isDisabled ? "not-allowed" : "pointer",
                          textAlign: "left",
                        }}
                        disabled={isDisabled}
                        title={hint}
                        onClick={() => {
                          if (isDisabled) {
                            return;
                          }

                          onOpenRelatedEntity?.({
                            entityId: item.entityId,
                            objectTypeKey: item.objectTypeKey,
                          });
                        }}
                      >
                        <span style={entityCardSubtaskTitleStyle}>{item.title}</span>
                        <span style={entityCardSubtaskMetaItemStyle}>
                          {item.objectTypeLabel || item.objectTypeKey}
                        </span>
                        <span style={entityCardSubtaskMetaItemStyle}>
                          {item.status || "—"}
                        </span>
                      </button>

                      {canManageRelations ? (
                        <button
                          type="button"
                          style={{
                            ...deleteButtonStyle,
                            opacity: isDeleting ? 0.6 : 1,
                            cursor: isDeleting ? "wait" : "pointer",
                          }}
                          title="Удалить связь"
                          disabled={creating || isDeleting}
                          onClick={() => {
                            if (!item.relationInstanceId) {
                              return;
                            }

                            void onDeleteRelation?.(item.relationInstanceId);
                          }}
                        >
                          ×
                        </button>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </>
      ) : null}
    </div>
  );
}
