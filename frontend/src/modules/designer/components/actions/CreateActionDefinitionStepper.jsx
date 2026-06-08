const STEPS = [
  { id: 1, label: "Выбор типа" },
  { id: 2, label: "Настройка" },
];

export default function CreateActionDefinitionStepper({ activeStep = 1 }) {
  return (
    <nav
      className="designer-create-action-definition-modal__stepper"
      aria-label="Шаги создания действия"
    >
      {STEPS.map((step, index) => {
        const isActive = activeStep === step.id;
        const isCompleted = activeStep > step.id;

        return (
          <div
            key={step.id}
            className={[
              "designer-create-action-definition-modal__step",
              isActive ? "is-active" : "",
              isCompleted ? "is-completed" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <span
              className="designer-create-action-definition-modal__step-index"
              aria-hidden="true"
            >
              {isCompleted ? "✓" : step.id}
            </span>
            <span className="designer-create-action-definition-modal__step-label">
              {step.label}
            </span>
            {index < STEPS.length - 1 ? (
              <span
                className="designer-create-action-definition-modal__step-separator"
                aria-hidden="true"
              />
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}
