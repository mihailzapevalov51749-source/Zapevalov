import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

import { getApiErrorMessage } from "../../designer/api/platformApiClient";
import {
  PAGE_LAYOUT_PAGE_TYPE,
  PAGE_LAYOUT_TOOLBAR_ZONE,
  useResolvedPageLayoutContract,
} from "../../../shared/appShell/pageLayoutContract";
import * as platformEventJournalApi from "../api/platformEventJournalApi";
import { formatAbsoluteDateTime } from "../utils/formatDateTime";
import {
  mapJournalApiEntriesToUi,
  sortJournalEntries,
} from "../utils/mapPlatformEventJournalEntry";

import "./platformEventJournalPage.css";

export default function PlatformEventJournalPage() {
  useResolvedPageLayoutContract({
    pageType: PAGE_LAYOUT_PAGE_TYPE.STUDIO_SECTION,
    toolbarZoneId: PAGE_LAYOUT_TOOLBAR_ZONE.APP_HEADER,
    canMinimize: true,
  });

  const { tenantId } = useParams();
  const [entries, setEntries] = useState([]);
  const [selectedEntryId, setSelectedEntryId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const loadJournal = useCallback(async () => {
    setIsLoading(true);
    setLoadError("");

    try {
      const items = await platformEventJournalApi.listPlatformEventJournalEntries();
      const sortedEntries = sortJournalEntries(mapJournalApiEntriesToUi(items), "desc");
      setEntries(sortedEntries);
      setSelectedEntryId((previous) => {
        if (
          previous != null
          && sortedEntries.some((entry) => entry.id === previous)
        ) {
          return previous;
        }
        return sortedEntries[0]?.id ?? null;
      });
    } catch (error) {
      setLoadError(getApiErrorMessage(error, "Не удалось загрузить журнал событий"));
      setEntries([]);
      setSelectedEntryId(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadJournal();
  }, [loadJournal, tenantId]);

  const selectedEntry = useMemo(
    () => entries.find((entry) => entry.id === selectedEntryId) ?? null,
    [entries, selectedEntryId],
  );

  return (
    <div className="platform-event-journal">
      <header className="platform-event-journal__header">
        <h1 className="platform-event-journal__title">Журнал событий</h1>
        <p className="platform-event-journal__subtitle">
          Официальная история развития платформы
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

      {!isLoading && entries.length === 0 ? (
        <p className="platform-event-journal__status">Событий пока нет.</p>
      ) : null}

      {!isLoading && entries.length > 0 ? (
        <div className="platform-event-journal__layout">
          <ul className="platform-event-journal__list" aria-label="Журнал событий">
            {entries.map((entry) => {
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
                    <span className="platform-event-journal__cell platform-event-journal__cell--title">
                      {entry.title}
                    </span>
                    <span className="platform-event-journal__separator" aria-hidden="true">
                      |
                    </span>
                    <span className="platform-event-journal__cell platform-event-journal__cell--status">
                      {entry.statusLabel}
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
            {selectedEntry ? (
              <>
                <h2 className="platform-event-journal__detail-title">
                  {selectedEntry.title}
                </h2>
                <dl className="platform-event-journal__fields">
                  <div className="platform-event-journal__field">
                    <dt>Дата</dt>
                    <dd>{formatAbsoluteDateTime(selectedEntry.createdAt)}</dd>
                  </div>
                  <div className="platform-event-journal__field">
                    <dt>Тип события</dt>
                    <dd>{selectedEntry.eventType}</dd>
                  </div>
                  <div className="platform-event-journal__field">
                    <dt>Статус</dt>
                    <dd>{selectedEntry.statusLabel}</dd>
                  </div>
                  <div className="platform-event-journal__field">
                    <dt>Автор</dt>
                    <dd>{selectedEntry.author}</dd>
                  </div>
                  <div className="platform-event-journal__field platform-event-journal__field--wide">
                    <dt>Описание</dt>
                    <dd>{selectedEntry.description || "—"}</dd>
                  </div>
                </dl>
              </>
            ) : (
              <p className="platform-event-journal__status">
                Выберите событие в списке.
              </p>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}
