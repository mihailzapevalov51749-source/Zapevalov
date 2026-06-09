export default function YasiiPanelControlButton({
  active = false,
  disabled = false,
  title,
  ariaLabel,
  ariaPressed,
  onMouseDown,
  onClick,
  children,
}) {
  return (
    <button
      type="button"
      className={[
        "yasii-panel-header__action",
        active ? "yasii-panel-header__action--active" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label={ariaLabel}
      title={title}
      aria-pressed={ariaPressed}
      disabled={disabled}
      onMouseDown={onMouseDown}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
