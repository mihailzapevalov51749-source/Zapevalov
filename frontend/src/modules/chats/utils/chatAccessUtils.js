export function resolveChatCreatorId(chat) {
  if (!chat || typeof chat !== "object") {
    return null;
  }

  return (
    chat.created_by_id
    ?? chat.createdById
    ?? chat.created_by?.id
    ?? null
  );
}

export function resolveCurrentUserId(currentUser) {
  if (!currentUser || typeof currentUser !== "object") {
    return null;
  }

  return currentUser.id ?? currentUser.user_id ?? currentUser.userId ?? null;
}

export function isGroupChat(chat) {
  return String(chat?.type || "").toLowerCase() === "group";
}

export function isChatCreator(chat, currentUser) {
  const creatorId = resolveChatCreatorId(chat);
  const userId = resolveCurrentUserId(currentUser);

  if (creatorId == null || userId == null) {
    return false;
  }

  return String(creatorId) === String(userId);
}
