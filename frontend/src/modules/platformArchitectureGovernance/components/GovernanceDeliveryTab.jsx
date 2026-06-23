import { Link } from "react-router-dom";

export default function GovernanceDeliveryTab({ delivery, loading, tenantId }) {
  if (loading) {
    return <p className="platform-governance__status">Загрузка контура доставки…</p>;
  }

  if (!delivery) {
    return <p className="platform-governance__status">Модель контура недоступна.</p>;
  }

  return (
    <div className="platform-governance__delivery">
      <p className="platform-governance__list-caption">
        Reference-модель · {delivery.source_document}
      </p>

      <section className="platform-governance__section">
        <h2>Маршрут изменений</h2>
        <div className="platform-governance__route-chain" aria-label={delivery.route_label}>
          {(delivery.route || []).map((step, index, array) => (
            <div key={step} className="platform-governance__route-step">
              <span className="platform-governance__route-node">{step}</span>
              {index < array.length - 1 ? <span className="platform-governance__route-arrow">↓</span> : null}
            </div>
          ))}
        </div>
      </section>

      <section className="platform-governance__section">
        <h2>Фазы</h2>
        <ol className="platform-governance__phase-list">
          {(delivery.phases || []).map((phase) => (
            <li key={phase.key}>
              <strong>{phase.title}</strong>
              <span>{phase.description}</span>
            </li>
          ))}
        </ol>
      </section>

      {delivery.policies?.length ? (
        <section className="platform-governance__section">
          <h2>Политики применения</h2>
          <ul className="platform-governance__chip-list">
            {delivery.policies.map((policy) => (
              <li key={policy} className="platform-governance__chip">
                {policy}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {delivery.links?.length ? (
        <section className="platform-governance__section">
          <h2>Связанные разделы</h2>
          <ul className="platform-governance__link-list">
            {delivery.links.map((link) => (
              <li key={link.label}>
                {link.target === "platform-releases" ? (
                  <Link
                    className="platform-governance__link"
                    to={`/designer/tenant/${tenantId}/platform-releases`}
                  >
                    {link.label}
                  </Link>
                ) : (
                  <Link
                    className="platform-governance__link"
                    to={`/designer/tenant/${tenantId}/platform-architecture?registry=${link.target}`}
                  >
                    {link.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
