import { resolveRuntimeActionIcon } from "../utils/resolveRuntimeActionIcon.js";
import { resolveRuntimeActionLabel } from "../utils/resolveRuntimeActionLabel.js";
import { handleRuntimeRowActionClick } from "../utils/handleRuntimeRowActionClick.js";

export default function RuntimeRowActions({
  actions = [],
  tenantId = null,
  objectTypeKey = null,
  entityId = null,
  menuItemStyle = null,
  onActionClick = handleRuntimeRowActionClick,
  onCloseMenu = null,
}) {
  if (!Array.isArray(actions) || actions.length === 0) {
    return null;
  }

  return actions.map((action) => {
    const label = resolveRuntimeActionLabel(action);
    const Icon = resolveRuntimeActionIcon(action);
    const actionKey = String(action?.id || action?.key || label);

    return (
      <button
        key={actionKey}
        type="button"
        style={menuItemStyle || undefined}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onCloseMenu?.();
          onActionClick?.({
            action,
            tenantId,
            objectTypeKey,
            entityId,
          });
        }}
      >
        {Icon ? (
          <Icon
            size={14}
            strokeWidth={2}
            aria-hidden="true"
            style={{ marginRight: 6, verticalAlign: "middle" }}
          />
        ) : null}
        {label}
      </button>
    );
  });
}
