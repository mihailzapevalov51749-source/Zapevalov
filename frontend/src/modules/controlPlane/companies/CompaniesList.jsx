import TenantRegistryStatusBadge from "../components/TenantRegistryStatusBadge";
import TenantRegistryTypeBadge from "../components/TenantRegistryTypeBadge";
import {
  resolveCompanyCurrentName,
  resolveCompanyOriginalName,
} from "./companiesSearch.js";
import { resolveTenantPlatformVersion } from "./resolveTenantPlatformVersion.js";
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
          placeholder="Поиск по ID, названию, slug или коду"
          style={styles.searchInput}
        />
      </div>

      <div style={styles.tableHeader}>
        <div>ID</div>
        <div>Название при создании</div>
        <div>Текущее название</div>
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
                <div style={styles.idCell}>{company.id}</div>
                <div style={styles.companyName}>{resolveCompanyOriginalName(company)}</div>
                <div style={styles.companyName}>{resolveCompanyCurrentName(company)}</div>
                <div>
                  <TenantRegistryTypeBadge
                    tenantId={company.id}
                    tenantType={company.tenant_type}
                  />
                </div>
                <div style={styles.mutedText}>
                  {resolveTenantPlatformVersion(company)}
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
