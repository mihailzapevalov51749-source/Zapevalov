export type HeaderMode = "runtime" | "designer" | "admin" | "ai" | "system";

export type HeaderActionKind =
  | "button"
  | "iconButton"
  | "toggle"
  | "menu"
  | "link"
  | "switch"
  | "custom";

export type HeaderActionContract = {
  id: string;
  kind: HeaderActionKind;
  label?: string;
  icon?: string;
  path?: string;
  active?: boolean;
  disabled?: boolean;
  actionKey?: string;
  shortcut?: string;
  variant?: "default" | "primary" | "ghost" | "danger" | "success";
  tooltip?: string;
  hidden?: boolean;
  loading?: boolean;
  badgeCount?: number;
  /** Backward-compatible alias for existing adapters. */
  onClickKey?: string;
  meta?: Record<string, unknown>;
};
