import {
  PLATFORM_KEY_PATTERN,
  slugifyPlatformKey,
} from "../../../shared/keys/generatePlatformKey.js";

export function isValidCompanyCode(value) {
  return PLATFORM_KEY_PATTERN.test(String(value || "").trim());
}

export function buildCompanyCodeFromName(name) {
  const slug = slugifyPlatformKey(name);
  if (!slug || slug.length < 3 || !/^[a-z]/.test(slug)) {
    return "";
  }
  return slug.slice(0, 64).replace(/_+$/g, "");
}
