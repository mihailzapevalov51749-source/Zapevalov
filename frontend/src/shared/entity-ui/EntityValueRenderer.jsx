import {
  formatDateTime,
  getCellDisplayValue,
  getUserDisplayName,
  normalizeUserValue,
} from "./entityValueUtils";

const DEFAULT_AVATAR_SETTINGS = {
  x: 0,
  y: 0,
  scale: 1,
};

const PROFILE_AVATAR_SIZE = 132;
const DEFAULT_STATUS_COLOR = "#2563EB";

export default function EntityValueRenderer({
  column,
  value,
  fallback = "—",
  variant = "default",
}) {
  const type = String(column?.type || "text").toLowerCase();

  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  if (type === "user") {
    return <EntityUser value={value} variant={variant} />;
  }

  if (type === "date" || type === "datetime") {
    return <EntityDate value={value} />;
  }

  if (type === "choice" || type === "status") {
    return <EntityStatus column={column} value={value} />;
  }

  if (type === "file" || type === "attachment") {
    return <EntityFile value={value} />;
  }

  return <EntityText value={value} />;
}

function getUserAvatarUrl(value) {
  if (!value || typeof value !== "object") return "";

  return (
    value.avatarUrl ||
    value.avatar_url ||
    value.photoUrl ||
    value.photo_url ||
    value.imageUrl ||
    value.image_url ||
    ""
  );
}

function getUserAvatarSettings(value) {
  if (!value || typeof value !== "object") return DEFAULT_AVATAR_SETTINGS;

  const settings = value.avatarSettings || value.avatar_settings || {};

  return {
    x: Number(settings.x || 0),
    y: Number(settings.y || 0),
    scale: Number(settings.scale || 1),
  };
}

function EntityText({ value }) {
  const label = getCellDisplayValue(value);

  return (
    <span
      title={label}
      style={{
        minWidth: 0,
        maxWidth: "100%",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

function EntityUser({ value, variant }) {
  const normalizedUser = normalizeUserValue(value);

  const name = getUserDisplayName(normalizedUser);
  const avatarUrl = getUserAvatarUrl(normalizedUser);
  const avatarSettings = getUserAvatarSettings(normalizedUser);

  const isCompact = variant === "compact";
  const avatarSize = isCompact ? 20 : 22;

  const avatarRatio = avatarSize / PROFILE_AVATAR_SIZE;
  const avatarX = (avatarSettings.x || 0) * avatarRatio;
  const avatarY = (avatarSettings.y || 0) * avatarRatio;
  const avatarScale = avatarSettings.scale || 1;

  return (
    <span
      title={name}
      style={{
        minWidth: 0,
        maxWidth: "100%",
        display: "inline-flex",
        alignItems: "center",
        gap: isCompact ? 6 : 8,
        overflow: "hidden",
      }}
    >
      <span
        style={{
          width: avatarSize,
          height: avatarSize,
          minWidth: avatarSize,
          borderRadius: "50%",
          background: "#E0E7FF",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: isCompact ? 10 : 11,
          fontWeight: 700,
          color: "#3730A3",
          flexShrink: 0,
          userSelect: "none",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt=""
            draggable={false}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              display: "block",
              userSelect: "none",
              pointerEvents: "none",
              transform: `translate(${avatarX}px, ${avatarY}px) scale(${avatarScale})`,
              transformOrigin: "center center",
            }}
          />
        ) : (
          name?.[0] || "?"
        )}
      </span>

      <span
        style={{
          minWidth: 0,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {name}
      </span>
    </span>
  );
}

function EntityDate({ value }) {
  const formattedValue = formatDateTime(value);

  return (
    <span
      title={formattedValue}
      style={{
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}
    >
      {formattedValue}
    </span>
  );
}

function getStatusLabel(value) {
  if (value === null || value === undefined || value === "") return "—";

  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  if (typeof value === "object") {
    return String(
      value.label ||
        value.title ||
        value.name ||
        value.value ||
        value.text ||
        "—"
    );
  }

  return String(value);
}

function normalizeStatusOptions(options) {
  if (!Array.isArray(options)) return [];

  return options.map((option) => {
    if (typeof option === "string") {
      return {
        label: option,
        value: option,
        color: DEFAULT_STATUS_COLOR,
      };
    }

    return {
      label:
        option?.label ||
        option?.title ||
        option?.name ||
        option?.value ||
        "",
      value: option?.value || option?.id || option?.label || "",
      color:
        option?.color ||
        option?.backgroundColor ||
        option?.background_color ||
        option?.bgColor ||
        option?.bg_color ||
        DEFAULT_STATUS_COLOR,
    };
  });
}

function getOptionByValue(column, value) {
  const label = getStatusLabel(value);
  const options = normalizeStatusOptions(column?.options);

  return options.find((option) => {
    return (
      String(option.label || "").trim() === String(label || "").trim() ||
      String(option.value || "").trim() === String(label || "").trim()
    );
  });
}

function getStatusColor(column, value) {
  if (value && typeof value === "object") {
    return (
      value.color ||
      value.backgroundColor ||
      value.background_color ||
      value.bgColor ||
      value.bg_color ||
      getOptionByValue(column, value)?.color ||
      DEFAULT_STATUS_COLOR
    );
  }

  return getOptionByValue(column, value)?.color || DEFAULT_STATUS_COLOR;
}

function EntityStatus({ column, value }) {
  const label = getStatusLabel(value);
  const color = getStatusColor(column, value);

  return (
    <span
      title={label}
      style={{
        maxWidth: "100%",
        height: 22,
        padding: "0 10px",
        borderRadius: 999,
        background: color,
        color: "#ffffff",
        display: "inline-flex",
        alignItems: "center",
        fontSize: 12,
        fontWeight: 700,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

function EntityFile({ value }) {
  const files = Array.isArray(value) ? value : [value];

  const label =
    files
      .map((file) =>
        typeof file === "object"
          ? file.name || file.title || file.filename
          : String(file)
      )
      .filter(Boolean)
      .join(", ") || "—";

  return (
    <span
      title={label}
      style={{
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}