import { useEffect, useRef, useState } from "react";

import FieldEditor from "../../../shared/fieldEditors/FieldEditor";
import FieldValueRenderer from "../../../shared/fieldTypes/FieldValueRenderer";

import textIcon from "../../../assets/icons/ClipboardList.svg";
import calendarIcon from "../../../assets/icons/CalendarClock.svg";

import {
  entityCardFieldCellStyle,
  entityCardFieldIconBoxStyle,
  entityCardFieldIconStyle,
  entityCardFieldLabelStyle,
  entityCardFieldsGridStyle,
  entityCardFieldsStyle,
  entityCardFieldTextBoxStyle,
  entityCardFieldValueStyle,
  entityCardUserFieldCellStyle,
} from "../../../shared/entityCardShell/styles/entityCardFieldsGridStyles";

function normalizeRendererType(field) {
  const type = String(field?.rawFieldType || field?.type || "text").toLowerCase();

  if (type === "multi_choice") {
    return "choice";
  }

  if (type === "person" || type === "assignee") {
    return "user";
  }

  if (type === "file" || type === "files") {
    return "file";
  }

  return type;
}

function getFieldIcon(field) {
  const type = normalizeRendererType(field);

  if (type === "date" || type === "datetime") {
    return calendarIcon;
  }

  return textIcon;
}

function RuntimeFieldCell({
  field,
  value,
  onFieldChange,
  readOnly = false,
  fieldErrors = {},
}) {
  const [isEditing, setIsEditing] = useState(false);
  const previousValueRef = useRef(value);
  const type = normalizeRendererType(field);
  const isUser = type === "user";
  const isEditable = !readOnly && Boolean(onFieldChange);

  useEffect(() => {
    if (!isEditing) {
      previousValueRef.current = value;
    }
  }, [isEditing, value]);

  const handleSave = async (nextValue) => {
    if (!isEditable) {
      return;
    }

    onFieldChange?.(field.key, nextValue);
    setIsEditing(false);
  };

  return (
    <div
      style={{
        ...entityCardFieldCellStyle,
        ...(isUser ? entityCardUserFieldCellStyle : {}),
      }}
    >
      {!isUser ? (
        <div style={entityCardFieldIconBoxStyle}>
          <img src={getFieldIcon(field)} alt="" style={entityCardFieldIconStyle} />
        </div>
      ) : null}

      <div style={entityCardFieldTextBoxStyle}>
        <div style={entityCardFieldLabelStyle}>{field.label || field.key}</div>

        <div style={entityCardFieldValueStyle}>
          {isEditable && isEditing ? (
            <FieldEditor
              fieldDef={field}
              value={value}
              onChange={(nextValue) => {
                void handleSave(nextValue);
              }}
              readOnly={false}
            />
          ) : (
            <div
              onClick={() => {
                if (isEditable) {
                  setIsEditing(true);
                }
              }}
              style={{
                width: "100%",
                cursor: isEditable ? "pointer" : "default",
              }}
            >
              <FieldValueRenderer
                type={type}
                value={value}
                column={{
                  id: field.key,
                  title: field.label,
                  type: field.rawFieldType || field.type,
                }}
                compact
                multiline={type === "text"}
                emptyValue="—"
              />
            </div>
          )}
        </div>

        {fieldErrors[field.key] ? (
          <div style={{ fontSize: 11, color: "#dc2626", marginTop: 4 }}>
            {fieldErrors[field.key]}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function ObjectEntityCardFieldsGrid({
  fields = [],
  formValues = {},
  fieldErrors = {},
  onFieldChange,
  readOnly = false,
}) {
  if (!fields.length) {
    return null;
  }

  return (
    <section style={entityCardFieldsStyle}>
      <div style={entityCardFieldsGridStyle}>
        {fields.map((field) => (
          <RuntimeFieldCell
            key={field.key}
            field={field}
            value={formValues[field.key]}
            onFieldChange={onFieldChange}
            readOnly={readOnly}
            fieldErrors={fieldErrors}
          />
        ))}
      </div>
    </section>
  );
}
