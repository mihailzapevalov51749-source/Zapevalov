import ObjectSettingsBadge from "./ObjectSettingsBadge";

function hasCountBadge(count) {
  return count !== null && count !== undefined && count !== "";
}

export default function ObjectSettingsPanel({
  title,
  count = null,
  countVariant = "stat",
  icon = null,
  actions = null,
  footer = null,
  children,
  className = "",
  tone = "default",
  titleId,
}) {
  const normalizedTitle = String(title || "").trim();
  const showCount = hasCountBadge(count);
  const useStatCount = countVariant === "stat";
  const hasFooter = footer !== null && footer !== false && footer !== undefined;

  return (
    <section
      className={[
        "object-settings-panel",
        tone === "muted" ? "object-settings-panel--muted" : "",
        hasFooter ? "object-settings-panel--with-footer" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-labelledby={titleId || undefined}
    >
      {normalizedTitle || icon || actions ? (
        <header className="object-settings-panel__header">
          {normalizedTitle ? (
            <h3 id={titleId} className="object-settings-panel__title">
              <span>{normalizedTitle}</span>
              {showCount ? (
                <>
                  {useStatCount ? (
                    <span className="object-settings-panel__title-separator" aria-hidden="true">
                      ·
                    </span>
                  ) : null}
                  <ObjectSettingsBadge variant={countVariant}>{count}</ObjectSettingsBadge>
                </>
              ) : null}
            </h3>
          ) : (
            <div />
          )}

          <div className="object-settings-panel__meta">
            {actions ? (
              <div className="object-settings-panel__actions">{actions}</div>
            ) : null}
            {icon ? (
              <div className="object-settings-panel__icon" aria-hidden="true">
                {icon}
              </div>
            ) : null}
          </div>
        </header>
      ) : null}

      <div className="object-settings-panel__body">{children}</div>

      {hasFooter ? (
        <footer className="object-settings-panel__footer">{footer}</footer>
      ) : null}
    </section>
  );
}
