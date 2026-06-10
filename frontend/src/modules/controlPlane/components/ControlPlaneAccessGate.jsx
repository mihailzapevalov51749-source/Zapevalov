import { getMe } from "../../../api/authApi";
import { useEffect, useState } from "react";

import { canAccessControlPlane } from "../../admin/access/adminAccess";

export default function ControlPlaneAccessGate({ children }) {
  const [user, setUser] = useState(null);
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
          setUser(null);
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
  }, []);

  if (isLoading) {
    return <div style={{ padding: 24, color: "#64748b" }}>Проверка доступа...</div>;
  }

  if (!canAccessControlPlane(user)) {
    return (
      <div style={{ padding: 48, textAlign: "center" }}>
        <h2 style={{ marginTop: 0 }}>Нет доступа к управлению платформой</h2>
        <p style={{ color: "#64748b", maxWidth: 520, margin: "0 auto" }}>
          Control Plane доступен только владельцу платформы (роли admin / superadmin).
        </p>
      </div>
    );
  }

  return children;
}
