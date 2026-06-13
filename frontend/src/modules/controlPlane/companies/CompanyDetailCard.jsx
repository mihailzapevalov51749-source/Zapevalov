import TenantRegistryStatusBadge from "../components/TenantRegistryStatusBadge";
import TenantRegistryTypeBadge from "../components/TenantRegistryTypeBadge";
import { resolveClientStatusLabel } from "../../admin/clients/clientStatusLabels";
import { companiesWorkspaceStyles as styles } from "./companiesWorkspaceStyles.js";

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("ru-RU");
}

function DetailField({ label, children }) {
  return (
    <>
      <div style={styles.detailLabel}>{label}</div>
      <div style={styles.detailValue}>{children}</div>
    </>
  );
}

export default function CompanyDetailCard({
  company,
  loading,
  error,
  isOpeningOffice = false,
  onOpenOffice,
  onClone,
  onDelete,
  onChangeAdministrator,
  onClose,
}) {
  if (loading) {
    return (
      <section style={styles.detailPanel}>
        <div style={styles.placeholderCard}>Загрузка карточки...</div>
      </section>
    );
  }

  if (!company) {
    return (
      <section style={styles.detailPanel}>
        <div style={styles.placeholderCard}>
          Выберите компанию в списке слева, чтобы посмотреть карточку и выполнить
          действия.
        </div>
      </section>
    );
  }

  const isSystemTenant = Number(company.id) === 1;

  return (
    <section style={styles.detailPanel} aria-label="Карточка компании">
      <header style={styles.detailHeader}>
        <h2 style={styles.detailTitle}>{company.name}</h2>
      </header>

      <div style={styles.detailBody}>
        {error ? <div style={styles.error}>{error}</div> : null}

        <div style={styles.detailGrid}>
          <DetailField label="Код компании">{company.code || "—"}</DetailField>
          <DetailField label="Описание">{company.description || "—"}</DetailField>
          <DetailField label="Тип">
            <TenantRegistryTypeBadge
              tenantId={company.id}
              tenantType={company.tenant_type}
            />
          </DetailField>
          <DetailField label="Статус">
            <TenantRegistryStatusBadge status={company.tenant_status} />
            <span style={{ marginLeft: 8, color: "#64748b", fontSize: 13 }}>
              {resolveClientStatusLabel(company.tenant_status)}
            </span>
          </DetailField>
          <DetailField label="Версия">{company.template_version || "—"}</DetailField>
          <DetailField label="Лицензия">—</DetailField>
          <DetailField label="Дата создания">
            {formatDate(company.created_at)}
          </DetailField>
          <DetailField label="Пользователи">—</DetailField>
          <DetailField label="Рабочие пространства">—</DetailField>
          {company.source_tenant_id != null ? (
            <DetailField label="Источник структуры">
              {company.source_tenant_id}
            </DetailField>
          ) : null}
          {company.notes ? (
            <DetailField label="Заметки">{company.notes}</DetailField>
          ) : null}
        </div>

        <section style={styles.superadminSection} aria-label="Владелец компании">
          <h3 style={styles.superadminTitle}>Владелец компании</h3>
          {company.company_superadmin ? (
            <div style={styles.detailGrid}>
              <DetailField label="Роль">
                {company.company_superadmin.role || "superadmin"}
              </DetailField>
              <DetailField label="Статус">Владелец компании</DetailField>
              <DetailField label="ФИО">
                {company.company_superadmin.full_name || "—"}
              </DetailField>
              <DetailField label="Email">{company.company_superadmin.email || "—"}</DetailField>
              <DetailField label="Телефон">
                {company.company_superadmin.phone || "—"}
              </DetailField>
              <DetailField label="Должность">
                {company.company_superadmin.position || "—"}
              </DetailField>
              <DetailField label="Статус">
                {company.company_superadmin.is_active ? "Активен" : "Неактивен"}
              </DetailField>
              <DetailField label="Последний вход">
                {formatDate(company.company_superadmin.last_login_at)}
              </DetailField>
            </div>
          ) : (
            <p style={styles.superadminEmpty}>Владелец компании не назначен</p>
          )}

          <div style={styles.superadminActions}>
            <button
              type="button"
              style={styles.secondaryButton}
              onClick={onChangeAdministrator}
              disabled={!onChangeAdministrator}
            >
              Сменить администратора
            </button>
            <button type="button" style={styles.disabledButton} disabled title="Скоро">
              Сбросить пароль
            </button>
          </div>
        </section>

        <div style={styles.actionsRow}>
          <button
            type="button"
            style={styles.primaryButton}
            onClick={onOpenOffice}
            disabled={isOpeningOffice}
          >
            {isOpeningOffice ? "Открытие..." : "Открыть компанию"}
          </button>
          <button type="button" style={styles.secondaryButton} onClick={onClone}>
            Клонировать
          </button>
          <button type="button" style={styles.disabledButton} disabled title="Скоро">
            Архивировать
          </button>
          <button
            type="button"
            style={isSystemTenant ? styles.disabledButton : styles.dangerButton}
            onClick={onDelete}
            disabled={isSystemTenant}
            title={isSystemTenant ? "Системный tenant защищён" : undefined}
          >
            Удалить
          </button>
          <button type="button" style={styles.disabledButton} disabled title="Скоро">
            Обновить из Template
          </button>
          {onClose ? (
            <button type="button" style={styles.secondaryButton} onClick={onClose}>
              Закрыть
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
