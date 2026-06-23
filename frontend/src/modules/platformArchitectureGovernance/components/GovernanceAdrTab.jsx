const STATUS_LABELS = {
  accepted: "Принятые",
  in_progress: "В работе",
  archived: "Архивные",
};

export default function GovernanceAdrTab({
  adrList,
  adrDetail,
  loadingList,
  loadingDetail,
  selectedSlug,
  onSelectSlug,
}) {
  if (loadingList) {
    return <p className="platform-governance__status">Загрузка ADR…</p>;
  }

  const items = adrList?.items ?? [];

  return (
    <div className="platform-governance__layout">
      <aside className="platform-governance__list">
        <p className="platform-governance__list-caption">
          Источник: docs/architecture/adr/*.md
        </p>
        {items.length ? (
          <ul className="platform-governance__norm-list">
            {items.map((item) => {
              const isActive = item.slug === selectedSlug;
              return (
                <li key={item.slug}>
                  <button
                    type="button"
                    className={`platform-governance__norm-btn${isActive ? " is-active" : ""}`}
                    onClick={() => onSelectSlug(item.slug)}
                  >
                    <span className="platform-governance__adr-slug">{item.slug}</span>
                    <span>{item.title}</span>
                    <span className="platform-governance__adr-status">
                      {STATUS_LABELS[item.status_group] || item.status}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="platform-governance__status">ADR не найдены.</p>
        )}
      </aside>

      <article className="platform-governance__detail">
        {loadingDetail ? (
          <p className="platform-governance__status">Загрузка карточки ADR…</p>
        ) : adrDetail ? (
          <>
            <h2 className="platform-governance__detail-title">{adrDetail.title}</h2>
            <dl className="platform-governance__fields">
              <div>
                <dt>Slug</dt>
                <dd>{adrDetail.slug}</dd>
              </div>
              <div>
                <dt>Статус</dt>
                <dd>{adrDetail.status}</dd>
              </div>
              <div>
                <dt>Дата</dt>
                <dd>{adrDetail.date || "—"}</dd>
              </div>
              <div>
                <dt>Документ</dt>
                <dd>{adrDetail.document_path}</dd>
              </div>
            </dl>

            {adrDetail.summary ? (
              <section className="platform-governance__section">
                <h3>Краткое описание</h3>
                <p>{adrDetail.summary}</p>
              </section>
            ) : null}

            <SectionList title="Связанные ADR" items={adrDetail.related_adrs} />
            <SectionList title="Связанные категории" items={adrDetail.related_categories} />
            <SectionList title="Связанные службы" items={adrDetail.related_services} />
          </>
        ) : (
          <p className="platform-governance__status">Выберите ADR в списке.</p>
        )}
      </article>
    </div>
  );
}

function SectionList({ title, items }) {
  const values = Array.isArray(items) ? items.filter(Boolean) : [];
  if (!values.length) {
    return null;
  }
  return (
    <section className="platform-governance__section">
      <h3>{title}</h3>
      <ul className="platform-governance__chip-list">
        {values.map((item) => (
          <li key={item} className="platform-governance__chip">
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}
