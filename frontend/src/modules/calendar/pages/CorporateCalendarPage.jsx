import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import PlatformConfirmModal from "../../../shared/platformModal/PlatformConfirmModal";
import CalendarContextMenu from "../components/CalendarContextMenu";
import CalendarDayView from "../components/CalendarDayView";
import CalendarEventDetailsPanel from "../components/CalendarEventDetailsPanel";
import CalendarEventModal from "../components/CalendarEventModal";
import CalendarMonthView from "../components/CalendarMonthView";
import CalendarSidebar from "../components/CalendarSidebar";
import CalendarToolbar from "../components/CalendarToolbar";
import CalendarWeekView from "../components/CalendarWeekView";
import {
  createCalendarEvent,
  deleteCalendarEvent,
  getCalendarEvent,
  listCalendarEvents,
  respondCalendarEvent,
  updateCalendarEvent,
} from "../api/calendarApi";
import {
  PAGE_LAYOUT_PAGE_TYPE,
  PAGE_LAYOUT_TOOLBAR_ZONE,
  useResolvedPageLayoutContract,
} from "../../../shared/appShell/pageLayoutContract";
import {
  buildDuplicatePayload,
  buildSlotPrefill,
  closedCalendarContextMenu,
  openEventContextMenu,
  openSlotContextMenu,
} from "../utils/calendarContextMenu";
import { getLoadRange, shiftFocusDate } from "../utils/calendarDateUtils";
import { calendarStyles as styles } from "../styles/calendarStyles";
import useRuntimeModuleConfiguration from "../../../shared/runtimeModuleConfiguration/useRuntimeModuleConfiguration";
import { filterCalendarEventTypes } from "../calendarConstants";

function dedupeEventsById(events) {
  const byId = new Map();

  (Array.isArray(events) ? events : []).forEach((event) => {
    if (event?.id == null) {
      return;
    }
    byId.set(String(event.id), event);
  });

  return Array.from(byId.values());
}

function closedEventModalState() {
  return {
    open: false,
    mode: "create",
    eventId: null,
    prefill: null,
    initialEvent: null,
    duplicateTitle: null,
  };
}

export default function CorporateCalendarPage({ tenantId }) {
  useResolvedPageLayoutContract({
    pageType: PAGE_LAYOUT_PAGE_TYPE.CALENDAR,
    toolbarZoneId: PAGE_LAYOUT_TOOLBAR_ZONE.APP_HEADER,
    canMinimize: true,
    title: "Календарь",
  });

  const navigate = useNavigate();
  const { configuration: calendarConfiguration, settings: calendarSettings } =
    useRuntimeModuleConfiguration(tenantId, "runtime.calendar");
  const enabledEventTypes = useMemo(
    () => filterCalendarEventTypes(calendarSettings.enabled_event_types),
    [calendarSettings.enabled_event_types, calendarConfiguration?.configuration_version],
  );
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [viewMode, setViewMode] = useState("week");
  const [focusDate, setFocusDate] = useState(new Date());
  const [search, setSearch] = useState("");
  const [eventType, setEventType] = useState("");
  const [participantSearch, setParticipantSearch] = useState("");
  const [eventModalState, setEventModalState] = useState(closedEventModalState);
  const [contextMenuState, setContextMenuState] = useState(closedCalendarContextMenu());
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const defaultView = String(calendarSettings.default_view || "").trim().toLowerCase();
    if (["day", "week", "month", "list"].includes(defaultView)) {
      setViewMode(defaultView);
    }
  }, [calendarSettings.default_view, calendarConfiguration?.configuration_version]);

  const loadEvents = useCallback(async ({ background = false } = {}) => {
    if (!tenantId) return;

    if (!background) {
      setIsLoading(true);
    }
    setError("");

    try {
      const { start, end } = getLoadRange(focusDate, viewMode);

      const result = await listCalendarEvents(tenantId, {
        start_from: start.toISOString(),
        start_to: end.toISOString(),
        event_type: eventType || undefined,
        search: search || undefined,
      });

      const normalized = dedupeEventsById(Array.isArray(result) ? result : []);
      setEvents(normalized);

      setSelectedEvent((current) => {
        if (!current?.id) {
          return current;
        }

        const refreshed = normalized.find((item) => String(item.id) === String(current.id));
        return refreshed || null;
      });
    } catch (loadError) {
      console.error(loadError);
      setError("Не удалось загрузить события календаря");
    } finally {
      if (!background) {
        setIsLoading(false);
      }
    }
  }, [tenantId, focusDate, viewMode, eventType, search]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const filteredEvents = useMemo(() => {
    const participantQuery = participantSearch.trim().toLowerCase();
    if (!participantQuery) return events;

    return events.filter((event) =>
      (event.participants || []).some((participant) => {
        const name = String(participant.user?.full_name || "").toLowerCase();
        const email = String(participant.user?.email || "").toLowerCase();
        return name.includes(participantQuery) || email.includes(participantQuery);
      }),
    );
  }, [events, participantSearch]);

  const resolveTenantScopedEvent = useCallback(
    (event) => {
      if (!event?.id) {
        return null;
      }

      if (event.tenant_id != null && String(event.tenant_id) !== String(tenantId)) {
        setError("Нет доступа к событию другой компании");
        return null;
      }

      return event;
    },
    [tenantId],
  );

  const openCreateModal = useCallback((prefill = null) => {
    setEventModalState({
      open: true,
      mode: "create",
      eventId: null,
      prefill,
      initialEvent: null,
      duplicateTitle: null,
    });
  }, []);

  const openEditModal = useCallback((event) => {
    const scopedEvent = resolveTenantScopedEvent(event);
    if (!scopedEvent) {
      return;
    }

    setEventModalState({
      open: true,
      mode: "edit",
      eventId: scopedEvent.id,
      prefill: null,
      initialEvent: scopedEvent,
      duplicateTitle: null,
    });
  }, [resolveTenantScopedEvent]);

  const handleCreateEvent = async (payload) => {
    const created = await createCalendarEvent(tenantId, payload);
    setSelectedEvent(created);
    setEvents((current) => dedupeEventsById([created, ...current]));
    await loadEvents({ background: true });
    return created;
  };

  const handleUpdateEvent = async (eventId, payload) => {
    const updated = await updateCalendarEvent(tenantId, eventId, payload);
    setSelectedEvent(updated);
    setEvents((current) =>
      dedupeEventsById(
        current.map((item) => (String(item.id) === String(updated.id) ? updated : item)),
      ),
    );
    await loadEvents({ background: true });
    return updated;
  };

  const handleDuplicateEvent = async (event) => {
    const scopedEvent = resolveTenantScopedEvent(event);
    if (!scopedEvent) {
      return;
    }

    const duplicated = await createCalendarEvent(tenantId, buildDuplicatePayload(scopedEvent));
    setSelectedEvent(duplicated);
    setEvents((current) => dedupeEventsById([duplicated, ...current]));
    await loadEvents({ background: true });
  };

  const handleDeleteEvent = async () => {
    if (!deleteTarget?.id) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteCalendarEvent(tenantId, deleteTarget.id);
      setEvents((current) =>
        current.filter((item) => String(item.id) !== String(deleteTarget.id)),
      );
      setSelectedEvent((current) =>
        current && String(current.id) === String(deleteTarget.id) ? null : current,
      );
      setDeleteTarget(null);
      await loadEvents({ background: true });
    } catch (deleteError) {
      console.error(deleteError);
      setError("Не удалось удалить событие");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSlotContextMenu = useCallback(
    ({ x, y, date, hour, view }) => {
      setContextMenuState(
        openSlotContextMenu({
          x,
          y,
          date,
          startTime: hour == null ? undefined : `${String(hour).padStart(2, "0")}:00`,
          view,
        }),
      );
    },
    [],
  );

  const handleEventContextMenu = useCallback(
    (event, mouseEvent) => {
      const scopedEvent = resolveTenantScopedEvent(event);
      if (!scopedEvent) {
        return;
      }

      setContextMenuState(
        openEventContextMenu({
          x: mouseEvent.clientX,
          y: mouseEvent.clientY,
          event: scopedEvent,
        }),
      );
    },
    [resolveTenantScopedEvent],
  );

  const handleContextMenuAction = useCallback(
    async (actionId, menuState) => {
      if (menuState.mode === "slot") {
        if (actionId !== "create") {
          return;
        }

        const prefill = buildSlotPrefill({
          tenantId,
          date: menuState.date,
          startTime: menuState.startTime,
        });

        openCreateModal(prefill);
        return;
      }

      const event = resolveTenantScopedEvent(menuState.event);
      if (!event) {
        return;
      }

      if (actionId === "open") {
        setSelectedEvent(event);
        return;
      }

      if (actionId === "edit") {
        openEditModal(event);
        return;
      }

      if (actionId === "duplicate") {
        await handleDuplicateEvent(event);
        return;
      }

      if (actionId === "delete") {
        setDeleteTarget(event);
      }
    },
    [handleDuplicateEvent, openCreateModal, openEditModal, resolveTenantScopedEvent, tenantId],
  );

  const handleOpenChat = (event) => {
    if (!event?.chat_id) return;
    navigate(`/portal/${tenantId}/page/35?chatId=${event.chat_id}`);
    window.dispatchEvent(
      new CustomEvent("chat:navigate", {
        detail: { chatId: event.chat_id, tenantId },
      }),
    );
  };

  useEffect(() => {
    async function handleCalendarNavigate(event) {
      const detail = event.detail || {};
      const targetEventId = detail.eventId || detail.event_id || detail.entityId;
      const detailTenantId = detail.tenantId || detail.tenant_id || tenantId;

      if (!targetEventId || String(detailTenantId) !== String(tenantId)) {
        return;
      }

      const normalizedEventId = String(targetEventId);
      const existingEvent = events.find(
        (item) => String(item.id) === normalizedEventId,
      );

      if (existingEvent) {
        setSelectedEvent(existingEvent);
        return;
      }

      try {
        const fetched = await getCalendarEvent(tenantId, normalizedEventId);
        if (fetched?.id) {
          setSelectedEvent(fetched);
          setEvents((current) => dedupeEventsById([fetched, ...current]));
        }
      } catch (loadError) {
        console.error("[CorporateCalendarPage] calendar navigate failed", loadError);
        setError("Не удалось открыть событие календаря из уведомления.");
      }
    }

    window.addEventListener("calendar:navigate", handleCalendarNavigate);

    return () => {
      window.removeEventListener("calendar:navigate", handleCalendarNavigate);
    };
  }, [events, tenantId]);

  const handleRespond = async (event, status) => {
    const updated = await respondCalendarEvent(tenantId, event.id, status);
    setSelectedEvent(updated);
    setEvents((current) =>
      dedupeEventsById(
        current.map((item) => (String(item.id) === String(updated.id) ? updated : item)),
      ),
    );
    await loadEvents({ background: true });
  };

  const handleSidebarSelectDate = (date, options = {}) => {
    setFocusDate(date);

    if (!options.navigateMonth && viewMode === "month") {
      setViewMode("day");
    }
  };

  const showInitialLoader = isLoading && events.length === 0;
  const viewProps = {
    events: filteredEvents,
    focusDate,
    selectedEventId: selectedEvent?.id,
    onSelectEvent: setSelectedEvent,
    onSlotContextMenu: handleSlotContextMenu,
    onEventContextMenu: handleEventContextMenu,
  };

  return (
    <div style={styles.page}>
      <CalendarToolbar
        viewMode={viewMode}
        focusDate={focusDate}
        onChangeViewMode={setViewMode}
        onCreateEvent={() => openCreateModal()}
        onToday={() => setFocusDate(new Date())}
        onNavigatePrevious={() => setFocusDate((current) => shiftFocusDate(current, viewMode, -1))}
        onNavigateNext={() => setFocusDate((current) => shiftFocusDate(current, viewMode, 1))}
      />

      <div style={styles.body}>
        <CalendarSidebar
          focusDate={focusDate}
          search={search}
          onSearchChange={setSearch}
          eventType={eventType}
          onEventTypeChange={setEventType}
          participantSearch={participantSearch}
          onParticipantSearchChange={setParticipantSearch}
          onSelectDate={handleSidebarSelectDate}
          enabledEventTypes={enabledEventTypes}
        />

        <div
          style={
            viewMode === "month" ? styles.mainPanel : styles.mainPanelTimeGrid
          }
        >
          {error ? <div style={styles.emptyState}>{error}</div> : null}
          {showInitialLoader ? <div style={styles.emptyState}>Загрузка…</div> : null}

          {!showInitialLoader && viewMode === "day" ? <CalendarDayView {...viewProps} /> : null}
          {!showInitialLoader && viewMode === "week" ? <CalendarWeekView {...viewProps} /> : null}
          {!showInitialLoader && viewMode === "month" ? <CalendarMonthView {...viewProps} /> : null}
        </div>

        <div style={styles.detailsPanel}>
          <CalendarEventDetailsPanel
            event={selectedEvent}
            onOpenChat={handleOpenChat}
            onRespond={handleRespond}
          />
        </div>
      </div>

      <CalendarContextMenu
        state={contextMenuState}
        onClose={() => setContextMenuState(closedCalendarContextMenu())}
        onSelectAction={handleContextMenuAction}
      />

      <CalendarEventModal
        isOpen={eventModalState.open}
        onClose={() => setEventModalState(closedEventModalState())}
        onSubmit={handleCreateEvent}
        onUpdate={handleUpdateEvent}
        tenantId={tenantId}
        mode={eventModalState.mode}
        eventId={eventModalState.eventId}
        prefill={eventModalState.prefill}
        initialEvent={eventModalState.initialEvent}
        duplicateTitle={eventModalState.duplicateTitle}
        enabledEventTypes={enabledEventTypes}
        defaultEventDurationMinutes={calendarSettings.default_event_duration_minutes}
      />

      <PlatformConfirmModal
        open={Boolean(deleteTarget)}
        title="Удалить событие?"
        message={`Событие «${deleteTarget?.title || "Без названия"}» будет удалено без возможности восстановления.`}
        variant="danger"
        loading={isDeleting}
        onConfirm={handleDeleteEvent}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
