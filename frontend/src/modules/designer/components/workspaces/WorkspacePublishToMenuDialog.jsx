import { useEffect, useMemo, useState } from "react";

import { getApiErrorMessage } from "../../api/platformApiClient";
import * as designerApi from "../../api/designerApi";
import { navigationService } from "../../../navigation/services/navigationService";
import { flattenNavigationParentOptions } from "../../utils/mergeDesignerSidebarNavigation";
import {
  MENU_PLACEMENT_SCOPE_DESIGNER,
  MENU_PLACEMENT_SCOPE_RUNTIME,
  MENU_PLACEMENT_TARGET_OPTIONS,
} from "../../utils/menuPlacementScopes";
import {
  dispatchDesignerNavigationReload,
  dispatchPortalNavigationReload,
} from "../../utils/navigationReload";

import "../../styles/objectTypePublishDialog.css";

function buildPlacementPayload(menuScope, parentId, sortOrder) {
  return {
    menu_scope: menuScope,
    parent_id: parentId ? Number(parentId) : null,
    sort_order: Number(sortOrder) || 0,
    is_visible: true,
  };
}

export default function WorkspacePublishToMenuDialog({
  open,
  tenantId,
  workspace,
  onClose,
  onSuccess,
}) {
  const [publishToStudio, setPublishToStudio] = useState(true);
  const [publishToOffice, setPublishToOffice] = useState(false);
  const [designerParentId, setDesignerParentId] = useState("");
  const [runtimeParentId, setRuntimeParentId] = useState("");
  const [sortOrder, setSortOrder] = useState(100);
  const [designerNavigationTree, setDesignerNavigationTree] = useState([]);
  const [runtimeNavigationTree, setRuntimeNavigationTree] = useState([]);
  const [loadingTree, setLoadingTree] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    const loadTrees = async () => {
      setLoadingTree(true);
      setError("");
      try {
        const [designerTree, runtimeTree] = await Promise.all([
          publishToStudio
            ? navigationService.getTree(tenantId, { scope: "designer", mode: "designer" })
            : Promise.resolve([]),
          publishToOffice
            ? navigationService.getTree(tenantId, { scope: "runtime", mode: "runtime" })
            : Promise.resolve([]),
        ]);
        if (!cancelled) {
          setDesignerNavigationTree(Array.isArray(designerTree) ? designerTree : []);
          setRuntimeNavigationTree(Array.isArray(runtimeTree) ? runtimeTree : []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(getApiErrorMessage(err, "Не удалось загрузить меню"));
        }
      } finally {
        if (!cancelled) setLoadingTree(false);
      }
    };
    loadTrees();
    return () => {
      cancelled = true;
    };
  }, [open, tenantId, publishToStudio, publishToOffice]);

  const designerParentOptions = useMemo(
    () => flattenNavigationParentOptions(designerNavigationTree),
    [designerNavigationTree],
  );
  const runtimeParentOptions = useMemo(
    () => flattenNavigationParentOptions(runtimeNavigationTree),
    [runtimeNavigationTree],
  );

  if (!open) return null;

  const handleSubmit = async () => {
    if (!workspace?.id) return;
    if (!publishToStudio && !publishToOffice) {
      setError("Выберите хотя бы одно меню: Студия или Офис");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const placements = [];
      if (publishToStudio) {
        placements.push(
          buildPlacementPayload(MENU_PLACEMENT_SCOPE_DESIGNER, designerParentId, sortOrder),
        );
      }
      if (publishToOffice) {
        placements.push(
          buildPlacementPayload(MENU_PLACEMENT_SCOPE_RUNTIME, runtimeParentId, sortOrder),
        );
      }
      const result = await designerApi.publishWorkspaceMenuPlacements(tenantId, workspace.id, {
        placements,
      });
      if (publishToStudio) dispatchDesignerNavigationReload();
      if (publishToOffice) dispatchPortalNavigationReload();
      onSuccess?.(result);
      onClose?.();
    } catch (err) {
      setError(getApiErrorMessage(err, "Не удалось разместить пространство в меню"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="designer-publish-dialog-backdrop" role="presentation" onClick={onClose}>
      <div
        className="designer-publish-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="workspace-publish-dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="workspace-publish-dialog-title" className="designer-publish-dialog__title">
          Разместить в меню
        </h2>
        <p className="designer-publish-dialog__subtitle">
          Выберите, где опубликовать рабочее пространство.
        </p>
        <div className="designer-publish-dialog__preview">
          <div>
            <div className="designer-publish-dialog__preview-name">{workspace?.title || "Пространство"}</div>
            <div className="designer-publish-dialog__preview-meta">{workspace?.slug || "—"}</div>
          </div>
        </div>

        <fieldset className="designer-publish-dialog__targets">
          <legend className="designer-publish-dialog__targets-legend">Куда опубликовать</legend>
          {MENU_PLACEMENT_TARGET_OPTIONS.map((option) => {
            const checked = option.id === MENU_PLACEMENT_SCOPE_DESIGNER ? publishToStudio : publishToOffice;
            const onChange = option.id === MENU_PLACEMENT_SCOPE_DESIGNER ? setPublishToStudio : setPublishToOffice;
            return (
              <label key={option.id} className="designer-publish-dialog__target">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(event) => onChange(event.target.checked)}
                  disabled={submitting}
                />
                <span>
                  <strong>{option.label}</strong>
                  <span className="designer-publish-dialog__target-hint">{option.description}</span>
                </span>
              </label>
            );
          })}
        </fieldset>

        {publishToStudio ? (
          <label className="designer-publish-dialog__field">
            <span>Раздел меню Студии</span>
            <select
              className="designer-input"
              value={designerParentId}
              onChange={(event) => setDesignerParentId(event.target.value)}
              disabled={loadingTree || submitting}
            >
              <option value="">Корень меню Студии</option>
              {designerParentOptions.map((option) => (
                <option key={option.id} value={String(option.id)}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {publishToOffice ? (
          <label className="designer-publish-dialog__field">
            <span>Раздел меню Офиса</span>
            <select
              className="designer-input"
              value={runtimeParentId}
              onChange={(event) => setRuntimeParentId(event.target.value)}
              disabled={loadingTree || submitting}
            >
              <option value="">Корень меню Офиса</option>
              {runtimeParentOptions.map((option) => (
                <option key={option.id} value={String(option.id)}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <label className="designer-publish-dialog__field">
          <span>Порядок сортировки</span>
          <input
            className="designer-input"
            type="number"
            value={sortOrder}
            onChange={(event) => setSortOrder(event.target.value)}
            disabled={submitting}
          />
        </label>

        {error ? <div className="designer-publish-dialog__error">{error}</div> : null}

        <div className="designer-publish-dialog__actions">
          <button type="button" className="designer-btn" onClick={onClose} disabled={submitting}>
            Отмена
          </button>
          <button
            type="button"
            className="designer-workspace-btn designer-workspace-btn--publish-primary"
            onClick={handleSubmit}
            disabled={submitting || loadingTree}
          >
            {submitting ? "Публикация..." : "Опубликовать"}
          </button>
        </div>
      </div>
    </div>
  );
}

