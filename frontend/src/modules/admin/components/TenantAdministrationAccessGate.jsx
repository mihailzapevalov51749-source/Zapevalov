import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";

import { getMe, normalizeCurrentUser } from "../../../api/authApi";
import { canAccessTenantAdministration } from "../access/adminAccess";

export default function TenantAdministrationAccessGate({ children }) {
  const outletContext = useOutletContext();
  const [user, setUser] = useState(() =>
    normalizeCurrentUser(outletContext?.user ?? null),
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadUser() {
      try {
        const data = await getMe();
        if (isMounted) {
          setUser(data);
        }
      } catch {
        if (isMounted) {
          setUser(normalizeCurrentUser(outletContext?.user ?? null));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadUser();

    return () => {
      isMounted = false;
    };
  }, [outletContext?.user]);

  if (isLoading) {
    return <div style={{ padding: 24, color: "#64748b" }}>Проверка доступа...</div>;
  }

  if (!canAccessTenantAdministration(user)) {
    return (
      <div style={{ padding: 48, textAlign: "center" }}>
        <h2 style={{ marginTop: 0 }}>Нет доступа к администрированию компании</h2>
        <p style={{ color: "#64748b", maxWidth: 520, margin: "0 auto" }}>
          Раздел доступен администраторам компании и владельцу платформы.
        </p>
      </div>
    );
  }

  return children;
}
