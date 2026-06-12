import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "react-router-dom";

import { getApiErrorMessage } from "../../designer/api/platformApiClient";
import { bootstrapPlatformSettings } from "../../../shared/platformSettings/bootstrapPlatformSettings.js";
import {
  PAGE_LAYOUT_PAGE_TYPE,
  PAGE_LAYOUT_TOOLBAR_ZONE,
  useResolvedPageLayoutContract,
} from "../../../shared/appShell/pageLayoutContract";
import PlatformEventJournalFilters from "../components/PlatformEventJournalFilters";
import * as platformEventJournalApi from "../api/platformEventJournalApi";
import { formatAbsoluteDateTime } from "../utils/formatDateTime";
import {
  filterPlatformEventJournalEntries,
  JOURNAL_EVENT_CATEGORY_ALL,
  JOURNAL_EVENT_TYPE_ALL,
  JOURNAL_SORT_NEWEST,
  resolveJournalSelectedEntryId,
} from "../utils/filterPlatformEventJournalEntries";
import {
  mapJournalApiEntriesToUi,
  sortJournalEntries,
} from "../utils/mapPlatformEventJournalEntry";

import "./platformEventJournalPage.css";

function formatJournalTenantCompanyLabel(entry) {
  if (!entry) {
    return "—";
  }

  if (entry.targetName && entry.targetName !== "—") {
    return entry.targetName;
  }

  const parts = [];
  if (entry.tenantId && entry.tenantId !== "—") {
    parts.push(`Tenant ${entry.tenantId}`);
  }
  if (entry.companyId && entry.companyId !== "—" && entry.companyId !== entry.tenantId) {
    parts.push(`Company ${entry.companyId}`);
  }

  return parts.length > 0 ? parts.join(" · ") : "—";
}

function JournalEntryDetailCard({ entry, isTenantJournal }) {
  if (!entry) {
    return (
      <p className="platform-event-journal__status">Выберите событие в списке.</p>
    );
  }

  return (
    <>
      <h2 className="platform-event-journal__detail-title">{entry.title}</h2>
      <dl className="platform-event-journal__fields">
        <div className="platform-event-journal__group">
          <div className="platform-event-journal__field">
            <dt>Дата</dt>
            <dd>{formatAbsoluteDateTime(entry.createdAt)}</dd>
          </div>
          <div className="platform-event-journal__field">
            <dt>Автор</dt>
            <dd>{entry.author}</dd>
          </div>
        </div>

        {isTenantJournal ? (
          <div className="platform-event-journal__group">
            <div className="platform-event-journal__field">
              <dt>Категория</dt>
              <dd>{entry.eventCategory}</dd>
            </div>
            <div className="platform-event-journal__field">
              <dt>Тип события</dt>
              <dd>{entry.eventType}</dd>
            </div>
          </div>
        ) : (
          <>
            <div className="platform-event-journal__group">
              <div className="platform-event-journal__field">
                <dt>Категория</dt>
                <dd>{entry.eventCategory}</dd>
              </div>
              <div className="platform-event-journal__field">
                <dt>Тип события</dt>
                <dd>{entry.eventType}</dd>
              </div>
            </div>
            <div className="platform-event-journal__group platform-event-journal__group--single">
              <div className="platform-event-journal__field platform-event-journal__field--wide">
                <dt>Тенант / Компания</dt>
                <dd>{formatJournalTenantCompanyLabel(entry)}</dd>
              </div>
            </div>
          </>
        )}

        <div className="platform-event-journal__group platform-event-journal__group--description">
          <div className="platform-event-journal__field platform-event-journal__field--wide">
            <dt>Описание</dt>
            <dd>{entry.description || "—"}</dd>
          </div>
        </div>
      </dl>
    </>
  );
}

export default function PlatformEventJournalPage() {
  useResolvedPageLayoutContract({
    pageType: PAGE_LAYOUT_PAGE_TYPE.STUDIO_SECTION,
    toolbarZoneId: PAGE_LAYOUT_TOOLBAR_ZONE.APP_HEADER,
    canMinimize: true,
  });

  const { tenantId } = useParams();
  const location = useLocation();
  const isTenantJournal = Boolean(
    tenantId && /\/designer\/tenant\/\d+\/event-journal(?:\/|$)/.test(location.pathname),
  );
  const [allEntries, setAllEntries] = useState([]);
  const [selectedEntryId, setSelectedEntryId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [eventTypeKey, setEventTypeKey] = useState(JOURNAL_EVENT_TYPE_ALL);
  const [eventCategoryKey, setEventCategoryKey] = useState(JOURNAL_EVENT_CATEGORY_ALL);
  const [dateFilter, setDateFilter] = useState(null);
  const [sortDirection, setSortDirection] = useState(JOURNAL_SORT_NEWEST);
  const [filterOptions, setFilterOptions] = useState({ categories: [], eventTypes: [] });

  const loadJournal = useCallback(async () => {
    setIsLoading(true);
    setLoadError("");

    try {
      if (!isTenantJournal) {
        await bootstrapPlatformSettings();
      }

      const [items, options] = await Promise.all([
        isTenantJournal
          ? platformEventJournalApi.listTenantEventJournalEntries(tenantId)
          : platformEventJournalApi.listPlatformEventJournalEntries(),
        isTenantJournal
          ? platformEventJournalApi.getTenantEventJournalFilterOptions(tenantId)
          : platformEventJournalApi.getPlatformEventJournalFilterOptions(),
      ]);

      setFilterOptions(options);
      setEventCategoryKey(JOURNAL_EVENT_CATEGORY_ALL);
      setEventTypeKey(JOURNAL_EVENT_TYPE_ALL);

      const sortedEntries = sortJournalEntries(mapJournalApiEntriesToUi(items), "desc");
      setAllEntries(sortedEntries);
      setSelectedEntryId((previous) =>
        resolveJournalSelectedEntryId(sortedEntries, previous),
      );
    } catch (error) {
      setLoadError(getApiErrorMessage(error, "Не удалось загрузить журнал событий"));
      setAllEntries([]);
      setSelectedEntryId(null);
    } finally {
      setIsLoading(false);
    }
  }, [isTenantJournal, tenantId]);

  useEffect(() => {
    loadJournal();
  }, [loadJournal]);

  const filteredEntries = useMemo(
    () =>
      filterPlatformEventJournalEntries(allEntries, {
        searchQuery,
        eventTypeKey,
        eventCategoryKey,
        dateFilter,
        sortDirection,
      }),
    [allEntries, searchQuery, eventTypeKey, eventCategoryKey, dateFilter, sortDirection],
  );

  useEffect(() => {
    setSelectedEntryId((previous) =>
      resolveJournalSelectedEntryId(filteredEntries, previous),
    );
  }, [filteredEntries]);

  const selectedEntry = useMemo(
    () => filteredEntries.find((entry) => entry.id === selectedEntryId) ?? null,
    [filteredEntries, selectedEntryId],
  );

  const hasAnyEntries = allEntries.length > 0;
  const hasFilteredEntries = filteredEntries.length > 0;

  return (
    <div className="platform-event-journal">
      <header className="platform-event-journal__header">
        <h1 className="platform-event-journal__title">Журнал событий</h1>
        <p className="platform-event-journal__subtitle">
          {isTenantJournal
            ? "События Studio текущей компании"
            : "Аудит действий Control Plane"}
        </p>
      </header>

      {loadError ? (
        <p className="platform-event-journal__status platform-event-journal__status--error">
          {loadError}
        </p>
      ) : null}

      {isLoading ? (
        <p className="platform-event-journal__status">Загрузка журнала...</p>
      ) : null}

      {!isLoading && !hasAnyEntries ? (
        <p className="platform-event-journal__status">Событий пока нет.</p>
      ) : null}

      {!isLoading && hasAnyEntries ? (
        <>
          <PlatformEventJournalFilters
            categories={filterOptions.categories}
            eventTypes={filterOptions.eventTypes}
            searchQuery={searchQuery}
            eventTypeKey={eventTypeKey}
            eventCategoryKey={eventCategoryKey}
            dateFilter={dateFilter}
            sortDirection={sortDirection}
            onSearchQueryChange={setSearchQuery}
            onEventTypeKeyChange={setEventTypeKey}
            onEventCategoryKeyChange={setEventCategoryKey}
            onDateFilterChange={setDateFilter}
            onSortDirectionChange={setSortDirection}
          />

          {!hasFilteredEntries ? (
            <div className="platform-event-journal__empty" role="status">
              <p className="platform-event-journal__empty-title">События не найдены</p>
              <p className="platform-event-journal__empty-hint">
                Измените фильтры или очистите период.
              </p>
            </div>
          ) : (
            <div className="platform-event-journal__layout">
              <ul className="platform-event-journal__list" aria-label="Журнал событий">
                {filteredEntries.map((entry) => {
                  const isSelected = entry.id === selectedEntryId;
                  return (
                    <li key={entry.id}>
                      <button
                        type="button"
                        className={`platform-event-journal__row${isSelected ? " is-selected" : ""}`}
                        onClick={() => setSelectedEntryId(entry.id)}
                        aria-pressed={isSelected}
                      >
                        <span className="platform-event-journal__cell platform-event-journal__cell--date">
                          {entry.dateLabel}
                        </span>
                        <span className="platform-event-journal__separator" aria-hidden="true">
                          |
                        </span>
                        <span
                          className="platform-event-journal__cell platform-event-journal__cell--title"
                          title={entry.title}
                        >
                          {entry.title}
                        </span>
                        <span className="platform-event-journal__separator" aria-hidden="true">
                          |
                        </span>
                        <span
                          className="platform-event-journal__cell platform-event-journal__cell--category"
                          title={entry.eventCategory}
                        >
                          {entry.eventCategory}
                        </span>
                        <span className="platform-event-journal__separator" aria-hidden="true">
                          |
                        </span>
                        <span
                          className="platform-event-journal__cell platform-event-journal__cell--type"
                          title={entry.eventType}
                        >
                          {entry.eventType}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>

              <section
                className="platform-event-journal__detail"
                aria-label="Детали события"
              >
                <JournalEntryDetailCard
                  entry={selectedEntry}
                  isTenantJournal={isTenantJournal}
                />
              </section>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
