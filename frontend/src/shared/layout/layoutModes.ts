export const LAYOUT_MODES = {
  RUNTIME: "runtime",
  DESIGNER: "designer",
} as const;

export type LayoutMode = (typeof LAYOUT_MODES)[keyof typeof LAYOUT_MODES];

export function isLayoutMode(value: unknown): value is LayoutMode {
  return value === LAYOUT_MODES.RUNTIME || value === LAYOUT_MODES.DESIGNER;
}
