import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { getStoredCurrentUser } from "../../../../modules/designer/constants/designerRoles.js";
import { resolveAuthSession } from "../../../../api/sessionBridgeApi.js";
import {
  APP_MODES,
  buildSidebarModeSwitcherOptions,
  detectAppMode,
  resolveModeSwitcherAccess,
  resolveSidebarModeSwitchPath,
} from "../../../appMode/sidebarModeSwitcher.js";
import { showPlatformNotification } from "../../../platformNotification/PlatformNotification.js";
import { TENANT_HOME_PAGE_NOT_FOUND_MESSAGE } from "../../../tenantContext/resolveTenantRuntimeEntryPath.js";
import { resolveTenantIdFromPathname } from "../../../tenantContext/tenantContextResolver.js";

export default function SidebarModeSwitcher({ tenantIdFallback = 1 }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(() => getStoredCurrentUser());
  const [isSwitching, setIsSwitching] = useState(false);

  useEffect(() => {
    let isMounted = true;

    void resolveAuthSession()
      .then((result) => {
        if (isMounted && result?.user) {
          setUser(result.user);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  const currentMode = useMemo(
    () => detectAppMode(location.pathname),
    [location.pathname],
  );
  const access = useMemo(() => resolveModeSwitcherAccess(user), [user]);
  const options = useMemo(
    () => buildSidebarModeSwitcherOptions({ currentMode, access }),
    [currentMode, access],
  );

  const tenantId = resolveTenantIdFromPathname(location.pathname) ?? tenantIdFallback;

  const handleSwitch = useCallback(
    async (targetKey) => {
      if (isSwitching) {
        return;
      }

      setIsSwitching(true);
      try {
        const path = await resolveSidebarModeSwitchPath(targetKey, {
          pathname: location.pathname,
          tenantIdFallback: tenantId,
        });

        if (!path) {
          if (targetKey === APP_MODES.OFFICE) {
            showPlatformNotification({
              message: TENANT_HOME_PAGE_NOT_FOUND_MESSAGE,
              variant: "warning",
            });
          }
          return;
        }

        navigate(path);
      } finally {
        setIsSwitching(false);
      }
    },
    [isSwitching, location.pathname, navigate, tenantId],
  );

  if (!options.length) {
    return null;
  }

  return (
    <div
      className="app-sidebar-renderer__mode-switcher"
      role="navigation"
      aria-label="Переключение режима работы"
    >
      {options.map((option, index) => (
        <span key={option.key} className="app-sidebar-renderer__mode-switcher-item">
          {index > 0 ? (
            <span
              className="app-sidebar-renderer__mode-switcher-separator"
              aria-hidden="true"
            >
              |
            </span>
          ) : null}
          <button
            type="button"
            className="app-sidebar-renderer__mode-switcher-button"
            disabled={isSwitching}
            onClick={() => {
              void handleSwitch(option.key);
            }}
          >
            {option.label}
          </button>
        </span>
      ))}
    </div>
  );
}
