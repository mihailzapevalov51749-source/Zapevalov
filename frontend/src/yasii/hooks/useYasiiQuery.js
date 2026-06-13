import { useCallback, useState } from "react";
import { useLocation } from "react-router-dom";

import { resolveYasiiTenantId } from "../workspace/yasiiWorkspaceModeStorage.js";
import { sendYasiiQuery } from "../yasiiApi";

const WELCOME_MESSAGE = {
  id: "yasii-welcome",
  role: "yasii",
  text:
    "Привет. Я ЯСИИ.\nПока я работаю в техническом demo-режиме.\nМогу показать, как проходит runtime pipeline.",
};

const DEMO_ASSISTANT_TEXT =
  "Я получил ваш запрос и успешно прошёл технический runtime pipeline.";

function createMessageId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function resolveAssistantText(payload) {
  if (payload?.demo === true) {
    return DEMO_ASSISTANT_TEXT;
  }

  const message = String(payload?.message ?? "").trim();
  return message || "Ответ ЯСИИ получен.";
}

export default function useYasiiQuery() {
  const location = useLocation();
  const tenantId = resolveYasiiTenantId(location.pathname);
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const sendMessage = useCallback(async (rawText) => {
    const text = String(rawText ?? "").trim();
    if (!text || loading) {
      return;
    }

    const userMessage = {
      id: createMessageId("user"),
      role: "user",
      text,
    };

    setMessages((previous) => [...previous, userMessage]);
    setLoading(true);
    setError(null);

    try {
      const response = await sendYasiiQuery(text, tenantId);
      const payload = response?.payload ?? {};
      const trace = Array.isArray(payload.trace) ? payload.trace : undefined;

      setMessages((previous) => [
        ...previous,
        {
          id: createMessageId("yasii"),
          role: "yasii",
          text: resolveAssistantText(payload),
          trace,
          rawMessage: payload.demo ? payload.message : undefined,
        },
      ]);
    } catch (requestError) {
      console.error(requestError);
      setError("Не удалось получить ответ ЯСИИ.");
    } finally {
      setLoading(false);
    }
  }, [loading, tenantId]);

  return {
    messages,
    loading,
    error,
    sendMessage,
  };
}
