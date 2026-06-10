import { useParams } from "react-router-dom";

import AdminTenantDetailPage from "../../admin/tenants/AdminTenantDetailPage";
import ControlPlaneTenantDetailPage from "../pages/ControlPlaneTenantDetailPage";

export function ControlPlaneCompanyDetailRoute() {
  const { portalId } = useParams();
  return <AdminTenantDetailPage portalId={Number(portalId)} />;
}

export function ControlPlaneRegistryDetailRoute() {
  const { tenantId } = useParams();
  return <ControlPlaneTenantDetailPage tenantId={Number(tenantId)} />;
}
