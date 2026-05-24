// src/modules/universalTable/components/views/UniversalViewBlockEditor.jsx

import UniversalViewFieldsSelector from "./UniversalViewFieldsSelector";

const VIEW_TYPES = [
  { value: "table", label: "Таблица" },
  { value: "tree", label: "Дерево" },
  { value: "board", label: "Доска" },
];

function normalizeBlock(block = {}) {
  return {
    id: block.id,
    type: block.type || "table",
    title: block.title || "Новый блок",
    fields: Array.isArray(block.fields) ? block.fields : [],
    x: Number.isFinite(Number(block.x)) ? Number(block.x) : 0,
    y: Number.isFinite(Number(block.y)) ? Number(block.y) : 0,
    width: Number.isFinite(Number(block.width)) ? Number(block.width) : 520,
    height: Number.isFinite(Number(block.height)) ? Number(block.height) : 420,
  };
}

export default function UniversalViewBlockEditor({
  block,
  fields = [],
  onChange,
  onDelete,
}) {
  const currentBlock = normalizeBlock(block);

  function patchBlock(patch) {
    onChange?.({
      ...currentBlock,
      ...patch,
    });
  }

  return (
    <div style={styles.root}>
      <div style={styles.header}>
        <div style={styles.title}>Блок составного представления</div>

        <button
          type="button"
          style={styles.deleteButton}
          onClick={onDelete}
        >
          Удалить
        </button>
      </div>

      <div style={styles.grid}>
        <label style={styles.field}>
          <span style={styles.label}>Название блока</span>

          <input
            value={currentBlock.title}
            onChange={(event) =>
              patchBlock({ title: event.target.value })
            }
            style={styles.input}
          />
        </label>

        <label style={styles.field}>
          <span style={styles.label}>Тип блока</span>

          <select
            value={currentBlock.type}
            onChange={(event) =>
              patchBlock({ type: event.target.value })
            }
            style={styles.input}
          >
            {VIEW_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div style={styles.sizeGrid}>
        <label style={styles.field}>
          <span style={styles.label}>X</span>

          <input
            type="number"
            value={currentBlock.x}
            onChange={(event) =>
              patchBlock({ x: Number(event.target.value) || 0 })
            }
            style={styles.input}
          />
        </label>

        <label style={styles.field}>
          <span style={styles.label}>Y</span>

          <input
            type="number"
            value={currentBlock.y}
            onChange={(event) =>
              patchBlock({ y: Number(event.target.value) || 0 })
            }
            style={styles.input}
          />
        </label>

        <label style={styles.field}>
          <span style={styles.label}>Ширина</span>

          <input
            type="number"
            value={currentBlock.width}
            onChange={(event) =>
              patchBlock({ width: Number(event.target.value) || 520 })
            }
            style={styles.input}
          />
        </label>

        <label style={styles.field}>
          <span style={styles.label}>Высота</span>

          <input
            type="number"
            value={currentBlock.height}
            onChange={(event) =>
              patchBlock({ height: Number(event.target.value) || 420 })
            }
            style={styles.input}
          />
        </label>
      </div>

      <UniversalViewFieldsSelector
        fields={fields}
        selectedFieldIds={currentBlock.fields}
        onChange={(nextFieldIds) =>
          patchBlock({ fields: nextFieldIds })
        }
      />
    </div>
  );
}

const styles = {
  root: {
    padding: 12,

    display: "flex",
    flexDirection: "column",
    gap: 12,

    border: "1px solid #E5E7EB",
    borderRadius: 12,

    background: "#FFFFFF",
  },

  header: {
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

  deleteButton: {
    border: "none",
    background: "transparent",
    padding: 0,

    cursor: "pointer",

    fontSize: 12,
    color: "#DC2626",
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 180px",
    gap: 10,
  },

  sizeGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 10,
  },

  field: {
    display: "flex",
    flexDirection: "column",
    gap: 5,
  },

  label: {
    fontSize: 12,
    color: "#6B7280",
  },

  input: {
    height: 34,
    padding: "0 10px",

    border: "1px solid #D1D5DB",
    borderRadius: 8,

    fontSize: 13,
    color: "#111827",
    background: "#FFFFFF",

    outline: "none",
    boxSizing: "border-box",
  },
};