import "./objectSettingsStyles.css";

import ObjectSettingsBadge from "./ObjectSettingsBadge";
import ObjectSettingsButton from "./ObjectSettingsButton";

function renderActions(actions) {
  if (!actions) {
    return null;
  }

  return Array.isArray(actions) ? actions : [actions];
}

function hasCountBadge(count) {
  return count !== null && count !== undefined && count !== "";
}

/**
 * Tab toolbar for object settings tabs (Поля, Связи, Действия, …).
 *
 * Standard layout: title + count badge on the left, primaryAction on the right.
 * Panel headers inside split layouts should not duplicate count or create actions.
 */
export default function ObjectSettingsHeader({
  title,
  count = null,
  description = "",
  primaryAction = null,
  secondaryActions = null,
  centered = false,
}) {
  const showCount = hasCountBadge(count);

  return (
    <header
      className={[
        "object-settings-header",
        centered && !description ? "object-settings-header--centered" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="object-settings-header__copy">
        <h3 className="object-settings-header__title">
          {title}
          {showCount ? (
            <ObjectSettingsBadge variant="count">{count}</ObjectSettingsBadge>
          ) : null}
        </h3>
        {description ? (
          <p className="object-settings-header__description">{description}</p>
        ) : null}
      </div>

      {primaryAction || secondaryActions ? (
        <div className="object-settings-header__actions">
          {renderActions(secondaryActions)?.map((action, index) => (
            <span key={action?.key || `secondary-action-${index}`}>{action}</span>
          ))}
          {primaryAction}
        </div>
      ) : null}
    </header>
  );
}

ObjectSettingsHeader.PrimaryButton = function ObjectSettingsHeaderPrimaryButton({
  children,
  ...buttonProps
}) {
  return (
    <ObjectSettingsButton variant="primary" {...buttonProps}>
      {children}
    </ObjectSettingsButton>
  );
};
