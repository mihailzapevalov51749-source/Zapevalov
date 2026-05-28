import { useEffect, useState } from "react";

import {
  setExistingTablesList,
  subscribeExistingTablesList,
} from "../../modules/universalTable/utils/existingTablesListState";
import { UNIVERSAL_TABLE_TITLE_CHANGED_EVENT } from "../../modules/universalTable/utils/universalTableTitleEvents";

export default function TableBlockAddModal({
  isOpen,
  onClose,
  onCreateNew,
  onAddExisting,
}) {
  const [step, setStep] = useState("choice");
  const [tables, setTables] = useState([]);
  const [selectedTableId, setSelectedTableId] = useState("");
  const [isLoadingTables, setIsLoadingTables] = useState(false);
  const [tablesError, setTablesError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setStep("choice");
      setSelectedTableId("");
      setTablesError("");
      return;
    }
    setTables([]);
    setExistingTablesList([]);
    setIsLoadingTables(false);
    setTablesError("");
  }, [isOpen]);

  useEffect(() => subscribeExistingTablesList(setTables), []);

  useEffect(() => {
    const handleTableTitleChanged = (event) => {
      const { tableId, title } = event.detail || {};
      const normalizedTitle = String(title || "").trim();

      if (!tableId || !normalizedTitle) return;

      setTables((previous) =>
        previous.map((table) =>
          String(table.id) === String(tableId)
            ? {
                ...table,
                title: normalizedTitle,
                label: normalizedTitle,
              }
            : table
        )
      );
    };

    window.addEventListener(
      UNIVERSAL_TABLE_TITLE_CHANGED_EVENT,
      handleTableTitleChanged
    );

    return () => {
      window.removeEventListener(
        UNIVERSAL_TABLE_TITLE_CHANGED_EVENT,
        handleTableTitleChanged
      );
    };
  }, []);

  if (!isOpen) return null;

  const handleCreateNew = async () => {
    try {
      setIsSubmitting(true);
      await onCreateNew?.();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddExisting = async () => {
    if (!selectedTableId) return;

    try {
      setIsSubmitting(true);
      await onAddExisting?.(Number(selectedTableId));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={overlayStyle}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose?.();
        }
      }}
    >
      <div
        style={modalStyle}
        onMouseDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
      >
        <div style={headerStyle}>
          <h3 style={titleStyle}>Добавить таблицу</h3>
          <button type="button" onClick={onClose} style={closeButtonStyle}>
            ×
          </button>
        </div>

        {step === "choice" ? (
          <div style={bodyStyle}>
            <p style={textStyle}>
              Создайте новую универсальную таблицу или привяжите существующую к
              блоку в этом разделе.
            </p>

            <button
              type="button"
              style={primaryButtonStyle}
              disabled={isSubmitting}
              onClick={handleCreateNew}
            >
              {isSubmitting ? "Создание..." : "Создать новую таблицу"}
            </button>

            <button
              type="button"
              style={secondaryButtonStyle}
              disabled={isSubmitting || isLoadingTables}
              onClick={() => setStep("existing")}
            >
              Добавить существующую таблицу
            </button>
          </div>
        ) : (
          <div style={bodyStyle}>
            <p style={textStyle}>
              Добавление существующей таблицы временно отключено до миграции на
              Published Runtime Reference.
            </p>

            <div style={errorStyle}>
              Добавление существующей таблицы временно отключено до миграции на
              Published Runtime Reference.
            </div>

            <select
              value={selectedTableId}
              onChange={(event) => setSelectedTableId(event.target.value)}
              style={selectStyle}
              disabled
            >
              <option value="">Выбор существующей таблицы недоступен</option>
            </select>

            <div style={actionsStyle}>
              <button
                type="button"
                style={secondaryButtonStyle}
                disabled={isSubmitting}
                onClick={() => setStep("choice")}
              >
                Назад
              </button>

              <button
                type="button"
                style={primaryButtonStyle}
                disabled
                onClick={() => {}}
              >
                Добавить
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const overlayStyle = {
  position: "fixed",
  inset: 0,
  zIndex: 10050,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "rgba(15, 23, 42, 0.45)",
  padding: 16,
  boxSizing: "border-box",
};

const modalStyle = {
  width: "100%",
  maxWidth: 420,
  background: "#0f1b2d",
  border: "1px solid #24364f",
  borderRadius: 12,
  boxShadow: "0 18px 48px rgba(15, 23, 42, 0.28)",
  overflow: "hidden",
};

const headerStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  padding: "12px 14px",
  borderBottom: "1px solid #24364f",
  background: "#16243a",
};

const titleStyle = {
  margin: 0,
  fontSize: 14,
  fontWeight: 800,
  color: "#e5f0ff",
};

const closeButtonStyle = {
  width: 28,
  height: 28,
  borderRadius: 8,
  border: "1px solid #334155",
  background: "#0f1b2d",
  color: "#ffffff",
  cursor: "pointer",
};

const bodyStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 10,
  padding: 14,
};

const textStyle = {
  margin: 0,
  fontSize: 13,
  lineHeight: 1.5,
  color: "#cbd5e1",
};

const errorStyle = {
  fontSize: 13,
  color: "#fca5a5",
};

const selectStyle = {
  padding: "8px 10px",
  border: "1px solid #334155",
  borderRadius: 8,
  background: "#0f1b2d",
  color: "#ffffff",
  fontSize: 13,
};

const actionsStyle = {
  display: "flex",
  gap: 8,
  justifyContent: "flex-end",
};

const primaryButtonStyle = {
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid #3b82f6",
  background: "#2563eb",
  color: "#ffffff",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 700,
};

const secondaryButtonStyle = {
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid #334155",
  background: "#16243a",
  color: "#e5f0ff",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 600,
};
