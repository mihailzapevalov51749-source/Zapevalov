import TenantRegistryStatusBadge from "../components/TenantRegistryStatusBadge";
import TenantRegistryTypeBadge from "../components/TenantRegistryTypeBadge";
import { companiesWorkspaceStyles as styles } from "./companiesWorkspaceStyles.js";

export default function CompaniesList({
  companies,
  loading,
  searchQuery,
  onSearch,
  selectedCompanyId,
  onSelect,
}) {
  return (
    <div style={styles.listPanel}>
      <div style={styles.toolbar}>
        <input
          value={searchQuery}
          onChange={(event) => onSearch(event.target.value)}
          placeholder="Поиск по названию или ID"
          style={styles.searchInput}
        />
      </div>

      <div style={styles.tableHeader}>
        <div>Название</div>
        <div>Тип</div>
        <div>Версия</div>
        <div>Статус</div>
      </div>

      <div style={styles.listBody}>
        {loading ? <div style={styles.emptyState}>Загрузка...</div> : null}

        {!loading && companies.length === 0 ? (
          <div style={styles.emptyState}>
            Компании не найдены. Используйте «Создать компанию» выше.
          </div>
        ) : null}

        {!loading
          && companies.map((company) => {
            const isSelected = Number(selectedCompanyId) === Number(company.id);

            return (
              <button
                key={company.id}
                type="button"
                onClick={() => onSelect(company)}
                style={{
                  ...styles.listRow,
                  ...(isSelected ? styles.listRowSelected : {}),
                }}
                aria-pressed={isSelected}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={styles.companyName}>{company.name}</div>
                  {company.description ? (
                    <div style={{ ...styles.listCellMuted, marginTop: 2 }}>
                      {company.description}
                    </div>
                  ) : null}
                </div>
                <div>
                  <TenantRegistryTypeBadge
                    tenantId={company.id}
                    tenantType={company.tenant_type}
                  />
                </div>
                <div style={styles.mutedText}>
                  {company.template_version || "—"}
                </div>
                <div>
                  <TenantRegistryStatusBadge status={company.tenant_status} />
                </div>
              </button>
            );
          })}
      </div>
    </div>
  );
}
