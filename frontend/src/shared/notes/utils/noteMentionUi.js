export const MENTION_POPOVER_WIDTH = 320;
export const MENTION_POPOVER_HEIGHT = 190;

export function normalizeUser(user) {
  const id =
    user?.id ?? user?.user_id ?? user?.key ?? user?.value ?? "";

  const label =
    user?.full_name ||
    user?.fullName ||
    user?.name ||
    user?.label ||
    user?.email ||
    "Без имени";

  return {
    id,
    label,
    email: user?.email || "",
    avatar_url: user?.avatar_url || user?.avatarUrl || "",
  };
}

export function getInitials(fullName) {
  if (!fullName) return "?";

  return String(fullName)
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function getPopoverPosition(rect) {
  if (!rect) return { top: 8, left: 8 };

  const viewportWidth =
    window.innerWidth || document.documentElement.clientWidth;

  const viewportHeight =
    window.innerHeight || document.documentElement.clientHeight;

  let left = rect.left;
  let top = rect.top - MENTION_POPOVER_HEIGHT - 10;

  if (left + MENTION_POPOVER_WIDTH > viewportWidth - 12) {
    left = viewportWidth - MENTION_POPOVER_WIDTH - 12;
  }

  if (left < 12) left = 12;

  if (top < 12) top = 12;

  if (top + MENTION_POPOVER_HEIGHT > viewportHeight - 12) {
    top = viewportHeight - MENTION_POPOVER_HEIGHT - 12;
  }

  return { top, left };
}
