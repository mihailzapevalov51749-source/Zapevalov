import { useCallback, useEffect, useMemo, useState } from "react";
import { FolderOpen } from "lucide-react";

import { getApiErrorMessage } from "../../api/platformApiClient";
import * as designerApi from "../../api/designerApi";
import ActionDefinitionPropertiesPanel from "../actions/ActionDefinitionPropertiesPanel";
import ActionDefinitionRowMenu from "../actions/ActionDefinitionRowMenu";
import CreateActionDefinitionModal from "../actions/CreateActionDefinitionModal";
import {
  ObjectSettingsButton,
  ObjectSettingsEmptyState,
  ObjectSettingsHeader,
  ObjectSettingsPage,
  ObjectSettingsPanel,
  ObjectSettingsPanelFooter,
  ObjectSettingsSplitLayout,
  buildObjectSettingsLayoutStorageKey,
} from "../../../../shared/objectSettings";

export default function ObjectActionsTab({
  tenantId,
  objectTypeId = null,
  objectTypeKey = "",
  onSchemaChanged = null,
}) {
  const [actionDefinitions, setActionDefinitions] = useState([]);
  const [actionTypes, setActionTypes] = useState([]);
  const [placementCatalog, setPlacementCatalog] = useState([]);
  const [placementCatalogError, setPlacementCatalogError] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [actionFooterState, setActionFooterState] = useState(null);

  const hasConfiguredActions = actionDefinitions.length > 0;
  const selectedAction =
    actionDefinitions.find((item) => item.id === selectedId) || null;

  const layoutStorageKey = useMemo(
    () =>
      buildObjectSettingsLayoutStorageKey({
        tenantId,
        objectTypeKey,
        tabKey: "actions",
      }),
    [objectTypeKey, tenantId],
  );

  const existingActionKeys = useMemo(
    () =>
      actionDefinitions
        .map((item) => String(item?.key || "").trim())
        .filter(Boolean),
    [actionDefinitions],
  );

  const loadActionDefinitions = useCallback(async () => {
    if (!tenantId || !objectTypeId) {
      setActionDefinitions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const items = await designerApi.listActionDefinitions(tenantId, objectTypeId);
      setActionDefinitions(Array.isArray(items) ? items : []);
    } catch (err) {
      setError(getApiErrorMessage(err, "Не удалось загрузить действия объекта"));
      setActionDefinitions([]);
    } finally {
      setLoading(false);
    }
  }, [objectTypeId, tenantId]);

  const loadActionTypes = useCallback(async () => {
    if (!tenantId) {
      setActionTypes([]);
      return;
    }

    try {
      const types = await designerApi.listActionTypes(tenantId);
      setActionTypes(Array.isArray(types) ? types : []);
    } catch {
      setActionTypes([]);
    }
  }, [tenantId]);

  useEffect(() => {
    loadActionDefinitions();
  }, [loadActionDefinitions]);

  useEffect(() => {
    loadActionTypes();
  }, [loadActionTypes]);

  const loadPlacementCatalog = useCallback(async () => {
    if (!tenantId) {
      setPlacementCatalog([]);
      setPlacementCatalogError("");
      return;
    }

    try {
      const items = await designerApi.getActionPlacementCatalog(tenantId);
      setPlacementCatalog(Array.isArray(items) ? items : []);
      setPlacementCatalogError("");
    } catch {
      setPlacementCatalog([]);
      setPlacementCatalogError("Не удалось загрузить варианты размещения.");
    }
  }, [tenantId]);

  useEffect(() => {
    loadPlacementCatalog();
  }, [loadPlacementCatalog]);

  useEffect(() => {
    if (!selectedId) {
      return;
    }

    const stillExists = actionDefinitions.some((item) => item.id === selectedId);
    if (!stillExists) {
      setSelectedId(actionDefinitions[0]?.id || null);
    }
  }, [actionDefinitions, selectedId]);

  const handleCreated = useCallback((created) => {
    setActionDefinitions((current) => {
      const next = [...current, created].sort((left, right) =>
        String(left?.name || "").localeCompare(String(right?.name || ""), "ru"),
      );
      return next;
    });
    setSelectedId(created?.id || null);
  }, []);

  const handleSaved = useCallback((updated) => {
    setActionDefinitions((current) =>
      current
        .map((item) => (item.id === updated.id ? updated : item))
        .sort((left, right) =>
          String(left?.name || "").localeCompare(String(right?.name || ""), "ru"),
        ),
    );
  }, []);

  const handleDelete = useCallback(
    async (actionDefinitionId) => {
      if (!tenantId || !objectTypeId || !actionDefinitionId) {
        return;
      }

      const target = actionDefinitions.find((item) => item.id === actionDefinitionId);
      const confirmed = window.confirm(
        `Удалить действие «${target?.name || target?.key || ""}»?`,
      );

      if (!confirmed) {
        return;
      }

      try {
        await designerApi.deleteActionDefinition(
          tenantId,
          objectTypeId,
          actionDefinitionId,
        );
        setActionDefinitions((current) =>
          current.filter((item) => item.id !== actionDefinitionId),
        );
        setSelectedId((current) =>
          current === actionDefinitionId ? null : current,
        );
        await onSchemaChanged?.();
      } catch (err) {
        window.alert(getApiErrorMessage(err, "Не удалось удалить действие"));
      }
    },
    [actionDefinitions, objectTypeId, onSchemaChanged, tenantId],
  );

  const openCreateModal = useCallback(() => {
    setIsCreateModalOpen(true);
  }, []);

  return (
    <ObjectSettingsPage>
      <ObjectSettingsHeader
        title="Действия объекта"
        count={actionDefinitions.length}
        centered
        primaryAction={
          <ObjectSettingsButton variant="primary" onClick={openCreateModal}>
            + Создать действие
          </ObjectSettingsButton>
        }
      />

      <ObjectSettingsSplitLayout
        storageKey={layoutStorageKey}
        left={
          <ObjectSettingsPanel
            title="Настроенные действия"
            tone="muted"
            titleId="designer-object-configured-actions-title"
          >
            {loading ? <p className="object-settings-status">Загрузка…</p> : null}

            {!loading && error ? (
              <p className="object-settings-error" role="alert">
                {error}
              </p>
            ) : null}

            {!loading && !error && !hasConfiguredActions ? (
              <ObjectSettingsEmptyState
                featured
                icon={<FolderOpen size={18} strokeWidth={1.75} />}
                title="Нет настроенных действий"
                description="Создайте действие, чтобы оно стало доступно в интерфейсе объекта."
              />
            ) : null}

            {!loading && !error && hasConfiguredActions ? (
              <div className="designer-table-wrap">
                <table className="designer-table">
                  <thead>
                    <tr>
                      <th>Название</th>
                      <th>Key</th>
                      <th>Активно</th>
                      <th aria-label="Действия" />
                    </tr>
                  </thead>
                  <tbody>
                    {actionDefinitions.map((item) => (
                      <tr
                        key={item.id}
                        className={item.id === selectedId ? "is-selected" : ""}
                        onClick={() => setSelectedId(item.id)}
                      >
                        <td>{item.name}</td>
                        <td>
                          <code>{item.key}</code>
                        </td>
                        <td>{item.is_active ? "Да" : "Нет"}</td>
                        <td onClick={(event) => event.stopPropagation()}>
                          <ActionDefinitionRowMenu
                            onDelete={() => handleDelete(item.id)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </ObjectSettingsPanel>
        }
        right={
          <ObjectSettingsPanel
            title="Свойства действия"
            titleId="designer-object-action-properties-title"
            footer={
              selectedAction && actionFooterState ? (
                <ObjectSettingsPanelFooter
                  onDelete={() => handleDelete(selectedAction.id)}
                  onSave={actionFooterState.handleSave}
                  deleteDisabled={Boolean(selectedAction.is_system)}
                  saveDisabled={
                    actionFooterState.disabled || Boolean(selectedAction.is_system)
                  }
                  saving={actionFooterState.saving}
                />
              ) : null
            }
          >
            {selectedAction ? (
              <ActionDefinitionPropertiesPanel
                tenantId={tenantId}
                objectTypeId={objectTypeId}
                action={selectedAction}
                actionTypes={actionTypes}
                placementCatalog={placementCatalog}
                placementCatalogError={placementCatalogError}
                onSaved={handleSaved}
                onSchemaChanged={onSchemaChanged}
                hideFooter
                onFooterStateChange={setActionFooterState}
              />
            ) : (
              <ObjectSettingsEmptyState
                compact
                inPanel
                title="Выберите действие слева"
                description="Чтобы просмотреть и изменить свойства действия."
              />
            )}
          </ObjectSettingsPanel>
        }
      />

      <CreateActionDefinitionModal
        open={isCreateModalOpen}
        tenantId={tenantId}
        objectTypeId={objectTypeId}
        existingActionKeys={existingActionKeys}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={handleCreated}
        onSchemaChanged={onSchemaChanged}
      />
    </ObjectSettingsPage>
  );
}
