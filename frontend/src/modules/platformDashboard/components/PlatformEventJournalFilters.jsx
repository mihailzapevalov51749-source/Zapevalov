import {
  JOURNAL_EVENT_CATEGORY_ALL,
  JOURNAL_EVENT_TYPE_ALL,
  JOURNAL_SORT_NEWEST,
  JOURNAL_SORT_OLDEST,
} from "../utils/filterPlatformEventJournalEntries";
import { useFrozenFilterWidths } from "../utils/useFrozenFilterWidths";
import PlatformEventJournalDateFilter from "./PlatformEventJournalDateFilter";

import "./platformEventJournalFilters.css";

export default function PlatformEventJournalFilters({
  categories = [],
  eventTypes = [],
  searchQuery = "",
  eventTypeKey = JOURNAL_EVENT_TYPE_ALL,
  eventCategoryKey = JOURNAL_EVENT_CATEGORY_ALL,
  dateFilter = null,
  sortDirection = JOURNAL_SORT_NEWEST,
  disabled = false,
  onSearchQueryChange,
  onEventTypeKeyChange,
  onEventCategoryKeyChange,
  onDateFilterChange,
  onSortDirectionChange,
}) {
  const isNewestFirst = sortDirection === JOURNAL_SORT_NEWEST;
  const sortLabel = isNewestFirst ? "Новые сверху" : "Старые сверху";
  const { category: categoryWidth, eventType: eventTypeWidth, date: dateWidth } =
    useFrozenFilterWidths(categories, eventTypes);

  const handleToggleSort = () => {
    onSortDirectionChange?.(
      isNewestFirst ? JOURNAL_SORT_OLDEST : JOURNAL_SORT_NEWEST,
    );
  };

  return (
    <section
      className="platform-event-journal-filters"
      aria-label="Фильтры журнала событий"
    >
      <label className="platform-event-journal-filters__field platform-event-journal-filters__field--search">
        <span className="platform-event-journal-filters__label">Поиск</span>
        <input
          type="search"
          className="platform-event-journal-filters__input"
          value={searchQuery}
          disabled={disabled}
          placeholder="Название, описание, тип, автор"
          onChange={(event) => onSearchQueryChange?.(event.target.value)}
        />
      </label>

      <label
        className="platform-event-journal-filters__field platform-event-journal-filters__field--category"
        style={{ width: `${categoryWidth}px`, flexBasis: `${categoryWidth}px` }}
      >
        <span className="platform-event-journal-filters__label">Категория</span>
        <select
          className="platform-event-journal-filters__select"
          value={eventCategoryKey}
          disabled={disabled}
          onChange={(event) => onEventCategoryKeyChange?.(event.target.value)}
        >
          <option value={JOURNAL_EVENT_CATEGORY_ALL}>Все</option>
          {categories.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </label>

      <label
        className="platform-event-journal-filters__field platform-event-journal-filters__field--type"
        style={{ width: `${eventTypeWidth}px`, flexBasis: `${eventTypeWidth}px` }}
      >
        <span className="platform-event-journal-filters__label">Тип события</span>
        <select
          className="platform-event-journal-filters__select"
          value={eventTypeKey}
          disabled={disabled}
          onChange={(event) => onEventTypeKeyChange?.(event.target.value)}
        >
          <option value={JOURNAL_EVENT_TYPE_ALL}>Все</option>
          {eventTypes.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </label>

      <div
        className="platform-event-journal-filters__field platform-event-journal-filters__field--date"
        style={{ width: `${dateWidth}px`, flexBasis: `${dateWidth}px` }}
      >
        <PlatformEventJournalDateFilter
          value={dateFilter}
          disabled={disabled}
          onChange={onDateFilterChange}
        />
      </div>

      <div className="platform-event-journal-filters__field platform-event-journal-filters__field--sort">
        <button
          type="button"
          className={`platform-event-journal-filters__sort-toggle${
            isNewestFirst ? "" : " is-oldest-first"
          }`}
          onClick={handleToggleSort}
          disabled={disabled}
          title={sortLabel}
          aria-label={sortLabel}
        >
          <span className="platform-event-journal-filters__sort-icon" aria-hidden="true">
            ⇅
          </span>
        </button>
      </div>
    </section>
  );
}
