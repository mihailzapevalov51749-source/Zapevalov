import { useCallback, useEffect, useMemo, useState } from "react";

import { useYasiiAssistantSession } from "../context/YasiiAssistantContext.jsx";
import { createAceHandoff, sendEmbeddedQuery } from "../yasiiEmbeddedApi.js";
import { isEmbeddedHandoffStale } from "../yasiiEmbeddedContext.js";

const DEMO_ASSISTANT_TEXT =
  "Я получил ваш запрос и успешно прошёл embedded runtime pipeline.";

function createMessageId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function resolveAssistantText(payload) {
  const message = String(payload?.message ?? "").trim();
  if (message) {
    return message;
  }

  if (payload?.demo === true) {
    return DEMO_ASSISTANT_TEXT;
  }

  return "Ответ ЯСИИ получен.";
}

export default function useYasiiEmbeddedQuery({  buildHostContext,
  scopeKey,
  enabled = true,
  welcomeMessage = "ЯСИИ подключён через Embedded Entry Framework.",
  handoffErrorMessage = "Не удалось создать ACE handoff.",
}) {
  const session = useYasiiAssistantSession();
  const [localMessages, setLocalMessages] = useState([
    {
      id: "yasii-embedded-welcome",
      role: "yasii",
      text: welcomeMessage,
    },
  ]);
  const messages = session?.messages ?? localMessages;
  const setMessages = session?.setMessages ?? setLocalMessages;
  const [handoff, setHandoff] = useState(null);
  const [handoffCreatedAt, setHandoffCreatedAt] = useState(null);
  const [handoffScopeKey, setHandoffScopeKey] = useState(null);
  const [loading, setLoading] = useState(false);
  const [handoffLoading, setHandoffLoading] = useState(false);
  const [error, setError] = useState(null);
  const [handoffError, setHandoffError] = useState(null);

  const isStale = useMemo(
    () =>
      Boolean(
        handoff &&
          isEmbeddedHandoffStale({
            createdAt: handoffCreatedAt,
            scopeKey: handoffScopeKey,
            currentScopeKey: scopeKey,
          }),
      ),
    [handoff, handoffCreatedAt, handoffScopeKey, scopeKey],
  );

  const refreshHandoff = useCallback(async () => {
    if (!enabled) {
      return null;
    }

    setHandoffLoading(true);
    setHandoffError(null);

    try {
      const hostContext = buildHostContext();
      const nextHandoff = await createAceHandoff(hostContext);
      setHandoff(nextHandoff);
      setHandoffCreatedAt(Date.now());
      setHandoffScopeKey(scopeKey);
      setError(null);
      return nextHandoff;
    } catch (requestError) {
      console.error(requestError);
      setHandoffError(handoffErrorMessage);
      return null;
    } finally {
      setHandoffLoading(false);
    }
  }, [buildHostContext, enabled, handoffErrorMessage, scopeKey]);

  useEffect(() => {
    if (!enabled || !handoff || handoffLoading) {
      return;
    }

    if (handoffScopeKey !== scopeKey) {
      setHandoff(null);
      setHandoffCreatedAt(null);
      setHandoffScopeKey(null);
      refreshHandoff();
    }
  }, [enabled, handoff, handoffLoading, handoffScopeKey, refreshHandoff, scopeKey]);

  const sendMessage = useCallback(
    async (rawText) => {
      const text = String(rawText ?? "").trim();
      if (!text || loading || handoffLoading) {
        return;
      }

      if (!handoff?.handoffId) {
        setError("Контекст ЯСИИ не готов. Обновите handoff.");
        return;
      }

      if (
        isEmbeddedHandoffStale({
          createdAt: handoffCreatedAt,
          scopeKey: handoffScopeKey,
          currentScopeKey: scopeKey,
        })
      ) {
        setError("Контекст устарел. Обновите контекст перед отправкой сообщения.");
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
        const hostContext = buildHostContext();
        const response = await sendEmbeddedQuery({
          handoffId: handoff.handoffId,
          queryText: text,
          tenantId: hostContext?.tenantId,
        });
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
        setError("Не удалось получить ответ ЯСИИ через embedded query.");
      } finally {
        setLoading(false);
      }
    },
    [
      handoff,
      handoffCreatedAt,
      handoffLoading,
      handoffScopeKey,
      loading,
      scopeKey,
      buildHostContext,
    ],
  );

  return {
    messages,
    handoff,
    handoffLoading,
    handoffError,
    loading,
    error,
    isStale,
    refreshHandoff,
    sendMessage,
  };
}
