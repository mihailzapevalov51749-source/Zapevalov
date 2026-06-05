import { useMemo, useState } from "react";

const SEARCH_THRESHOLD = 20;

function matchesSearch(item, query) {
  if (!query) {
    return true;
  }
  const haystack = [item.title, item.contextLine, item.locationText, item.rawLabel]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
}

function DependencyGroupCard({ group, onOpenRoute }) {
  return (
    <article className="designer-trash-purge-deps__group-card">
      <h5 className="designer-trash-purge-deps__group-title">
        {group.groupLabel} ({group.items.length})
      </h5>
      <ul className="designer-trash-purge-deps__list">
        {group.items.map((item) => (
          <li key={item.id} className="designer-trash-purge-deps__item">
            <div className="designer-trash-purge-deps__item-main">
              {item.contextLine ? (
                <div className="designer-trash-purge-deps__item-meta">{item.contextLine}</div>
              ) : null}
              <div className="designer-trash-purge-deps__item-meta">
                <span className="designer-trash-purge-deps__item-meta-label">Расположение:</span>{" "}
                {item.locationText}
              </div>
            </div>
            {item.canOpen ? (
              <button
                type="button"
                className="designer-btn designer-btn--compact designer-trash-purge-deps__open"
                onClick={() => onOpenRoute?.(item.route)}
              >
                Открыть
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </article>
  );
}

export default function TrashPurgeDependenciesPanel({
  groups = [],
  totalCount = 0,
  onOpenRoute,
}) {
  const [searchText, setSearchText] = useState("");
  const normalizedQuery = searchText.trim().toLowerCase();

  const filteredGroups = useMemo(() => {
    if (!normalizedQuery) {
      return groups;
    }
    return groups
      .map((group) => ({
        ...group,
        items: (group.items || []).filter((item) => matchesSearch(item, normalizedQuery)),
      }))
      .filter((group) => group.items.length > 0);
  }, [groups, normalizedQuery]);

  if (!groups.length) {
    return null;
  }

  return (
    <section
      id="trash-purge-deps-section"
      className="designer-trash-purge-deps"
      aria-label="Зависимости"
    >
      <div className="designer-trash-purge-deps__header">
        <h4 className="designer-trash-purge-deps__section-title">Зависимости</h4>
        <p className="designer-trash-purge-deps__total">Всего: {totalCount}</p>
      </div>

      {totalCount > SEARCH_THRESHOLD ? (
        <input
          type="search"
          className="designer-trash-purge-deps__search"
          placeholder="Поиск по зависимостям..."
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
        />
      ) : null}

      <div className="designer-trash-purge-deps__groups">
        {filteredGroups.map((group) => (
          <DependencyGroupCard key={group.groupKey} group={group} onOpenRoute={onOpenRoute} />
        ))}
      </div>
    </section>
  );
}
