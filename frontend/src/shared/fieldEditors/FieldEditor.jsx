import { fieldDefToRendererColumn } from "../viewEngine/utils/fieldDefToRendererColumn";

import {
  FIELD_EDITOR_TYPE_CHOICE,
  FIELD_EDITOR_TYPE_RELATION,
  getFieldEditorComponent,
  normalizeFieldEditorType,
} from "./fieldEditorRegistry";
import QuickCreateRelationField from "./editors/QuickCreateRelationField";
import { resolveFieldPlaceholder } from "./resolveFieldPlaceholder";

/**
 * @typedef {Object} FieldEditorCreateContext
 * @property {number | null} [tenantId]
 * @property {Record<string, unknown> | null} [catalog]
 * @property {string | null} [objectTypeKey]
 */

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
  createContext = null,
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
  const placeholder = resolveFieldPlaceholder(fieldDef, column);

  if (editorType === FIELD_EDITOR_TYPE_RELATION && createContext) {
    return (
      <QuickCreateRelationField
        fieldDef={fieldDef}
        value={value}
        onChange={onChange}
        tenantId={createContext.tenantId}
        catalog={createContext.catalog}
        objectTypeKey={createContext.objectTypeKey}
        readOnly={readOnly}
        placeholder={placeholder}
      />
    );
  }

  const openOnMount =
    autoFocus &&
    inline &&
    editorType === FIELD_EDITOR_TYPE_CHOICE &&
    !column.multiple;

  return (
    <Editor
      column={column}
      fieldDef={fieldDef}
      placeholder={placeholder}
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
