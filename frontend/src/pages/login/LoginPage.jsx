import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { getMe, getTenantLoginBranding, login, logout } from "../../api/authApi";
import {
  parseRequestedTenantId,
  resolvePostLoginPath,
} from "../../shared/auth/postLoginRedirect";
import { buildLoginCompanySubtitle } from "./loginCompanySubtitle";

export default function LoginPage({ onLogin }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedTenantId = parseRequestedTenantId(searchParams);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [companyDisplayName, setCompanyDisplayName] = useState(null);
  const [companyBrandingLoaded, setCompanyBrandingLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (!requestedTenantId) {
      setCompanyDisplayName(null);
      setCompanyBrandingLoaded(true);
      return () => {
        cancelled = true;
      };
    }

    setCompanyBrandingLoaded(false);
    setCompanyDisplayName(null);

    getTenantLoginBranding(requestedTenantId)
      .then((displayName) => {
        if (!cancelled) {
          setCompanyDisplayName(displayName);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCompanyDisplayName(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setCompanyBrandingLoaded(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [requestedTenantId]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      await login(email, password);
      const user = await getMe();
      const redirect = await resolvePostLoginPath(user, { requestedTenantId });

      if (!redirect.path) {
        logout();
        setError(redirect.error || "Не удалось определить стартовый маршрут");
        return;
      }

      await onLogin?.();
      navigate(redirect.path, { replace: true });
    } catch (e) {
      setError(e.message || "Ошибка входа");
    } finally {
      setLoading(false);
    }
  };

  const companySubtitle = requestedTenantId
    ? buildLoginCompanySubtitle(companyBrandingLoaded ? companyDisplayName : null)
    : null;

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f1f5f9",
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          width: 320,
          padding: 24,
          borderRadius: 12,
          background: "#ffffff",
          boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <h2 style={{ margin: 0 }}>Вход</h2>

        {companySubtitle ? (
          <p style={{ margin: 0, color: "#64748b", fontSize: 14 }}>{companySubtitle}</p>
        ) : null}

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{
            padding: 10,
            borderRadius: 8,
            border: "1px solid #cbd5f5",
          }}
        />

        <input
          type="password"
          placeholder="Пароль"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{
            padding: 10,
            borderRadius: 8,
            border: "1px solid #cbd5f5",
          }}
        />

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: 10,
            borderRadius: 8,
            border: "none",
            background: "#2563eb",
            color: "#fff",
            cursor: "pointer",
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? "Вход..." : "Войти"}
        </button>

        {error ? (
          <div style={{ color: "red", fontSize: 14 }}>{error}</div>
        ) : null}
      </form>
    </div>
  );
}
