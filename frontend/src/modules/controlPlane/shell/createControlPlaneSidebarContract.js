import { createRuntimeSidebarContract } from "../../../shared/shell/sidebar";
import {
  CONTROL_PLANE_NAV_ITEMS,
  resolveControlPlaneActiveNavItemId,
  resolveControlPlaneActiveParentIds,
} from "../config/controlPlaneNavigation.js";

export const CONTROL_PLANE_RETURN_TO_STUDIO_ACTION = {
  id: "control-plane-return-to-studio",
  kind: "action",
  label: "Вернуться в Студию",
  actionKey: "return-to-studio",
};

export function createControlPlaneSidebarContract({
  activePath,
  menuScale = 1,
  isEditMode = false,
  onChangeMenuScale,
}) {
  const activeItemId = resolveControlPlaneActiveNavItemId(activePath);
  const activeParentIds = resolveControlPlaneActiveParentIds(activePath);

  const contract = createRuntimeSidebarContract({
    navigationItems: CONTROL_PLANE_NAV_ITEMS,
    activePath,
    activeItemId,
    activeParentIds,
    menuScale,
    isEditMode,
    onChangeMenuScale,
    canEditMenu: true,
    canCreateItem: false,
    canOpenSettings: true,
    canDragItems: false,
    brand: {
      subtitle: "Control Plane",
    },
  });

  return {
    ...contract,
    footerActions: [],
    serviceNavigationActions: [CONTROL_PLANE_RETURN_TO_STUDIO_ACTION],
  };
}
