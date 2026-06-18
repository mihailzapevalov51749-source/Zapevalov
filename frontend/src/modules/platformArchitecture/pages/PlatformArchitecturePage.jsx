import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

import { getApiErrorMessage } from "../../designer/api/platformApiClient";
import {
  PAGE_LAYOUT_PAGE_TYPE,
  PAGE_LAYOUT_TOOLBAR_ZONE,
  useResolvedPageLayoutContract,
} from "../../../shared/appShell/pageLayoutContract";
import ArchitectureComponentDetailCard from "../components/ArchitectureComponentDetailCard";
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

  const [tree, setTree] = useState(null);
  const [selectedKey, setSelectedKey] = useState(null);
  const [card, setCard] = useState(null);
  const [loadingTree, setLoadingTree] = useState(true);
  const [loadingCard, setLoadingCard] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState(null);
  const [scanInfo, setScanInfo] = useState(null);

  const loadTree = useCallback(async () => {
    setLoadingTree(true);
    setError(null);
    try {
      const data = await platformArchitectureApi.fetchArchitectureTree(resolvedTenantId);
      setTree(data);
      const firstNode = data?.categories?.[0]?.children?.[0];
      if (firstNode) {
        setSelectedKey((current) => current || firstNode.key);
      }
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Не удалось загрузить дерево архитектуры"));
    } finally {
      setLoadingTree(false);
    }
  }, [resolvedTenantId]);

  const loadLatestScan = useCallback(async () => {
    try {
      const data = await platformArchitectureApi.fetchLatestArchitectureScan(resolvedTenantId);
      setScanInfo(data?.scan ?? null);
    } catch {
      setScanInfo(null);
    }
  }, [resolvedTenantId]);

  useEffect(() => {
    loadTree();
    loadLatestScan();
  }, [loadTree, loadLatestScan]);

  useEffect(() => {
    if (!selectedKey) {
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
          setError(getApiErrorMessage(requestError, "Не удалось загрузить карточку компонента"));
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
  }, [resolvedTenantId, selectedKey]);

  const categories = useMemo(() => tree?.categories ?? [], [tree]);

  const handleScan = async () => {
    setScanning(true);
    setError(null);
    try {
      const scan = await platformArchitectureApi.runArchitectureScan(resolvedTenantId);
      setScanInfo(scan);
      await loadTree();
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
      <header className="platform-architecture__header">
        <div>
          <h1 className="platform-architecture__title">Архитектура платформы</h1>
          <p className="platform-architecture__subtitle">
            Навигатор по контурам, ядру и связям ЯсноПро — сначала понятные названия, затем технические детали.
          </p>
        </div>
        <button
          type="button"
          className="platform-architecture__scan-btn"
          onClick={handleScan}
          disabled={scanning}
        >
          {scanning ? "Сканирование…" : "Запустить сканирование"}
        </button>
      </header>

      {scanInfo?.scanner_version ? (
        <p className="platform-architecture__status">
          Последнее сканирование: v{scanInfo.scanner_version}
          {scanInfo.finished_at ? ` · ${new Date(scanInfo.finished_at).toLocaleString("ru-RU")}` : ""}
        </p>
      ) : null}

      {error ? <p className="platform-architecture__status platform-architecture__status--error">{error}</p> : null}

      {loadingTree ? (
        <p className="platform-architecture__status">Загрузка дерева архитектуры…</p>
      ) : (
        <div className="platform-architecture__layout">
          <nav className="platform-architecture__tree" aria-label="Дерево архитектуры">
            {categories.map((category) => (
              <section key={category.key} className="platform-architecture__category">
                <h2 className="platform-architecture__category-title">{category.title}</h2>
                <ul className="platform-architecture__nodes">
                  {(category.children || []).map((node) => {
                    const isActive = node.key === selectedKey;
                    return (
                      <li key={node.key}>
                        <button
                          type="button"
                          className={`platform-architecture__node-btn${
                            isActive ? " platform-architecture__node-btn--active" : ""
                          }`}
                          onClick={() => setSelectedKey(node.key)}
                        >
                          <span className="platform-architecture__node-title">{node.title}</span>
                          <span className="platform-architecture__node-tech">{node.technical_name}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </nav>

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
  );
}
