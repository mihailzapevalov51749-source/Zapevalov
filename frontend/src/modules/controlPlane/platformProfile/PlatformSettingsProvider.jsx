import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  patchPlatformProfileSettings,
  putPlatformOwner,
} from "../api/platformProfileSettingsApi.js";
import { getApiErrorMessage } from "../../designer/api/platformApiClient.js";
import { DEFAULT_PLATFORM_SETTINGS } from "../../../shared/platformSettings/platformSettingsConstants.js";
import {
  bootstrapPlatformSettings,
  resetPlatformSettingsBootstrap,
} from "../../../shared/platformSettings/bootstrapPlatformSettings.js";
import {
  setPlatformSettingsCache,
  subscribePlatformSettings,
} from "../../../shared/platformSettings/platformSettingsCache.js";
import {
  mapApiGeneralToPlatformSettings,
  mapFormToApiGeneralUpdate,
  mapPlatformSettingsToProfile,
} from "./platformProfileSettingsMappers.js";
import { mapApiOwnerToForm } from "./platformProfileOwnerMappers.js";

const PlatformSettingsContext = createContext(null);

export function PlatformSettingsProvider({ children }) {
  const [settings, setSettings] = useState({ ...DEFAULT_PLATFORM_SETTINGS });
  const [profileSettings, setProfileSettings] = useState(() =>
    mapPlatformSettingsToProfile(),
  );
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingOwner, setIsSavingOwner] = useState(false);
  const [platformOwner, setPlatformOwner] = useState(() => mapApiOwnerToForm());

  const applySettings = useCallback((nextSettings, nextProfile) => {
    setSettings(nextSettings);
    setProfileSettings(nextProfile);
    setPlatformSettingsCache(nextSettings);
  }, []);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setLoadError("");

    try {
      const { settings: nextSettings, response } = await bootstrapPlatformSettings();
      const nextProfile = mapPlatformSettingsToProfile(response?.general);
      setPlatformOwner(mapApiOwnerToForm(response?.owner));
      applySettings(nextSettings, nextProfile);
      return nextSettings;
    } catch (error) {
      setLoadError(getApiErrorMessage(error, "Не удалось загрузить настройки платформы"));
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [applySettings]);

  useEffect(() => {
    refresh().catch(() => {});
  }, [refresh]);

  useEffect(() => subscribePlatformSettings(setSettings), []);

  const savePlatformOwner = useCallback(
    async (payload) => {
      setIsSavingOwner(true);
      setLoadError("");

      try {
        resetPlatformSettingsBootstrap();
        const owner = await putPlatformOwner(payload);
        const nextOwnerForm = mapApiOwnerToForm(owner);
        setPlatformOwner(nextOwnerForm);
        window.dispatchEvent(
          new CustomEvent("platform-owner:updated", {
            detail: { owner: nextOwnerForm },
          }),
        );
        window.dispatchEvent(new CustomEvent("admin:users-updated"));
        return owner;
      } catch (error) {
        const message = getApiErrorMessage(
          error,
          "Не удалось сохранить владельца платформы",
        );
        setLoadError(message);
        throw new Error(message);
      } finally {
        setIsSavingOwner(false);
      }
    },
    [],
  );

  const saveGeneralSettings = useCallback(
    async (form) => {
      setIsSaving(true);
      setLoadError("");

      try {
        resetPlatformSettingsBootstrap();
        const response = await patchPlatformProfileSettings(mapFormToApiGeneralUpdate(form));
        const nextSettings = mapApiGeneralToPlatformSettings(response?.general);
        const nextProfile = mapPlatformSettingsToProfile(response?.general);
        applySettings(nextSettings, nextProfile);
        return nextSettings;
      } catch (error) {
        const message = getApiErrorMessage(error, "Не удалось сохранить настройки платформы");
        setLoadError(message);
        throw new Error(message);
      } finally {
        setIsSaving(false);
      }
    },
    [applySettings],
  );

  const value = useMemo(
    () => ({
      settings,
      profileSettings,
      platformName: settings.platformName,
      platformShortName: settings.platformShortName,
      isLoading,
      isSaving,
      isSavingOwner,
      platformOwner,
      loadError,
      refresh,
      saveGeneralSettings,
      savePlatformOwner,
    }),
    [
      settings,
      profileSettings,
      isLoading,
      isSaving,
      isSavingOwner,
      platformOwner,
      loadError,
      refresh,
      saveGeneralSettings,
      savePlatformOwner,
    ],
  );

  return (
    <PlatformSettingsContext.Provider value={value}>
      {children}
    </PlatformSettingsContext.Provider>
  );
}

export function usePlatformSettings() {
  const context = useContext(PlatformSettingsContext);

  if (!context) {
    throw new Error("usePlatformSettings must be used within PlatformSettingsProvider");
  }

  return context;
}
