export default function ObjectSettingsEmptyState({
  icon = null,
  title,
  description = "",
  action = null,
  compact = false,
  inPanel = false,
  featured = false,
  className = "",
}) {
  return (
    <div
      className={[
        "object-settings-empty-state",
        compact ? "object-settings-empty-state--compact" : "",
        inPanel ? "object-settings-empty-state--in-panel" : "",
        featured ? "object-settings-empty-state--featured" : "",
        icon ? "object-settings-empty-state--with-icon" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {icon ? (
        <div className="object-settings-empty-state__icon" aria-hidden="true">
          {icon}
        </div>
      ) : null}

      {title ? (
        <p className="object-settings-empty-state__title">{title}</p>
      ) : null}

      {description ? (
        <p className="object-settings-empty-state__description">{description}</p>
      ) : null}

      {action ? (
        <div className="object-settings-empty-state__action">{action}</div>
      ) : null}
    </div>
  );
}
