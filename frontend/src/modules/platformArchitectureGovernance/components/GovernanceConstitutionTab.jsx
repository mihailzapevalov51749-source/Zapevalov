export default function GovernanceConstitutionTab({ constitution, loading, selectedNorm, onSelectNorm }) {
  if (loading) {
    return <p className="platform-governance__status">Загрузка конституции…</p>;
  }

  if (!constitution?.norms?.length) {
    return <p className="platform-governance__status">Нормы конституции недоступны.</p>;
  }

  const activeNorm =
    constitution.norms.find((item) => item.number === selectedNorm) ?? constitution.norms[0];

  return (
    <div className="platform-governance__layout">
      <aside className="platform-governance__list">
        <p className="platform-governance__list-caption">
          Read-only projection · {constitution.source_document}
        </p>
        <ul className="platform-governance__norm-list">
          {constitution.norms.map((norm) => {
            const isActive = norm.number === activeNorm.number;
            return (
              <li key={norm.number}>
                <button
                  type="button"
                  className={`platform-governance__norm-btn${isActive ? " is-active" : ""}`}
                  onClick={() => onSelectNorm(norm.number)}
                >
                  <span className="platform-governance__norm-number">{norm.number}.</span>
                  <span>{norm.title}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      <article className="platform-governance__detail">
        <h2 className="platform-governance__detail-title">
          {activeNorm.number}. {activeNorm.title}
        </h2>
        {activeNorm.criticality ? (
          <p className="platform-governance__badge">Критичность: {activeNorm.criticality}</p>
        ) : null}

        {activeNorm.description ? (
          <section className="platform-governance__section">
            <h3>Описание</h3>
            <p>{activeNorm.description}</p>
          </section>
        ) : null}

        <SectionList title="Связанные запреты" items={activeNorm.linked_restrictions} empty="Derived index пуст." />
        <SectionList title="Связанные ADR" items={activeNorm.related_adrs} />
        <SectionList title="Связанные категории архитектуры" items={activeNorm.related_categories} />
      </article>
    </div>
  );
}

function SectionList({ title, items, empty = "—" }) {
  const values = Array.isArray(items) ? items.filter(Boolean) : [];
  return (
    <section className="platform-governance__section">
      <h3>{title}</h3>
      {values.length ? (
        <ul className="platform-governance__chip-list">
          {values.map((item) => (
            <li key={item} className="platform-governance__chip">
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="platform-governance__muted">{empty}</p>
      )}
    </section>
  );
}
