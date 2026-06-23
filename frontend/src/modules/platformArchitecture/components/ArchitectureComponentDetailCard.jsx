import { StringListSection } from "./ArchitectureRegistryOverview";

export default function ArchitectureComponentDetailCard({ card }) {
  if (!card) {
    return <p className="platform-architecture__status">Выберите элемент в реестре.</p>;
  }

  return (
    <article className="platform-architecture__detail">
      <h2 className="platform-architecture__detail-title">{card.title}</h2>
      <p className="platform-architecture__detail-tech">Техническое название: {card.technical_name}</p>

      <section className="platform-architecture__section">
        <h3 className="platform-architecture__section-title">Описание</h3>
        <p className="platform-architecture__status">{card.description || "—"}</p>
      </section>

      <section className="platform-architecture__section">
        <h3 className="platform-architecture__section-title">Назначение</h3>
        <p className="platform-architecture__status">{card.purpose || "—"}</p>
      </section>

      <StringListSection title="Backend файлы" items={card.backend_files} />
      <StringListSection title="Frontend файлы" items={card.frontend_files} />

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
