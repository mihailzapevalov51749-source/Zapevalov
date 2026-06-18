import { useEffect, useMemo, useState } from "react";

import {
  PAGE_LAYOUT_PAGE_TYPE,
  PAGE_LAYOUT_TOOLBAR_ZONE,
  useResolvedPageLayoutContract,
} from "../../../shared/appShell/pageLayoutContract";
import * as platformModuleUpdateOffersApi from "../api/platformModuleUpdateOffersApi";
import "./controlPlaneModuleUpdateOffersPage.css";

const STATUS_LABELS = {
  available: "Доступно",
  applied: "Применено",
  skipped: "Пропущено",
  expired: "Истекло",
  withdrawn: "Отозвано",
};

export default function ControlPlaneModuleUpdateOffersPage() {
  useResolvedPageLayoutContract({
    pageType: PAGE_LAYOUT_PAGE_TYPE.DASHBOARD,
    toolbarZoneId: PAGE_LAYOUT_TOOLBAR_ZONE.APP_HEADER,
    title: "Обновления модулей",
  });

  const [offers, setOffers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadOffers() {
      setIsLoading(true);
      setError("");

      try {
        const data = await platformModuleUpdateOffersApi.listPlatformModuleUpdateOffers();
        if (!cancelled) {
          setOffers(Array.isArray(data) ? data : []);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            platformModuleUpdateOffersApi.getApiErrorMessage(
              loadError,
              "Не удалось загрузить предложения обновлений",
            ),
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadOffers();

    return () => {
      cancelled = true;
    };
  }, []);

  const sortedOffers = useMemo(
    () =>
      [...offers].sort((left, right) => {
        const tenantCompare = Number(left.tenant_id) - Number(right.tenant_id);
        if (tenantCompare !== 0) {
          return tenantCompare;
        }
        return String(left.module_key || "").localeCompare(String(right.module_key || ""));
      }),
    [offers],
  );

  return (
    <section className="cp-module-offers-page">
      <p className="cp-module-offers-page__intro">
        Read-only обзор предложений обновления модулей по tenant. Apply, Rollback и
        другие действия на этом этапе недоступны.
      </p>

      {isLoading ? <p className="cp-module-offers-page__status">Загрузка…</p> : null}
      {error ? <p className="cp-module-offers-page__error">{error}</p> : null}

      {!isLoading && !error ? (
        <div className="cp-module-offers-page__table-wrap">
          <table className="cp-module-offers-page__table">
            <thead>
              <tr>
                <th>Tenant</th>
                <th>Module</th>
                <th>From</th>
                <th>To</th>
                <th>Status</th>
                <th>Release</th>
              </tr>
            </thead>
            <tbody>
              {sortedOffers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="cp-module-offers-page__empty">
                    Предложения обновлений не найдены.
                  </td>
                </tr>
              ) : (
                sortedOffers.map((offer) => (
                  <tr key={offer.id}>
                    <td>
                      <div>{offer.tenant_name || `Tenant ${offer.tenant_id}`}</div>
                      <code>#{offer.tenant_id}</code>
                    </td>
                    <td>
                      <div>{offer.module_title || offer.module_key}</div>
                      <code>{offer.module_key}</code>
                    </td>
                    <td>{offer.from_version}</td>
                    <td>{offer.to_version}</td>
                    <td>{STATUS_LABELS[offer.status] || offer.status}</td>
                    <td>{offer.release_version || "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
