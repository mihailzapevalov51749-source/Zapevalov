const STEP_ITEMS = [
  { id: "file", label: "Файл", marker: "①" },
  { id: "mapping", label: "Колонки", marker: "②" },
  { id: "valueMapping", label: "Значения", marker: "③" },
  { id: "review", label: "Проверка", marker: "④" },
  { id: "result", label: "Импорт", marker: "⑤" },
];

/**
 * @param {{ activeStep: string }} props
 */
export default function ObjectExcelImportStepper({ activeStep = "file" }) {
  const activeIndex = STEP_ITEMS.findIndex((item) => item.id === activeStep);

  return (
    <nav className="object-excel-import__stepper" aria-label="Шаги импорта">
      {STEP_ITEMS.map((item, index) => {
        const isActive = item.id === activeStep;
        const isCompleted = activeIndex > index;

        return (
          <div
            key={item.id}
            className={`object-excel-import__step${
              isActive ? " is-active" : isCompleted ? " is-completed" : ""
            }`}
          >
            <span className="object-excel-import__step-index" aria-hidden="true">
              {isCompleted ? "✓" : item.marker}
            </span>
            <span className="object-excel-import__step-label">{item.label}</span>
            {index < STEP_ITEMS.length - 1 ? (
              <span className="object-excel-import__step-separator" aria-hidden="true">
                —
              </span>
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}
