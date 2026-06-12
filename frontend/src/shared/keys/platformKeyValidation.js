import { PLATFORM_KEY_PATTERN } from "./generatePlatformKey.js";

export function normalizePlatformKey(value = "") {
  return String(value || "").trim().toLowerCase();
}

export function validatePlatformKey(value, reservedKeys = []) {
  const key = normalizePlatformKey(value);

  if (!key) {
    return "Укажите код";
  }

  if (!/^[a-z_]/.test(key)) {
    return "Код должен начинаться с латинской буквы или _";
  }

  if (!/^[a-z0-9_]+$/.test(key)) {
    return "Код может содержать только латиницу, цифры и _";
  }

  if (!PLATFORM_KEY_PATTERN.test(key)) {
    return "Код должен быть от 3 до 64 символов в формате snake_case (a-z, 0-9, _)";
  }

  const reserved = new Set(
    (reservedKeys || []).map((item) => normalizePlatformKey(item)).filter(Boolean),
  );

  if (reserved.has(key)) {
    return "Роль с таким кодом уже существует";
  }

  return null;
}
