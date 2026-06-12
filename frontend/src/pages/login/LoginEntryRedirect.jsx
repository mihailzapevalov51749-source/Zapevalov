import { useEffect, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";

import {
  parseRequestedTenantId,
  resolvePostLoginPath,
  TENANT_ACCESS_DENIED_MESSAGE,
} from "../../shared/auth/postLoginRedirect";

export default function LoginEntryRedirect({ user }) {
  const [searchParams] = useSearchParams();
  const requestedTenantId = parseRequestedTenantId(searchParams);
  const [targetPath, setTargetPath] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function resolveEntry() {
      setLoading(true);
      setError("");

      try {
        const result = await resolvePostLoginPath(user, { requestedTenantId });
        if (cancelled) {
          return;
        }

        if (!result.path) {
          setError(result.error || TENANT_ACCESS_DENIED_MESSAGE);
          setTargetPath(null);
          return;
        }

        setTargetPath(result.path);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void resolveEntry();

    return () => {
      cancelled = true;
    };
  }, [requestedTenantId, user]);

  if (loading) {
    return <div style={{ padding: 48, textAlign: "center", color: "#64748b" }}>Загрузка...</div>;
  }

  if (!targetPath) {
    return (
      <div style={{ padding: 48, textAlign: "center" }}>
        <h2 style={{ marginTop: 0 }}>Нет доступа</h2>
        <p style={{ color: "#64748b", maxWidth: 520, margin: "0 auto" }}>
          {error || TENANT_ACCESS_DENIED_MESSAGE}
        </p>
      </div>
    );
  }

  return <Navigate to={targetPath} replace />;
}
