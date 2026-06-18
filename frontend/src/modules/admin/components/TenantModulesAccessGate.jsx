import { useEffect, useState } from "react";
import { useOutletContext, useParams } from "react-router-dom";

import { getMe, normalizeCurrentUser } from "../../../api/authApi";
import { canReadTenantModules } from "../access/adminAccess";
import AdminModulesPage from "../modules/AdminModulesPage";

export default function TenantModulesAccessGate({ children }) {
  const outletContext = useOutletContext();
  const { tenantId } = useParams();
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

  if (!canReadTenantModules(user)) {
    return (
      <div style={{ padding: 48, textAlign: "center" }}>
        <h2 style={{ marginTop: 0 }}>Нет доступа к модулям компании</h2>
        <p style={{ color: "#64748b", maxWidth: 520, margin: "0 auto" }}>
          Раздел доступен администраторам компании, суперадминистраторам и владельцу
          платформы.
        </p>
      </div>
    );
  }

  return children ?? <AdminModulesPage tenantId={tenantId} />;
}
