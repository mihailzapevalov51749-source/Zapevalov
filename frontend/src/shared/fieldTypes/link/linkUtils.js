const BLOCKED_SCHEMES = ["javascript:", "data:", "vbscript:", "file:"];

const ALLOWED_SCHEMES = ["http:", "https:"];

export function normalizeLinkValue(value, emptyValue = "—") {
  if (!value) {
    return {
      label: emptyValue,
      url: "",
    };
  }

  if (typeof value === "string") {
    return {
      label: value,
      url: value,
    };
  }

  if (typeof value === "object") {
    return {
      label:
        value.label ||
        value.title ||
        value.name ||
        value.text ||
        value.url ||
        emptyValue,

      url: value.url || value.href || value.link || "",
    };
  }

  return {
    label: String(value),
    url: "",
  };
}

export function normalizeLinkStorageValue(value) {
  if (value == null || value === "") {
    return null;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || null;
  }

  if (typeof value === "object") {
    const rawUrl = value.url || value.href || value.link || "";
    const trimmed = String(rawUrl).trim();
    return trimmed || null;
  }

  return null;
}

export function isBlockedLinkScheme(rawUrl) {
  const normalized = String(rawUrl || "").trim().toLowerCase();

  return BLOCKED_SCHEMES.some((scheme) => normalized.startsWith(scheme));
}

export function resolveLinkHref(rawUrl) {
  const url = String(rawUrl || "").trim();

  if (!url || isBlockedLinkScheme(url)) {
    return "";
  }

  const lower = url.toLowerCase();

  if (lower.startsWith("http://") || lower.startsWith("https://")) {
    return url;
  }

  if (url.includes("://")) {
    return "";
  }

  return `https://${url}`;
}

export function isSafeLinkHref(rawUrl) {
  const href = resolveLinkHref(rawUrl);

  if (!href) {
    return false;
  }

  try {
    const parsed = new URL(href);
    return ALLOWED_SCHEMES.includes(parsed.protocol);
  } catch {
    return false;
  }
}

export function getLinkDisplayLabel(value, emptyValue = "—") {
  const normalized = normalizeLinkValue(value, emptyValue);
  const storage = normalizeLinkStorageValue(value);

  if (!storage) {
    return emptyValue;
  }

  return normalized.label || storage;
}
