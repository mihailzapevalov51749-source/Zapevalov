function RelatedChipList({ items }) {
  if (!Array.isArray(items) || items.length === 0) {
    return <p className="platform-architecture__status">—</p>;
  }

  return (
    <ul className="platform-architecture__chips">
      {items.map((item) => (
        <li key={item.key} className="platform-architecture__chip" title={item.technical_name}>
          {item.title}
        </li>
      ))}
    </ul>
  );
}

function FindingGrid({ findings }) {
  const rows = [
    ["Маршрутов", findings?.routes ?? 0],
    ["Таблиц", findings?.tables ?? 0],
    ["Служб", findings?.services ?? 0],
    ["Зависимостей", findings?.dependencies ?? 0],
    ["Документов", findings?.documents ?? 0],
    ["Правил", findings?.rules ?? 0],
  ];

  return (
    <div className="platform-architecture__findings">
      {rows.map(([label, value]) => (
        <div key={label} className="platform-architecture__finding">
          <span className="platform-architecture__finding-label">{label}</span>
          <span className="platform-architecture__finding-value">{value}</span>
        </div>
      ))}
    </div>
  );
}

export default function ArchitectureComponentDetailCard({ card }) {
  if (!card) {
    return <p className="platform-architecture__status">Выберите элемент в дереве архитектуры.</p>;
  }

  const pathItems = card.place_in_architecture?.path ?? [];
  const pathLabel = pathItems.map((item) => item.title).join(" → ") || "—";

  return (
    <article className="platform-architecture__detail">
      <h2 className="platform-architecture__detail-title">{card.title}</h2>
      <p className="platform-architecture__detail-tech">Техническое название: {card.technical_name}</p>

      <section className="platform-architecture__section">
        <h3 className="platform-architecture__section-title">Общая информация</h3>
        <dl className="platform-architecture__fields">
          <div className="platform-architecture__field">
            <dt>Категория</dt>
            <dd>{card.category_label || card.category_key}</dd>
          </div>
          <div className="platform-architecture__field">
            <dt>Описание</dt>
            <dd>{card.description || "—"}</dd>
          </div>
          <div className="platform-architecture__field">
            <dt>Назначение</dt>
            <dd>{card.purpose || "—"}</dd>
          </div>
        </dl>
      </section>

      <section className="platform-architecture__section">
        <h3 className="platform-architecture__section-title">Место в архитектуре</h3>
        <dl className="platform-architecture__fields">
          <div className="platform-architecture__field">
            <dt>Путь</dt>
            <dd>{pathLabel}</dd>
          </div>
        </dl>
        <h4 className="platform-architecture__section-title">Дочерние элементы</h4>
        <RelatedChipList items={card.place_in_architecture?.children} />
      </section>

      <section className="platform-architecture__section">
        <h3 className="platform-architecture__section-title">Использует</h3>
        <RelatedChipList items={card.uses} />
      </section>

      <section className="platform-architecture__section">
        <h3 className="platform-architecture__section-title">Используется</h3>
        <RelatedChipList items={card.used_by} />
      </section>

      <section className="platform-architecture__section">
        <h3 className="platform-architecture__section-title">Данные</h3>
        <RelatedChipList items={card.data} />
      </section>

      <section className="platform-architecture__section">
        <h3 className="platform-architecture__section-title">Архитектурные решения</h3>
        <RelatedChipList items={card.decisions} />
      </section>

      <section className="platform-architecture__section">
        <h3 className="platform-architecture__section-title">Архитектурные запреты</h3>
        <RelatedChipList items={card.restrictions} />
      </section>

      <section className="platform-architecture__section">
        <h3 className="platform-architecture__section-title">Фактически найдено</h3>
        <FindingGrid findings={card.findings} />
      </section>

      <section className="platform-architecture__section">
        <h3 className="platform-architecture__section-title">Источники</h3>
        <RelatedChipList
          items={(card.sources || []).map((source, index) => ({
            key: `${source}-${index}`,
            title: source,
            technical_name: source,
          }))}
        />
      </section>

      <section className="platform-architecture__section">
        <h3 className="platform-architecture__section-title">Последняя проверка</h3>
        <dl className="platform-architecture__fields">
          <div className="platform-architecture__field">
            <dt>Дата сканирования</dt>
            <dd>{card.last_scan?.scanned_at ? new Date(card.last_scan.scanned_at).toLocaleString("ru-RU") : "—"}</dd>
          </div>
          <div className="platform-architecture__field">
            <dt>Версия сканирования</dt>
            <dd>{card.last_scan?.scanner_version || "—"}</dd>
          </div>
        </dl>
      </section>
    </article>
  );
}
