import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";

import { getApiErrorMessage } from "../../designer/api/platformApiClient";
import {
  PAGE_LAYOUT_PAGE_TYPE,
  PAGE_LAYOUT_TOOLBAR_ZONE,
  useResolvedPageLayoutContract,
} from "../../../shared/appShell/pageLayoutContract";
import ArchitectureComponentDetailCard from "../components/ArchitectureComponentDetailCard";
import ArchitectureDocumentModal from "../components/ArchitectureDocumentModal";
import ArchitectureElementList from "../components/ArchitectureElementList";
import ArchitectureRegistryOverview from "../components/ArchitectureRegistryOverview";
import ArchitectureRegistryTabs from "../components/ArchitectureRegistryTabs";
import {
  ARCHITECTURE_REGISTRY_TABS,
  DEFAULT_REGISTRY_TAB,
  normalizeRegistrySearchParams,
  resolveRegistryTab,
} from "../config/architectureRegistryConfig";
import * as platformArchitectureApi from "../api/platformArchitectureApi";

import "./platformArchitecturePage.css";

export default function PlatformArchitecturePage() {
  useResolvedPageLayoutContract({
    pageType: PAGE_LAYOUT_PAGE_TYPE.STUDIO_SECTION,
    toolbarZoneId: PAGE_LAYOUT_TOOLBAR_ZONE.APP_HEADER,
    canMinimize: true,
  });

  const { tenantId } = useParams();
  const resolvedTenantId = Number(tenantId) || 1;
  const [searchParams, setSearchParams] = useSearchParams();

  const rawRegistry = searchParams.get("registry");
  const activeRegistry = resolveRegistryTab(rawRegistry);
  const selectedKey = searchParams.get("element") || null;

  useEffect(() => {
    const normalized = normalizeRegistrySearchParams(searchParams);
    if (normalized) {
      setSearchParams(normalized, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const [overview, setOverview] = useState(null);
  const [registryElements, setRegistryElements] = useState([]);
  const [registryLabel, setRegistryLabel] = useState("");
  const [card, setCard] = useState(null);
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [loadingRegistry, setLoadingRegistry] = useState(false);
  const [loadingCard, setLoadingCard] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [documentModalOpen, setDocumentModalOpen] = useState(false);
  const [documentData, setDocumentData] = useState(null);
  const [documentError, setDocumentError] = useState(null);
  const [openingDocument, setOpeningDocument] = useState(false);
  const [error, setError] = useState(null);

  const setRegistryParams = useCallback(
    (registryKey, elementKey) => {
      const next = new URLSearchParams(searchParams);
      next.set("registry", registryKey);
      if (elementKey) {
        next.set("element", elementKey);
      } else {
        next.delete("element");
      }
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const handleRegistrySelect = useCallback(
    (registryKey) => {
      setRegistryParams(registryKey, null);
    },
    [setRegistryParams],
  );

  const loadOverview = useCallback(async () => {
    setLoadingOverview(true);
    setError(null);
    try {
      const data = await platformArchitectureApi.fetchArchitectureRegistryOverview(resolvedTenantId);
      setOverview(data);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Не удалось загрузить обзор реестров"));
    } finally {
      setLoadingOverview(false);
    }
  }, [resolvedTenantId]);

  const loadRegistryElements = useCallback(async () => {
    if (activeRegistry === DEFAULT_REGISTRY_TAB) {
      setRegistryElements([]);
      setRegistryLabel("");
      return;
    }

    setLoadingRegistry(true);
    setError(null);
    try {
      const data = await platformArchitectureApi.fetchArchitectureRegistryElements(
        resolvedTenantId,
        activeRegistry,
      );
      setRegistryElements(data?.elements ?? []);
      setRegistryLabel(data?.registry_label ?? activeRegistry);

      const hasSelected = (data?.elements ?? []).some((item) => item.key === selectedKey);
      if (!hasSelected && data?.elements?.[0]?.key) {
        setRegistryParams(activeRegistry, data.elements[0].key);
      }
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Не удалось загрузить реестр"));
      setRegistryElements([]);
    } finally {
      setLoadingRegistry(false);
    }
  }, [activeRegistry, resolvedTenantId, selectedKey, setRegistryParams]);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  useEffect(() => {
    loadRegistryElements();
  }, [loadRegistryElements]);

  useEffect(() => {
    if (activeRegistry === DEFAULT_REGISTRY_TAB || !selectedKey) {
      setCard(null);
      return undefined;
    }

    let cancelled = false;
    setLoadingCard(true);
    setError(null);

    platformArchitectureApi
      .fetchArchitectureComponent(resolvedTenantId, selectedKey)
      .then((data) => {
        if (!cancelled) {
          setCard(data);
        }
      })
      .catch((requestError) => {
        if (!cancelled) {
          setError(getApiErrorMessage(requestError, "Не удалось загрузить карточку элемента"));
          setCard(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingCard(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [resolvedTenantId, selectedKey, activeRegistry]);

  const activeRegistryTitle = useMemo(
    () => ARCHITECTURE_REGISTRY_TABS.find((tab) => tab.key === activeRegistry)?.title ?? activeRegistry,
    [activeRegistry],
  );

  const handleOpenDocument = async () => {
    setOpeningDocument(true);
    setDocumentError(null);
    setDocumentData(null);
    setDocumentModalOpen(true);

    try {
      const data = await platformArchitectureApi.fetchArchitectureRegistryDocument(
        resolvedTenantId,
        activeRegistry,
      );
      setDocumentData(data);
    } catch (requestError) {
      setDocumentError(
        getApiErrorMessage(requestError, "Не удалось открыть архитектурный документ"),
      );
    } finally {
      setOpeningDocument(false);
    }
  };

  const handleCloseDocument = () => {
    setDocumentModalOpen(false);
  };

  const handleScan = async () => {
    setScanning(true);
    setError(null);
    try {
      await platformArchitectureApi.runArchitectureScan(resolvedTenantId);
      await loadOverview();
      if (activeRegistry !== DEFAULT_REGISTRY_TAB) {
        await loadRegistryElements();
      }
      if (selectedKey) {
        const refreshed = await platformArchitectureApi.fetchArchitectureComponent(
          resolvedTenantId,
          selectedKey,
        );
        setCard(refreshed);
      }
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Не удалось выполнить сканирование"));
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="platform-architecture">
      <ArchitectureRegistryTabs
        activeRegistry={activeRegistry}
        onSelect={handleRegistrySelect}
        onOpenDocument={handleOpenDocument}
        openingDocument={openingDocument}
        onScan={handleScan}
        scanning={scanning}
      />

      <ArchitectureDocumentModal
        open={documentModalOpen}
        onClose={handleCloseDocument}
        loading={openingDocument}
        documentData={documentData}
        errorMessage={documentError}
        registryLabel={activeRegistryTitle}
      />

      <div className="platform-architecture__canvas" data-page-canvas>
        {error ? <p className="platform-architecture__status platform-architecture__status--error">{error}</p> : null}

        {activeRegistry === DEFAULT_REGISTRY_TAB ? (
          <ArchitectureRegistryOverview overview={overview} loading={loadingOverview} />
        ) : (
          <div className="platform-architecture__layout">
            <ArchitectureElementList
              elements={registryElements}
              selectedKey={selectedKey}
              onSelect={(elementKey) => setRegistryParams(activeRegistry, elementKey)}
              loading={loadingRegistry}
              registryLabel={registryLabel || activeRegistryTitle}
            />

            <div>
              {loadingCard ? (
                <p className="platform-architecture__status">Загрузка карточки…</p>
              ) : (
                <ArchitectureComponentDetailCard card={card} />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
