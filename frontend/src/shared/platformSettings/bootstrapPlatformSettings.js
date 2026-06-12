import { getPlatformProfileSettings } from "../../modules/controlPlane/api/platformProfileSettingsApi.js";
import { mapApiGeneralToPlatformSettings } from "../../modules/controlPlane/platformProfile/platformProfileSettingsMappers.js";
import { setPlatformSettingsCache } from "./platformSettingsCache.js";

let bootstrapPromise = null;

export function resetPlatformSettingsBootstrap() {
  bootstrapPromise = null;
}

export function bootstrapPlatformSettings() {
  if (!bootstrapPromise) {
    bootstrapPromise = getPlatformProfileSettings()
      .then((response) => {
        const settings = mapApiGeneralToPlatformSettings(response?.general);
        setPlatformSettingsCache(settings);
        return { settings, response };
      })
      .catch((error) => {
        bootstrapPromise = null;
        throw error;
      });
  }

  return bootstrapPromise;
}
