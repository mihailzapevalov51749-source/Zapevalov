import { useEffect, useMemo, useState } from "react";

import PlatformUserAvatar from "../../controlPlane/platformUsers/PlatformUserAvatar.jsx";
import PlatformModal from "../../../shared/platformModal/PlatformModal";
import "../../../shared/platformModal/platformModalFooter.css";
import "../../../shared/quickCreate/platformQuickCreateModal.css";

import { searchUsers } from "../api/calendarApi";
import {
  CALENDAR_EVENT_TYPES,
  combineDateTime,
  toInputDate,
  toInputTime,
} from "../calendarConstants";

const CREATE_MODAL_KEY = "calendar_event_create_modal";
const EDIT_MODAL_KEY = "calendar_event_edit_modal";
const FORM_ID = "calendar-event-form";

function FormField({ id, label, required = false, children }) {
  return (
    <div className="platform-quick-create-modal__field">
      <label className="platform-quick-create-modal__label" htmlFor={id}>
        {label}
        {required ? (
          <span className="platform-quick-create-modal__required" aria-hidden>
            *
          </span>
        ) : null}
      </label>
      <div className="platform-quick-create-modal__control">{children}</div>
    </div>
  );
}

function mergeDisplayUsers(searchResults, selectedUsers) {
  const byId = new Map();

  selectedUsers.forEach((user) => {
    if (user?.id != null) {
      byId.set(String(user.id), user);
    }
  });

  (Array.isArray(searchResults) ? searchResults : []).forEach((user) => {
    if (user?.id != null) {
      byId.set(String(user.id), user);
    }
  });

  return Array.from(byId.values()).sort((left, right) => {
    const leftName = String(left.full_name || left.email || "").toLowerCase();
    const rightName = String(right.full_name || right.email || "").toLowerCase();
    return leftName.localeCompare(rightName, "ru");
  });
}

function mapParticipantsToUsers(event) {
  return (event?.participants || [])
    .map((participant) => participant.user || { id: participant.user_id })
    .filter((user) => user?.id != null);
}

function buildDefaultFormValues(defaultEventDurationMinutes = 60) {
  const now = new Date();
  const end = new Date(now.getTime() + Number(defaultEventDurationMinutes || 60) * 60 * 1000);
  const defaultEventType = "video_meeting";

  return {
    title: "",
    description: "",
    eventType: defaultEventType,
    startDate: toInputDate(now),
    startTime: "10:00",
    endDate: toInputDate(end),
    endTime: toInputTime(end),
    location: "",
    meetingUrl: "",
    createEventChat: true,
    createVideoMeeting: false,
    selectedUsers: [],
  };
}

function buildFormValuesFromPrefill(prefill, defaultEventDurationMinutes = 60) {
  const defaults = buildDefaultFormValues(defaultEventDurationMinutes);
  if (!prefill?.startDateTime || !prefill?.endDateTime) {
    return defaults;
  }

  const start = new Date(prefill.startDateTime);
  const end = new Date(prefill.endDateTime);

  return {
    ...defaults,
    startDate: toInputDate(start),
    startTime: toInputTime(start),
    endDate: toInputDate(end),
    endTime: toInputTime(end),
  };
}

function buildFormValuesFromEvent(event, options = {}) {
  const defaults = buildDefaultFormValues(options.defaultEventDurationMinutes);
  if (!event) {
    return defaults;
  }

  const start = new Date(event.start_at);
  const end = new Date(event.end_at);

  return {
    title: options.duplicateTitle || event.title || "",
    description: event.description || "",
    eventType: event.event_type || defaults.eventType,
    startDate: toInputDate(start),
    startTime: toInputTime(start),
    endDate: toInputDate(end),
    endTime: toInputTime(end),
    location: event.location || "",
    meetingUrl: event.meeting_url || "",
    createEventChat: false,
    createVideoMeeting: false,
    selectedUsers: mapParticipantsToUsers(event),
  };
}

export default function CalendarEventModal({
  isOpen,
  onClose,
  onSubmit,
  onUpdate,
  tenantId,
  mode = "create",
  eventId = null,
  prefill = null,
  initialEvent = null,
  duplicateTitle = null,
  enabledEventTypes = CALENDAR_EVENT_TYPES,
  defaultEventDurationMinutes = 60,
}) {
  const isEditMode = mode === "edit";
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventType, setEventType] = useState("video_meeting");
  const [startDate, setStartDate] = useState(toInputDate(new Date()));
  const [startTime, setStartTime] = useState("10:00");
  const [endDate, setEndDate] = useState(toInputDate(new Date()));
  const [endTime, setEndTime] = useState("11:00");
  const [location, setLocation] = useState("");
  const [meetingUrl, setMeetingUrl] = useState("");
  const [createEventChat, setCreateEventChat] = useState(true);
  const [createVideoMeeting, setCreateVideoMeeting] = useState(false);
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const availableEventTypes = useMemo(() => {
    const values = Array.isArray(enabledEventTypes) ? enabledEventTypes : CALENDAR_EVENT_TYPES;
    return values.length ? values : CALENDAR_EVENT_TYPES;
  }, [enabledEventTypes]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let nextValues = buildDefaultFormValues(defaultEventDurationMinutes);

    if (isEditMode && initialEvent) {
      nextValues = buildFormValuesFromEvent(initialEvent, { defaultEventDurationMinutes });
    } else if (duplicateTitle && initialEvent) {
      nextValues = buildFormValuesFromEvent(initialEvent, {
        duplicateTitle,
        defaultEventDurationMinutes,
      });
    } else if (prefill) {
      nextValues = buildFormValuesFromPrefill(prefill, defaultEventDurationMinutes);
    } else if (initialEvent && !isEditMode) {
      nextValues = buildFormValuesFromEvent(initialEvent, { defaultEventDurationMinutes });
    }

    const allowedValues = new Set(availableEventTypes.map((item) => item.value));
    if (!allowedValues.has(nextValues.eventType)) {
      nextValues.eventType = availableEventTypes[0]?.value || nextValues.eventType;
    }

    setTitle(nextValues.title);
    setDescription(nextValues.description);
    setEventType(nextValues.eventType);
    setStartDate(nextValues.startDate);
    setStartTime(nextValues.startTime);
    setEndDate(nextValues.endDate);
    setEndTime(nextValues.endTime);
    setLocation(nextValues.location);
    setMeetingUrl(nextValues.meetingUrl);
    setCreateEventChat(nextValues.createEventChat);
    setCreateVideoMeeting(nextValues.createVideoMeeting);
    setSelectedUsers(nextValues.selectedUsers);
    setSearch("");
    setUsers([]);
  }, [
    availableEventTypes,
    defaultEventDurationMinutes,
    duplicateTitle,
    initialEvent,
    isEditMode,
    isOpen,
    prefill,
  ]);

  useEffect(() => {
    if (!isOpen || !tenantId) return;

    const timeout = setTimeout(async () => {
      try {
        const result = await searchUsers(tenantId, search);
        setUsers(Array.isArray(result) ? result : []);
      } catch (error) {
        console.error("Ошибка поиска пользователей", error);
      }
    }, 250);

    return () => clearTimeout(timeout);
  }, [isOpen, tenantId, search]);

  const displayUsers = useMemo(
    () => mergeDisplayUsers(users, selectedUsers),
    [users, selectedUsers],
  );

  const toggleUser = (user) => {
    const userId = String(user.id);
    setSelectedUsers((prev) => {
      const exists = prev.some((item) => String(item.id) === userId);
      if (exists) {
        return prev.filter((item) => String(item.id) !== userId);
      }
      return [...prev, user];
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!title.trim()) return;

    const startAt = combineDateTime(startDate, startTime);
    const endAt = combineDateTime(endDate, endTime);
    if (!startAt || !endAt) return;

    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      event_type: eventType,
      start_at: startAt,
      end_at: endAt,
      location: location.trim() || null,
      meeting_url: meetingUrl.trim() || null,
      participant_ids: selectedUsers.map((user) => user.id),
      create_event_chat: createEventChat,
      create_video_meeting: createVideoMeeting,
    };

    setIsSubmitting(true);
    try {
      if (isEditMode) {
        await onUpdate?.(eventId, {
          title: payload.title,
          description: payload.description,
          event_type: payload.event_type,
          start_at: payload.start_at,
          end_at: payload.end_at,
          location: payload.location,
          meeting_url: payload.meeting_url,
          participant_ids: payload.participant_ids,
        });
      } else {
        await onSubmit?.(payload);
      }
      onClose();
    } catch (submitError) {
      console.error(isEditMode ? "Не удалось обновить событие" : "Не удалось создать событие", submitError);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PlatformModal
      open={isOpen}
      onClose={onClose}
      title={isEditMode ? "Редактирование события" : "Создание события"}
      modalKey={isEditMode ? EDIT_MODAL_KEY : CREATE_MODAL_KEY}
      canCustomizeLayout
      keepFullyVisible
      ariaLabel={isEditMode ? "Редактирование события" : "Создание события"}
      footer={
        <div className="platform-modal-footer">
          <button type="button" className="platform-modal-footer__button" onClick={onClose}>
            Отмена
          </button>
          <button
            type="submit"
            form={FORM_ID}
            className="platform-modal-footer__button platform-modal-footer__button--primary"
            disabled={isSubmitting}
          >
            {isEditMode ? "Сохранить" : "Создать"}
          </button>
        </div>
      }
    >
      <form id={FORM_ID} className="platform-quick-create-modal" onSubmit={handleSubmit}>
        <FormField id="calendar-event-title" label="Название" required>
          <input
            id="calendar-event-title"
            className="platform-quick-create-modal__input"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Демонстрация платформы ЯсноПро"
            required
          />
        </FormField>

        <FormField id="calendar-event-description" label="Описание">
          <textarea
            id="calendar-event-description"
            className="platform-quick-create-modal__textarea"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
          />
        </FormField>

        <FormField id="calendar-event-type" label="Тип события" required>
          <select
            id="calendar-event-type"
            className="platform-quick-create-modal__input"
            value={eventType}
            onChange={(event) => setEventType(event.target.value)}
          >
            {availableEventTypes.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </FormField>

        <div className="platform-quick-create-modal__row">
          <FormField id="calendar-event-start-date" label="Дата начала" required>
            <input
              id="calendar-event-start-date"
              type="date"
              className="platform-quick-create-modal__input"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              required
            />
          </FormField>
          <FormField id="calendar-event-start-time" label="Время начала" required>
            <input
              id="calendar-event-start-time"
              type="time"
              className="platform-quick-create-modal__input"
              value={startTime}
              onChange={(event) => setStartTime(event.target.value)}
              required
            />
          </FormField>
        </div>

        <div className="platform-quick-create-modal__row">
          <FormField id="calendar-event-end-date" label="Дата окончания" required>
            <input
              id="calendar-event-end-date"
              type="date"
              className="platform-quick-create-modal__input"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              required
            />
          </FormField>
          <FormField id="calendar-event-end-time" label="Время окончания" required>
            <input
              id="calendar-event-end-time"
              type="time"
              className="platform-quick-create-modal__input"
              value={endTime}
              onChange={(event) => setEndTime(event.target.value)}
              required
            />
          </FormField>
        </div>

        <FormField id="calendar-event-participants" label="Участники">
          <input
            id="calendar-event-participants-search"
            className="platform-quick-create-modal__input"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Поиск сотрудников компании"
          />
          <div className="platform-quick-create-modal__user-list">
            {displayUsers.map((user) => {
              const selected = selectedUsers.some((item) => String(item.id) === String(user.id));
              return (
                <button
                  key={user.id}
                  type="button"
                  className={`platform-quick-create-modal__user-item${selected ? " is-selected" : ""}`}
                  onClick={() => toggleUser(user)}
                >
                  <PlatformUserAvatar user={user} size={32} />
                  <span>{user.full_name || user.email}</span>
                </button>
              );
            })}
          </div>
        </FormField>

        <FormField id="calendar-event-location" label="Место / ссылка">
          <input
            id="calendar-event-location"
            className="platform-quick-create-modal__input"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            placeholder="Офис / онлайн"
          />
          <input
            id="calendar-event-meeting-url"
            className="platform-quick-create-modal__input"
            value={meetingUrl}
            onChange={(event) => setMeetingUrl(event.target.value)}
            placeholder="https://..."
            style={{ marginTop: 8 }}
          />
        </FormField>

        {!isEditMode ? (
          <>
            <label className="platform-quick-create-modal__checkbox">
              <input
                type="checkbox"
                checked={createEventChat}
                onChange={(event) => setCreateEventChat(event.target.checked)}
              />
              <span>Создать чат события</span>
            </label>

            <label className="platform-quick-create-modal__checkbox">
              <input
                type="checkbox"
                checked={createVideoMeeting}
                onChange={(event) => setCreateVideoMeeting(event.target.checked)}
              />
              <span>Создать видеовстречу</span>
            </label>
          </>
        ) : null}
      </form>
    </PlatformModal>
  );
}
