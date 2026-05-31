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
