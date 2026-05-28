const MODE_LABELS = {
  runtime: "Офис",
  designer: "Студия",
};

export default function ModeSwitcherText({
  mode = "runtime",
  onToggle,
  variant = "runtime",
}) {
  const label = MODE_LABELS[mode] || MODE_LABELS.runtime;

  return (
    <button
      type="button"
      className={`mode-switcher-text mode-switcher-text--${variant}`}
      data-mode={mode}
      onClick={onToggle}
      aria-label={`Текущий режим: ${label}. Переключить режим.`}
      title="Переключить режим"
    >
      <span className="mode-switcher-text__label">{label}</span>
    </button>
  );
}
