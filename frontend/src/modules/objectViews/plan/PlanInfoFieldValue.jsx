import { useCallback, useEffect, useRef, useState } from "react";

import FieldEditor from "../../../shared/fieldEditors/FieldEditor";
import {
  normalizeFieldEditorType,
} from "../../../shared/fieldEditors/fieldEditorRegistry";
import FieldValueRenderer from "../../../shared/fieldTypes/FieldValueRenderer";
import { fieldDefToRendererColumn } from "../../../shared/viewEngine/utils/fieldDefToRendererColumn";
import { isSameFieldValue } from "../../objectEntities/utils/inlineFieldValueUtils";

const FIELD_MODE = {
  VIEW: "view",
  EDITING: "editing",
  SAVING: "saving",
};

const IMMEDIATE_COMMIT_TYPES = new Set([
  "choice",
  "multi_choice",
  "user",
  "boolean",
  "date",
  "datetime",
  "status",
  "select",
]);

function shouldCommitImmediately(field) {
  return IMMEDIATE_COMMIT_TYPES.has(
    normalizeFieldEditorType(field?.rawFieldType || field?.type),
  );
}

function isOutsideEditor(target, cellElement) {
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

/**
 * Inline field value for Plan Info grid — same visual layout as Studio preview, with Office editing.
 */
export default function PlanInfoFieldValue({
  field,
  value,
  onFieldChange,
  readOnly = false,
  fieldError = "",
  createContext = null,
}) {
  const [mode, setMode] = useState(FIELD_MODE.VIEW);
  const [draftValue, setDraftValue] = useState(value);
  const cellRef = useRef(null);
  const editorWrapRef = useRef(null);

  const editorType = normalizeFieldEditorType(field?.rawFieldType || field?.type);
  const rendererType = String(field?.type || "text").toLowerCase();
  const isUser = rendererType === "user" || editorType === "user";
  const isEditable = !readOnly && Boolean(onFieldChange);
  const rendererColumn = fieldDefToRendererColumn(field);
  const commitImmediately = shouldCommitImmediately(field);

  useEffect(() => {
    if (mode === FIELD_MODE.VIEW) {
      setDraftValue(value);
    }
  }, [mode, value]);

  const exitToView = useCallback(() => {
    setMode(FIELD_MODE.VIEW);
  }, []);

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
    [cancelEdit, editorType, exitToView, field.key, isEditable, onFieldChange, value],
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
      if (!isOutsideEditor(event.target, cellRef.current)) {
        return;
      }

      if (commitImmediately) {
        cancelEdit();
        return;
      }

      void commitField(draftValue);
    };

    document.addEventListener("mousedown", handlePointerDown, true);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown, true);
    };
  }, [cancelEdit, commitField, commitImmediately, draftValue, isUser, mode]);

  const isInteractive = mode === FIELD_MODE.EDITING || mode === FIELD_MODE.SAVING;

  if (isEditable && isInteractive) {
    return (
      <div
        ref={cellRef}
        className={`object-plan-view__info-grid-value object-plan-view__info-grid-value--editing${
          mode === FIELD_MODE.SAVING ? " is-saving" : ""
        }`}
        onBlur={handleEditorBlur}
      >
        <div ref={editorWrapRef}>
          <FieldEditor
            fieldDef={field}
            value={commitImmediately ? value : draftValue}
            onChange={handleEditorChange}
            readOnly={mode === FIELD_MODE.SAVING}
            autoFocus={mode === FIELD_MODE.EDITING}
            inline
            createContext={createContext}
            onCancel={cancelEdit}
            onDismiss={cancelEdit}
            onCommit={() => void commitField(draftValue)}
          />
        </div>
        {fieldError ? (
          <span className="object-plan-view__info-field-error">{fieldError}</span>
        ) : null}
      </div>
    );
  }

  return (
    <div
      ref={cellRef}
      className={`object-plan-view__info-grid-value${
        isEditable ? " object-plan-view__info-grid-value--editable" : ""
      }`}
      role={isEditable ? "button" : undefined}
      tabIndex={isEditable ? 0 : undefined}
      onClick={handleActivate}
      onKeyDown={(event) => {
        if (!isEditable) {
          return;
        }

        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          handleActivate();
        }
      }}
    >
      <FieldValueRenderer
        type={rendererType}
        value={value}
        column={rendererColumn}
        compact
        multiline={rendererType === "text" || rendererType === "textarea"}
        emptyValue="—"
        resolveUser={createContext?.resolveUser}
        resolveLookup={createContext?.resolveLookup}
      />
      {fieldError ? (
        <span className="object-plan-view__info-field-error">{fieldError}</span>
      ) : null}
    </div>
  );
}
