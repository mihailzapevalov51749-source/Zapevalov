import type { HeaderMode } from "./headerTypes";

export const HEADER_MODES = {
  RUNTIME: "runtime",
  DESIGNER: "designer",
  ADMIN: "admin",
  AI: "ai",
  SYSTEM: "system",
} as const satisfies Record<string, HeaderMode>;

export function isHeaderMode(value: unknown): value is HeaderMode {
  return (
    value === HEADER_MODES.RUNTIME ||
    value === HEADER_MODES.DESIGNER ||
    value === HEADER_MODES.ADMIN ||
    value === HEADER_MODES.AI ||
    value === HEADER_MODES.SYSTEM
  );
}
