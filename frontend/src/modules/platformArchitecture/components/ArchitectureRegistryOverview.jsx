import { sortRegistriesByTabOrder } from "../config/architectureRegistryConfig";

function StringListSection({ title, items }) {
  if (!Array.isArray(items) || items.length === 0) {
    return null;
  }

  return (
    <section className="platform-architecture__section">
      <h3 className="platform-architecture__section-title">{title}</h3>
      <ul className="platform-architecture__chips">
        {items.map((item) => (
          <li key={item} className="platform-architecture__chip">
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function ArchitectureRegistryOverview({ overview, loading }) {
  if (loading) {
    return <p className="platform-architecture__status">Загрузка обзора реестров…</p>;
  }

  if (!overview) {
    return <p className="platform-architecture__status">Обзор реестров недоступен.</p>;
  }

  const registries = sortRegistriesByTabOrder(overview.registries ?? []);
  const findings = overview.global_findings ?? {};
  const lastScanLabel = overview.last_scan?.scanned_at
    ? new Date(overview.last_scan.scanned_at).toLocaleString("ru-RU")
    : null;

  return (
    <article className="platform-architecture__detail">
      <header className="platform-architecture__overview-header">
        <h2 className="platform-architecture__detail-title">Обзор архитектурных реестров</h2>
        <p className="platform-architecture__detail-tech">
          Всего элементов: {overview.total_elements ?? 0}
          {overview.last_scan?.scanner_version
            ? ` · Сканер v${overview.last_scan.scanner_version}`
            : ""}
          {lastScanLabel ? ` · ${lastScanLabel}` : ""}
        </p>
      </header>

      <section className="platform-architecture__section">
        <h3 className="platform-architecture__section-title">Реестры</h3>
        <div className="platform-architecture__overview-grid">
          {registries.map((registry) => (
            <div key={registry.key} className="platform-architecture__overview-card">
              <span className="platform-architecture__overview-card-title">{registry.title}</span>
              <span className="platform-architecture__overview-card-count">{registry.element_count}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="platform-architecture__section">
        <h3 className="platform-architecture__section-title">Последнее сканирование</h3>
        <dl className="platform-architecture__fields">
          <div className="platform-architecture__field">
            <dt>Дата</dt>
            <dd>
              {overview.last_scan?.scanned_at
                ? new Date(overview.last_scan.scanned_at).toLocaleString("ru-RU")
                : "—"}
            </dd>
          </div>
          <div className="platform-architecture__field">
            <dt>Версия сканера</dt>
            <dd>{overview.last_scan?.scanner_version || "—"}</dd>
          </div>
        </dl>
      </section>

      <section className="platform-architecture__section">
        <h3 className="platform-architecture__section-title">Найдено сканером</h3>
        <div className="platform-architecture__findings">
          {[
            ["Маршрутов", findings.routes ?? 0],
            ["Таблиц", findings.tables ?? 0],
            ["Служб", findings.services ?? 0],
            ["Зависимостей", findings.dependencies ?? 0],
            ["Документов", findings.documents ?? 0],
            ["Файлы правил Cursor", findings.rules ?? 0],
          ].map(([label, value]) => (
            <div key={label} className="platform-architecture__finding">
              <span className="platform-architecture__finding-label">{label}</span>
              <span className="platform-architecture__finding-value">{value}</span>
            </div>
          ))}
        </div>
      </section>
    </article>
  );
}

export { StringListSection };
