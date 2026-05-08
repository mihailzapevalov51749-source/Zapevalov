import { cellInputStyle } from "../../styles/tableStyles";

const CELL_EDITOR_HEIGHT = 28;

const normalizeAlign = (align) => {
  if (["left", "center", "right"].includes(align)) return align;
  return "left";
};

const getJustifyByAlign = (align) => {
  if (align === "center") return "center";
  if (align === "right") return "flex-end";
  return "flex-start";
};

const getShowTime = (column) => {
  if (column?.lookup?.showTime === true) return true;
  if (column?.settings?.lookup?.showTime === true) return true;
  return false;
};

const getShowDateHint = (column) => {
  if (column?.lookup?.showDateHint === false) return false;
  if (column?.settings?.lookup?.showDateHint === false) return false;
  return true;
};

const normalizeDateInputValue = (value) => {
  if (!value) return "";

  const stringValue = String(value);

  if (/^\d{4}-\d{2}-\d{2}$/.test(stringValue)) {
    return stringValue;
  }

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(stringValue)) {
    return stringValue.slice(0, 10);
  }

  const date = new Date(stringValue);

  if (Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const normalizeDateTimeInputValue = (value) => {
  if (!value) return "";

  const stringValue = String(value);

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(stringValue)) {
    return stringValue.slice(0, 16);
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(stringValue)) {
    return `${stringValue}T00:00`;
  }

  const date = new Date(stringValue);

  if (Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const parseDateValue = (value) => {
  if (!value) return null;

  const stringValue = String(value);

  if (/^\d{4}-\d{2}-\d{2}$/.test(stringValue)) {
    const date = new Date(`${stringValue}T00:00:00`);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const date = new Date(stringValue);

  if (Number.isNaN(date.getTime())) return null;

  return date;
};

const formatDateRu = (value) => {
  const date = parseDateValue(value);

  if (!date) return "";

  return date.toLocaleDateString("ru-RU");
};

const formatTimeRu = (value) => {
  const date = parseDateValue(value);

  if (!date) return "";

  return date.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getDayDiff = (value) => {
  const targetDate = parseDateValue(value);

  if (!targetDate) return null;

  targetDate.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffMs = targetDate.getTime() - today.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
};

const getDaysWord = (days) => {
  const abs = Math.abs(days);
  const lastDigit = abs % 10;
  const lastTwoDigits = abs % 100;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) return "дней";
  if (lastDigit === 1) return "день";
  if (lastDigit >= 2 && lastDigit <= 4) return "дня";
  return "дней";
};

const getDateHint = (value) => {
  const diff = getDayDiff(value);

  if (diff === null) {
    return {
      text: "",
      color: "#94a3b8",
    };
  }

  if (diff === 0) {
    return {
      text: "сегодня",
      color: "#2563eb",
    };
  }

  if (diff > 0) {
    return {
      text: `через ${diff} ${getDaysWord(diff)}`,
      color: "#64748b",
    };
  }

  return {
    text: `просрочено на ${Math.abs(diff)} ${getDaysWord(diff)}`,
    color: "#dc2626",
  };
};

export default function DateCellEditor({
  column,
  value,
  onChange,
  readOnly = false,
  isPrimary = false,
}) {
  const align = normalizeAlign(column?.align);
  const justifyContent = getJustifyByAlign(align);

  const fontWeight = isPrimary ? 700 : 400;

  const showTime = getShowTime(column);
  const showDateHint = getShowDateHint(column);

  if (readOnly) {
    const formattedDate = formatDateRu(value);
    const formattedTime = formatTimeRu(value);
    const hint = getDateHint(value);

    return (
      <div
        data-table-action="true"
        title={
          formattedDate
            ? showTime
              ? `${formattedDate} ${formattedTime}`
              : formattedDate
            : ""
        }
        style={{
          width: "100%",
          minHeight: CELL_EDITOR_HEIGHT,
          display: "flex",
          flexDirection: "column",
          alignItems:
            align === "center"
              ? "center"
              : align === "right"
                ? "flex-end"
                : "flex-start",
          justifyContent: "center",
          padding: "3px 6px",
          boxSizing: "border-box",
          overflow: "hidden",
          textAlign: align,
        }}
      >
        <div
          style={{
            maxWidth: "100%",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            fontSize: 13,
            lineHeight: "16px",
            fontWeight,
            color: formattedDate ? "#0f172a" : "#94a3b8",
          }}
        >
          {formattedDate || "—"}
        </div>

        {formattedDate && showTime && formattedTime && (
          <div
            style={{
              maxWidth: "100%",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              fontSize: 11,
              lineHeight: "14px",
              color: "#2563eb",
            }}
          >
            {formattedTime}
          </div>
        )}

        {formattedDate && showDateHint && hint.text && (
          <div
            style={{
              maxWidth: "100%",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              fontSize: 11,
              lineHeight: "14px",
              color: hint.color,
            }}
          >
            {hint.text}
          </div>
        )}
      </div>
    );
  }

  return (
    <input
      data-table-action="true"
      type={showTime ? "datetime-local" : "date"}
      value={
        showTime
          ? normalizeDateTimeInputValue(value)
          : normalizeDateInputValue(value)
      }
      readOnly={readOnly}
      disabled={readOnly}
      onClick={(event) => event.stopPropagation()}
      onChange={(event) => onChange?.(event.target.value)}
      style={{
        ...cellInputStyle,
        width: "100%",
        height: CELL_EDITOR_HEIGHT,
        minHeight: CELL_EDITOR_HEIGHT,
        maxHeight: CELL_EDITOR_HEIGHT,
        border: "none",
        outline: "none",
        background: "transparent",
        textAlign: align,
        fontWeight,
        color: "#0f172a",
        fontSize: 13,
        lineHeight: `${CELL_EDITOR_HEIGHT}px`,
        padding: "0 6px",
        boxSizing: "border-box",
      }}
    />
  );
}