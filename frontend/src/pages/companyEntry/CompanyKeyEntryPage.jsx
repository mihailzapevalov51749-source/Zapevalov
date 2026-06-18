import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";

import { getTenantEntryByKey } from "../../api/authApi";
import LoginPage from "../../pages/login/LoginPage";
import {
  resolvePostLoginPath,
  TENANT_ACCESS_DENIED_MESSAGE,
} from "../../shared/auth/postLoginRedirect";
import {
  isReservedCompanyKeySegment,
  normalizeCompanyKey,
} from "../../shared/tenantContext/companyKeyPaths";

const LOADING_STYLE = { padding: 48, textAlign: "center", color: "#64748b" };
const ERROR_WRAPPER_STYLE = { padding: 48, textAlign: "center" };

export default function CompanyKeyEntryPage({ user, companyKey, onLogin }) {
  const normalizedCompanyKey = normalizeCompanyKey(companyKey);
  const [tenantEntry, setTenantEntry] = useState(null);
  const [entryError, setEntryError] = useState("");
  const [entryLoading, setEntryLoading] = useState(true);
  const [redirectPath, setRedirectPath] = useState(null);
  const [redirectError, setRedirectError] = useState("");
  const [redirectLoading, setRedirectLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function resolveCompany() {
      setEntryLoading(true);
      setEntryError("");
      setTenantEntry(null);

      if (!normalizedCompanyKey || isReservedCompanyKeySegment(normalizedCompanyKey)) {
        if (!cancelled) {
          setEntryError("Компания не найдена");
          setEntryLoading(false);
        }
        return;
      }

      try {
        const entry = await getTenantEntryByKey(normalizedCompanyKey);
        if (!cancelled) {
          setTenantEntry(entry);
        }
      } catch {
        if (!cancelled) {
          setEntryError("Компания не найдена");
        }
      } finally {
        if (!cancelled) {
          setEntryLoading(false);
        }
      }
    }

    void resolveCompany();

    return () => {
      cancelled = true;
    };
  }, [normalizedCompanyKey]);

  useEffect(() => {
    let cancelled = false;

    async function resolveAuthenticatedEntry() {
      if (!user || !tenantEntry?.tenant_id) {
        return;
      }

      setRedirectLoading(true);
      setRedirectError("");
      setRedirectPath(null);

      try {
        const result = await resolvePostLoginPath(user, {
          requestedTenantId: tenantEntry.tenant_id,
        });

        if (cancelled) {
          return;
        }

        if (!result.path) {
          setRedirectError(result.error || TENANT_ACCESS_DENIED_MESSAGE);
          return;
        }

        setRedirectPath(result.path);
      } finally {
        if (!cancelled) {
          setRedirectLoading(false);
        }
      }
    }

    void resolveAuthenticatedEntry();

    return () => {
      cancelled = true;
    };
  }, [tenantEntry?.tenant_id, user]);

  if (entryLoading) {
    return <div style={LOADING_STYLE}>Загрузка...</div>;
  }

  if (entryError || !tenantEntry) {
    return (
      <div style={ERROR_WRAPPER_STYLE}>
        <h2 style={{ marginTop: 0 }}>Компания не найдена</h2>
        <p style={{ color: "#64748b", maxWidth: 520, margin: "0 auto" }}>
          {entryError || "Проверьте ссылку приглашения или обратитесь к администратору."}
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <LoginPage
        onLogin={onLogin}
        requestedTenantId={tenantEntry.tenant_id}
        requestedTenantKey={tenantEntry.tenant_key}
      />
    );
  }

  if (redirectLoading) {
    return <div style={LOADING_STYLE}>Загрузка...</div>;
  }

  if (!redirectPath) {
    return (
      <div style={ERROR_WRAPPER_STYLE}>
        <h2 style={{ marginTop: 0 }}>Нет доступа</h2>
        <p style={{ color: "#64748b", maxWidth: 520, margin: "0 auto" }}>
          {redirectError || TENANT_ACCESS_DENIED_MESSAGE}
        </p>
      </div>
    );
  }

  return <Navigate to={redirectPath} replace />;
}
