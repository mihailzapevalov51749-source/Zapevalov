import type {
  AppShellCapabilitiesState,
  AppShellMode,
  AppShellSources,
  AppShellState,
} from "../provider/appShellTypes";

export type AppShellActionPayload = Record<string, unknown> | undefined;
export type AppShellActionMeta = {
  source?: "renderer" | "provider" | "bridge" | "system";
  mode?: AppShellMode;
  traceId?: string;
  timestamp?: number;
  reason?: string;
};

export type AppShellActionContext = {
  actionKey: string;
  payload: AppShellActionPayload;
  meta?: AppShellActionMeta;
  state: AppShellState;
  sources: AppShellSources;
  capabilities: AppShellCapabilitiesState;
};

export type AppShellActionResult = {
  ok: boolean;
  status:
    | "handled"
    | "noop"
    | "missing"
    | "blocked"
    | "invalid_payload"
    | "error";
  actionKey: string;
  reason?: string;
  error?: unknown;
};

export type AppShellActionHandler = (
  ctx: AppShellActionContext
) => Promise<void> | void;

export type AppShellCapabilityKey = keyof AppShellCapabilitiesState;

export type AppShellActionOptions = {
  enabled?: boolean;
  modes?: AppShellMode[];
  requiredCapabilities?: AppShellCapabilityKey[];
  validatePayload?: (payload: AppShellActionPayload) => boolean;
  description?: string;
};

export type AppShellRegisteredAction = {
  actionKey: string;
  handler: AppShellActionHandler;
  options: AppShellActionOptions;
};
