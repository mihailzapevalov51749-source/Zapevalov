import { useState } from "react";

import { getPageFull } from "../../../api/pagesApi";
import { findNavigationItemById } from "../../../portal/utils/portalPageUtils";
import useMenuEditor from "../../../modules/navigation/hooks/useMenuEditor";
import { updateLegacyTable } from "../../../modules/runtimeLegacyWriteAdapter";
import { dispatchUniversalTableTitleChanged } from "../../../modules/universalTable/utils/universalTableTitleEvents";
import {
  isUniversalTableNavigationItem,
  resolvePrimaryTableIdForPage,
} from "../../../modules/universalTable/utils/resolvePrimaryTableId";
import { navigationService } from "../../../modules/navigation/services/navigationService";

export function usePlatformSidebarControls({
  portalId = 1,
  reloadNavigation,
  menuScale = 1,
  onChangeMenuScale,
  canEditMenu = true,
  canCreateItem = true,
  canDragItems = true,
  createPayloadDefaults = {
    scope: "runtime",
    mode: "runtime",
    context: "runtime",
  },
}) {
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false);
  const menuEditor = useMenuEditor({
    portalId,
    reload: typeof reloadNavigation === "function" ? reloadNavigation : async () => {},
  });

  const handleUpdateMenuItem = async (itemId, data, navigationItems = []) => {
    try {
      const navigationItem = findNavigationItemById(navigationItems, itemId);
      const nextTitle = String(data?.title || "").trim();

      if (
        navigationItem &&
        nextTitle &&
        isUniversalTableNavigationItem(navigationItem) &&
        navigationItem.page_id
      ) {
        try {
          const linkedPage = await getPageFull(navigationItem.page_id);
          const tableId = await resolvePrimaryTableIdForPage(linkedPage);

          if (tableId) {
            const updatedTable = await updateLegacyTable(tableId, {
              title: nextTitle,
            });

            const syncedTitle = updatedTable?.title || nextTitle;

            dispatchUniversalTableTitleChanged({
              tableId,
              title: syncedTitle,
              dedicatedPageId: navigationItem.page_id,
            });

            await menuEditor.updateItem?.(itemId, {
              ...data,
              title: syncedTitle,
            });

            return;
          }
        } catch (renameError) {
          console.error("Failed to save universal table menu item:", renameError);
        }
      }

      await menuEditor.updateItem?.(itemId, data);
    } catch (saveError) {
      console.error("Failed to save menu item:", saveError);
    }
  };

  const handleSidebarAction = (actionKey, payload) => {
    switch (actionKey) {
      case "toggle-edit-mode":
        if (!canEditMenu) {
          return;
        }
        if (menuEditor.isEditMode) {
          menuEditor.exitEditMode?.();
        } else {
          menuEditor.enterEditMode?.();
        }
        return;
      case "menu-scale": {
        if (typeof onChangeMenuScale === "function") {
          const current = Number(payload?.value ?? menuScale ?? 1);
          const step = Number(payload?.step ?? 0.1);
          const nextScale = Math.min(1.4, Math.max(0.8, current + step));
          onChangeMenuScale(nextScale);
        }
        return;
      }
      case "add-menu-item":
        if (!canCreateItem) {
          return;
        }
        if (menuEditor.isEditMode) {
          setIsCreateMenuOpen(true);
        }
        return;
      case "update-menu-item":
        if (!canEditMenu) return;
        if (!payload?.id || !payload?.data) return;
        handleUpdateMenuItem(
          payload.id,
          payload.data,
          Array.isArray(payload.navigationItems) ? payload.navigationItems : []
        );
        return;
      case "delete-menu-item":
        if (!canEditMenu) return;
        if (!payload?.id) return;
        menuEditor.deleteItem?.(payload.id);
        return;
      case "move-menu-items":
        if (!canDragItems) return;
        if (!Array.isArray(payload?.items) || !payload.items.length) return;
        navigationService
          .moveItems(payload.items)
          .then(async () => {
            await (typeof reloadNavigation === "function"
              ? reloadNavigation()
              : Promise.resolve());
          })
          .catch((moveError) => {
            console.error("Failed to move menu items:", moveError);
          });
        return;
      case "open-menu-settings":
        if (!canEditMenu) {
          return;
        }
        if (menuEditor.isEditMode) {
          menuEditor.exitEditMode?.();
        } else {
          menuEditor.enterEditMode?.();
        }
        return;
      default:
        return;
    }
  };

  return {
    isEditMode: menuEditor.isEditMode,
    isSaving: menuEditor.isSaving,
    isCreateMenuOpen,
    setIsCreateMenuOpen,
    createItem: (data) =>
      menuEditor.createItem({
        ...data,
        ...createPayloadDefaults,
      }),
    handleSidebarAction,
  };
}
