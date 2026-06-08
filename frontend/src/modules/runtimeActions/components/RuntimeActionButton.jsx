import { resolveRuntimeActionIcon } from "../utils/resolveRuntimeActionIcon.js";
import { resolveRuntimeActionLabel } from "../utils/resolveRuntimeActionLabel.js";
import { notifyRuntimeActionNotImplemented } from "../utils/notifyRuntimeActionNotImplemented.js";

export default function RuntimeActionButton({ action, className = "", onClick = null }) {
  if (!action) {
    return null;
  }

  const label = resolveRuntimeActionLabel(action);
  const Icon = resolveRuntimeActionIcon(action);

  const handleClick = () => {
    if (typeof onClick === "function") {
      onClick(action);
      return;
    }

    notifyRuntimeActionNotImplemented();
  };

  return (
    <button
      type="button"
      className={`object-runtime-top-panel-actions__button${className ? ` ${className}` : ""}`}
      onClick={handleClick}
      title={label}
      aria-label={label}
    >
      {Icon ? <Icon size={14} strokeWidth={2} aria-hidden="true" /> : null}
      <span>{label}</span>
    </button>
  );
}
