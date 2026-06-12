import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";

import {
  resolvePostLoginPath,
  TENANT_ACCESS_DENIED_MESSAGE,
} from "../auth/postLoginRedirect.js";
import { resolveRootEntryPath } from "./appModeNavigation.js";

export default function RootEntryRedirect({ user = null }) {
  const [targetPath, setTargetPath] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function resolveEntry() {
      setLoading(true);
      setError("");

      try {
        const result = await resolvePostLoginPath(user, {});
        if (cancelled) {
          return;
        }

        if (!result.path) {
          if (result.error) {
            setError(result.error);
            setTargetPath(null);
            return;
          }

          const fallbackPath = await resolveRootEntryPath(user);
          if (cancelled) {
            return;
          }

          if (!fallbackPath) {
            setError(TENANT_ACCESS_DENIED_MESSAGE);
            setTargetPath(null);
            return;
          }

          setTargetPath(fallbackPath);
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
  }, [user]);

  if (loading) {
    return <div style={{ padding: 48, textAlign: "center", color: "#64748b" }}>Загрузка...</div>;
  }

  if (!targetPath && error) {
    return (
      <div style={{ padding: 48, textAlign: "center" }}>
        <h2 style={{ marginTop: 0 }}>Нет доступа</h2>
        <p style={{ color: "#64748b", maxWidth: 520, margin: "0 auto" }}>
          {error || TENANT_ACCESS_DENIED_MESSAGE}
        </p>
      </div>
    );
  }

  if (!targetPath) {
    return (
      <div style={{ padding: 48, textAlign: "center" }}>
        <h2 style={{ marginTop: 0 }}>Не удалось открыть Office</h2>
        <p style={{ color: "#64748b", maxWidth: 520, margin: "0 auto" }}>
          Главная страница компании не найдена.
        </p>
      </div>
    );
  }

  return <Navigate to={targetPath} replace />;
}
