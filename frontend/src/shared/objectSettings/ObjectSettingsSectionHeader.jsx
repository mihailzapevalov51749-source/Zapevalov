export default function ObjectSettingsSectionHeader({
  title,
  count = null,
  description = "",
  actions = null,
  className = "",
}) {
  const titleText =
    count === null || count === undefined || count === ""
      ? title
      : `${title} (${count})`;

  return (
    <header
      className={["object-settings-section-header", className]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="object-settings-section-header__copy">
        {titleText ? (
          <h4 className="object-settings-section-header__title">{titleText}</h4>
        ) : null}
        {description ? (
          <p className="object-settings-section-header__description">
            {description}
          </p>
        ) : null}
      </div>

      {actions ? (
        <div className="object-settings-section-header__actions">{actions}</div>
      ) : null}
    </header>
  );
}
