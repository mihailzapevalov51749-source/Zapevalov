import { platformApiClient } from "../../designer/api/platformApiClient";

const BASE_PATH = "/quality-issues";

export async function listQualityIssues() {
  const { data } = await platformApiClient.get(BASE_PATH);
  return data;
}

export async function getQualityIssue(issueId) {
  const { data } = await platformApiClient.get(`${BASE_PATH}/${issueId}`);
  return data;
}

export async function createQualityIssue(payload) {
  const { data } = await platformApiClient.post(BASE_PATH, payload);
  return data;
}

export async function updateQualityIssue(issueId, payload) {
  const { data } = await platformApiClient.patch(`${BASE_PATH}/${issueId}`, payload);
  return data;
}

export async function deleteQualityIssue(issueId) {
  await platformApiClient.delete(`${BASE_PATH}/${issueId}`);
}

export async function prepareQualityIssueFix(issueId) {
  const { data } = await platformApiClient.post(`${BASE_PATH}/${issueId}/prepare-fix`);
  return data;
}

export async function approveQualityIssueFix(issueId) {
  const { data } = await platformApiClient.post(`${BASE_PATH}/${issueId}/approve-fix`);
  return data;
}

export async function listQualityIssueStatusHistory(issueId) {
  const { data } = await platformApiClient.get(`${BASE_PATH}/${issueId}/status-history`);
  return data;
}
