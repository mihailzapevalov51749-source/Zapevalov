import { useEffect, useMemo, useState } from "react";

import { getApiErrorMessage } from "../../api/platformApiClient";
import * as designerApi from "../../api/designerApi";
import { navigationService } from "../../../navigation/services/navigationService";
import ObjectTypeIcon from "../../../../shared/icons/ObjectTypeIcon";
import {
  flattenNavigationParentOptions,
} from "../../utils/mergeDesignerSidebarNavigation";
import {
  MENU_PLACEMENT_SCOPE_DESIGNER,
  MENU_PLACEMENT_SCOPE_RUNTIME,
  MENU_PLACEMENT_TARGET_OPTIONS,
} from "../../utils/menuPlacementScopes";
import {
  dispatchDesignerNavigationReload,
  dispatchPortalNavigationReload,
} from "../../utils/navigationReload";
import { buildPortalObjectRoute } from "../../../../portal/utils/portalObjectRoutes";

import "../../styles/objectTypePublishDialog.css";

function buildPlacementPayload(menuScope, parentId, sortOrder) {
  return {
    menu_scope: menuScope,
    parent_id: parentId ? Number(parentId) : null,
    sort_order: Number(sortOrder) || 0,
    is_visible: true,
  };
}

export default function ObjectTypePublishToMenuDialog({
  open,
  tenantId,
  portalId = tenantId,
  objectType,
  onClose,
  onSuccess,
  onBeforePublish,
  onPublishingChange,
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
    if (!open) {
      return undefined;
    }

    let cancelled = false;

    const loadTrees = async () => {
      setLoadingTree(true);
      setError("");

      try {
        const requests = [];

        if (publishToStudio) {
          requests.push(
            navigationService.getTree(tenantId, {
              scope: "designer",
              mode: "designer",
            }),
          );
        } else {
          requests.push(Promise.resolve([]));
        }

        if (publishToOffice) {
          requests.push(
            navigationService.getTree(tenantId, {
              scope: "runtime",
              mode: "runtime",
            }),
          );
        } else {
          requests.push(Promise.resolve([]));
        }

        const [designerTree, runtimeTree] = await Promise.all(requests);

        if (!cancelled) {
          setDesignerNavigationTree(
            Array.isArray(designerTree) ? designerTree : [],
          );
          setRuntimeNavigationTree(
            Array.isArray(runtimeTree) ? runtimeTree : [],
          );
        }
      } catch (err) {
        if (!cancelled) {
          setError(getApiErrorMessage(err, "Не удалось загрузить меню"));
        }
      } finally {
        if (!cancelled) {
          setLoadingTree(false);
        }
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

  const officeRoutePreview = useMemo(() => {
    if (!publishToOffice || !objectType) {
      return "";
    }

    return (
      buildPortalObjectRoute(portalId, {
        objectTypeId: objectType.id,
        objectTypeKey: objectType.key,
      }) || ""
    );
  }, [publishToOffice, portalId, objectType]);

  if (!open) {
    return null;
  }

  const handleSubmit = async () => {
    if (!objectType?.id) {
      return;
    }

    if (!publishToStudio && !publishToOffice) {
      setError("Выберите хотя бы одно меню: Студия или Офис");
      return;
    }

    setSubmitting(true);
    onPublishingChange?.(true);
    setError("");

    try {
      if (typeof onBeforePublish === "function") {
        await onBeforePublish();
      }

      const publishResult = await designerApi.publishCatalog(tenantId);

      const placements = [];

      if (publishToStudio) {
        placements.push(
          buildPlacementPayload(
            MENU_PLACEMENT_SCOPE_DESIGNER,
            designerParentId,
            sortOrder,
          ),
        );
      }

      if (publishToOffice) {
        placements.push(
          buildPlacementPayload(
            MENU_PLACEMENT_SCOPE_RUNTIME,
            runtimeParentId,
            sortOrder,
          ),
        );
      }

      await designerApi.publishMenuPlacements(tenantId, objectType.id, {
        placements,
      });

      if (publishToStudio) {
        dispatchDesignerNavigationReload();
      }

      if (publishToOffice) {
        dispatchPortalNavigationReload();
      }

      onSuccess?.({
        catalogVersion: publishResult?.catalog_version ?? null,
        schemaVersion: publishResult?.schema_version ?? null,
        placements,
      });
      onClose?.();
    } catch (err) {
      setError(
        getApiErrorMessage(
          err,
          "Не удалось опубликовать каталог или разместить объект в меню",
        ),
      );
    } finally {
      setSubmitting(false);
      onPublishingChange?.(false);
    }
  };

  return (
    <div
      className="designer-publish-dialog-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="designer-publish-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="designer-publish-dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="designer-publish-dialog-title" className="designer-publish-dialog__title">
          Разместить в меню
        </h2>
        <p className="designer-publish-dialog__subtitle">
          Сначала публикуется каталог. Затем объект размещается в выбранных меню.
          Название, иконка и цвет пункта берутся из объекта.
        </p>

        <div className="designer-publish-dialog__preview">
          <ObjectTypeIcon
            iconType={objectType?.icon_type}
            iconFileUrl={objectType?.icon_file_url}
            color={objectType?.color}
            size={40}
            className="object-type-icon--header"
          />
          <div>
            <div className="designer-publish-dialog__preview-name">
              {objectType?.name}
            </div>
            <div className="designer-publish-dialog__preview-meta">
              {objectType?.key || "—"}
            </div>
          </div>
        </div>

        <fieldset className="designer-publish-dialog__targets">
          <legend className="designer-publish-dialog__targets-legend">
            Куда опубликовать
          </legend>
          {MENU_PLACEMENT_TARGET_OPTIONS.map((option) => {
            const checked =
              option.id === MENU_PLACEMENT_SCOPE_DESIGNER
                ? publishToStudio
                : publishToOffice;
            const onChange =
              option.id === MENU_PLACEMENT_SCOPE_DESIGNER
                ? setPublishToStudio
                : setPublishToOffice;

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
                  <span className="designer-publish-dialog__target-hint">
                    {option.description}
                  </span>
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
          <>
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
            {officeRoutePreview ? (
              <p className="designer-publish-dialog__route-preview">
                URL в Офисе: <code>{officeRoutePreview}</code>
              </p>
            ) : null}
          </>
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
          <button
            type="button"
            className="designer-btn"
            onClick={onClose}
            disabled={submitting}
          >
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
