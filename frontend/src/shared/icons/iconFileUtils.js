import { apiClient } from "../../api/apiClient";

/** Same accept list as left menu + webp from files API. */
export const ICON_FILE_ACCEPT = ".svg,.png,.jpg,.jpeg,.webp";

const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;

export function isValidHexColor(color) {
  if (!color || typeof color !== "string") {
    return false;
  }

  return HEX_COLOR_PATTERN.test(color.trim());
}

export function normalizeObjectTypeColor(color) {
  if (color == null || color === "") {
    return null;
  }

  const raw = String(color).trim();
  if (!raw) {
    return null;
  }

  const withHash = raw.startsWith("#") ? raw : `#${raw}`;
  if (!HEX_COLOR_PATTERN.test(withHash)) {
    return null;
  }

  return withHash.toUpperCase();
}

export function getObjectTypeIconRenderMode(iconFileUrl) {
  if (!iconFileUrl) {
    return "empty";
  }

  const path = iconFileUrl.split("?")[0].toLowerCase();
  if (path.endsWith(".svg")) {
    return "svg-mask";
  }

  return "raster";
}

/**
 * Styles for SVG mask tint. Color applies to icon shape, not container background.
 */
export function getObjectTypeIconColorStyle(color, iconFileUrl) {
  const src = resolveIconFileSrc(iconFileUrl);
  const tint = normalizeObjectTypeColor(color);

  if (!src || !tint || getObjectTypeIconRenderMode(iconFileUrl) !== "svg-mask") {
    return null;
  }

  return {
    backgroundColor: tint,
    WebkitMaskImage: `url("${src}")`,
    maskImage: `url("${src}")`,
    WebkitMaskSize: "contain",
    maskSize: "contain",
    WebkitMaskRepeat: "no-repeat",
    maskRepeat: "no-repeat",
    WebkitMaskPosition: "center",
    maskPosition: "center",
  };
}

export function hasUploadedIcon(iconType, iconFileUrl) {
  const url = String(iconFileUrl || "").trim();

  if (!url) {
    return false;
  }

  const type = String(iconType || "").trim().toLowerCase();

  if (!type || type === "upload" || type === "library" || type === "file") {
    return true;
  }

  return iconType === "upload";
}

function readIconFieldsFromUnknownIcon(iconValue) {
  if (!iconValue) {
    return { icon_type: null, icon_file_url: null };
  }

  if (typeof iconValue === "string") {
    const trimmed = iconValue.trim();

    if (!trimmed) {
      return { icon_type: null, icon_file_url: null };
    }

    if (trimmed.startsWith("/") || trimmed.startsWith("http")) {
      return { icon_type: "upload", icon_file_url: trimmed };
    }

    return { icon_type: "library", icon_file_url: null };
  }

  if (typeof iconValue !== "object") {
    return { icon_type: null, icon_file_url: null };
  }

  const icon_type =
    iconValue.icon_type ??
    iconValue.iconType ??
    iconValue.type ??
    null;
  const icon_file_url =
    iconValue.icon_file_url ??
    iconValue.iconFileUrl ??
    iconValue.url ??
    iconValue.file_url ??
    iconValue.fileUrl ??
    iconValue.path ??
    null;

  return {
    icon_type: icon_type != null ? String(icon_type) : null,
    icon_file_url: icon_file_url != null ? String(icon_file_url) : null,
  };
}

export function resolveIconFileSrc(iconFileUrl) {
  if (!iconFileUrl) {
    return null;
  }

  if (iconFileUrl.startsWith("http://") || iconFileUrl.startsWith("https://")) {
    return iconFileUrl;
  }

  const baseUrl = apiClient.defaults.baseURL || "";
  return `${baseUrl}${iconFileUrl}`;
}

export function getObjectTypeIconFields(source) {
  if (!source) {
    return { icon_type: null, icon_file_url: null };
  }

  let icon_type = source.icon_type ?? source.iconType ?? null;
  let icon_file_url = source.icon_file_url ?? source.iconFileUrl ?? null;

  if (!icon_file_url && source.icon != null) {
    const fromIcon = readIconFieldsFromUnknownIcon(source.icon);
    icon_type = icon_type ?? fromIcon.icon_type;
    icon_file_url = icon_file_url ?? fromIcon.icon_file_url;
  }

  const settings =
    source.settings_json && typeof source.settings_json === "object"
      ? source.settings_json
      : source.settingsJson && typeof source.settingsJson === "object"
        ? source.settingsJson
        : null;

  if (settings) {
    icon_type = icon_type ?? settings.icon_type ?? settings.iconType ?? null;
    icon_file_url =
      icon_file_url ??
      settings.icon_file_url ??
      settings.iconFileUrl ??
      null;
  }

  return {
    icon_type: icon_type != null ? String(icon_type) : null,
    icon_file_url: icon_file_url != null ? String(icon_file_url).trim() : null,
  };
}

export function getObjectTypeAppearanceFields(source) {
  if (!source) {
    return {
      icon_type: null,
      icon_file_url: null,
      color: null,
    };
  }

  const color =
    source.color ??
    source.display_color ??
    source.displayColor ??
    null;

  const baseIcons = getObjectTypeIconFields(source);
  const displayIcons = getObjectTypeIconFields({
    icon_type: source.display_icon_type ?? source.displayIconType,
    icon_file_url: source.display_icon_file_url ?? source.displayIconFileUrl,
  });

  return {
    icon_type: displayIcons.icon_type ?? baseIcons.icon_type,
    icon_file_url: displayIcons.icon_file_url ?? baseIcons.icon_file_url,
    color: normalizeObjectTypeColor(color),
  };
}

/**
 * Prefer published/runtime object type; fall back to navigation enrichment (Office menu).
 */
export function mergeObjectTypeAppearance(primary, fallback) {
  const primaryAppearance = getObjectTypeAppearanceFields(primary);
  const fallbackAppearance = getObjectTypeAppearanceFields(fallback);

  if (hasUploadedIcon(primaryAppearance.icon_type, primaryAppearance.icon_file_url)) {
    return primaryAppearance;
  }

  return {
    icon_type: primaryAppearance.icon_type ?? fallbackAppearance.icon_type,
    icon_file_url: primaryAppearance.icon_file_url ?? fallbackAppearance.icon_file_url,
    color: primaryAppearance.color ?? fallbackAppearance.color,
  };
}
