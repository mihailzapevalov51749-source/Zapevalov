function formatReadiness(readiness) {
  if (readiness == null || Number.isNaN(readiness)) {
    return "Нет данных для расчёта";
  }
  return `${readiness}%`;
}

function WorkList({ icon, title, items, emptyMessage }) {
  return (
    <section className="platform-dev__owner-work-block">
      <h4 className="platform-dev__owner-work-title">{title}</h4>
      {items?.length ? (
        <ul className="platform-dev__owner-work-list">
          {items.map((item) => (
            <li key={item} className="platform-dev__owner-work-item">
              <span className="platform-dev__owner-work-icon" aria-hidden="true">
                {icon}
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="platform-dev__owner-work-empty">{emptyMessage}</p>
      )}
    </section>
  );
}

export default function OwnerStageDetailPanel({ stage, emptyMessage }) {
  if (!stage) {
    return (
      <div className="platform-dev__detail-empty">
        <p>{emptyMessage || "Выберите этап в списке слева."}</p>
      </div>
    );
  }

  return (
    <div className="platform-dev__detail-view platform-dev__detail-view--owner">
      <h3 className="platform-dev__detail-view-title">{stage.title}</h3>

      <section className="platform-dev__owner-readiness">
        <p className="platform-dev__owner-readiness-label">Готовность</p>
        <p className="platform-dev__owner-readiness-value">
          {formatReadiness(stage.readiness)}
        </p>
        {stage.ownerStatus ? (
          <p className="platform-dev__owner-readiness-status">{stage.ownerStatus}</p>
        ) : null}
      </section>

      <WorkList
        icon="✓"
        title="Сделано"
        items={stage.done}
        emptyMessage="Пока нет завершённых шагов."
      />
      <WorkList
        icon="•"
        title="В работе"
        items={stage.inWork}
        emptyMessage="Сейчас нет активных шагов."
      />
      <WorkList
        icon="□"
        title="Осталось выполнить"
        items={stage.remaining}
        emptyMessage="Все шаги этапа выполнены."
      />
    </div>
  );
}
