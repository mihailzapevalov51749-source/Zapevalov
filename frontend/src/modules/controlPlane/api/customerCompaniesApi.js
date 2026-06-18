import { platformApiClient } from "../../designer/api/platformApiClient";

export async function listCustomerCompanyCatalog() {
  const response = await platformApiClient.get("/control-plane/customer-companies/catalog");
  return response.data;
}

export async function getCustomerCompanyCatalogItem(portalId) {
  const response = await platformApiClient.get(
    `/control-plane/customer-companies/catalog/${portalId}`,
  );
  return response.data;
}

export async function createCustomerCompanyBridgeTicket(portalId) {
  const response = await platformApiClient.post(
    `/control-plane/customer-companies/catalog/${portalId}/bridge-ticket`,
  );
  return response.data;
}
