import { resolveEmbeddedRoleLabel } from "../yasiiEmbeddedRoles.js";

export default function YasiiEmbeddedContextHeader({
  surfaceName,
  contextLabel,
  roleIds,
  defaultRole,
  scope,
}) {
  const roleLabel = resolveEmbeddedRoleLabel(roleIds?.length ? roleIds : [defaultRole]);

  return (
    <div className="yasii-embedded-banner" role="status">
      <div className="yasii-embedded-banner__row">
        <span className="yasii-embedded-banner__label">Источник:</span>
        <span>{surfaceName}</span>
      </div>
      <div className="yasii-embedded-banner__row">
        <span className="yasii-embedded-banner__label">Контекст:</span>
        <span>{contextLabel}</span>
      </div>
      <div className="yasii-embedded-banner__row">
        <span className="yasii-embedded-banner__label">Роль:</span>
        <span>{roleLabel}</span>
      </div>
      <div className="yasii-embedded-banner__row">
        <span className="yasii-embedded-banner__label">Scope:</span>
        <span>{scope}</span>
      </div>
    </div>
  );
}
