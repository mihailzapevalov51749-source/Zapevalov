/**
 * CalculatorBlockView
 *
 * Назначение:
 * Отображение блока "Калькулятор" в режиме просмотра.
 *
 * Здесь в будущем:
 * - UI калькулятора
 * - поля ввода
 * - результаты расчетов
 *
 * Важно:
 * Этот файл отвечает ТОЛЬКО за отображение (read-only).
 */

export default function CalculatorBlockView({ block }) {
  return (
    <div>
      <strong>{block?.title || "Калькулятор"}</strong>

      <div style={{ marginTop: 8, color: "#64748b", fontSize: 14 }}>
        Здесь будет отображение калькулятора (формулы, поля, результаты).
      </div>
    </div>
  );
}