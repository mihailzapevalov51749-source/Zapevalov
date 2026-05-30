import { fieldDefToRendererColumn } from "../viewEngine/utils/fieldDefToRendererColumn";

import { getFieldEditorComponent, normalizeFieldEditorType } from "./fieldEditorRegistry";

/**
 * Form field editor — maps catalog field def to typed editor (no UniversalTable dependency).
 */
export default function FieldEditor({
  fieldDef = null,
  value,
  onChange,
  readOnly = false,
  autoFocus = false,
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

  return (
    <Editor
      column={column}
      fieldDef={fieldDef}
      value={value}
      onChange={onChange}
      readOnly={readOnly}
      autoFocus={autoFocus}
      multiline={editorType === "textarea"}
      includeTime={editorType === "datetime"}
    />
  );
}
