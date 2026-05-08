import TextCellEditor from "./TextCellEditor";
import BooleanCellEditor from "./BooleanCellEditor";
import ChoiceCellEditor from "./ChoiceCellEditor";
import DateCellEditor from "./DateCellEditor";
import LinkCellEditor from "./LinkCellEditor";
import LookupCellEditor from "./LookupCellEditor";
import NumberCellEditor from "./NumberCellEditor";
import FileCellEditor from "./FileCellEditor";
import UserCellEditor from "./UserCellEditor";

const normalizeColumnType = (type) => {
  const normalized = String(type || "text").toLowerCase();

  if (["text", "string"].includes(normalized)) return "text";

  if (["number", "numeric", "integer", "float"].includes(normalized)) {
    return "number";
  }

  if (["date", "datetime"].includes(normalized)) return "date";

  if (["choice", "select", "status", "option"].includes(normalized)) {
    return "choice";
  }

  if (["boolean", "bool", "checkbox"].includes(normalized)) {
    return "boolean";
  }

  if (["link", "url"].includes(normalized)) return "link";

  if (["lookup", "relation"].includes(normalized)) return "lookup";

  if (["file", "files", "attachment", "attachments"].includes(normalized)) {
    return "file";
  }

  if (
    [
      "user",
      "users",
      "person",
      "employee",
      "assignee",
      "created_by",
      "updated_by",
      "system_user",
      "system_created_by",
      "system_updated_by",
    ].includes(normalized)
  ) {
    return "user";
  }

  return "text";
};

export default function TableCellEditor({
  column,
  value,
  onChange,
  readOnly = false,
  isPrimary = false,
  autoFocus = false,
}) {
  const type = normalizeColumnType(column?.type);

  const editorProps = {
    column,
    value,
    onChange,
    readOnly,
    isPrimary,
    autoFocus,
  };

  switch (type) {
    case "boolean":
      return <BooleanCellEditor {...editorProps} />;

    case "choice":
      return <ChoiceCellEditor {...editorProps} />;

    case "date":
      return <DateCellEditor {...editorProps} />;

    case "link":
      return <LinkCellEditor {...editorProps} />;

    case "lookup":
      return <LookupCellEditor {...editorProps} />;

    case "number":
      return <NumberCellEditor {...editorProps} />;

    case "file":
      return <FileCellEditor {...editorProps} />;

    case "user":
      return <UserCellEditor {...editorProps} />;

    case "text":
    default:
      return <TextCellEditor {...editorProps} />;
  }
}