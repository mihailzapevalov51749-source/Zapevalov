import { forwardRef, useEffect, useRef, useState } from "react";

import yasiiLogo from "../../assets/yasii.png";
import useYasiiQuery from "../hooks/useYasiiQuery";

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
    <div className={className}>
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

const YasiiSidePanel = forwardRef(function YasiiSidePanel({ open, onClose }, ref) {
  const { messages, loading, error, sendMessage } = useYasiiQuery();
  const [draft, setDraft] = useState("");
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [open, messages, loading, error]);

  if (!open) {
    return null;
  }

  const handleSubmit = () => {
    const text = draft.trim();
    if (!text || loading) {
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

  return (
    <aside ref={ref} className="yasii-panel" role="dialog" aria-label="ЯСИИ">
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
              Цифровой сотрудник · demo
            </div>
          </div>
        </div>
        <button
          type="button"
          className="yasii-panel-header__close"
          aria-label="Закрыть"
          onClick={onClose}
        >
          ×
        </button>
      </header>

      <div className="yasii-panel-body">
        {messages.map((message) => (
          <YasiiMessage key={message.id} message={message} />
        ))}
        {loading ? (
          <div className="yasii-message yasii-message-assistant">
            <div className="yasii-typing">ЯСИИ обрабатывает запрос...</div>
          </div>
        ) : null}
        {error ? <div className="yasii-error">{error}</div> : null}
        <div ref={messagesEndRef} />
      </div>

      <footer className="yasii-panel-footer">
        <div className="yasii-input-row">
          <textarea
            className="yasii-input"
            placeholder="Введите сообщение..."
            value={draft}
            rows={2}
            disabled={loading}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button
            type="button"
            className="yasii-send-button"
            disabled={loading || !draft.trim()}
            onClick={handleSubmit}
          >
            Отправить
          </button>
        </div>
      </footer>
    </aside>
  );
});

export default YasiiSidePanel;
