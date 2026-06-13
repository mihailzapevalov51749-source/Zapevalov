import { useEffect, useRef, useState } from "react";
import { Outlet, useLocation, useParams } from "react-router-dom";

import { TENANT_ACCESS_DENIED_MESSAGE } from "../auth/postLoginRedirect.js";

import {
  evaluateOfficeRuntimeGuardAccess,
  isOfficeRuntimeGuardReady,
  resolveOfficeRuntimeGuardPortalId,
} from "./officeRuntimeTenantGuard.js";
import {
  beginOfficeRuntimeGuardRequest,
  isStaleOfficeRuntimeGuardResponse,
} from "./officeRuntimeTenantGuardRace.js";

const LOADING_STYLE = { padding: 48, textAlign: "center", color: "#64748b" };
const DENIED_WRAPPER_STYLE = { padding: 48, textAlign: "center" };

export default function OfficeRuntimeTenantGuard({ user }) {
  const location = useLocation();
  const params = useParams();
  const requestSeqRef = useRef(0);
  const guardPortalId = resolveOfficeRuntimeGuardPortalId(
    location.pathname,
    params,
  );

  const [validated, setValidated] = useState(() => ({
    portalId: guardPortalId,
    result: evaluateOfficeRuntimeGuardAccess(user, guardPortalId),
  }));

  useEffect(() => {
    const { requestId } = beginOfficeRuntimeGuardRequest(requestSeqRef);
    const targetPortalId = guardPortalId;

    setValidated({
      portalId: targetPortalId,
      result: null,
    });

    const result = evaluateOfficeRuntimeGuardAccess(user, targetPortalId);
    if (
      isStaleOfficeRuntimeGuardResponse({
        requestId,
        requestSeqRef,
        requestPortalId: targetPortalId,
        currentPortalId: guardPortalId,
      })
    ) {
      return;
    }

    setValidated({
      portalId: targetPortalId,
      result,
    });
  }, [user, guardPortalId]);

  if (!isOfficeRuntimeGuardReady(validated, guardPortalId)) {
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
        officeRuntimePortalId: guardPortalId,
      }}
    />
  );
}
