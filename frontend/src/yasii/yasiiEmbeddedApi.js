import { apiClient } from "../api/apiClient.js";

export const YASII_EMBEDDED_ENDPOINTS = {
  handoff: "/ai-context/handoff",
  embeddedQuery: "/yasii/embedded/query",
};

export async function createAceHandoff(hostContext) {
  const response = await apiClient.post(YASII_EMBEDDED_ENDPOINTS.handoff, hostContext);
  return response.data;
}

export async function sendEmbeddedQuery({ handoffId, queryText }) {
  const response = await apiClient.post(YASII_EMBEDDED_ENDPOINTS.embeddedQuery, {
    handoffId,
    queryText,
  });

  return response.data;
}
