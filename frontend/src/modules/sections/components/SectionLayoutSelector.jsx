/**
 * SectionLayoutSelector
 *
 * Назначение:
 * Компонент выбора компоновки раздела.
 *
 * Режимы:
 * - one_column: одна колонка
 * - two_columns: две колонки
 * - three_columns: три колонки
 * - grid: адаптивная сетка
 * - free: гибкий режим с размещением блоков по координатной сетке
 */

const LAYOUT_OPTIONS = [
  { value: "one_column", label: "1 колонка" },
  { value: "two_columns", label: "2 колонки" },
  { value: "three_columns", label: "3 колонки" },
  { value: "grid", label: "Сетка" },
  { value: "free", label: "Гибкий" },
];

export default function SectionLayoutSelector({ value, onChange }) {
  return (
    <label style={{ display: "grid", gap: 6, marginBottom: 12 }}>
      <span style={{ fontSize: 13, color: "#475569" }}>
        Компоновка раздела
      </span>

      <select
        value={value || "one_column"}
        onChange={(e) => onChange(e.target.value)}
        style={{
          padding: "8px 10px",
          border: "1px solid #cbd5e1",
          borderRadius: 8,
          boxSizing: "border-box",
          width: "100%",
          background: "#ffffff",
        }}
      >
        {LAYOUT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}