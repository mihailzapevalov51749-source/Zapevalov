import { Minus } from "lucide-react";

import "./pageToolbarActions.css";

export default function AppShellPageMinimizeButton({
  onClick,
  disabled = false,
  title = "Свернуть страницу",
  ariaLabel = "Свернуть страницу",
}) {
  return (
    <div className="app-shell-page-minimize-control">
      <button
        type="button"
        className="app-shell-page-minimize-control__button"
        disabled={disabled}
        onClick={onClick}
        title={title}
        aria-label={ariaLabel}
      >
        <Minus size={14} strokeWidth={2} aria-hidden />
      </button>
    </div>
  );
}
