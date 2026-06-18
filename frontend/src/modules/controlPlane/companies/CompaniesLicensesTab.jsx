import { useCallback, useEffect, useMemo, useState } from "react";

import { listTenantRegistry } from "../api/tenantRegistryApi";
import RefreshIconButton from "../../../shared/ui/RefreshIconButton";
import TenantRegistryStatusBadge from "../components/TenantRegistryStatusBadge";
import TenantRegistryTypeBadge from "../components/TenantRegistryTypeBadge";
import { resolveTenantPlatformVersion } from "./resolveTenantPlatformVersion.js";
import { companiesWorkspaceStyles as styles } from "./companiesWorkspaceStyles.js";

function normalizeSearchText(value) {
  return String(value || "").trim().toLowerCase();
}

export default function CompaniesLicensesTab() {
  const [companies, setCompanies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const loadCompanies = useCallback(async () => {
    try {
      setIsLoading(true);
      setError("");
      const data = await listTenantRegistry();
      const items = Array.isArray(data) ? data : [];
      setCompanies(
        [...items].sort((left, right) => Number(left.id) - Number(right.id)),
      );
    } catch (requestError) {
      const detail =
        requestError?.response?.data?.detail
        || requestError?.message
        || "Не удалось загрузить список лицензий";
      setError(typeof detail === "string" ? detail : "Не удалось загрузить список лицензий");
      setCompanies([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  const filteredCompanies = useMemo(() => {
    const query = normalizeSearchText(searchQuery);
    if (!query) {
      return companies;
    }

    return companies.filter((company) => {
      const haystack = [
        company.id,
        company.name,
        company.description,
        company.tenant_type,
        company.tenant_status,
        company.platform_version,
        company.template_version,
      ]
        .map(normalizeSearchText)
        .join(" ");

      return haystack.includes(query);
    });
  }, [companies, searchQuery]);

  return (
    <div style={styles.tabContent}>
      <div style={styles.tabToolbar}>
        <input
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Поиск по компании или ID"
          style={{ ...styles.searchInput, flex: 1 }}
        />
        <RefreshIconButton onClick={loadCompanies} title="Обновить" />
      </div>

      {error ? <div style={styles.error}>{error}</div> : null}

      <section style={styles.workspace}>
        <div style={{ ...styles.listPanel, width: "100%" }}>
          <div style={styles.tableHeader}>
            <div>Компания</div>
            <div>Тип</div>
            <div>Статус лицензии</div>
            <div>Версия</div>
          </div>

          <div style={styles.listBody}>
            {isLoading ? <div style={styles.emptyState}>Загрузка...</div> : null}

            {!isLoading && filteredCompanies.length === 0 ? (
              <div style={styles.emptyState}>Лицензии не найдены.</div>
            ) : null}

            {!isLoading
              && filteredCompanies.map((company) => (
                <div key={company.id} style={{ ...styles.listRow, cursor: "default" }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={styles.companyName}>{company.name}</div>
                    <div style={{ ...styles.listCellMuted, marginTop: 2 }}>
                      ID {company.id}
                    </div>
                  </div>
                  <div>
                    <TenantRegistryTypeBadge
                      tenantId={company.id}
                      tenantType={company.tenant_type}
                    />
                  </div>
                  <div>
                    <TenantRegistryStatusBadge status={company.tenant_status} />
                  </div>
                  <div style={styles.listCellMuted}>{resolveTenantPlatformVersion(company)}</div>
                </div>
              ))}
          </div>
        </div>
      </section>
    </div>
  );
}
