function escapeMessageId(messageId) {
  const value = String(messageId);

  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    return CSS.escape(value);
  }

  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export function scrollContainerToBottom(container) {
  if (!container) {
    return;
  }

  container.scrollTop = container.scrollHeight;
}

export function scrollMessageIntoView(messageElement, block = "start") {
  if (!messageElement) {
    return;
  }

  messageElement.scrollIntoView({ block, behavior: "auto" });
}

export function findMessageElement(container, messageId) {
  if (!container || !messageId) {
    return null;
  }

  const escapedId = escapeMessageId(messageId);
  const nodes = container.querySelectorAll(`[data-yasii-message-id="${escapedId}"]`);

  if (!nodes.length) {
    return null;
  }

  return nodes[nodes.length - 1];
}

/**
 * Scroll chat container so the message top aligns with the container viewport top.
 */
export function scrollAssistantMessageToStart(container, messageElement) {
  if (!container || !messageElement) {
    return;
  }

  if (!container.contains(messageElement)) {
    return;
  }

  const containerRect = container.getBoundingClientRect();
  const messageRect = messageElement.getBoundingClientRect();
  const delta = messageRect.top - containerRect.top;

  container.scrollTop = Math.max(0, container.scrollTop + delta);
}

export function resolveMessageScrollIntent(previousLength, messages) {
  if (!Array.isArray(messages) || messages.length <= previousLength) {
    return null;
  }

  const lastMessage = messages[messages.length - 1];
  if (!lastMessage) {
    return null;
  }

  if (lastMessage.role === "user") {
    return { type: "bottom" };
  }

  if (lastMessage.role === "yasii" || lastMessage.role === "assistant") {
    if (lastMessage.id === "yasii-embedded-welcome") {
      return null;
    }

    return {
      type: "assistant-start",
      messageId: String(lastMessage.id),
    };
  }

  return null;
}
