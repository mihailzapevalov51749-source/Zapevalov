import { useCallback, useEffect, useRef, useState } from "react";

import FieldEditor from "../../../shared/fieldEditors/FieldEditor";
import {
  FIELD_EDITOR_TYPE_RELATION,
  normalizeFieldEditorType,
} from "../../../shared/fieldEditors/fieldEditorRegistry";
import FieldValueRenderer from "../../../shared/fieldTypes/FieldValueRenderer";
import RelationFieldCell from "./RelationFieldCell";
import { fieldDefToRendererColumn } from "../../../shared/viewEngine/utils/fieldDefToRendererColumn";

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

import { isSameFieldValue } from "../utils/inlineFieldValueUtils";

const FIELD_MODE = {
  VIEW: "view",
  EDITING: "editing",
  SAVING: "saving",
};

const IMMEDIATE_COMMIT_EDITOR_TYPES = new Set([
  "choice",
  "multi_choice",
  "user",
  "boolean",
  "date",
  "datetime",
]);

function normalizeRendererType(field) {
  const type = String(field?.rawFieldType || field?.type || "text").toLowerCase();

  if (type === "multi_choice" || type === "status" || type === "select") {
    return "choice";
  }

  if (type === "person" || type === "assignee") {
    return "user";
  }

  if (type === "file" || type === "files") {
    return "file";
  }

  if (type === "relation") {
    return "relation";
  }

  if (type === "lookup" || type === "linkedrow" || type === "linked_row") {
    return "lookup";
  }

  if (type === "link" || type === "url") {
    return "link";
  }

  return type;
}

function shouldCommitImmediately(field) {
  return IMMEDIATE_COMMIT_EDITOR_TYPES.has(
    normalizeFieldEditorType(field?.rawFieldType || field?.type),
  );
}

function getFieldIcon(field) {
  const type = normalizeRendererType(field);

  if (type === "date" || type === "datetime") {
    return calendarIcon;
  }

  return textIcon;
}

function isOutsideInlineEditor(target, cellElement) {
  if (!target || !cellElement) {
    return true;
  }

  if (cellElement.contains(target)) {
    return false;
  }

  if (target.closest?.("[data-user-picker-popover]")) {
    return false;
  }

  return true;
}

export function RuntimeFieldCell({
  field,
  value,
  onFieldChange,
  readOnly = false,
  fieldErrors = {},
  alwaysEditing = false,
}) {
  const [mode, setMode] = useState(
    alwaysEditing ? FIELD_MODE.EDITING : FIELD_MODE.VIEW,
  );
  const [draftValue, setDraftValue] = useState(value);
  const cellRef = useRef(null);
  const editorWrapRef = useRef(null);

  const type = normalizeRendererType(field);
  const editorType = normalizeFieldEditorType(field?.rawFieldType || field?.type);
  const isUser = type === "user";
  const isEditable = !readOnly && Boolean(onFieldChange);
  const rendererColumn = fieldDefToRendererColumn(field);
  const commitImmediately = shouldCommitImmediately(field);
  const fieldError = fieldErrors[field.key];

  useEffect(() => {
    if (alwaysEditing) {
      setMode(FIELD_MODE.EDITING);
    }
  }, [alwaysEditing]);

  useEffect(() => {
    if (mode === FIELD_MODE.VIEW) {
      setDraftValue(value);
    }
  }, [value, mode]);

  const exitToView = useCallback(() => {
    if (!alwaysEditing) {
      setMode(FIELD_MODE.VIEW);
    }
  }, [alwaysEditing]);

  const cancelEdit = useCallback(() => {
    setDraftValue(value);
    exitToView();
  }, [exitToView, value]);

  const commitField = useCallback(
    async (nextValue) => {
      if (!isEditable) {
        return;
      }

      if (isSameFieldValue(value, nextValue, editorType)) {
        cancelEdit();
        return;
      }

      setMode(FIELD_MODE.SAVING);

      try {
        const result = await onFieldChange?.(field.key, nextValue);

        if (result?.ok === false) {
          setDraftValue(value);
          setMode(FIELD_MODE.EDITING);
          return;
        }

        exitToView();
      } catch {
        setDraftValue(value);
        setMode(FIELD_MODE.EDITING);
      }
    },
    [
      cancelEdit,
      editorType,
      exitToView,
      field.key,
      isEditable,
      onFieldChange,
      value,
    ],
  );

  const handleActivate = useCallback(() => {
    if (!isEditable || mode === FIELD_MODE.SAVING) {
      return;
    }

    setDraftValue(value);
    setMode(FIELD_MODE.EDITING);
  }, [isEditable, mode, value]);

  const handleEditorChange = useCallback(
    (nextValue) => {
      if (commitImmediately) {
        void commitField(nextValue);
        return;
      }

      setDraftValue(nextValue);
    },
    [commitImmediately, commitField],
  );

  const handleEditorDismiss = useCallback(() => {
    if (mode === FIELD_MODE.SAVING) {
      return;
    }

    cancelEdit();
  }, [cancelEdit, mode]);

  const handleEditorBlur = useCallback(
    (event) => {
      if (isUser) {
        return;
      }

      const nextTarget = event.relatedTarget;

      if (nextTarget && editorWrapRef.current?.contains(nextTarget)) {
        return;
      }

      if (commitImmediately) {
        cancelEdit();
        return;
      }

      void commitField(draftValue);
    },
    [cancelEdit, commitImmediately, commitField, draftValue, isUser],
  );

  useEffect(() => {
    if (mode !== FIELD_MODE.EDITING || isUser) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (!isOutsideInlineEditor(event.target, cellRef.current)) {
        return;
      }

      cancelEdit();
    };

    document.addEventListener("mousedown", handlePointerDown, true);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown, true);
    };
  }, [cancelEdit, isUser, mode]);

  const isInteractive = mode === FIELD_MODE.EDITING || mode === FIELD_MODE.SAVING;

  return (
    <div
      ref={cellRef}
      style={{
        ...entityCardFieldCellStyle,
        ...(isUser ? entityCardUserFieldCellStyle : {}),
        opacity: mode === FIELD_MODE.SAVING ? 0.65 : 1,
        pointerEvents: mode === FIELD_MODE.SAVING ? "none" : "auto",
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
          {isEditable && isInteractive ? (
            <div
              ref={editorWrapRef}
              style={{ width: "100%" }}
              onBlur={handleEditorBlur}
            >
              <FieldEditor
                fieldDef={field}
                value={commitImmediately ? value : draftValue}
                onChange={handleEditorChange}
                readOnly={mode === FIELD_MODE.SAVING}
                autoFocus={mode === FIELD_MODE.EDITING}
                inline
                onCancel={cancelEdit}
                onDismiss={handleEditorDismiss}
                onCommit={() => void commitField(draftValue)}
              />
            </div>
          ) : (
            <div
              role={isEditable ? "button" : undefined}
              tabIndex={isEditable ? 0 : undefined}
              onClick={handleActivate}
              onDoubleClick={(event) => {
                if (!isEditable || type !== "link") {
                  return;
                }

                event.preventDefault();
                handleActivate();
              }}
              onKeyDown={(event) => {
                if (!isEditable) {
                  return;
                }

                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  handleActivate();
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
                column={rendererColumn}
                compact
                multiline={type === "text"}
                emptyValue="—"
              />
            </div>
          )}
        </div>

        {fieldError ? (
          <div style={{ fontSize: 11, color: "#dc2626", marginTop: 4 }}>
            {fieldError}
          </div>
        ) : null}

        {mode === FIELD_MODE.SAVING ? (
          <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
            Сохранение…
          </div>
        ) : null}
      </div>
    </div>
  );
}

function isRelationField(field) {
  const rawType = String(field?.rawFieldType || field?.type || "").toLowerCase();
  return rawType === FIELD_EDITOR_TYPE_RELATION;
}

export default function ObjectEntityCardFieldsGrid({
  fields = [],
  formValues = {},
  fieldErrors = {},
  onFieldChange,
  readOnly = false,
  alwaysEditing = false,
  tenantId = null,
  entityId = null,
  objectTypeKey = null,
  catalog = null,
  isCreate = false,
  onOpenRelatedEntity = null,
}) {
  if (!fields.length) {
    return null;
  }

  return (
    <section style={entityCardFieldsStyle}>
      <div style={entityCardFieldsGridStyle}>
        {fields.map((field) =>
          isRelationField(field) ? (
            <RelationFieldCell
              key={field.key}
              field={field}
              tenantId={tenantId}
              entityId={entityId}
              objectTypeKey={objectTypeKey}
              catalog={catalog}
              readOnly={readOnly}
              isCreate={isCreate}
              value={formValues[field.key]}
              onFieldChange={onFieldChange}
              onOpenRelatedEntity={onOpenRelatedEntity}
            />
          ) : (
            <RuntimeFieldCell
              key={field.key}
              field={field}
              value={formValues[field.key]}
              onFieldChange={onFieldChange}
              readOnly={readOnly}
              fieldErrors={fieldErrors}
              alwaysEditing={alwaysEditing}
            />
          ),
        )}
      </div>
    </section>
  );
}
