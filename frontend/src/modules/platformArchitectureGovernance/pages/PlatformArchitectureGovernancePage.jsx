import { useCallback, useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";

import { getApiErrorMessage } from "../../designer/api/platformApiClient";
import {
  PAGE_LAYOUT_PAGE_TYPE,
  PAGE_LAYOUT_TOOLBAR_ZONE,
  useResolvedPageLayoutContract,
} from "../../../shared/appShell/pageLayoutContract";
import GovernanceTabs from "../components/GovernanceTabs";
import GovernanceOverviewTab from "../components/GovernanceOverviewTab";
import GovernanceConstitutionTab from "../components/GovernanceConstitutionTab";
import GovernanceAdrTab from "../components/GovernanceAdrTab";
import GovernanceDeliveryTab from "../components/GovernanceDeliveryTab";
import {
  DEFAULT_GOVERNANCE_TAB,
  normalizeGovernanceSearchParams,
  resolveGovernanceTab,
} from "../config/governanceTabsConfig";
import * as governanceApi from "../api/platformArchitectureGovernanceApi";

import "./platformArchitectureGovernancePage.css";

export default function PlatformArchitectureGovernancePage() {
  useResolvedPageLayoutContract({
    pageType: PAGE_LAYOUT_PAGE_TYPE.STUDIO_SECTION,
    toolbarZoneId: PAGE_LAYOUT_TOOLBAR_ZONE.APP_HEADER,
    canMinimize: true,
  });

  const { tenantId } = useParams();
  const resolvedTenantId = Number(tenantId) || 1;
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab = resolveGovernanceTab(searchParams.get("tab"));
  const selectedAdrSlug = searchParams.get("adr") || null;
  const selectedNormNumber = Number(searchParams.get("norm") || "1") || 1;

  useEffect(() => {
    const normalized = normalizeGovernanceSearchParams(searchParams);
    if (normalized) {
      setSearchParams(normalized, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const [overview, setOverview] = useState(null);
  const [constitution, setConstitution] = useState(null);
  const [adrList, setAdrList] = useState(null);
  const [adrDetail, setAdrDetail] = useState(null);
  const [delivery, setDelivery] = useState(null);
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [loadingConstitution, setLoadingConstitution] = useState(false);
  const [loadingAdrList, setLoadingAdrList] = useState(false);
  const [loadingAdrDetail, setLoadingAdrDetail] = useState(false);
  const [loadingDelivery, setLoadingDelivery] = useState(false);
  const [error, setError] = useState(null);

  const setTabParams = useCallback(
    (tabKey, extra = {}) => {
      const next = new URLSearchParams(searchParams);
      next.set("tab", tabKey);
      Object.entries(extra).forEach(([key, value]) => {
        if (value == null || value === "") {
          next.delete(key);
        } else {
          next.set(key, String(value));
        }
      });
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  useEffect(() => {
    let cancelled = false;
    setLoadingOverview(true);
    setError(null);
    governanceApi
      .fetchGovernanceOverview(resolvedTenantId)
      .then((data) => {
        if (!cancelled) {
          setOverview(data);
        }
      })
      .catch((requestError) => {
        if (!cancelled) {
          setError(getApiErrorMessage(requestError, "Не удалось загрузить обзор governance"));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingOverview(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [resolvedTenantId]);

  useEffect(() => {
    if (activeTab !== "constitution") {
      return undefined;
    }
    let cancelled = false;
    setLoadingConstitution(true);
    setError(null);
    governanceApi
      .fetchGovernanceConstitution(resolvedTenantId)
      .then((data) => {
        if (!cancelled) {
          setConstitution(data);
        }
      })
      .catch((requestError) => {
        if (!cancelled) {
          setError(getApiErrorMessage(requestError, "Не удалось загрузить конституцию"));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingConstitution(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [activeTab, resolvedTenantId]);

  useEffect(() => {
    if (activeTab !== "adr") {
      return undefined;
    }
    let cancelled = false;
    setLoadingAdrList(true);
    setError(null);
    governanceApi
      .fetchGovernanceAdrList(resolvedTenantId)
      .then((data) => {
        if (!cancelled) {
          setAdrList(data);
          const firstSlug = data?.items?.[0]?.slug;
          if (!selectedAdrSlug && firstSlug) {
            setTabParams("adr", { adr: firstSlug });
          }
        }
      })
      .catch((requestError) => {
        if (!cancelled) {
          setError(getApiErrorMessage(requestError, "Не удалось загрузить ADR"));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingAdrList(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [activeTab, resolvedTenantId, selectedAdrSlug, setTabParams]);

  useEffect(() => {
    if (activeTab !== "adr" || !selectedAdrSlug) {
      setAdrDetail(null);
      return undefined;
    }
    let cancelled = false;
    setLoadingAdrDetail(true);
    governanceApi
      .fetchGovernanceAdrDetail(resolvedTenantId, selectedAdrSlug)
      .then((data) => {
        if (!cancelled) {
          setAdrDetail(data);
        }
      })
      .catch((requestError) => {
        if (!cancelled) {
          setError(getApiErrorMessage(requestError, "Не удалось загрузить карточку ADR"));
          setAdrDetail(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingAdrDetail(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [activeTab, resolvedTenantId, selectedAdrSlug]);

  useEffect(() => {
    if (activeTab !== "delivery") {
      return undefined;
    }
    let cancelled = false;
    setLoadingDelivery(true);
    setError(null);
    governanceApi
      .fetchGovernanceDelivery(resolvedTenantId)
      .then((data) => {
        if (!cancelled) {
          setDelivery(data);
        }
      })
      .catch((requestError) => {
        if (!cancelled) {
          setError(getApiErrorMessage(requestError, "Не удалось загрузить контур доставки"));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingDelivery(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [activeTab, resolvedTenantId]);

  return (
    <div className="platform-governance">
      <GovernanceTabs
        activeTab={activeTab}
        onSelect={(tabKey) => setTabParams(tabKey, { adr: null, norm: null })}
      />

      <div className="platform-governance__canvas" data-page-canvas>
        {error ? (
          <p className="platform-governance__status platform-governance__status--error">{error}</p>
        ) : null}

        {activeTab === DEFAULT_GOVERNANCE_TAB ? (
          <GovernanceOverviewTab
            overview={overview}
            loading={loadingOverview}
            tenantId={resolvedTenantId}
          />
        ) : null}

        {activeTab === "constitution" ? (
          <GovernanceConstitutionTab
            constitution={constitution}
            loading={loadingConstitution}
            selectedNorm={selectedNormNumber}
            onSelectNorm={(normNumber) => setTabParams("constitution", { norm: normNumber })}
          />
        ) : null}

        {activeTab === "adr" ? (
          <GovernanceAdrTab
            adrList={adrList}
            adrDetail={adrDetail}
            loadingList={loadingAdrList}
            loadingDetail={loadingAdrDetail}
            selectedSlug={selectedAdrSlug}
            onSelectSlug={(slug) => setTabParams("adr", { adr: slug })}
          />
        ) : null}

        {activeTab === "delivery" ? (
          <GovernanceDeliveryTab
            delivery={delivery}
            loading={loadingDelivery}
            tenantId={resolvedTenantId}
          />
        ) : null}
      </div>
    </div>
  );
}
