import { createRuntimeSidebarContract } from "../../../shared/shell/sidebar";
import {
  CONTROL_PLANE_NAV_ITEMS,
  applyControlPlaneNavBadges,
  resolveControlPlaneActiveNavItemId,
  resolveControlPlaneActiveParentIds,
} from "../config/controlPlaneNavigation.js";

export function createControlPlaneSidebarContract({
  activePath,
  menuScale = 1,
  isEditMode = false,
  onChangeMenuScale,
  platformName,
  reviewCount = 0,
}) {
  const activeItemId = resolveControlPlaneActiveNavItemId(activePath);
  const activeParentIds = resolveControlPlaneActiveParentIds(activePath);
  const normalizedReviewCount = Number(reviewCount) > 0 ? Number(reviewCount) : 0;
  const navigationItems = applyControlPlaneNavBadges(CONTROL_PLANE_NAV_ITEMS, {
    "cp-group-releases": normalizedReviewCount,
  });

  const contract = createRuntimeSidebarContract({
    navigationItems,
    activePath,
    activeItemId,
    activeParentIds,
    menuScale,
    isEditMode,
    onChangeMenuScale,
    canEditMenu: true,
    canCreateItem: false,
    canOpenSettings: true,
    canDragItems: true,
    brand: {
      title: String(platformName || "").trim() || "ЯсноПро",
      subtitle: "Control Plane",
    },
  });

  return {
    ...contract,
    footerActions: [],
    serviceNavigationActions: [],
  };
}
