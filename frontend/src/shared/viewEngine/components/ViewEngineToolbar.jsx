import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

const DEFAULT_QUICK_FILTERS = [
  { key: "all", label: "Все" },
  { key: "today", label: "Сегодня" },
  { key: "active", label: "Активные" },
  { key: "overdue", label: "Просроченные" },
];

/**
 * @deprecated Use modules/objectViews/table/components/ObjectTableViewsBar.
 * Legacy toolbar — disconnected UI stubs, not wired to query.
 */
export default function ViewEngineToolbar({
  viewLabel = "Таблица",
  viewKey = "default_table",
  viewsSettingsPath = null,
  onRefresh,
  refreshing = false,
}) {
  const [activeFilterKey, setActiveFilterKey] = useState("all");
  const [activeRepresentationSlot, setActiveRepresentationSlot] = useState("default");

  const filterItems = useMemo(() => DEFAULT_QUICK_FILTERS, []);

  return (
    <div className="view-engine-toolbar" data-view-engine-toolbar="true">
      <div className="view-engine-toolbar__filters">
        <button
          type="button"
          className="view-engine-toolbar__filters-btn"
          title="Фильтры (скоро)"
          onClick={() => {}}
        >
          Фильтры
        </button>

        <div className="view-engine-toolbar__quick-filters">
          {filterItems.map((filter) => {
            const isActive = activeFilterKey === filter.key;

            return (
              <button
                key={filter.key}
                type="button"
                className={`view-engine-toolbar__chip${isActive ? " is-active" : ""}`}
                onClick={() => setActiveFilterKey(filter.key)}
              >
                {filter.label}
              </button>
            );
          })}

          <button
            type="button"
            className="view-engine-toolbar__chip view-engine-toolbar__chip--more"
            title="Дополнительные фильтры (скоро)"
            onClick={() => {}}
          >
            ...
          </button>
        </div>
      </div>

      <div className="view-engine-toolbar__representations">
        <button
          type="button"
          className={`view-engine-toolbar__rep${activeRepresentationSlot === "default" ? " is-active" : ""}`}
          onClick={() => setActiveRepresentationSlot("default")}
          title={viewKey}
        >
          {viewLabel}
          {viewKey ? ` · ${viewKey}` : ""}
        </button>

        <button
          type="button"
          className={`view-engine-toolbar__rep${activeRepresentationSlot === "slot1" ? " is-active" : ""}`}
          onClick={() => setActiveRepresentationSlot("slot1")}
        >
          Слот 1
        </button>

        <button
          type="button"
          className={`view-engine-toolbar__rep${activeRepresentationSlot === "slot2" ? " is-active" : ""}`}
          onClick={() => setActiveRepresentationSlot("slot2")}
        >
          Слот 2
        </button>

        {viewsSettingsPath ? (
          <Link
            to={viewsSettingsPath}
            className="view-engine-toolbar__add-representation"
            title="Настроить представления"
          >
            + Представление
          </Link>
        ) : (
          <button
            type="button"
            className="view-engine-toolbar__add-representation"
            title="Настроить представления (скоро)"
            onClick={() => {}}
          >
            + Представление
          </button>
        )}

        {typeof onRefresh === "function" ? (
          <button
            type="button"
            className="view-engine-toolbar__refresh"
            onClick={onRefresh}
            disabled={refreshing}
            title="Обновить данные"
          >
            ↻
          </button>
        ) : null}
      </div>
    </div>
  );
}
