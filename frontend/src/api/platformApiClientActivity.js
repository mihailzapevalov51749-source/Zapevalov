import { recordApiActivity } from "../shared/userActivity/userActivityTracker.js";

/**
 * Registers presence tracking on platform API requests.
 * Kept out of platformApiClient module init to avoid App↔API chunk cycles (WI-RT-012).
 */
export function attachPlatformApiClientActivityInterceptor(platformApiClient) {
  platformApiClient.interceptors.request.use((config) => {
    recordApiActivity();
    return config;
  });
}
