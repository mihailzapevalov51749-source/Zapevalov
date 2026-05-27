import {
  isCanonicalAppShellActionKey,
  normalizeAppShellActionKey,
} from "./appShellActionKeys";
import { createAppShellActionRegistry } from "./appShellActionRegistry";

function defaultLogger(level, message, details) {
  if (!import.meta.env.DEV) {
    return;
  }

  const payload = details ?? {};

  if (level === "error") {
    console.error(`[AppShellActionBridge] ${message}`, payload);
    return;
  }

  if (level === "warn") {
    console.warn(`[AppShellActionBridge] ${message}`, payload);
    return;
  }

  console.debug(`[AppShellActionBridge] ${message}`, payload);
}

function checkActionAllowed(entry, ctx) {
  const options = entry.options ?? {};

  if (options.enabled === false) {
    return { ok: false, status: "blocked", reason: "action disabled" };
  }

  if (Array.isArray(options.modes) && options.modes.length > 0) {
    if (!options.modes.includes(ctx.state.mode)) {
      return {
        ok: false,
        status: "blocked",
        reason: `mode '${ctx.state.mode}' is not allowed`,
      };
    }
  }

  if (
    Array.isArray(options.requiredCapabilities) &&
    options.requiredCapabilities.length > 0
  ) {
    for (const capability of options.requiredCapabilities) {
      if (ctx.capabilities?.[capability] !== true) {
        return {
          ok: false,
          status: "blocked",
          reason: `capability '${capability}' denied`,
        };
      }
    }
  }

  if (
    typeof options.validatePayload === "function" &&
    !options.validatePayload(ctx.payload)
  ) {
    return {
      ok: false,
      status: "invalid_payload",
      reason: "payload validation failed",
    };
  }

  return { ok: true };
}

/**
 * AppShell Action Bridge skeleton.
 * No real routing/API calls are implemented here.
 */
export function createAppShellActionBridge({
  getState,
  getSources,
  logger = defaultLogger,
} = {}) {
  const registry = createAppShellActionRegistry();

  async function dispatchAction(actionKey, payload, meta) {
    const normalizedActionKey = normalizeAppShellActionKey(actionKey);

    if (!isCanonicalAppShellActionKey(normalizedActionKey)) {
      logger("warn", "invalid action key format", {
        actionKey,
        normalizedActionKey,
      });

      return {
        ok: false,
        status: "invalid_payload",
        actionKey: normalizedActionKey,
        reason: "invalid action key naming convention",
      };
    }

    const state = typeof getState === "function" ? getState() : undefined;
    const sources = typeof getSources === "function" ? getSources() : undefined;
    const capabilities = state?.capabilities ?? {};
    const entry = registry.getAction(normalizedActionKey);

    if (!entry) {
      logger("debug", "missing action handler", {
        actionKey: normalizedActionKey,
      });
      return {
        ok: false,
        status: "missing",
        actionKey: normalizedActionKey,
        reason: "no registered handler",
      };
    }

    const ctx = {
      actionKey: normalizedActionKey,
      payload,
      meta,
      state,
      sources,
      capabilities,
    };

    const allowed = checkActionAllowed(entry, ctx);
    if (!allowed.ok) {
      logger("warn", "action blocked by guard", {
        actionKey: normalizedActionKey,
        reason: allowed.reason,
      });
      return {
        ok: false,
        status: allowed.status,
        actionKey: normalizedActionKey,
        reason: allowed.reason,
      };
    }

    try {
      await entry.handler(ctx);
      logger("debug", "action handled", { actionKey: normalizedActionKey });
      return {
        ok: true,
        status: "handled",
        actionKey: normalizedActionKey,
      };
    } catch (error) {
      logger("error", "action handler failed", {
        actionKey: normalizedActionKey,
        error,
      });
      return {
        ok: false,
        status: "error",
        actionKey: normalizedActionKey,
        reason: "handler threw error",
        error,
      };
    }
  }

  return {
    registerAction: registry.registerAction,
    unregisterAction: registry.unregisterAction,
    hasAction: registry.hasAction,
    listActions: registry.listActions,
    dispatchAction,
  };
}
