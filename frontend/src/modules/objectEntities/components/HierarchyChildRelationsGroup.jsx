import { useEffect, useMemo, useState } from "react";

import { queryRuntimeEntities } from "../../designer/api/runtimeQueryApi";
import {
  entityCardSubtasksEmptyStyle,
  entityCardSubtasksListStyle,
  entityCardSubtaskMetaItemStyle,
  entityCardSubtaskTitleStyle,
  getEntityCardRelatedRowStyle,
} from "../../../shared/entityCardShell/styles/entityCardSubtasksStyles";
import { resolveSubtaskDisplayFieldKeys } from "../services/resolveSubtasksFromRelations";
import { resolveEntityTitle } from "../services/resolveEntityTitle";

const groupHeaderStyle = {
  padding: "8px 12px 4px",
  fontSize: 13,
  fontWeight: 700,
  color: "#0F172A",
};

const toolbarStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  padding: "4px 6px 10px",
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

const primaryButtonStyle = {
  ...actionButtonStyle,
  background: "#1D4ED8",
  borderColor: "#1D4ED8",
  color: "#fff",
};

const pickFormStyle = {
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

const mutationErrorStyle = {
  margin: "0 6px 10px",
  padding: "8px 10px",
  borderRadius: 10,
  background: "#FEF2F2",
  color: "#B91C1C",
  fontSize: 12,
  fontWeight: 600,
};

const removeButtonStyle = {
  border: "1px solid #FECACA",
  borderRadius: 8,
  background: "#FFF1F2",
  color: "#BE123C",
  fontSize: 11,
  fontWeight: 600,
  padding: "4px 8px",
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const addMenuStyle = {
  display: "grid",
  gap: 4,
  padding: 8,
  border: "1px solid #E2E8F0",
  borderRadius: 10,
  background: "#fff",
  boxShadow: "0 8px 24px rgba(15, 23, 42, 0.12)",
  minWidth: 200,
};

function resolvePeerEntityLabel(catalog, objectTypeKey, entity) {
  const displayKeys = resolveSubtaskDisplayFieldKeys(catalog, objectTypeKey);
  const values =
    entity?.values && typeof entity.values === "object" ? entity.values : {};

  const title = resolveEntityTitle(values, displayKeys.titleFieldKey);

  return title || String(entity?.id || "Запись");
}

function AddExistingHierarchyChildForm({
  tenantId,
  entityId,
  objectTypeKey,
  catalog,
  pickLabel = "Выберите запись",
  excludedEntityIds = [],
  linking = false,
  onCancel,
  onSubmit,
}) {
  const [selectedEntityId, setSelectedEntityId] = useState("");
  const [peerEntities, setPeerEntities] = useState([]);
  const [peerLoading, setPeerLoading] = useState(false);
  const [peerError, setPeerError] = useState("");

  const excludedSet = useMemo(
    () => new Set(excludedEntityIds.map((id) => String(id).trim()).filter(Boolean)),
    [excludedEntityIds],
  );

  useEffect(() => {
    if (!tenantId || !objectTypeKey) {
      return undefined;
    }

    let cancelled = false;

    async function loadPeers() {
      setPeerLoading(true);
      setPeerError("");
      setSelectedEntityId("");

      try {
        const response = await queryRuntimeEntities(tenantId, objectTypeKey, {
          limit: 50,
          offset: 0,
          sort: "created_at",
          order: "desc",
        });

        if (cancelled) {
          return;
        }

        const items = Array.isArray(response?.items) ? response.items : [];

        setPeerEntities(
          items.filter((item) => {
            const id = String(item?.id ?? "").trim();

            return id && !excludedSet.has(id);
          }),
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

    void loadPeers();

    return () => {
      cancelled = true;
    };
  }, [tenantId, objectTypeKey, excludedSet]);

  return (
    <form
      style={pickFormStyle}
      onSubmit={(event) => {
        event.preventDefault();

        if (!selectedEntityId) {
          return;
        }

        onSubmit?.(selectedEntityId);
      }}
    >
      <label style={fieldLabelStyle}>
        {pickLabel}
        <select
          value={selectedEntityId}
          onChange={(event) => setSelectedEntityId(event.target.value)}
          style={fieldControlStyle}
          disabled={linking || peerLoading}
        >
          <option value="">
            {peerLoading ? "Загрузка…" : pickLabel}
          </option>
          {peerEntities.map((entity) => (
            <option key={entity.id} value={entity.id}>
              {resolvePeerEntityLabel(catalog, objectTypeKey, entity)}
            </option>
          ))}
        </select>
      </label>

      {peerError ? (
        <div style={mutationErrorStyle} role="alert">
          {peerError}
        </div>
      ) : null}

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button
          type="button"
          style={actionButtonStyle}
          onClick={onCancel}
          disabled={linking}
        >
          Отмена
        </button>
        <button
          type="submit"
          style={primaryButtonStyle}
          disabled={linking || !selectedEntityId || peerLoading}
        >
          {linking ? "Добавление…" : "Добавить"}
        </button>
      </div>
    </form>
  );
}

export default function HierarchyChildRelationsGroup({
  group,
  tenantId = null,
  entityId = null,
  objectTypeKey = null,
  catalog = null,
  canAddChild = false,
  creating = false,
  deletingInstanceId = "",
  mutationError = "",
  onOpenRelatedEntity = null,
  onCreateNewChild = null,
  onLinkExistingChild = null,
  onUnlinkChild = null,
}) {
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [isPickOpen, setIsPickOpen] = useState(false);

  const uiLabels = group?.uiLabels || {};
  const items = Array.isArray(group?.items) ? group.items : [];
  const groupTitle = uiLabels.groupTitle || group?.title || "Дочерние элементы";
  const showDueColumn = items.some(
    (item) => item.dueDate && item.dueDate !== "—",
  );
  const gridColumns = showDueColumn
    ? "minmax(150px, 1fr) 86px 96px 88px minmax(120px, auto)"
    : "minmax(150px, 1fr) 86px 96px minmax(120px, auto)";

  const excludedEntityIds = useMemo(() => {
    const ids = [entityId, ...items.map((item) => item.entityId)];

    return ids.filter(Boolean);
  }, [entityId, items]);

  return (
    <div data-hierarchy-child-relations-group="">
      <div style={groupHeaderStyle}>{groupTitle}</div>

      {!items.length ? (
        <div style={entityCardSubtasksEmptyStyle} role="status">
          Нет записей
        </div>
      ) : (
        <div style={entityCardSubtasksListStyle}>
          {items.map((item) => {
            const isRemoving =
              deletingInstanceId &&
              deletingInstanceId === item.relationInstanceId;
            const isDisabled = !item.canOpen;

            return (
              <div
                key={
                  item.relationInstanceId ||
                  `${item.entityId}-${group.relationKey}`
                }
                style={{
                  ...getEntityCardRelatedRowStyle(gridColumns),
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
                  title={isDisabled ? "Сущность недоступна" : "Открыть карточку"}
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
                    {item.status || "—"}
                  </span>
                  <span style={entityCardSubtaskMetaItemStyle}>
                    {item.assignee || "—"}
                  </span>
                  {showDueColumn ? (
                    <span style={entityCardSubtaskMetaItemStyle}>
                      {item.dueDate || "—"}
                    </span>
                  ) : null}
                </button>

                <button
                  type="button"
                  style={{
                    ...removeButtonStyle,
                    opacity: isRemoving ? 0.6 : 1,
                    cursor: isRemoving ? "wait" : "pointer",
                  }}
                  title={uiLabels.unlinkLabel || "Убрать из подзадач"}
                  disabled={creating || isRemoving}
                  onClick={() => {
                    if (!item.relationInstanceId) {
                      return;
                    }

                    void onUnlinkChild?.(item.relationInstanceId);
                  }}
                >
                  {isRemoving ? "…" : uiLabels.unlinkLabel || "Убрать из подзадач"}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {mutationError ? (
        <div style={mutationErrorStyle} role="alert">
          {mutationError}
        </div>
      ) : null}

      {isPickOpen ? (
        <AddExistingHierarchyChildForm
          tenantId={tenantId}
          entityId={entityId}
          objectTypeKey={objectTypeKey}
          catalog={catalog}
          pickLabel={uiLabels.pickExistingLabel}
          excludedEntityIds={excludedEntityIds}
          linking={creating}
          onCancel={() => setIsPickOpen(false)}
          onSubmit={async (childEntityId) => {
            const linked = await onLinkExistingChild?.(childEntityId);

            if (linked) {
              setIsPickOpen(false);
              setAddMenuOpen(false);
            }
          }}
        />
      ) : null}

      {canAddChild && !isPickOpen ? (
        <div style={toolbarStyle}>
          <div style={{ position: "relative" }}>
            <button
              type="button"
              style={primaryButtonStyle}
              disabled={creating}
              onClick={() => setAddMenuOpen((value) => !value)}
            >
              {uiLabels.addButtonLabel || "+ Подзадачу"}
            </button>

            {addMenuOpen ? (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  marginTop: 6,
                  zIndex: 2,
                }}
              >
                <div style={addMenuStyle}>
                  <button
                    type="button"
                    style={actionButtonStyle}
                    onClick={() => {
                      setAddMenuOpen(false);
                      onCreateNewChild?.();
                    }}
                  >
                    {uiLabels.createNewLabel || "Создать новую"}
                  </button>
                  <button
                    type="button"
                    style={actionButtonStyle}
                    onClick={() => {
                      setAddMenuOpen(false);
                      setIsPickOpen(true);
                    }}
                  >
                    {uiLabels.linkExistingLabel || "Добавить существующую"}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
