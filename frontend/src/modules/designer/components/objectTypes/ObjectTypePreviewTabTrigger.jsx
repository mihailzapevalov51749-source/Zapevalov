import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { NavLink, useMatch, useNavigate, useParams } from "react-router-dom";

import { useDesignerShell } from "../../context/DesignerShellContext";
import { useObjectTypePreviewTab } from "../../context/ObjectTypePreviewTabContext";

import "../../../../shared/viewEngine/viewEngineTable.css";

/**
 * Tab-bar trigger «Предпросмотр ▾» — dropdown of object view tabs.
 */
export default function ObjectTypePreviewTabTrigger({ tab }) {
  const { tenantId } = useDesignerShell();
  const { objectTypeId } = useParams();
  const navigate = useNavigate();
  const triggerRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);

  const previewState = useObjectTypePreviewTab();
  const views = previewState?.views || [];
  const loading = previewState?.loading;
  const selectedViewKey = previewState?.selectedViewKey;
  const selectView = previewState?.selectView;

  const previewPath = `/designer/tenant/${tenantId}/object-types/${objectTypeId}/${tab.id}`;
  const isPreviewActive = Boolean(
    useMatch(
      "/designer/tenant/:tenantId/object-types/:objectTypeId/runtime-preview",
    ),
  );
  const hasMenu = views.length > 0 && !loading;

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleMouseDown = (event) => {
      const inMenu = event.target?.closest?.("[data-object-preview-tab-menu]");
      const inAnchor = triggerRef.current?.contains(event.target);

      if (!inMenu && !inAnchor) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleMouseDown, true);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleMouseDown, true);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const openPreviewRoute = (viewKey = selectedViewKey) => {
    const params = new URLSearchParams();
    if (viewKey) {
      params.set("viewKey", viewKey);
    }

    const query = params.toString();
    navigate(query ? `${previewPath}?${query}` : previewPath);
  };

  const handleSelectView = (viewKey) => {
    selectView?.(viewKey);
    openPreviewRoute(viewKey);
    setIsOpen(false);
  };

  const rect = triggerRef.current?.getBoundingClientRect?.();
  const top = rect ? rect.bottom + 6 : 48;
  const left = rect ? Math.max(8, rect.left) : 8;

  return (
    <>
      <NavLink
        ref={triggerRef}
        to={previewPath}
        className={({ isActive }) =>
          `object-type-tabs__link object-type-tabs__preview-trigger${
            isActive ? " is-active" : ""
          }`
        }
        onClick={(event) => {
          if (isPreviewActive && hasMenu) {
            event.preventDefault();
            setIsOpen((current) => !current);
            return;
          }

          if (!isPreviewActive) {
            event.preventDefault();
            openPreviewRoute();
          }
        }}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label="Предпросмотр вкладок объекта"
      >
        <span>{tab.label}</span>
        <span className="object-type-tabs__preview-chevron" aria-hidden="true">
          ▾
        </span>
      </NavLink>

      {isOpen && hasMenu && typeof document !== "undefined"
        ? createPortal(
            <div
              data-object-preview-tab-menu="true"
              className="view-engine-toolbar__portal-menu object-type-tabs__preview-menu"
              role="menu"
              aria-label="Вкладки объекта"
              style={{
                position: "fixed",
                top,
                left,
                zIndex: 10050,
                minWidth: 220,
              }}
            >
              <div className="view-engine-toolbar__portal-menu-section">
                {views.map((view) => {
                  const viewKey = String(view?.key || "").trim();
                  const isSelected = viewKey && viewKey === selectedViewKey;

                  return (
                    <button
                      key={view.id || viewKey}
                      type="button"
                      role="menuitem"
                      className={`view-engine-toolbar__portal-menu-item${
                        isSelected ? " view-engine-toolbar__portal-menu-item--active" : ""
                      }`}
                      onClick={() => handleSelectView(viewKey)}
                    >
                      {view.name || viewKey || "Вкладка"}
                    </button>
                  );
                })}
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
