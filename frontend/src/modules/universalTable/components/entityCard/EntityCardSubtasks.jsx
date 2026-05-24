import {
  entityCardSubtasksStyle,
  entityCardSubtasksEmptyStyle,
  entityCardSubtasksListStyle,
  entityCardSubtaskRowStyle,
  entityCardSubtaskTitleStyle,
  entityCardSubtaskMetaItemStyle,
  entityCardSubtaskStatusStyle,
  entityCardSubtaskAssigneeStyle,
  entityCardSubtaskAvatarStyle,
  entityCardSubtaskAvatarImageStyle,
  entityCardSubtaskAssigneeNameStyle,
} from "./styles/entityCardSubtasksStyles";

const DEFAULT_AVATAR_SETTINGS = { x: 0, y: 0, scale: 1 };
const PROFILE_AVATAR_SIZE = 132;

function getRowId(row) {
  return String(row?.id || row?.rowId || row?.row_id || "");
}

function getParentId(row) {
  const values = row?.values || {};

  const direct =
    row?.parentId ||
    row?.parent_id ||
    row?.parentRowId ||
    row?.parent_row_id ||
    row?.parent?.id ||
    row?.parentRow?.id ||
    row?.parent_row?.id ||
    null;

  if (direct) return String(direct);

  const parentValue =
    values.parent ||
    values.parent_task ||
    values.parentTask ||
    values.parent_row ||
    values.parentRow ||
    null;

  if (parentValue && typeof parentValue === "object") {
    return String(
      parentValue.id ||
        parentValue.rowId ||
        parentValue.row_id ||
        ""
    );
  }

  return "";
}

function getColumnByNames(columns = [], names = []) {
  return (
    columns.find((column) => {
      const title = String(column?.title || "").toLowerCase();
      const key = String(column?.key || column?.id || "").toLowerCase();

      return names.some((name) => {
        const normalizedName = String(name).toLowerCase();
        return title.includes(normalizedName) || key.includes(normalizedName);
      });
    }) || null
  );
}

function getColumnOptions(column) {
  const rawOptions =
    column?.options ||
    column?.settings?.options ||
    column?.config?.options ||
    [];

  if (!Array.isArray(rawOptions)) return [];

  return rawOptions;
}

function getValue(row, column) {
  if (!row || !column) return "";

  const values = row.values || {};
  const columnId = column.id || column.key;

  return values[columnId] ?? "";
}

function getOptionLabel(option) {
  if (!option) return "";

  if (typeof option === "string") return option;

  return (
    option.label ||
    option.title ||
    option.name ||
    option.value ||
    ""
  );
}

function getOptionColor(option) {
  if (!option || typeof option !== "object") return "";

  return (
    option.color ||
    option.background ||
    option.bg ||
    option.backgroundColor ||
    option.background_color ||
    ""
  );
}

function normalizeChoiceValue(value, column) {
  if (!value) {
    return {
      label: "—",
      color: "",
    };
  }

  if (Array.isArray(value)) {
    return normalizeChoiceValue(value[0], column);
  }

  const options = getColumnOptions(column);

  if (typeof value === "object") {
    const label =
      value.label ||
      value.title ||
      value.name ||
      value.value ||
      "—";

    const valueId =
      value.id ||
      value.key ||
      value.value ||
      label;

    const matchedOption =
      options.find((option) => {
        const optionLabel = getOptionLabel(option);
        const optionId =
          option?.id ||
          option?.key ||
          option?.value ||
          optionLabel;

        return (
          String(optionId) === String(valueId) ||
          String(optionLabel) === String(label)
        );
      }) || null;

    return {
      label,
      color:
        getOptionColor(value) ||
        getOptionColor(matchedOption),
    };
  }

  const label = String(value);

  const matchedOption =
    options.find((option) => {
      const optionLabel = getOptionLabel(option);
      const optionId =
        option?.id ||
        option?.key ||
        option?.value ||
        optionLabel;

      return (
        String(optionId) === label ||
        String(optionLabel) === label
      );
    }) || null;

  return {
    label,
    color: getOptionColor(matchedOption),
  };
}

function getTitle(row, columns = []) {
  const directTitle =
    row?.title ||
    row?.name ||
    row?.label ||
    row?.primaryValue ||
    row?.primary_value ||
    "";

  if (directTitle) return directTitle;

  const titleColumn =
    getColumnByNames(columns, ["название", "задач", "name", "title"]) ||
    columns[0];

  const value = getValue(row, titleColumn);

  if (typeof value === "object" && value !== null) {
    return (
      value.title ||
      value.name ||
      value.label ||
      value.value ||
      "Без названия"
    );
  }

  return value || "Без названия";
}

function getDueDate(row, columns = []) {
  const dueColumn = getColumnByNames(columns, [
    "срок",
    "дата",
    "due",
    "deadline",
  ]);

  const value =
    getValue(row, dueColumn) ||
    row?.dueDate ||
    row?.due_date ||
    row?.deadline ||
    "";

  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString("ru-RU");
}

function getStatus(row, columns = []) {
  const statusColumn = getColumnByNames(columns, ["статус", "status"]);
  const value = getValue(row, statusColumn) || row?.status || "";

  return normalizeChoiceValue(value, statusColumn);
}

function normalizeAvatarSettings(settings) {
  if (!settings) return DEFAULT_AVATAR_SETTINGS;

  if (typeof settings === "string") {
    try {
      return {
        ...DEFAULT_AVATAR_SETTINGS,
        ...JSON.parse(settings),
      };
    } catch {
      return DEFAULT_AVATAR_SETTINGS;
    }
  }

  if (typeof settings === "object") {
    return {
      ...DEFAULT_AVATAR_SETTINGS,
      ...settings,
    };
  }

  return DEFAULT_AVATAR_SETTINGS;
}

function getInitials(fullName) {
  if (!fullName) return "?";

  return String(fullName)
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function normalizeUser(value) {
  if (!value) {
    return {
      name: "—",
      avatarUrl: "",
      avatarSettings: DEFAULT_AVATAR_SETTINGS,
    };
  }

  if (Array.isArray(value)) {
    return normalizeUser(value[0]);
  }

  if (typeof value === "object") {
    return {
      name:
        value.full_name ||
        value.fullName ||
        value.name ||
        value.label ||
        value.email ||
        value.value ||
        "—",
      avatarUrl: value.avatar_url || value.avatarUrl || "",
      avatarSettings:
        value.avatar_settings ||
        value.avatarSettings ||
        DEFAULT_AVATAR_SETTINGS,
    };
  }

  return {
    name: String(value),
    avatarUrl: "",
    avatarSettings: DEFAULT_AVATAR_SETTINGS,
  };
}

function getAssignee(row, columns = []) {
  const assigneeColumn = getColumnByNames(columns, [
    "ответственный",
    "исполнитель",
    "assignee",
    "responsible",
    "user",
  ]);

  const value =
    getValue(row, assigneeColumn) ||
    row?.assignee ||
    row?.responsible ||
    "";

  return normalizeUser(value);
}

function SubtaskAssignee({ assignee }) {
  const user = normalizeUser(assignee);
  const normalized = normalizeAvatarSettings(user.avatarSettings);

  const size = 24;
  const avatarRatio = size / PROFILE_AVATAR_SIZE;
  const avatarX = (Number(normalized.x) || 0) * avatarRatio;
  const avatarY = (Number(normalized.y) || 0) * avatarRatio;
  const avatarScale = Number(normalized.scale) || 1;

  return (
    <div style={entityCardSubtaskAssigneeStyle}>
      <div style={entityCardSubtaskAvatarStyle}>
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={user.name || "Аватар"}
            draggable={false}
            style={{
              ...entityCardSubtaskAvatarImageStyle,
              transform: `translate(${avatarX}px, ${avatarY}px) scale(${avatarScale})`,
            }}
          />
        ) : (
          getInitials(user.name)
        )}
      </div>

      <span style={entityCardSubtaskAssigneeNameStyle}>
        {user.name}
      </span>
    </div>
  );
}

export default function EntityCardSubtasks({
  row,
  rows = [],
  columns = [],
  onOpenRelatedRow,
}) {
  const currentRowId = getRowId(row);

  const subtasks = Array.isArray(rows)
    ? rows.filter((item) => getParentId(item) === currentRowId)
    : [];

  if (!subtasks.length) {
    return (
      <div style={entityCardSubtasksStyle}>
        <div style={entityCardSubtasksEmptyStyle}>
          У этой задачи пока нет подзадач
        </div>
      </div>
    );
  }

  return (
    <div style={entityCardSubtasksStyle}>
      <div style={entityCardSubtasksListStyle}>
        {subtasks.map((subtask) => {
          const title = getTitle(subtask, columns);
          const dueDate = getDueDate(subtask, columns);
          const status = getStatus(subtask, columns);
          const assignee = getAssignee(subtask, columns);

          return (
            <button
              key={getRowId(subtask)}
              type="button"
              style={entityCardSubtaskRowStyle}
              onClick={() => onOpenRelatedRow?.(subtask)}
            >
              <div style={entityCardSubtaskTitleStyle}>
                {title}
              </div>

              <div style={entityCardSubtaskMetaItemStyle}>
                {dueDate}
              </div>

             
              <div
  style={{
    ...entityCardSubtaskStatusStyle,
    ...(status.color
      ? {
          background: status.color,
          color: "#FFFFFF",
        }
      : {}),
  }}
>
  {status.label}
</div>

              <SubtaskAssignee assignee={assignee} />
            </button>
          );
        })}
      </div>
    </div>
  );
}