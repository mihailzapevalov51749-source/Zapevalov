import fileIcon from "../../../assets/icons/ClipboardList.svg";

import { EntityCardInlineField } from "../../../shared/entityCardShell";

import {
  entityCardMainContentStyle,
  entityCardMainDescriptionLabelStyle,
  entityCardMainDescriptionStyle,
  entityCardMainEmptyDescriptionStyle,
  entityCardMainFinishButtonStyle,
  entityCardMainIconBoxStyle,
  entityCardMainIconStyle,
  entityCardMainLabelStyle,
  entityCardMainStyle,
  entityCardMainTitleStyle,
} from "../../../shared/entityCardShell/styles/entityCardMainStyles";

import { resolveEntityTitle } from "../services/resolveEntityTitle";

export default function ObjectEntityCardMain({
  titleField = null,
  descriptionField = null,
  formValues = {},
  onFieldChange,
  readOnly = false,
  fallbackTitle = "Без названия",
}) {
  const titleKey = titleField?.key ? String(titleField.key) : null;
  const descriptionKey = descriptionField?.key
    ? String(descriptionField.key)
    : null;

  const titleValue = titleKey
    ? resolveEntityTitle(formValues, titleKey) || fallbackTitle
    : fallbackTitle;

  const descriptionValue = descriptionKey
    ? formValues[descriptionKey]
    : "";

  const hasDescription =
    descriptionValue !== null &&
    descriptionValue !== undefined &&
    String(descriptionValue).trim() !== "";

  const updateField = async (field, value) => {
    if (!field?.key || readOnly) {
      return;
    }

    onFieldChange?.(field.key, value);
  };

  return (
    <section style={entityCardMainStyle}>
      <div style={entityCardMainIconBoxStyle}>
        <img src={fileIcon} alt="" style={entityCardMainIconStyle} />
      </div>

      <div style={entityCardMainContentStyle}>
        <div style={entityCardMainLabelStyle}>
          {titleField?.label || "Название"}
        </div>

        <div style={entityCardMainTitleStyle}>
          <EntityCardInlineField
            value={titleValue || ""}
            placeholder="Без названия"
            readOnly={readOnly || !titleKey}
            onSave={(nextValue) => updateField(titleField, nextValue)}
            style={{
              fontSize: 13,
              lineHeight: 1.35,
              fontWeight: 700,
              border: "none",
              padding: 0,
              background: "transparent",
              textTransform: "uppercase",
              color: "#0F172A",
            }}
          />
        </div>

        <div style={entityCardMainDescriptionLabelStyle}>
          {descriptionField?.label || "Описание"}
        </div>

        <div
          style={
            hasDescription
              ? entityCardMainDescriptionStyle
              : entityCardMainEmptyDescriptionStyle
          }
        >
          <EntityCardInlineField
            value={descriptionValue || ""}
            multiline
            placeholder="Описание пока не заполнено"
            readOnly={readOnly || !descriptionKey}
            onSave={(nextValue) =>
              updateField(descriptionField, nextValue)
            }
            style={{
              border: "none",
              padding: 0,
              background: "transparent",
              minHeight: 0,
              fontSize: 13,
              lineHeight: 1.45,
              color: hasDescription ? "#64748B" : "#94A3B8",
            }}
          />
        </div>
      </div>

      <button type="button" style={entityCardMainFinishButtonStyle}>
        Финиш
      </button>
    </section>
  );
}
