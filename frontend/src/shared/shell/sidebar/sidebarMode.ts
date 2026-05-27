import type { SidebarMode } from "./sidebarTypes";

export const SIDEBAR_MODES = {
  RUNTIME: "runtime",
  DESIGNER: "designer",
  ADMIN: "admin",
  AI: "ai",
  SYSTEM: "system",
} as const satisfies Record<string, SidebarMode>;

export function isSidebarMode(value: unknown): value is SidebarMode {
  return (
    value === SIDEBAR_MODES.RUNTIME ||
    value === SIDEBAR_MODES.DESIGNER ||
    value === SIDEBAR_MODES.ADMIN ||
    value === SIDEBAR_MODES.AI ||
    value === SIDEBAR_MODES.SYSTEM
  );
}
