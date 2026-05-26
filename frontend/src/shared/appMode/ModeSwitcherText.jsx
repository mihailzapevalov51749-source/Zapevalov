export default function ModeSwitcherText({
  mode = "runtime",
  onToggle,
  variant = "runtime",
}) {
  const label = mode === "designer" ? "Designer" : "Runtime";

  return (
    <button
      type="button"
      className={`mode-switcher-text mode-switcher-text--${variant}`}
      onClick={onToggle}
      aria-label={`Текущий режим: ${label}. Переключить режим.`}
      title="Переключить режим"
    >
      <span className="mode-switcher-text__label">{label}</span>
      <span className="mode-switcher-text__arrow" aria-hidden="true">
        ▷
      </span>
    </button>
  );
}
