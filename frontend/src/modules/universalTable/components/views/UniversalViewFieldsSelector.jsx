// src/modules/universalTable/components/views/UniversalViewFieldsSelector.jsx

function getFieldId(field) {
  return (
    field?.id ||
    field?.field_id ||
    field?.fieldId ||
    field?.key ||
    field?.name ||
    ""
  );
}

function getFieldTitle(field) {
  return (
    field?.title ||
    field?.label ||
    field?.name ||
    field?.key ||
    field?.id ||
    "Поле"
  );
}

function normalizeSelectedIds(selectedFieldIds = []) {
  return new Set((selectedFieldIds || []).map((id) => String(id)));
}

export default function UniversalViewFieldsSelector({
  fields = [],
  selectedFieldIds = [],
  onChange,
}) {
  const selectedIds = normalizeSelectedIds(selectedFieldIds);

  function handleToggle(fieldId) {
    const normalizedId = String(fieldId);
    const nextIds = new Set(selectedIds);

    if (nextIds.has(normalizedId)) {
      nextIds.delete(normalizedId);
    } else {
      nextIds.add(normalizedId);
    }

    onChange?.(Array.from(nextIds));
  }

  function handleSelectAll() {
    const allIds = fields.map(getFieldId).filter(Boolean).map(String);
    onChange?.(allIds);
  }

  function handleClearAll() {
    onChange?.([]);
  }

  if (!fields?.length) {
    return <div style={styles.empty}>Нет доступных полей</div>;
  }

  return (
    <div style={styles.root}>
      <div style={styles.header}>
        <div style={styles.title}>Поля представления</div>

        <div style={styles.actions}>
          <button type="button" style={styles.linkButton} onClick={handleSelectAll}>
            Выбрать все
          </button>

          <button type="button" style={styles.linkButton} onClick={handleClearAll}>
            Очистить
          </button>
        </div>
      </div>

      <div style={styles.list}>
        {fields.map((field) => {
          const fieldId = getFieldId(field);

          if (!fieldId) return null;

          const normalizedId = String(fieldId);
          const isChecked = selectedIds.has(normalizedId);

          return (
            <label
              key={normalizedId}
              style={{
                ...styles.item,
                ...(isChecked ? styles.itemSelected : {}),
              }}
            >
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => handleToggle(normalizedId)}
                style={styles.checkbox}
              />

              <span style={styles.itemText}>{getFieldTitle(field)}</span>

              {field?.type ? (
                <span style={styles.typeBadge}>{field.type}</span>
              ) : null}
            </label>
          );
        })}
      </div>
    </div>
  );
}

const styles = {
  root: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },

  header: {
    flexShrink: 0,

    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  title: {
    fontSize: 13,
    fontWeight: 700,
    color: "#111827",
  },

  actions: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },

  linkButton: {
    border: "none",
    background: "transparent",
    padding: 0,
    cursor: "pointer",
    fontSize: 12,
    color: "#2563EB",
  },

  list: {
    maxHeight: "min(420px, 45vh)",
    minHeight: 120,

    overflowY: "auto",

    display: "flex",
    flexDirection: "column",
    gap: 6,

    padding: 4,
    border: "1px solid #E5E7EB",
    borderRadius: 10,
    background: "#FFFFFF",
  },

  item: {
    minHeight: 34,
    padding: "6px 8px",

    display: "flex",
    alignItems: "center",
    gap: 8,

    borderRadius: 8,
    cursor: "pointer",

    fontSize: 13,
    color: "#374151",

    flexShrink: 0,
  },

  itemSelected: {
    background: "#F3F6FF",
  },

  checkbox: {
    width: 14,
    height: 14,
    margin: 0,
    cursor: "pointer",
  },

  itemText: {
    flex: 1,
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  typeBadge: {
    flexShrink: 0,

    padding: "2px 6px",

    borderRadius: 999,
    background: "#F3F4F6",

    fontSize: 11,
    color: "#6B7280",
  },

  empty: {
    minHeight: 120,

    padding: "12px 14px",

    border: "1px dashed #D1D5DB",
    borderRadius: 10,

    fontSize: 13,
    color: "#6B7280",
    background: "#FAFAFA",
  },
};