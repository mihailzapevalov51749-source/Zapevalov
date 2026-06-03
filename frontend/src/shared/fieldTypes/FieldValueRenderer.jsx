import { getFieldValueRenderer } from "./fieldTypeRegistry";

export default function FieldValueRenderer({
  type = "text",

  value,

  column,

  row,

  table,

  compact = false,

  multiline = false,

  expanded = false,

  emptyValue = "—",

  ...props
}) {
  const Renderer =
    getFieldValueRenderer(type);

  return (
    <Renderer
      value={value}
      column={column}
      row={row}
      table={table}
      compact={compact}
      multiline={multiline}
      expanded={expanded}
      emptyValue={emptyValue}
      {...props}
    />
  );
}