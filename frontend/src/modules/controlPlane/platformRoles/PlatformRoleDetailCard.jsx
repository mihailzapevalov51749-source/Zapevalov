import PlatformRoleBadge from "../platformUsers/PlatformRoleBadge.jsx";
import {
  PLATFORM_ADMIN_CAPABILITIES,
  PLATFORM_CONTOURS,
  PLATFORM_CP_SECTIONS,
  PLATFORM_ROLE_STATUS_ACTIVE,
  PLATFORM_ROLE_STATUS_INACTIVE,
  PLATFORM_SECTION_PERMISSION_GROUPS,
  resolvePlatformRoleStatusLabel,
  resolvePlatformRoleTypeLabel,
} from "./platformRoleModel.js";

function Field({ label, children }) {
  return (
    <label className="platform-role-detail__field">
      <span className="platform-role-detail__label">{label}</span>
      {children}
    </label>
  );
}

function ReadonlyValue({ children }) {
  return <div className="platform-role-detail__readonly">{children}</div>;
}

export default function PlatformRoleDetailCard({
  form,
  saving = false,
  onChange,
  onToggleContour,
  onToggleCpSection,
  onToggleSectionPermission,
  onToggleAdminCapability,
  onSave,
}) {
  if (!form) {
    return (
      <section className="platform-role-detail platform-role-detail--empty">
        <p>Выберите роль в списке</p>
      </section>
    );
  }

  const isSystem = Boolean(form.isSystem);

  return (
    <section className="platform-role-detail" aria-label="Карточка роли">
      <header className="platform-role-detail__header">
        <h2 className="platform-role-detail__title">Карточка роли</h2>
        <PlatformRoleBadge roleKey={form.key} />
      </header>

      <div className="platform-role-detail__section">
        <h3 className="platform-role-detail__section-title">Основная информация</h3>
        <div className="platform-role-detail__grid">
          <Field label="Название роли">
            <input
              className="platform-role-detail__input"
              value={form.label || ""}
              disabled={isSystem}
              onChange={(event) => onChange?.("label", event.target.value)}
            />
          </Field>
          <Field label="Код роли">
            {isSystem ? (
              <ReadonlyValue>{form.key}</ReadonlyValue>
            ) : (
              <input
                className="platform-role-detail__input"
                value={form.key || ""}
                onChange={(event) => onChange?.("key", event.target.value)}
              />
            )}
          </Field>
          <Field label="Описание">
            <textarea
              className="platform-role-detail__textarea"
              value={form.description || ""}
              rows={3}
              onChange={(event) => onChange?.("description", event.target.value)}
            />
          </Field>
          <Field label="Статус">
            <select
              className="platform-role-detail__input"
              value={form.status || PLATFORM_ROLE_STATUS_ACTIVE}
              onChange={(event) => onChange?.("status", event.target.value)}
            >
              <option value={PLATFORM_ROLE_STATUS_ACTIVE}>Активна</option>
              <option value={PLATFORM_ROLE_STATUS_INACTIVE}>Неактивна</option>
            </select>
          </Field>
          <Field label="Системная роль">
            <ReadonlyValue>{isSystem ? "Да" : "Нет"}</ReadonlyValue>
          </Field>
          <Field label="Тип роли">
            <ReadonlyValue>{resolvePlatformRoleTypeLabel(form)}</ReadonlyValue>
          </Field>
          <Field label="Текущий статус">
            <ReadonlyValue>{resolvePlatformRoleStatusLabel(form.status)}</ReadonlyValue>
          </Field>
        </div>
      </div>

      <div className="platform-role-detail__section">
        <h3 className="platform-role-detail__section-title">Доступ к контурам</h3>
        <div className="platform-role-detail__checks">
          {PLATFORM_CONTOURS.map((item) => (
            <label key={item.key} className="platform-role-detail__check">
              <input
                type="checkbox"
                checked={Boolean(form.contours?.[item.key])}
                onChange={() => onToggleContour?.(item.key)}
              />
              <span>{item.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="platform-role-detail__section">
        <h3 className="platform-role-detail__section-title">Разделы Control Plane</h3>
        <div className="platform-role-detail__checks">
          {PLATFORM_CP_SECTIONS.map((item) => (
            <label key={item.key} className="platform-role-detail__check">
              <input
                type="checkbox"
                checked={Boolean(form.cpSections?.[item.key])}
                onChange={() => onToggleCpSection?.(item.key)}
              />
              <span>{item.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="platform-role-detail__section">
        <h3 className="platform-role-detail__section-title">Права по разделам</h3>
        <div className="platform-role-detail__permission-groups">
          {Object.entries(PLATFORM_SECTION_PERMISSION_GROUPS).map(([sectionKey, permissions]) => {
            const section = PLATFORM_CP_SECTIONS.find((item) => item.key === sectionKey);
            return (
              <article key={sectionKey} className="platform-role-detail__permission-group">
                <h4 className="platform-role-detail__permission-group-title">
                  {section?.label || sectionKey}
                </h4>
                <div className="platform-role-detail__checks platform-role-detail__checks--grid">
                  {permissions.map((permission) => (
                    <label key={permission.key} className="platform-role-detail__check">
                      <input
                        type="checkbox"
                        checked={Boolean(form.sectionPermissions?.[sectionKey]?.[permission.key])}
                        onChange={() => onToggleSectionPermission?.(sectionKey, permission.key)}
                      />
                      <span>{permission.label}</span>
                    </label>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <div className="platform-role-detail__section">
        <h3 className="platform-role-detail__section-title">Административные полномочия</h3>
        <div className="platform-role-detail__checks platform-role-detail__checks--grid">
          {PLATFORM_ADMIN_CAPABILITIES.map((item) => (
            <label key={item.key} className="platform-role-detail__check">
              <input
                type="checkbox"
                checked={Boolean(form.adminCapabilities?.[item.key])}
                onChange={() => onToggleAdminCapability?.(item.key)}
              />
              <span>{item.label}</span>
            </label>
          ))}
        </div>
      </div>

      <footer className="platform-role-detail__actions">
        <button
          type="button"
          className="platform-roles-btn platform-roles-btn--primary"
          onClick={onSave}
          disabled={saving}
        >
          {saving ? "Сохранение…" : "Сохранить роль"}
        </button>
      </footer>
    </section>
  );
}
