import MenuColorPicker from "../../../../shared/navigation/MenuColorPicker";

import {
  createEmptyChoiceOption,
  moveChoiceOption,
} from "./fieldFormUtils";

import "./choiceOptionsEditor.css";

export default function ChoiceOptionsEditor({
  options = [],
  multiple = false,
  onOptionsChange,
  onMultipleChange,
  error = "",
}) {
  const updateOption = (index, patch) => {
    const next = options.map((option, optionIndex) =>
      optionIndex === index ? { ...option, ...patch } : option,
    );

    onOptionsChange?.(next);
  };

  const handleAddOption = () => {
    onOptionsChange?.([...options, createEmptyChoiceOption(options)]);
  };

  const handleRemoveOption = (index) => {
    onOptionsChange?.(options.filter((_, optionIndex) => optionIndex !== index));
  };

  const handleMoveOption = (index, direction) => {
    onOptionsChange?.(moveChoiceOption(options, index, direction));
  };

  return (
    <div className="designer-choice-options">
      <label className="designer-field-form__checkbox designer-choice-options__multiple">
        <input
          type="checkbox"
          checked={Boolean(multiple)}
          onChange={(event) => onMultipleChange?.(event.target.checked)}
        />
        Множественный выбор
      </label>

      <div className="designer-choice-options__header">
        <span className="designer-label">Варианты выбора</span>
      </div>

      {options.length === 0 ? (
        <p className="designer-choice-options__empty">Добавьте хотя бы один вариант</p>
      ) : (
        <ul className="designer-choice-options__list">
          {options.map((option, index) => (
            <li key={option.key} className="designer-choice-options__row">
              <MenuColorPicker
                color={option.color || ""}
                onChange={(color) => updateOption(index, { color })}
                title="Цвет варианта"
              />

              <input
                type="text"
                className="designer-input designer-choice-options__label-input"
                value={option.label}
                onChange={(event) =>
                  updateOption(index, { label: event.target.value })
                }
                placeholder="Название варианта"
              />

              <div className="designer-choice-options__actions">
                <button
                  type="button"
                  className="designer-choice-options__action"
                  disabled={index === 0}
                  onClick={() => handleMoveOption(index, -1)}
                  title="Переместить вверх"
                  aria-label="Переместить вверх"
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="designer-choice-options__action"
                  disabled={index === options.length - 1}
                  onClick={() => handleMoveOption(index, 1)}
                  title="Переместить вниз"
                  aria-label="Переместить вниз"
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="designer-choice-options__action designer-choice-options__action--danger"
                  onClick={() => handleRemoveOption(index)}
                  title="Удалить вариант"
                  aria-label="Удалить вариант"
                >
                  ×
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        className="designer-btn designer-choice-options__add"
        onClick={handleAddOption}
      >
        + Добавить
      </button>

      {error ? (
        <p className="designer-field-form__error">{error}</p>
      ) : null}
    </div>
  );
}
