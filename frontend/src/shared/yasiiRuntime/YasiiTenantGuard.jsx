import { useEffect, useRef, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";

import { TENANT_ACCESS_DENIED_MESSAGE } from "../auth/postLoginRedirect.js";
import { resolveYasiiTenantId } from "../../yasii/workspace/yasiiWorkspaceModeStorage.js";
import {
  beginOfficeRuntimeGuardRequest,
  isStaleOfficeRuntimeGuardResponse,
} from "../officeRuntime/officeRuntimeTenantGuardRace.js";

import {
  evaluateYasiiGuardAccess,
  isYasiiGuardReady,
} from "./yasiiTenantGuard.js";

const LOADING_STYLE = { padding: 48, textAlign: "center", color: "#64748b" };
const DENIED_WRAPPER_STYLE = { padding: 48, textAlign: "center" };

export default function YasiiTenantGuard({ user }) {
  const location = useLocation();
  const requestSeqRef = useRef(0);
  const guardTenantId = resolveYasiiTenantId(location.pathname);

  const [validated, setValidated] = useState(() => ({
    portalId: guardTenantId,
    result: evaluateYasiiGuardAccess(user, guardTenantId),
  }));

  useEffect(() => {
    const { requestId } = beginOfficeRuntimeGuardRequest(requestSeqRef);
    const targetTenantId = guardTenantId;

    setValidated({
      portalId: targetTenantId,
      result: null,
    });

    const result = evaluateYasiiGuardAccess(user, targetTenantId);
    if (
      isStaleOfficeRuntimeGuardResponse({
        requestId,
        requestSeqRef,
        requestPortalId: targetTenantId,
        currentPortalId: guardTenantId,
      })
    ) {
      return;
    }

    setValidated({
      portalId: targetTenantId,
      result,
    });
  }, [user, guardTenantId]);

  if (!isYasiiGuardReady(validated, guardTenantId)) {
    return <div style={LOADING_STYLE}>Загрузка...</div>;
  }

  if (validated.result.status === "denied") {
    return (
      <div style={DENIED_WRAPPER_STYLE}>
        <h2 style={{ marginTop: 0 }}>Нет доступа</h2>
        <p style={{ color: "#64748b", maxWidth: 520, margin: "0 auto" }}>
          {TENANT_ACCESS_DENIED_MESSAGE}
        </p>
      </div>
    );
  }

  return (
    <Outlet
      context={{
        user,
        yasiiRuntimeTenantId: guardTenantId,
      }}
    />
  );
}
