import { buildTrashDependencySummaryCounts } from "../../services/trashDependencyPresentation";

function TrashDependencyItem({ item, onOpenRoute }) {
  return (
    <li className="designer-trash-deps__item">
      <div className="designer-trash-deps__item-title">• {item.title}</div>
      {item.contextLine ? (
        <div className="designer-trash-deps__item-context">{item.contextLine}</div>
      ) : null}
      <div className="designer-trash-deps__item-location">
        <span className="designer-trash-deps__item-location-label">Расположение:</span>{" "}
        {item.locationText}
      </div>
      {item.canOpen ? (
        <button
          type="button"
          className="designer-btn designer-btn--compact designer-trash-deps__open"
          onClick={() => onOpenRoute?.(item.route)}
        >
          Открыть
        </button>
      ) : null}
    </li>
  );
}

export function TrashDependenciesSummary({ groups }) {
  const lines = buildTrashDependencySummaryCounts(groups);
  return (
    <ul className="designer-trash-deps__summary">
      {lines.map((line) => (
        <li key={line.key}>
          {line.label}: {line.count}
        </li>
      ))}
    </ul>
  );
}

/**
 * @param {{
 *   groups: Array<{ groupKey: string, groupLabel: string, count: number, items: Array }>,
 *   onOpenRoute?: (route: string) => void,
 *   showSummary?: boolean,
 * }} props
 */
export default function TrashDependenciesView({
  groups,
  onOpenRoute,
  showSummary = false,
}) {
  if (!Array.isArray(groups) || groups.length === 0) {
    return null;
  }

  return (
    <div className="designer-trash-deps">
      {showSummary ? <TrashDependenciesSummary groups={groups} /> : null}
      {groups.map((group) => (
        <section key={group.groupKey} className="designer-trash-deps__group">
          <h4 className="designer-trash-deps__group-title">
            {group.groupLabel} ({group.count})
          </h4>
          <ul className="designer-trash-deps__list">
            {group.items.map((item) => (
              <TrashDependencyItem
                key={item.id}
                item={item}
                onOpenRoute={onOpenRoute}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
