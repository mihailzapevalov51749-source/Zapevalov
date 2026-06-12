import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import * as designerApi from "../api/designerApi";
import { resolveStudioDraftProjection } from "../utils/resolveStudioDraftProjection";
import {
  readRoleMappingFromSettings,
} from "../utils/syncViewSettingsRoleMapping";
import {
  readPlanSettingsFromView,
} from "../utils/syncPlanViewSettings";
import { readObjectTabSettings } from "../../objectViews/services/objectTabSettings";
import { buildStudioPlanViewDraftSettings } from "../utils/buildStudioPlanViewDraftSettings.js";
import { buildStudioPreviewCatalogFromDesignerFields } from "../utils/buildStudioPreviewCatalogFromDesignerFields.js";
import {
  buildPlanViewDraftFromView,
  hasPendingPlanViewChanges,
  readPlanHierarchyRelationKey,
} from "../utils/planViewStudioSave.js";
import { saveStudioViewDraft } from "../utils/saveStudioViewDraft.js";
import { logPlanDebug } from "../../objectViews/plan/planViewDebug.js";
import { notifyDesignerStudioApiError } from "../utils/notifyDesignerStudioApiError";
import {
  canHidePlanTab,
  normalizePlanLayoutSettings,
  reorderPlanLayoutItems,
  togglePlanLayoutItemShowInInfo,
  togglePlanLayoutItemVisibility,
  updatePlanLayoutItemLabel,
  updatePlanLayoutTabs,
} from "../../objectViews/plan/planLayoutSettings.js";
import {
  hideStudioDraftProjectionField,
  reorderStudioDraftProjectionInfoFieldKeys,
  toggleStudioDraftProjectionInfoField,
} from "../../objectViews/plan/planPreviewConstructor.js";
import { useObjectTypePreviewTab } from "./ObjectTypePreviewTabContext";

const PlanViewStudioContext = createContext(null);

export function PlanViewStudioProvider({
  tenantId,
  objectTypeId,
  objectTypeKey = "",
  onSchemaChanged = null,
  onDirtyChange = null,
  registerSave = null,
  children,
}) {
  const previewTab = useObjectTypePreviewTab();
  const [views, setViews] = useState([]);
  const [fields, setFields] = useState([]);
  const [draft, setDraft] = useState(null);
  const [planSettings, setPlanSettings] = useState(null);
  const [activeViewKey, setActiveViewKey] = useState(null);
  const loadedViewSnapshotRef = useRef(null);

  const fieldOptions = useMemo(
    () =>
      (fields || []).map((field) => ({
        id: field.id,
        key: field.key,
        name: field.name || field.key,
        field_type: field.field_type || field.type,
        is_system: Boolean(field.is_system),
      })),
    [fields],
  );

  const normalizeProjection = useCallback(
    (settingsJson) => resolveStudioDraftProjection(settingsJson, fieldOptions),
    [fieldOptions],
  );

  const loadViews = useCallback(async () => {
    if (!tenantId || !objectTypeId) {
      setViews([]);
      return;
    }

    try {
      const data = await designerApi.listViews(tenantId, objectTypeId);
      setViews(Array.isArray(data) ? data : []);
    } catch {
      setViews([]);
    }
  }, [tenantId, objectTypeId]);

  const loadFields = useCallback(async () => {
    if (!tenantId || !objectTypeId) {
      setFields([]);
      return;
    }

    try {
      const data = await designerApi.listFields(tenantId, objectTypeId);
      setFields(Array.isArray(data) ? data : []);
    } catch {
      setFields([]);
    }
  }, [tenantId, objectTypeId]);

  useEffect(() => {
    void loadViews();
    void loadFields();
  }, [loadViews, loadFields]);

  const selectedView = useMemo(
    () => views.find((view) => view.key === activeViewKey) || null,
    [views, activeViewKey],
  );

  useEffect(() => {
    const previewKey = String(previewTab?.selectedViewKey || "").trim();

    if (previewKey) {
      setActiveViewKey(previewKey);
    }
  }, [previewTab?.selectedViewKey]);

  const previewSelectView = previewTab?.selectView;
  const setStudioViewDraft = previewTab?.setStudioViewDraft;
  const setPlanPreviewEditor = previewTab?.setPlanPreviewEditor;
  const studioViewDraftSnapshotRef = useRef(null);
  const planPreviewEditorRef = useRef(null);

  useEffect(() => {
    if (!selectedView || selectedView.view_type !== "plan") {
      loadedViewSnapshotRef.current = null;
      studioViewDraftSnapshotRef.current = null;
      planPreviewEditorRef.current = undefined;
      setDraft(null);
      setPlanSettings(null);
      setPlanPreviewEditor?.(null);
      setStudioViewDraft?.(null);
      return;
    }

    const snapshot = `${selectedView.key}\0${JSON.stringify(selectedView.settings_json || {})}`;

    if (loadedViewSnapshotRef.current === snapshot) {
      return;
    }

    loadedViewSnapshotRef.current = snapshot;
    studioViewDraftSnapshotRef.current = null;

    const settingsJson = selectedView.settings_json || {};

    setDraft({
      name: selectedView.name,
      key: selectedView.key,
      view_type: selectedView.view_type,
      is_active: selectedView.is_active,
      description: selectedView.description || "",
      settings_json: settingsJson,
      projection: normalizeProjection(settingsJson),
      roleMapping: readRoleMappingFromSettings(settingsJson),
      tabSettings: readObjectTabSettings(settingsJson),
    });
    setPlanSettings(readPlanSettingsFromView(settingsJson));
  }, [selectedView, normalizeProjection, setPlanPreviewEditor, setStudioViewDraft]);

  useEffect(() => {
    if (!setStudioViewDraft || !selectedView || !draft || draft.view_type !== "plan") {
      if (studioViewDraftSnapshotRef.current !== null) {
        studioViewDraftSnapshotRef.current = null;
        setStudioViewDraft(null);
      }
      return;
    }

    const nextSettings = buildStudioPlanViewDraftSettings(draft, planSettings);

    if (!nextSettings) {
      if (studioViewDraftSnapshotRef.current !== null) {
        studioViewDraftSnapshotRef.current = null;
        setStudioViewDraft(null);
      }
      return;
    }

    const snapshot = `${draft.key}\0${JSON.stringify(nextSettings)}`;

    if (studioViewDraftSnapshotRef.current === snapshot) {
      return;
    }

    studioViewDraftSnapshotRef.current = snapshot;
    setStudioViewDraft({
      viewKey: draft.key,
      settingsJson: nextSettings,
    });
  }, [selectedView, draft, planSettings, setStudioViewDraft]);

  const studioViewDraftSettings = useMemo(() => {
    if (!draft || draft.view_type !== "plan" || !selectedView) {
      return null;
    }

    const settingsJson = buildStudioPlanViewDraftSettings(draft, planSettings);

    if (!settingsJson) {
      return null;
    }

    return {
      viewKey: draft.key,
      settingsJson,
    };
  }, [draft, planSettings, selectedView]);

  const studioPreviewCatalog = useMemo(
    () =>
      buildStudioPreviewCatalogFromDesignerFields({
        objectTypeKey,
        fields,
      }),
    [objectTypeKey, fields],
  );

  const isPlanViewDirty = useMemo(
    () =>
      hasPendingPlanViewChanges({
        view: selectedView,
        draft,
        planSettings,
        fieldOptions,
        normalizeProjection,
      }),
    [selectedView, draft, planSettings, fieldOptions, normalizeProjection],
  );

  useEffect(() => {
    onDirtyChange?.(isPlanViewDirty);
  }, [isPlanViewDirty, onDirtyChange]);

  const savePlanViewDraft = useCallback(
    async (options = {}) => {
      const { flushBeforePublish = false } = options;

      if (!selectedView || selectedView.view_type !== "plan") {
        if (flushBeforePublish) {
          return null;
        }

        throw new Error("Не выбрано представление «План» для сохранения.");
      }

      const effectiveDraft =
        draft ?? buildPlanViewDraftFromView(selectedView, normalizeProjection);

      if (!effectiveDraft) {
        throw new Error(
          "Черновик представления «План» ещё не готов. Подождите загрузку и повторите сохранение.",
        );
      }

      const effectivePlanSettings =
        planSettings ?? readPlanSettingsFromView(effectiveDraft.settings_json);

      const pending = hasPendingPlanViewChanges({
        view: selectedView,
        draft: effectiveDraft,
        planSettings: effectivePlanSettings,
        fieldOptions,
        normalizeProjection,
      });

      if (!pending) {
        if (flushBeforePublish) {
          logPlanDebug("PLAN_PUBLISH_INPUT", {
            viewKey: selectedView.key,
            hierarchyRelationKey: readPlanHierarchyRelationKey(
              readPlanSettingsFromView(selectedView.settings_json || {}),
            ),
            action: "skip_already_saved",
          });
        }

        return null;
      }

      logPlanDebug("PLAN_PUBLISH_INPUT", {
        viewKey: selectedView.key,
        hierarchyRelationKey: readPlanHierarchyRelationKey(effectivePlanSettings),
        action: flushBeforePublish ? "flush_before_publish" : "save",
      });

      const savedView = await saveStudioViewDraft({
        tenantId,
        view: selectedView,
        draft: effectiveDraft,
        planSettings: effectivePlanSettings,
      });

      const savedSettingsJson =
        savedView?.settings_json && typeof savedView.settings_json === "object"
          ? savedView.settings_json
          : effectiveDraft.settings_json;
      const savedPlan = readPlanSettingsFromView(savedSettingsJson);

      logPlanDebug("PLAN_VIEW_SAVE_RESULT", {
        viewKey: selectedView.key,
        hierarchyRelationKey: readPlanHierarchyRelationKey(savedPlan),
      });

      loadedViewSnapshotRef.current = `${selectedView.key}\0${JSON.stringify(savedSettingsJson)}`;

      setDraft({
        ...effectiveDraft,
        name: savedView?.name ?? effectiveDraft.name,
        key: savedView?.key ?? effectiveDraft.key,
        view_type: savedView?.view_type ?? effectiveDraft.view_type,
        is_active: savedView?.is_active ?? effectiveDraft.is_active,
        description: savedView?.description ?? effectiveDraft.description,
        settings_json: savedSettingsJson,
        projection: normalizeProjection(savedSettingsJson),
        roleMapping: readRoleMappingFromSettings(savedSettingsJson),
        tabSettings: readObjectTabSettings(savedSettingsJson),
      });
      setPlanSettings(savedPlan);

      await loadViews();
      await onSchemaChanged?.({ viewKey: effectiveDraft.key });

      return savedView;
    },
    [
      selectedView,
      draft,
      planSettings,
      fieldOptions,
      normalizeProjection,
      tenantId,
      loadViews,
      onSchemaChanged,
    ],
  );

  useEffect(() => {
    if (selectedView?.view_type !== "plan") {
      registerSave?.(null);
      return undefined;
    }

    registerSave?.(savePlanViewDraft);

    return () => {
      registerSave?.(null);
    };
  }, [registerSave, savePlanViewDraft, selectedView?.view_type]);

  const updatePlanLayout = useCallback((mutator) => {
    setPlanSettings((prev) => {
      const layout = normalizePlanLayoutSettings(prev?.planLayout);
      const nextLayout = mutator(layout);

      return {
        ...(prev || {}),
        planLayout: nextLayout,
      };
    });
  }, []);

  const saveFieldRename = useCallback(
    async (fieldKey, nextName) => {
      const normalizedKey = String(fieldKey || "").trim();
      const normalizedName = String(nextName || "").trim();
      const field = (fields || []).find((item) => String(item?.key || "").trim() === normalizedKey);

      if (!field?.id || !normalizedName) {
        return false;
      }

      const currentName = String(field.name || field.key || normalizedKey).trim();

      if (normalizedName === currentName) {
        return true;
      }

      try {
        await designerApi.updateField(tenantId, objectTypeId, field.id, {
          name: normalizedName,
        });
        await loadFields();
        await onSchemaChanged?.();
        return true;
      } catch (err) {
        notifyDesignerStudioApiError(err, "Не удалось переименовать поле");
        return false;
      }
    },
    [fields, tenantId, objectTypeId, loadFields, onSchemaChanged],
  );

  const commitTabLabel = useCallback(
    (tabKey, nextLabel) => {
      const normalizedKey = String(tabKey || "").trim();
      const normalizedLabel = String(nextLabel || "").trim();

      if (!normalizedKey || !normalizedLabel) {
        return;
      }

      const layout = normalizePlanLayoutSettings(planSettings?.planLayout);
      const tab = layout.tabs.find((item) => item.key === normalizedKey);
      const currentLabel = String(tab?.label || normalizedKey).trim();

      if (normalizedLabel === currentLabel) {
        return;
      }

      updatePlanLayout((layoutState) =>
        updatePlanLayoutTabs(
          layoutState,
          updatePlanLayoutItemLabel(layoutState.tabs, normalizedKey, normalizedLabel),
        ),
      );
    },
    [planSettings?.planLayout, updatePlanLayout],
  );

  const hideField = useCallback((fieldKey) => {
    setDraft((prev) => {
      if (!prev) {
        return prev;
      }

      return {
        ...prev,
        projection: hideStudioDraftProjectionField(prev.projection, fieldKey),
      };
    });
  }, []);

  const toggleInfoField = useCallback((fieldKey) => {
    setDraft((prev) => {
      if (!prev) {
        return prev;
      }

      return {
        ...prev,
        projection: toggleStudioDraftProjectionInfoField(prev.projection, fieldKey),
      };
    });
  }, []);

  const reorderInfoField = useCallback((sourceKey, targetKey, position = "before") => {
    setDraft((prev) => {
      if (!prev) {
        return prev;
      }

      return {
        ...prev,
        projection: reorderStudioDraftProjectionInfoFieldKeys(
          prev.projection,
          sourceKey,
          targetKey,
          position,
        ),
      };
    });
  }, []);

  const hideTab = useCallback(
    (tabKey) => {
      const layout = normalizePlanLayoutSettings(planSettings?.planLayout);

      if (
        !canHidePlanTab(layout, tabKey) &&
        layout.tabs.find((tab) => tab.key === tabKey)?.visible !== false
      ) {
        return;
      }

      updatePlanLayout((layoutState) =>
        updatePlanLayoutTabs(
          layoutState,
          togglePlanLayoutItemVisibility(layoutState.tabs, tabKey),
        ),
      );
    },
    [planSettings?.planLayout, updatePlanLayout],
  );

  const toggleTabShowInInfo = useCallback(
    (tabKey) => {
      if (tabKey === "info") {
        return;
      }

      updatePlanLayout((layoutState) =>
        updatePlanLayoutTabs(
          layoutState,
          togglePlanLayoutItemShowInInfo(layoutState.tabs, tabKey),
        ),
      );
    },
    [updatePlanLayout],
  );

  const reorderTab = useCallback(
    (sourceKey, targetKey, position = "before") => {
      updatePlanLayout((layoutState) =>
        updatePlanLayoutTabs(
          layoutState,
          reorderPlanLayoutItems(layoutState.tabs, sourceKey, targetKey, position),
        ),
      );
    },
    [updatePlanLayout],
  );

  const planPreviewEditor = useMemo(
    () =>
      selectedView?.view_type === "plan" && draft?.view_type === "plan"
        ? {
            saveFieldRename,
            hideField,
            toggleInfoField,
            reorderInfoField,
            commitTabLabel,
            hideTab,
            toggleTabShowInInfo,
            reorderTab,
          }
        : null,
    [
      selectedView?.view_type,
      draft?.view_type,
      saveFieldRename,
      hideField,
      toggleInfoField,
      reorderInfoField,
      commitTabLabel,
      hideTab,
      toggleTabShowInInfo,
      reorderTab,
    ],
  );

  useEffect(() => {
    if (!setPlanPreviewEditor) {
      return undefined;
    }

    if (planPreviewEditorRef.current === planPreviewEditor) {
      return undefined;
    }

    planPreviewEditorRef.current = planPreviewEditor;
    setPlanPreviewEditor(planPreviewEditor);

    return () => {
      planPreviewEditorRef.current = undefined;
      setPlanPreviewEditor(null);
    };
  }, [planPreviewEditor, setPlanPreviewEditor]);

  const bindViewKey = useCallback(
    (viewKey) => {
      const normalizedKey = String(viewKey || "").trim();

      if (!normalizedKey) {
        return;
      }

      setActiveViewKey(normalizedKey);
      previewSelectView?.(normalizedKey);
    },
    [previewSelectView],
  );

  const value = useMemo(
    () => ({
      activeViewKey,
      bindViewKey,
      selectedView,
      draft,
      setDraft,
      planSettings,
      setPlanSettings,
      fieldOptions,
      reloadViews: loadViews,
      reloadFields: loadFields,
      isPlanStudioActive: selectedView?.view_type === "plan",
      isPlanViewDirty,
      planPreviewEditor,
      studioViewDraftSettings,
      studioPreviewCatalog,
    }),
    [
      activeViewKey,
      bindViewKey,
      selectedView,
      draft,
      planSettings,
      fieldOptions,
      loadViews,
      loadFields,
      isPlanViewDirty,
      planPreviewEditor,
      studioViewDraftSettings,
      studioPreviewCatalog,
    ],
  );

  return (
    <PlanViewStudioContext.Provider value={value}>{children}</PlanViewStudioContext.Provider>
  );
}

export function usePlanViewStudio() {
  return useContext(PlanViewStudioContext);
}
