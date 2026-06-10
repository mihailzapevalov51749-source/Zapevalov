import { useCallback, useEffect, useState } from "react";

import {
  readTenantUiPref,
  readTenantUiPrefJson,
  writeTenantUiPref,
  writeTenantUiPrefJson,
} from "./uiPreferencesStorage.js";
import { normalizeTenantId } from "./uiStorageKeys.js";

/**
 * React hook for tenant-scoped UI preferences in localStorage.
 *
 * @template T
 * @param {number|string|null|undefined} tenantId
 * @param {string} key
 * @param {T} defaultValue
 * @param {{ json?: boolean }} [options]
 * @returns {[T, (next: T | ((previous: T) => T)) => void]}
 */
export function useTenantScopedUiStorage(
  tenantId,
  key,
  defaultValue,
  { json = false } = {},
) {
  const normalizedTenantId = normalizeTenantId(tenantId);

  const readValue = useCallback(() => {
    if (!normalizedTenantId) {
      return defaultValue;
    }
    if (json) {
      return readTenantUiPrefJson(normalizedTenantId, key, defaultValue);
    }
    return readTenantUiPref(normalizedTenantId, key, defaultValue);
  }, [defaultValue, json, key, normalizedTenantId]);

  const [value, setValue] = useState(readValue);

  useEffect(() => {
    setValue(readValue());
  }, [readValue]);

  const setStoredValue = useCallback(
    (next) => {
      if (!normalizedTenantId) {
        return;
      }

      setValue((previous) => {
        const resolved =
          typeof next === "function" ? next(previous) : next;

        if (json) {
          writeTenantUiPrefJson(normalizedTenantId, key, resolved);
        } else {
          writeTenantUiPref(normalizedTenantId, key, resolved);
        }

        return resolved;
      });
    },
    [json, key, normalizedTenantId],
  );

  return [value, setStoredValue];
}
