import { useCallback, useEffect, useMemo, useState } from "react";

import PlatformModal from "../../../shared/platformModal/PlatformModal";
import "../../../shared/platformModal/platformModalFooter.css";
import "../../../shared/quickCreate/platformQuickCreateModal.css";
import {
  changeCompanyAdministrator,
  getCompanyUsers,
  inviteCompanyAdministrator,
} from "../api/companyAdministratorApi";
import {
  CONTROL_PLANE_CHANGE_ADMIN_MODAL_DEFAULT_BOUNDS,
  CONTROL_PLANE_CHANGE_ADMIN_MODAL_KEY,
  CONTROL_PLANE_MODAL_CONTENT_STYLE,
  CONTROL_PLANE_MODAL_VIEWPORT_INSET,
} from "./controlPlaneModalKeys.js";

const CHANGE_ADMIN_FORM_ID = "control-plane-change-company-admin-form";

const emptyInviteForm = {
  fullName: "",
  email: "",
  phone: "",
};

function FormField({ id, label, required = false, error, children }) {
  return (
    <div className="platform-quick-create-modal__field">
      <label className="platform-quick-create-modal__label" htmlFor={id}>
        {label}
        {required ? (
          <span className="platform-quick-create-modal__required" aria-hidden>
            *
          </span>
        ) : null}
      </label>
      <div className="platform-quick-create-modal__control">{children}</div>
      {error ? <p className="platform-quick-create-modal__error">{error}</p> : null}
    </div>
  );
}

function normalizeSearchText(value) {
  return String(value || "").trim().toLowerCase();
}

function resolveApiError(error, fallback) {
  const detail = error?.response?.data?.detail || error?.message || fallback;
  return typeof detail === "string" ? detail : fallback;
}

export default function ChangeCompanyAdministratorModal({
  isOpen,
  company,
  onClose,
  onChanged,
}) {
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [inviteForm, setInviteForm] = useState(emptyInviteForm);
  const [inviteErrors, setInviteErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const companyName = company?.name || "компании";
  const currentOwnerId = company?.company_superadmin?.user_id ?? null;
  const isInviteMode = !isLoading && users.length === 0;

  const resetState = useCallback(() => {
    setUsers([]);
    setSelectedUserId(null);
    setSearchQuery("");
    setInviteForm(emptyInviteForm);
    setInviteErrors({});
    setIsLoading(false);
    setIsSaving(false);
    setError("");
    setSuccessMessage("");
  }, []);

  const loadUsers = useCallback(async () => {
    if (!company?.id) {
      return;
    }

    try {
      setIsLoading(true);
      setError("");
      const data = await getCompanyUsers(company.id);
      const items = Array.isArray(data?.items) ? data.items : [];
      setUsers(items);
      const preferredUserId =
        items.find((item) => item.user_id === currentOwnerId)?.user_id
        ?? items[0]?.user_id
        ?? null;
      setSelectedUserId(preferredUserId);
    } catch (requestError) {
      setError(resolveApiError(requestError, "Не удалось загрузить пользователей компании"));
      setUsers([]);
      setSelectedUserId(null);
    } finally {
      setIsLoading(false);
    }
  }, [company?.id, currentOwnerId]);

  useEffect(() => {
    if (!isOpen) {
      resetState();
      return;
    }

    loadUsers();
  }, [isOpen, loadUsers, resetState]);

  const filteredUsers = useMemo(() => {
    const query = normalizeSearchText(searchQuery);
    if (!query) {
      return users;
    }

    return users.filter((user) => {
      const haystack = [user.full_name, user.email, user.role, user.role_label]
        .map(normalizeSearchText)
        .join(" ");
      return haystack.includes(query);
    });
  }, [searchQuery, users]);

  const validateInviteForm = () => {
    const nextErrors = {};
    if (!String(inviteForm.fullName || "").trim()) {
      nextErrors.fullName = "Укажите ФИО";
    }
    if (!String(inviteForm.email || "").trim()) {
      nextErrors.email = "Укажите email";
    }
    return nextErrors;
  };

  const handleInviteChange = (field, value) => {
    setInviteForm((previous) => ({ ...previous, [field]: value }));
    setInviteErrors((previous) => ({ ...previous, [field]: undefined }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!company?.id || isSaving) {
      return;
    }

    try {
      setIsSaving(true);
      setError("");
      setSuccessMessage("");

      if (isInviteMode) {
        const nextErrors = validateInviteForm();
        if (Object.keys(nextErrors).length > 0) {
          setInviteErrors(nextErrors);
          return;
        }

        const result = await inviteCompanyAdministrator(company.id, {
          full_name: inviteForm.fullName.trim(),
          email: inviteForm.email.trim(),
          phone: inviteForm.phone.trim() || null,
        });
        setSuccessMessage(
          result?.invitation_sent
            ? "Приглашение отправлено"
            : "Superadmin назначен. SMTP не настроен — письмо не отправлено.",
        );
        onChanged?.(result);
        return;
      }

      if (!selectedUserId) {
        setError("Выберите пользователя");
        return;
      }

      const result = await changeCompanyAdministrator(company.id, selectedUserId);
      setSuccessMessage("Superadmin компании обновлён");
      onChanged?.(result);
    } catch (requestError) {
      setError(
        resolveApiError(
          requestError,
          isInviteMode
            ? "Не удалось отправить приглашение"
            : "Не удалось сменить Superadmin",
        ),
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <PlatformModal
      modalKey={CONTROL_PLANE_CHANGE_ADMIN_MODAL_KEY}
      open={isOpen}
      onClose={onClose}
      title={isInviteMode ? "Назначить Superadmin" : "Сменить Superadmin"}
      subtitle={companyName}
      canCustomizeLayout
      keepFullyVisible
      viewportInset={CONTROL_PLANE_MODAL_VIEWPORT_INSET}
      defaultBounds={CONTROL_PLANE_CHANGE_ADMIN_MODAL_DEFAULT_BOUNDS}
      ariaLabel={isInviteMode ? "Назначение Superadmin" : "Смена Superadmin"}
      contentStyle={CONTROL_PLANE_MODAL_CONTENT_STYLE}
      footer={
        <div className="platform-modal-footer" data-platform-modal-no-drag>
          <div className="platform-modal-footer__leading" />
          <div className="platform-modal-footer__actions">
            <button
              type="button"
              className="platform-quick-create-modal__btn platform-quick-create-modal__btn--ghost"
              onClick={onClose}
              disabled={isSaving}
            >
              Отмена
            </button>
            <button
              type="submit"
              form={CHANGE_ADMIN_FORM_ID}
              className="platform-quick-create-modal__btn platform-quick-create-modal__btn--primary"
              disabled={isSaving || isLoading}
            >
              {isSaving
                ? "Сохранение..."
                : isInviteMode
                  ? "Отправить приглашение"
                  : "Сохранить"}
            </button>
          </div>
        </div>
      }
    >
      <div className="platform-quick-create-modal__body">
        <form
          id={CHANGE_ADMIN_FORM_ID}
          className="platform-quick-create-modal__form"
          onSubmit={handleSubmit}
          noValidate
        >
          {isLoading ? (
            <p className="platform-quick-create-modal__section-hint">Загрузка...</p>
          ) : null}

          {!isLoading && isInviteMode ? (
            <div className="platform-quick-create-modal__fields">
              <p className="platform-quick-create-modal__section-hint">
                В компании пока нет пользователей. Пригласите суперадминистратора компании.
              </p>
              <p className="platform-quick-create-modal__section-hint">
                Пользователю будет отправлено приглашение. В приглашении будет указано, что он
                назначен суперадминистратором компании {companyName}.
              </p>

              <FormField
                id="invite-full-name"
                label="ФИО"
                required
                error={inviteErrors.fullName}
              >
                <input
                  id="invite-full-name"
                  className="field-editor-input"
                  value={inviteForm.fullName}
                  onChange={(event) => handleInviteChange("fullName", event.target.value)}
                />
              </FormField>

              <FormField id="invite-email" label="Email" required error={inviteErrors.email}>
                <input
                  id="invite-email"
                  type="email"
                  className="field-editor-input"
                  value={inviteForm.email}
                  onChange={(event) => handleInviteChange("email", event.target.value)}
                />
              </FormField>

              <FormField id="invite-phone" label="Телефон" error={inviteErrors.phone}>
                <input
                  id="invite-phone"
                  className="field-editor-input"
                  value={inviteForm.phone}
                  onChange={(event) => handleInviteChange("phone", event.target.value)}
                />
              </FormField>
            </div>
          ) : null}

          {!isLoading && !isInviteMode ? (
            <div className="platform-quick-create-modal__fields">
              <FormField id="admin-search" label="Поиск по ФИО или email">
                <input
                  id="admin-search"
                  className="field-editor-input"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Начните вводить имя или email"
                />
              </FormField>

              <div className="platform-quick-create-modal__readonly-role">
                <span className="platform-quick-create-modal__label">Текущий администратор</span>
                <span>
                  {company?.company_superadmin?.full_name
                    || company?.company_superadmin?.email
                    || "Не назначен"}
                </span>
              </div>

              <div
                className="platform-quick-create-modal__field"
                role="radiogroup"
                aria-label="Пользователи компании"
              >
                {filteredUsers.length === 0 ? (
                  <p className="platform-quick-create-modal__section-hint">
                    Пользователи не найдены.
                  </p>
                ) : (
                  filteredUsers.map((user) => {
                    const isCurrentOwner = user.user_id === currentOwnerId;
                    return (
                      <label
                        key={user.user_id}
                        className="platform-quick-create-modal__readonly-role"
                        style={{ display: "block", marginBottom: 8 }}
                      >
                        <input
                          type="radio"
                          name="company-admin-user"
                          value={user.user_id}
                          checked={selectedUserId === user.user_id}
                          onChange={() => setSelectedUserId(user.user_id)}
                          style={{ marginRight: 8 }}
                        />
                        <span>
                          {user.full_name || user.email}
                          {" · "}
                          {user.email}
                          {" · "}
                          {user.role_label || user.role}
                          {isCurrentOwner ? " · текущий администратор" : ""}
                        </span>
                      </label>
                    );
                  })
                )}
              </div>
            </div>
          ) : null}

          {successMessage ? (
            <p className="platform-quick-create-modal__section-hint" role="status">
              {successMessage}
            </p>
          ) : null}

          {error ? (
            <p className="platform-quick-create-modal__error" role="alert">
              {error}
            </p>
          ) : null}
        </form>
      </div>
    </PlatformModal>
  );
}
