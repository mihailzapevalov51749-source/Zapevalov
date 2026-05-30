export function stripHtml(value) {
  return String(value || "")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .trim();
}

export function hasContent(value) {
  return Boolean(stripHtml(value));
}

export function getCurrentTimeLabel() {
  return new Date().toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function collectMentionPayloadFromHtml(html) {
  const template = document.createElement("template");
  template.innerHTML = html || "";

  const nodes = Array.from(
    template.content.querySelectorAll("[data-note-mention-user-id]"),
  );

  const mentionedUserIds = [];
  const mentionKeys = [];

  nodes.forEach((node) => {
    const userId = Number(node.getAttribute("data-note-mention-user-id"));

    const mentionKey = node.getAttribute("data-note-mention-key");

    if (!userId || !mentionKey) return;

    mentionedUserIds.push(userId);
    mentionKeys.push(mentionKey);
  });

  return {
    mentionedUserIds,
    mentionKeys,
  };
}
