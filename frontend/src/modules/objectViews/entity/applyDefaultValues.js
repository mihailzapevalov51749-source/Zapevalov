import {
  DEFAULT_VALUE_CONSTANT,
  DEFAULT_VALUE_CURRENT_USER,
  DEFAULT_VALUE_FALSE,
  DEFAULT_VALUE_NONE,
  DEFAULT_VALUE_NOW,
  DEFAULT_VALUE_NOW_PLUS_HOURS,
  DEFAULT_VALUE_OPTION,
  DEFAULT_VALUE_SPECIFIC_DATE,
  DEFAULT_VALUE_SPECIFIC_DATETIME,
  DEFAULT_VALUE_SPECIFIC_USER,
  DEFAULT_VALUE_TRUE,
  DEFAULT_VALUE_TODAY,
  DEFAULT_VALUE_TODAY_PLUS_DAYS,
} from "../../designer/components/fields/defaultValue/defaultValueRegistry";
import { normalizeDefaultValueFromField } from "../../designer/components/fields/defaultValue/defaultValueFormUtils";
import { getCurrentUserId } from "../../../shared/communication/domain/messageItemUtils";
import { normalizeFieldEditorType } from "../../../shared/fieldEditors/fieldEditorRegistry";
import { isRelationFieldType } from "../../designer/components/fields/relationFieldFormUtils";

function addDaysIsoDate(days, baseDate = new Date()) {
  const next = new Date(baseDate);
  next.setDate(next.getDate() + days);
  return next.toISOString().slice(0, 10);
}

function addHoursIsoDatetime(hours, baseDate = new Date()) {
  const next = new Date(baseDate);
  next.setHours(next.getHours() + hours);
  return next.toISOString();
}

function toDatetimeLocalValue(isoValue) {
  if (!isoValue) {
    return "";
  }

  const date = new Date(isoValue);

  if (Number.isNaN(date.getTime())) {
    return String(isoValue);
  }

  const pad = (num) => String(num).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * Resolve Field Definition default to a form/editor value.
 *
 * @param {Record<string, unknown>} field
 * @param {{ currentUserId?: number | null, now?: Date }} [context]
 */
export function resolveFieldDefaultForForm(field, context = {}) {
  const key = String(field?.key || "").trim();

  if (!key) {
    return undefined;
  }

  const rawFieldType = String(field.rawFieldType || field.field_type || field.type || "").trim();
  const editorType = normalizeFieldEditorType(rawFieldType);
  const configured = normalizeDefaultValueFromField(
    field.defaultValueJson ?? field.default_value_json,
    rawFieldType,
  );
  const scenarioType = configured.type;
  const value = configured.value;
  const now = context.now instanceof Date ? context.now : new Date();
  const currentUserId = context.currentUserId ?? null;

  if (scenarioType === DEFAULT_VALUE_NONE) {
    return undefined;
  }

  if (scenarioType === DEFAULT_VALUE_CONSTANT) {
    if (editorType === "number") {
      return value ?? "";
    }

    return value ?? "";
  }

  if (scenarioType === DEFAULT_VALUE_OPTION) {
    if (editorType === "multi_choice") {
      return value ? [String(value)] : [];
    }

    return value ?? "";
  }

  if (scenarioType === DEFAULT_VALUE_CURRENT_USER) {
    return currentUserId;
  }

  if (scenarioType === DEFAULT_VALUE_SPECIFIC_USER) {
    return value ?? null;
  }

  if (scenarioType === DEFAULT_VALUE_TODAY) {
    return now.toISOString().slice(0, 10);
  }

  if (scenarioType === DEFAULT_VALUE_TODAY_PLUS_DAYS) {
    return addDaysIsoDate(Number(value || 0), now);
  }

  if (scenarioType === DEFAULT_VALUE_SPECIFIC_DATE) {
    return value ?? "";
  }

  if (scenarioType === DEFAULT_VALUE_NOW) {
    return toDatetimeLocalValue(now.toISOString());
  }

  if (scenarioType === DEFAULT_VALUE_NOW_PLUS_HOURS) {
    return toDatetimeLocalValue(addHoursIsoDatetime(Number(value || 0), now));
  }

  if (scenarioType === DEFAULT_VALUE_SPECIFIC_DATETIME) {
    return toDatetimeLocalValue(String(value || ""));
  }

  if (scenarioType === DEFAULT_VALUE_TRUE) {
    return true;
  }

  if (scenarioType === DEFAULT_VALUE_FALSE) {
    return false;
  }

  return undefined;
}

/**
 * @param {Array<Record<string, unknown>>} fields
 * @param {{ currentUserId?: number | null, now?: Date }} [context]
 */
export function getDefaultValueResolveContext(overrides = {}) {
  const rawUserId = overrides.currentUserId ?? getCurrentUserId();
  const parsedUserId =
    rawUserId === "" || rawUserId == null ? null : Number.parseInt(String(rawUserId), 10);

  return {
    currentUserId: Number.isFinite(parsedUserId) ? parsedUserId : null,
    now: overrides.now instanceof Date ? overrides.now : new Date(),
  };
}

export function buildInitialCreateFormValuesWithDefaults(fields = [], context = {}) {
  /** @type {Record<string, unknown>} */
  const values = {};

  for (const field of fields) {
    const key = String(field.key || "").trim();

    if (!key) {
      continue;
    }

    const editorType = normalizeFieldEditorType(field.rawFieldType || field.type);
    const rawFieldType = String(field.rawFieldType || field.field_type || field.type || "").trim();

    if (isRelationFieldType(rawFieldType)) {
      values[key] = [];
      continue;
    }

    const resolved = resolveFieldDefaultForForm(field, context);

    if (resolved !== undefined) {
      values[key] = resolved;
      continue;
    }

    switch (editorType) {
      case "boolean":
        values[key] = false;
        break;
      case "multi_choice":
        values[key] = [];
        break;
      case "number":
        values[key] = "";
        break;
      default:
        values[key] = "";
        break;
    }
  }

  return values;
}
