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
  return iconType === "upload" && Boolean(iconFileUrl);
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

  return {
    icon_type: source.icon_type ?? null,
    icon_file_url: source.icon_file_url ?? null,
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

  return {
    ...getObjectTypeIconFields(source),
    color: normalizeObjectTypeColor(source.color),
  };
}
