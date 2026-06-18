import TenantEnvironmentBadge from "../../../shared/tenantEnvironment/TenantEnvironmentBadge";

import { resolveTenantEnvironment } from "../../../shared/tenantEnvironment/tenantEnvironment";

import PlatformVersionStatusBadge from "./PlatformVersionStatusBadge";



const ENVIRONMENT_ACCENT = {

  DEV: "#DC2626",

  TEMPLATE: "#EA580C",

};



function formatDateTime(value) {

  if (!value) {

    return "—";

  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {

    return String(value);

  }

  return date.toLocaleString("ru-RU");

}



export default function PlatformEnvironmentVersionCard({ row, environmentTitle, empty = false }) {

  const environmentKey = String(row?.environment_key || "").toUpperCase();

  const accent = ENVIRONMENT_ACCENT[environmentKey] || "#64748b";

  const environment = row

    ? resolveTenantEnvironment({

        tenantId: row.tenant_id,

        tenantType: environmentKey,

      })

    : null;

  const title = environmentTitle || environmentKey || "—";



  if (empty) {

    return (

      <article

        className="platform-versions-page__env-card platform-versions-page__env-card--empty"

        style={{ "--env-accent": accent }}

      >

        <div className="platform-versions-page__env-card-head">

          {environment ? (

            <TenantEnvironmentBadge environment={environment} />

          ) : (

            <span className="platform-versions-page__env-label">{title}</span>

          )}

        </div>

        <p className="platform-versions-page__env-empty">Версия не зарегистрирована</p>

      </article>

    );

  }



  return (

    <article

      className="platform-versions-page__env-card"

      style={{ "--env-accent": accent }}

    >

      <div className="platform-versions-page__env-card-head">

        <div className="platform-versions-page__env-card-title">

          {environment ? <TenantEnvironmentBadge environment={environment} /> : null}

          <h3 className="platform-versions-page__env-name">{title}</h3>

        </div>

        <PlatformVersionStatusBadge status={row.status} />

      </div>



      <p className="platform-versions-page__env-version-label">Версия</p>

      <div className="platform-versions-page__env-version" title="Текущая версия платформы">

        {row.platform_version || "—"}

      </div>



      <dl className="platform-versions-page__env-meta">

        <div>

          <dt>Установлена</dt>

          <dd>{formatDateTime(row.installed_at)}</dd>

        </div>

        <div>

          <dt>Кем</dt>

          <dd>{row.installed_by_name || "—"}</dd>

        </div>

      </dl>

    </article>

  );

}

