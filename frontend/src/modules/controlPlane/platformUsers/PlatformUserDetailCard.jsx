import { useEffect, useMemo, useState } from "react";

import { listTenantRegistry } from "../api/tenantRegistryApi";
import { Link } from "react-router-dom";

import { buildControlPlaneUsersRolesPath } from "../config/controlPlanePaths.js";
import {
  PLATFORM_CONTOURS,
  PLATFORM_CP_SECTIONS,
} from "../platformRoles/platformRoleModel.js";
import { getPlatformRoleByKey } from "../platformRoles/platformRoleStorage.js";
import {
  COMPANY_ACCESS_MODES,
  loadPlatformRoleCatalog,
} from "./platformUserConstants.js";
import { formatPlatformDateTime } from "./platformUserUtils.js";
import PlatformRoleBadge from "./PlatformRoleBadge.jsx";
import PlatformUserAvatar from "./PlatformUserAvatar.jsx";

function Field({ label, children }) {
  return (
    <label className="platform-user-detail__field">
      <span className="platform-user-detail__label">{label}</span>
      {children}
    </label>
  );
}

export default function PlatformUserDetailCard({
  form,
  saving = false,
  deleting = false,
  onChange,
  onSave,
  onResetPassword,
  onBlock,
  onDeleteAccess,
  onTransferOwnership,
}) {
  const [companies, setCompanies] = useState([]);

  useEffect(() => {
    let cancelled = false;

    async function loadCompanies() {
      try {
        const data = await listTenantRegistry();
        if (!cancelled) {
          setCompanies(Array.isArray(data) ? data : []);
        }
      } catch {
        if (!cancelled) {
          setCompanies([]);
        }
      }
    }

    loadCompanies();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedCompanies = useMemo(() => {
    if (form.companyAccessMode !== COMPANY_ACCESS_MODES.SELECTED) {
      return [];
    }

    if (form.companyAccessIds?.length > 0) {
      return companies.filter((company) =>
        form.companyAccessIds.includes(Number(company.id)),
      );
    }

    return companies.slice(0, 3);
  }, [companies, form.companyAccessIds, form.companyAccessMode]);

  const isDraft = form?.isNew || !form?.id;
  const canActOnUser = Boolean(form?.id) && !form?.isNew;
  const roleCatalog = loadPlatformRoleCatalog();
  const roleDefinition = getPlatformRoleByKey(form.platformRoleKey);
  const displayName = String(form.full_name || "").trim() || "Без имени";
  const displayPosition = String(form.position || "").trim() || "Не указана";

  if (!form) {
    return (
      <section className="platform-user-detail platform-user-detail--empty">
        <p>Выберите пользователя в списке</p>
      </section>
    );
  }

  return (
    <section className="platform-user-detail" aria-label="Карточка пользователя">
      <header className="platform-user-detail__card-header">
        <div className="platform-user-detail__user-identity">
          <PlatformUserAvatar user={form} size={52} />
          <div className="platform-user-detail__user-text">
            <h2 className="platform-user-detail__full-name">{displayName}</h2>
            <p className="platform-user-detail__position">{displayPosition}</p>
          </div>
        </div>
        {form.platformRoleKey ? (
          <PlatformRoleBadge
            roleKey={form.platformRoleKey}
            className="platform-user-detail__role-badge"
          />
        ) : null}
      </header>

      {form.isSystemPlatformOwner ? (
        <div className="platform-user-detail__system-owner-badge">
          Системный владелец платформы
        </div>
      ) : null}

      <div className="platform-user-detail__section">
        <h3 className="platform-user-detail__section-title">Основные данные</h3>
        <div className="platform-user-detail__grid">
          <Field label="ФИО">
            <input
              className="platform-user-detail__input"
              value={form.full_name || ""}
              onChange={(event) => onChange?.("full_name", event.target.value)}
            />
          </Field>
          <Field label="E-mail">
            <input
              className="platform-user-detail__input"
              value={form.email || ""}
              disabled={!isDraft}
              onChange={(event) => onChange?.("email", event.target.value)}
            />
          </Field>
          <Field label="Телефон">
            <input
              className="platform-user-detail__input"
              value={form.phone || ""}
              onChange={(event) => onChange?.("phone", event.target.value)}
            />
          </Field>
          <Field label="Роль платформы">
            <select
              className="platform-user-detail__input"
              value={form.platformRoleKey || "support"}
              disabled={form.isSystemPlatformOwner}
              onChange={(event) => onChange?.("platformRoleKey", event.target.value)}
            >
              {roleCatalog
                .filter(
                  (role) =>
                    role.key !== "platform_owner" || form.isSystemPlatformOwner,
                )
                .map((role) => (
                  <option key={role.key} value={role.key}>
                    {role.label}
                  </option>
                ))}
            </select>
          </Field>
          <Field label="Статус">
            <select
              className="platform-user-detail__input"
              value={form.is_active ? "active" : "inactive"}
              onChange={(event) => onChange?.("is_active", event.target.value === "active")}
            >
              <option value="active">Активен</option>
              <option value="inactive">Неактивен</option>
            </select>
          </Field>
          <Field label="Последний вход">
            <input
              className="platform-user-detail__input platform-user-detail__input--readonly"
              value={formatPlatformDateTime(form.last_login_at)}
              readOnly
            />
          </Field>
          <Field label="Дата создания">
            <input
              className="platform-user-detail__input platform-user-detail__input--readonly"
              value={formatPlatformDateTime(form.created_at)}
              readOnly
            />
          </Field>
          {isDraft || form.showPasswordFields ? (
            <>
              <Field label={isDraft ? "Пароль" : "Новый пароль"}>
                <input
                  type="password"
                  className="platform-user-detail__input"
                  value={form.password || ""}
                  placeholder={isDraft ? "Можно оставить пустым" : "Заполните для смены"}
                  onChange={(event) => onChange?.("password", event.target.value)}
                />
              </Field>
              <Field label="Повтор пароля">
                <input
                  type="password"
                  className="platform-user-detail__input"
                  value={form.password_repeat || ""}
                  onChange={(event) => onChange?.("password_repeat", event.target.value)}
                />
              </Field>
            </>
          ) : null}
        </div>
      </div>

      <div className="platform-user-detail__section">
        <h3 className="platform-user-detail__section-title">Права роли</h3>
        <p className="platform-user-detail__role-hint">
          Права назначаются только через роль платформы. Настроить права можно в разделе{" "}
          <Link to={buildControlPlaneUsersRolesPath("roles")}>Роли</Link>.
        </p>
        <div className="platform-user-detail__permissions platform-user-detail__permissions--readonly">
          <div className="platform-user-detail__permission-group">
            <span className="platform-user-detail__permission-group-title">Контуры</span>
            {PLATFORM_CONTOURS.map((item) => (
              <label key={item.key} className="platform-user-detail__permission">
                <input
                  type="checkbox"
                  checked={Boolean(roleDefinition?.contours?.[item.key])}
                  disabled
                  readOnly
                />
                <span>{item.label}</span>
              </label>
            ))}
          </div>
          <div className="platform-user-detail__permission-group">
            <span className="platform-user-detail__permission-group-title">Разделы Control Plane</span>
            {PLATFORM_CP_SECTIONS.map((item) => (
              <label key={item.key} className="platform-user-detail__permission">
                <input
                  type="checkbox"
                  checked={Boolean(roleDefinition?.cpSections?.[item.key])}
                  disabled
                  readOnly
                />
                <span>{item.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="platform-user-detail__section">
        <h3 className="platform-user-detail__section-title">Доступ к компаниям</h3>
        <div className="platform-user-detail__company-access">
          <div className="platform-user-detail__company-modes">
            <label className="platform-user-detail__radio">
              <input
                type="radio"
                name="company-access-mode"
                checked={form.companyAccessMode === COMPANY_ACCESS_MODES.ALL}
                onChange={() => onChange?.("companyAccessMode", COMPANY_ACCESS_MODES.ALL)}
              />
              <span>Все компании</span>
            </label>
            <label className="platform-user-detail__radio">
              <input
                type="radio"
                name="company-access-mode"
                checked={form.companyAccessMode === COMPANY_ACCESS_MODES.SELECTED}
                onChange={() => onChange?.("companyAccessMode", COMPANY_ACCESS_MODES.SELECTED)}
              />
              <span>Только выбранные компании</span>
            </label>
            <label className="platform-user-detail__radio">
              <input
                type="radio"
                name="company-access-mode"
                checked={form.companyAccessMode === COMPANY_ACCESS_MODES.NONE}
                onChange={() => onChange?.("companyAccessMode", COMPANY_ACCESS_MODES.NONE)}
              />
              <span>Нет доступа к компаниям</span>
            </label>
          </div>

          {form.companyAccessMode === COMPANY_ACCESS_MODES.SELECTED ? (
            <div className="platform-user-detail__company-tags" aria-label="Выбранные компании">
              {selectedCompanies.length > 0 ? (
                selectedCompanies.map((company) => (
                  <span key={company.id} className="platform-user-detail__company-tag">
                    {company.name}
                  </span>
                ))
              ) : (
                <span className="platform-user-detail__company-empty">Компании не выбраны</span>
              )}
            </div>
          ) : null}
        </div>
      </div>

      <div className="platform-user-detail__actions">
        <button
          type="button"
          className="platform-users-btn platform-users-btn--primary"
          disabled={saving || deleting}
          onClick={onSave}
        >
          {saving ? "Сохранение..." : isDraft ? "Создать" : "Сохранить"}
        </button>
        <button
          type="button"
          className="platform-users-btn platform-users-btn--outline"
          disabled={!canActOnUser || saving || deleting}
          onClick={onResetPassword}
        >
          Сбросить пароль
        </button>
        <button
          type="button"
          className="platform-users-btn platform-users-btn--outline platform-users-btn--warning"
          disabled={!canActOnUser || saving || deleting || !form.is_active}
          onClick={onBlock}
        >
          Заблокировать
        </button>
        <button
          type="button"
          className="platform-users-btn platform-users-btn--outline platform-users-btn--danger"
          disabled={!canActOnUser || saving || deleting}
          onClick={onDeleteAccess}
        >
          Удалить доступ
        </button>
      </div>

      <div className="platform-user-detail__ownership">
        <button
          type="button"
          className="platform-users-btn platform-users-btn--ownership"
          disabled={!canActOnUser || saving || deleting}
          onClick={onTransferOwnership}
        >
          Передать владение
        </button>
      </div>
    </section>
  );
}
