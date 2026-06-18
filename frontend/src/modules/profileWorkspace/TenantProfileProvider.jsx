import { useCallback, useEffect, useMemo, useState } from "react";



import { getPortal, patchPortalGeneralSettings } from "../admin/tenants/portalsApi.js";

import { getApiErrorMessage } from "../designer/api/platformApiClient.js";
import { syncTenantBrandingFromPortal } from "../../shared/tenantEnvironment/tenantBrandingSync.js";
import { ProfileContext } from "./ProfileContext.jsx";

import {

  buildTenantProfileContextValue,

  mapFormToPortalGeneralUpdate,

} from "./tenantProfileMappers.js";



export default function TenantProfileProvider({ tenantId, children }) {

  const normalizedTenantId = Number(tenantId);

  const [portal, setPortal] = useState(null);

  const [isLoading, setIsLoading] = useState(true);

  const [isSaving, setIsSaving] = useState(false);

  const [loadError, setLoadError] = useState("");



  const refresh = useCallback(async () => {

    if (!Number.isFinite(normalizedTenantId) || normalizedTenantId <= 0) {

      setPortal(null);

      setLoadError("Компания не выбрана");

      setIsLoading(false);

      return null;

    }



    setIsLoading(true);

    setLoadError("");



    try {

      const data = await getPortal(normalizedTenantId);

      setPortal(data);

      return data;

    } catch (error) {

      setPortal(null);

      setLoadError(getApiErrorMessage(error, "Не удалось загрузить профиль компании"));

      throw error;

    } finally {

      setIsLoading(false);

    }

  }, [normalizedTenantId]);



  const saveGeneralSettings = useCallback(

    async (form) => {

      if (!Number.isFinite(normalizedTenantId) || normalizedTenantId <= 0) {

        throw new Error("Компания не выбрана");

      }



      setIsSaving(true);

      setLoadError("");



      try {

        const data = await patchPortalGeneralSettings(

          normalizedTenantId,

          mapFormToPortalGeneralUpdate(form),

        );

        setPortal(data);
        syncTenantBrandingFromPortal(data);
        return data;

      } catch (error) {

        const message = getApiErrorMessage(error, "Не удалось сохранить настройки компании");

        setLoadError(message);

        throw new Error(message);

      } finally {

        setIsSaving(false);

      }

    },

    [normalizedTenantId],

  );



  useEffect(() => {

    refresh().catch(() => {});

  }, [refresh]);



  const value = useMemo(() => {

    if (isLoading && portal == null && !loadError) {

      return buildTenantProfileContextValue({

        tenantId: normalizedTenantId,

        portal: null,

        isLoading: true,

        loadError: "",

        isSaving: false,

        refresh,

        saveGeneralSettings,

      });

    }



    return buildTenantProfileContextValue({

      tenantId: normalizedTenantId,

      portal,

      isLoading,

      loadError,

      isSaving,

      refresh,

      saveGeneralSettings,

    });

  }, [

    normalizedTenantId,

    portal,

    isLoading,

    loadError,

    isSaving,

    refresh,

    saveGeneralSettings,

  ]);



  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;

}


