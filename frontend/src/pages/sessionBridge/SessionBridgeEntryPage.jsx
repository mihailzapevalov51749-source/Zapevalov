import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

import {
  exchangeBridgeTicket,
  resolveBridgeRedirectPath,
} from "../../api/sessionBridgeApi";

const WRAPPER_STYLE = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 24,
  background: "#f8fafc",
};

const CARD_STYLE = {
  width: "100%",
  maxWidth: 560,
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: 12,
  padding: 24,
  boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
};

function buildBridgeEntryErrorMessage({
  reason,
  portalId = "—",
  tenantCode = "—",
  status = "—",
}) {
  return [
    "Не удалось открыть компанию через Session Bridge",
    `Причина: ${reason}`,
    `portal_id=${portalId}`,
    `tenant_code=${tenantCode}`,
    `status=${status}`,
  ].join("\n");
}

export default function SessionBridgeEntryPage() {
  const [searchParams] = useSearchParams();
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function bootstrapBridgeSession() {
      const ticket = String(searchParams.get("ticket") || "").trim();
      const redirectParam = String(searchParams.get("redirect") || "").trim();

      if (!ticket) {
        if (!cancelled) {
          setErrorMessage(
            buildBridgeEntryErrorMessage({
              reason: "параметр ticket отсутствует",
              status: "missing_ticket",
            }),
          );
          setIsLoading(false);
        }
        return;
      }

      try {
        const exchangeResult = await exchangeBridgeTicket(ticket, {
          redirectPath: redirectParam || null,
        });
        if (cancelled) {
          return;
        }

        const portalId =
          exchangeResult?.portal_id ?? exchangeResult?.bridgeUser?.portal_id ?? "—";
        const tenantCode =
          exchangeResult?.tenant_code ?? exchangeResult?.bridgeUser?.tenant_code ?? "—";

        if (exchangeResult?.principal_type !== "bridge" && !exchangeResult?.bridgeUser) {
          throw Object.assign(new Error("Bridge session не подтверждена"), {
            portalId,
            tenantCode,
            status: "invalid_principal",
          });
        }

        const redirect = resolveBridgeRedirectPath({
          redirectParam,
          exchangePayload: exchangeResult,
          bridgeUser: exchangeResult.bridgeUser,
        });

        if (!redirect) {
          throw Object.assign(
            new Error("Не удалось определить redirect для bridge session"),
            {
              portalId,
              tenantCode,
              status: "missing_redirect",
            },
          );
        }

        window.location.replace(redirect);
      } catch (requestError) {
        if (cancelled) {
          return;
        }

        const reason =
          requestError?.message || "Не удалось выполнить bridge exchange";
        setErrorMessage(
          buildBridgeEntryErrorMessage({
            reason,
            portalId: requestError?.portalId ?? "—",
            tenantCode: requestError?.tenantCode ?? "—",
            status: requestError?.status ?? "exchange_failed",
          }),
        );
        setIsLoading(false);
      }
    }

    void bootstrapBridgeSession();

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  if (isLoading && !errorMessage) {
    return (
      <div style={WRAPPER_STYLE}>
        <div style={CARD_STYLE}>
          <h1 style={{ marginTop: 0, fontSize: 20 }}>Session Bridge</h1>
          <p style={{ color: "#64748b", marginBottom: 0 }}>
            Выполняется вход в компанию...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={WRAPPER_STYLE}>
      <div style={CARD_STYLE}>
        <h1 style={{ marginTop: 0, fontSize: 20 }}>Session Bridge</h1>
        <pre
          style={{
            whiteSpace: "pre-wrap",
            margin: 0,
            color: "#b45309",
            fontFamily: "inherit",
            fontSize: 14,
            lineHeight: 1.5,
          }}
        >
          {errorMessage}
        </pre>
      </div>
    </div>
  );
}
