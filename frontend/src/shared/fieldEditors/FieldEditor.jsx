import { fieldDefToRendererColumn } from "../viewEngine/utils/fieldDefToRendererColumn";

import {
  FIELD_EDITOR_TYPE_CHOICE,
  getFieldEditorComponent,
  normalizeFieldEditorType,
} from "./fieldEditorRegistry";

/**
 * Form field editor — maps catalog field def to typed editor (no UniversalTable dependency).
 */
export default function FieldEditor({
  fieldDef = null,
  value,
  onChange,
  readOnly = false,
  autoFocus = false,
  inline = false,
  onCancel,
  onCommit,
  onDismiss,
}) {
  if (!fieldDef) {
    return null;
  }

  const editorType = normalizeFieldEditorType(fieldDef.rawFieldType || fieldDef.type);
  const Editor = getFieldEditorComponent(editorType);
  const column = fieldDefToRendererColumn({
    ...fieldDef,
    type: editorType === "multi_choice" ? "choice" : fieldDef.type,
    multiple: editorType === "multi_choice" || fieldDef.multiple,
  });

  const openOnMount =
    autoFocus &&
    inline &&
    editorType === FIELD_EDITOR_TYPE_CHOICE &&
    !column.multiple;

  return (
    <Editor
      column={column}
      fieldDef={fieldDef}
      value={value}
      onChange={onChange}
      readOnly={readOnly}
      autoFocus={autoFocus}
      inline={inline}
      openOnMount={openOnMount}
      onCancel={onCancel}
      onCommit={onCommit}
      onDismiss={onDismiss}
      multiline={editorType === "textarea"}
      includeTime={editorType === "datetime"}
    />
  );
}
