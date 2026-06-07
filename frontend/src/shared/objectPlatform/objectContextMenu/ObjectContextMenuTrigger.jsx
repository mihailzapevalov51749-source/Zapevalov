import { useMemo, useRef, useState } from "react";

import ObjectContextMenu from "./ObjectContextMenu";
import {
  buildObjectContextMenuActions,
  runObjectContextMenuAction,
} from "./objectContextMenuActions";

/**
 * Clickable object identity trigger: «Название объекта ▾».
 */
export default function ObjectContextMenuTrigger({
  objectName = "Объект",
  label = null,
  variant = "header",
  tenantId = null,
  objectTypeKey = null,
  objectTypeId = null,
  actions = null,
  className = "",
}) {
  const triggerRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const displayLabel = String(label ?? objectName).trim() || "Объект";

  const menuContext = useMemo(
    () => ({
      tenantId,
      objectTypeKey: String(objectTypeKey || "").trim() || null,
      objectTypeId: String(objectTypeId || "").trim() || null,
      objectName: String(objectName || "").trim() || "Объект",
    }),
    [objectName, objectTypeId, objectTypeKey, tenantId],
  );

  const resolvedActions = useMemo(() => {
    if (Array.isArray(actions)) {
      return actions;
    }

    return buildObjectContextMenuActions(menuContext);
  }, [actions, menuContext]);

  const hasMenu = resolvedActions.some((action) => action && !action.disabled);
  const variantClass =
    variant === "tab" ? " object-context-menu-trigger--tab" : "";

  const handleToggle = () => {
    if (!hasMenu) {
      return;
    }

    setIsOpen((current) => !current);
  };

  const handleSelectAction = async (actionId) => {
    await runObjectContextMenuAction(actionId, resolvedActions, menuContext);
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={`object-context-menu-trigger${variantClass}${className ? ` ${className}` : ""}`}
        onClick={handleToggle}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={
          variant === "tab"
            ? `Меню вкладки: ${displayLabel}`
            : `Меню объекта: ${menuContext.objectName}`
        }
        disabled={!hasMenu}
      >
        <span className="object-context-menu-trigger__label">{displayLabel}</span>
        <span className="object-context-menu-trigger__chevron" aria-hidden="true">
          ▾
        </span>
      </button>

      <ObjectContextMenu
        open={isOpen}
        anchorRef={triggerRef}
        onClose={() => setIsOpen(false)}
        actions={resolvedActions}
        onSelectAction={handleSelectAction}
      />
    </>
  );
}
