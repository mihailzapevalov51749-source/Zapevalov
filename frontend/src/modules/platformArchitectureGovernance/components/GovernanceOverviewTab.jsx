import { Link } from "react-router-dom";

export default function GovernanceOverviewTab({ overview, loading, tenantId }) {
  if (loading) {
    return <p className="platform-governance__status">Загрузка обзора…</p>;
  }

  if (!overview) {
    return <p className="platform-governance__status">Нет данных обзора.</p>;
  }

  const releasesPath = `/designer/tenant/${tenantId}/${overview.releases_path || "platform-releases"}`;
  const activeRelease = overview.active_release;

  return (
    <div className="platform-governance__overview-grid">
      <section className="platform-governance__card">
        <h2 className="platform-governance__card-title">Конституция</h2>
        <p className="platform-governance__card-value">{overview.constitution_norms_count}</p>
        <p className="platform-governance__card-caption">норм конституции</p>
      </section>

      <section className="platform-governance__card">
        <h2 className="platform-governance__card-title">ADR</h2>
        <dl className="platform-governance__stats">
          <div>
            <dt>Всего</dt>
            <dd>{overview.adr_total}</dd>
          </div>
          <div>
            <dt>Принятые</dt>
            <dd>{overview.adr_accepted}</dd>
          </div>
          <div>
            <dt>В работе</dt>
            <dd>{overview.adr_in_progress}</dd>
          </div>
          <div>
            <dt>Архивные</dt>
            <dd>{overview.adr_archived}</dd>
          </div>
        </dl>
      </section>

      <section className="platform-governance__card">
        <h2 className="platform-governance__card-title">Контур доставки</h2>
        <p className="platform-governance__route">{overview.delivery_route}</p>
      </section>

      <section className="platform-governance__card">
        <h2 className="platform-governance__card-title">Релизы</h2>
        {activeRelease?.title ? (
          <p className="platform-governance__release-active">
            Активный релиз: <strong>{activeRelease.title}</strong>
            {activeRelease.version ? ` (${activeRelease.version})` : ""}
          </p>
        ) : (
          <p className="platform-governance__card-caption">Активный релиз не определён</p>
        )}
        <p className="platform-governance__card-caption">
          Всего релизов: {overview.releases_total_count}
        </p>
        <Link className="platform-governance__link" to={releasesPath}>
          Перейти в «Релизы платформы»
        </Link>
      </section>
    </div>
  );
}
