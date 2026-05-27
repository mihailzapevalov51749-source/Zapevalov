import { Outlet, useOutletContext, useParams } from "react-router-dom";

import DesignerShell from "../components/shell/DesignerShell";
import { DesignerShellProvider } from "../context/DesignerShellContext";

import "../styles/designer.css";

export default function DesignerTenantLayout() {
  const { tenantId = "1" } = useParams();
  const { user } = useOutletContext();

  return (
    <DesignerShellProvider
      value={{
        tenantId: Number(tenantId),
        user,
      }}
    >
      <DesignerShell />
    </DesignerShellProvider>
  );
}
