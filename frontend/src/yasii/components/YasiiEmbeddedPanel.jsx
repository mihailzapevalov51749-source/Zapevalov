import {
  forwardRef,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import yasiiLogo from "../../assets/yasii.png";
import { resolveEmbeddedSurface } from "../embedded/embeddedEntryRegistry.js";
import { buildEmbeddedScopeKey } from "../embedded/embeddedScopeKey.js";
import useYasiiEmbeddedQuery from "../hooks/useYasiiEmbeddedQuery";
import {
  findMessageElement,
  resolveMessageScrollIntent,
  scrollAssistantMessageToStart,
  scrollContainerToBottom,
} from "../yasiiChatScroll.js";
import { resolveYasiiSourceLabel } from "../embedded/yasiiSourceLabels.js";
import YasiiEmbeddedContextHeader from "./YasiiEmbeddedContextHeader.jsx";
import YasiiPanelHeaderActions from "./YasiiPanelHeaderActions.jsx";

const YASII_STATUS_LABEL = "Цифровой сотрудник";

function YasiiTraceList({ trace }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!Array.isArray(trace) || trace.length === 0) {
    return null;
  }

  return (
    <div className="yasii-trace">
      <button
        type="button"
        className="yasii-trace-toggle"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((previous) => !previous)}
      >
        Trace ({trace.length})
      </button>
      {isOpen ? (
        <ul className="yasii-trace-list">
          {trace.map((stage) => (
            <li key={stage} className="yasii-trace-list__item">
              <span className="yasii-trace-list__indicator" aria-hidden="true" />
              <span className="yasii-trace-list__label">{stage}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function YasiiMessage({ message }) {
  const isUser = message.role === "user";
  const className = isUser
    ? "yasii-message yasii-message-user"
    : "yasii-message yasii-message-assistant";

  return (
    <div
      className={className}
      data-yasii-message-id={message.id}
      data-yasii-message-role={message.role}
    >
      <div className="yasii-message__text">
        {message.text.split("\n").map((line, index, lines) => (
          <span key={`${message.id}-line-${index}`}>
            {line}
            {index < lines.length - 1 ? <br /> : null}
          </span>
        ))}
      </div>
      {!isUser ? <YasiiTraceList trace={message.trace} /> : null}
    </div>
  );
}

const YasiiEmbeddedPanel = forwardRef(function YasiiEmbeddedPanel(
  {
    open,
    onClose,
    layoutMode = "floating",
    surfaceId,
    contextData = {},
    inputPlaceholder = "Введите сообщение...",
  },
  ref,
) {
  const surface = useMemo(() => resolveEmbeddedSurface(surfaceId), [surfaceId]);

  const scopeKey = useMemo(() => {
    if (typeof surface.buildScopeKey === "function") {
      return surface.buildScopeKey(contextData);
    }

    return buildEmbeddedScopeKey(surfaceId, contextData);
  }, [contextData, surface, surfaceId]);

  const sourceLabel = resolveYasiiSourceLabel(surfaceId, surface.surfaceName);

  const buildHostContext = useCallback(
    () => surface.buildHostContext(contextData),
    [contextData, surface],
  );

  const {
    messages,
    handoff,
    handoffLoading,
    handoffError,
    loading,
    error,
    isStale,
    refreshHandoff,
    sendMessage,
  } = useYasiiEmbeddedQuery({
    buildHostContext,
    scopeKey,
    enabled: open,
    welcomeMessage: surface.welcomeMessage,
    handoffErrorMessage: `Не удалось создать ACE handoff для ${surface.surfaceName}.`,
  });

  const [draft, setDraft] = useState("");
  const messagesContainerRef = useRef(null);
  const lastMessageRef = useRef(null);
  const inputRef = useRef(null);
  const hasRequestedInitialHandoffRef = useRef(false);
  const previousOpenRef = useRef(false);
  const previousMessagesLengthRef = useRef(0);

  const focusInput = useCallback(() => {
    requestAnimationFrame(() => {
      inputRef.current?.focus({ preventScroll: true });
    });
  }, []);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      scrollContainerToBottom(messagesContainerRef.current);
      lastMessageRef.current?.scrollIntoView({ block: "end", behavior: "auto" });
    });
  }, []);

  const scrollToAssistantMessageStart = useCallback((messageId) => {
    const container = messagesContainerRef.current;
    const messageElement = findMessageElement(container, messageId);
    scrollAssistantMessageToStart(container, messageElement);
  }, []);

  useEffect(() => {
    if (!open) {
      hasRequestedInitialHandoffRef.current = false;
      previousOpenRef.current = false;
      previousMessagesLengthRef.current = messages.length;
      return;
    }

    if (hasRequestedInitialHandoffRef.current) {
      return;
    }

    hasRequestedInitialHandoffRef.current = true;
    refreshHandoff();
  }, [open, refreshHandoff, messages.length]);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (!previousOpenRef.current) {
      scrollToBottom();
      focusInput();
    }

    previousOpenRef.current = true;
  }, [focusInput, open, scrollToBottom]);

  useLayoutEffect(() => {
    if (!open) {
      previousMessagesLengthRef.current = messages.length;
      return;
    }

    const intent = resolveMessageScrollIntent(previousMessagesLengthRef.current, messages);
    previousMessagesLengthRef.current = messages.length;

    if (!intent) {
      return;
    }

    if (intent.type === "bottom") {
      scrollToBottom();
      focusInput();
      return;
    }

    if (intent.type === "assistant-start") {
      scrollToAssistantMessageStart(intent.messageId);
      focusInput();
    }
  }, [focusInput, messages, open, scrollToAssistantMessageStart, scrollToBottom]);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (error || handoffError) {
      focusInput();
    }
  }, [error, focusInput, handoffError, open]);

  useEffect(() => {
    if (!open || loading || handoffLoading) {
      return;
    }

    focusInput();
  }, [focusInput, handoffLoading, loading, open]);

  if (!open) {
    return null;
  }

  const handleSubmit = () => {
    const text = draft.trim();
    if (!text || loading || handoffLoading) {
      return;
    }

    setDraft("");
    sendMessage(text);
  };

  const handleKeyDown = (event) => {
    if (event.key !== "Enter" || event.shiftKey) {
      return;
    }

    event.preventDefault();
    handleSubmit();
  };

  const panelClassName = [
    "yasii-panel",
    "yasii-panel--embedded",
    layoutMode === "workspace" ? "yasii-panel--workspace" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <aside
      ref={ref}
      className={panelClassName}
      role={layoutMode === "workspace" ? "region" : "dialog"}
      aria-label={`ЯСИИ ${surface.surfaceName}`}
    >
      <header className="yasii-panel-header">
        <div className="yasii-panel-header__brand">
          <img
            src={yasiiLogo}
            alt=""
            className="yasii-panel-header__logo"
            aria-hidden="true"
          />
          <div className="yasii-panel-header__titles">
            <div className="yasii-panel-header__title">ЯСИИ</div>
            <div className="yasii-panel-header__status">
              <span className="yasii-panel-header__online" aria-hidden="true" />
              {YASII_STATUS_LABEL}
            </div>
          </div>
        </div>
        <YasiiPanelHeaderActions layoutMode={layoutMode} onClose={onClose} />
      </header>

      <YasiiEmbeddedContextHeader sourceLabel={sourceLabel} />

      {isStale ? (
        <div className="yasii-embedded-stale" role="alert">
          <div>Контекст устарел. Обновить контекст?</div>
          <button
            type="button"
            className="yasii-embedded-stale__action"
            onClick={refreshHandoff}
            disabled={handoffLoading}
          >
            {handoffLoading ? "Обновление..." : "Обновить контекст"}
          </button>
        </div>
      ) : null}

      {handoffLoading ? (
        <div className="yasii-embedded-status">Создаём ACE handoff...</div>
      ) : null}
      {handoffError ? <div className="yasii-error">{handoffError}</div> : null}

      <div ref={messagesContainerRef} className="yasii-panel-body">
        {messages.map((message) => (
          <YasiiMessage key={message.id} message={message} />
        ))}
        {loading ? (
          <div className="yasii-message yasii-message-assistant">
            <div className="yasii-typing">ЯСИИ обрабатывает запрос...</div>
          </div>
        ) : null}
        {error ? <div className="yasii-error">{error}</div> : null}
        <div ref={lastMessageRef} aria-hidden="true" />
      </div>

      <footer className="yasii-panel-footer">
        <div className="yasii-input-row">
          <textarea
            ref={inputRef}
            className="yasii-input"
            placeholder={inputPlaceholder}
            value={draft}
            rows={2}
            disabled={loading || handoffLoading || !handoff?.handoffId || isStale}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button
            type="button"
            className="yasii-send-button"
            disabled={
              loading ||
              handoffLoading ||
              isStale ||
              !handoff?.handoffId ||
              !draft.trim()
            }
            onClick={handleSubmit}
          >
            Отправить
          </button>
        </div>
      </footer>
    </aside>
  );
});

export default YasiiEmbeddedPanel;
