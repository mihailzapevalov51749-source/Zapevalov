import { useState } from "react";

import { getPageFull } from "../../../api/pagesApi";
import { findNavigationItemById } from "../../../portal/utils/portalPageUtils";
import useMenuEditor from "../../../modules/navigation/hooks/useMenuEditor";
import {
  isLegacyStorageNavigationItem,
  renameLegacyStorageForPage,
} from "../../../shared/legacy/adapters/legacyStorageAdapter";
import { navigationService } from "../../../modules/navigation/services/navigationService";
import {
  patchDesignerSystemMenuSettings,
  resolveDesignerSystemItemKey,
} from "./designerSystemMenuSettings";

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
  mode = "runtime",
}) {
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false);
  const menuEditor = useMenuEditor({
    portalId,
    reload: typeof reloadNavigation === "function" ? reloadNavigation : async () => {},
  });

  const handleUpdateMenuItem = async (itemId, data, navigationItems = []) => {
    try {
      const navigationItem = findNavigationItemById(navigationItems, itemId);
      const isObjectTypeItem =
        navigationItem?.type === "object_type" ||
        Boolean(navigationItem?.object_type_id);

      if (isObjectTypeItem) {
        await menuEditor.updateItem?.(itemId, {
          is_bold: data?.is_bold,
          is_italic: data?.is_italic,
          is_visible: data?.is_visible,
        });
        return;
      }

      const nextTitle = String(data?.title || "").trim();

      if (
        navigationItem &&
        nextTitle &&
        isLegacyStorageNavigationItem(navigationItem) &&
        navigationItem.page_id
      ) {
        try {
          const linkedPage = await getPageFull(navigationItem.page_id);
          const renameResult = await renameLegacyStorageForPage({
            pageData: linkedPage,
            title: nextTitle,
            dedicatedPageId: navigationItem.page_id,
          });

          if (renameResult?.title) {
            await menuEditor.updateItem?.(itemId, {
              ...data,
              title: renameResult.title,
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
        if (mode === "designer" && String(payload.id).startsWith("system-designer-")) {
          const systemItem = {
            id: payload.id,
            ...(payload?.navigationItems
              ? {
                  sourceItem: findNavigationItemById(payload.navigationItems, payload.id),
                }
              : {}),
          };
          const itemKey = resolveDesignerSystemItemKey(
            systemItem.sourceItem ?? { id: payload.id }
          );
          patchDesignerSystemMenuSettings(portalId, itemKey, {
            title:
              typeof payload.data.title === "string" ? payload.data.title : undefined,
            icon: payload.data.icon,
            icon_type: payload.data.icon_type,
            icon_file_url: payload.data.icon_file_url,
            color:
              typeof payload.data.color === "string" ? payload.data.color : undefined,
            is_bold:
              typeof payload.data.is_bold === "boolean"
                ? payload.data.is_bold
                : undefined,
            is_italic:
              typeof payload.data.is_italic === "boolean"
                ? payload.data.is_italic
                : undefined,
            is_visible:
              typeof payload.data.is_visible === "boolean"
                ? payload.data.is_visible
                : undefined,
            is_expanded:
              typeof payload.data.is_expanded === "boolean"
                ? payload.data.is_expanded
                : undefined,
          });
          return;
        }
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
        if (mode === "designer") {
          payload.items.forEach((item) => {
            if (!String(item?.id || "").startsWith("system-designer-")) return;
            const itemKey = resolveDesignerSystemItemKey({ id: item.id });
            patchDesignerSystemMenuSettings(portalId, itemKey, {
              sort_order:
                typeof item.sort_order === "number" && Number.isFinite(item.sort_order)
                  ? item.sort_order
                  : undefined,
              parent_id: item.parent_id ?? null,
            });
          });
          const customItems = payload.items.filter(
            (item) => !String(item?.id || "").startsWith("system-designer-")
          );
          if (!customItems.length) {
            return;
          }
          navigationService
            .moveItems(customItems)
            .then(async () => {
              await (typeof reloadNavigation === "function"
                ? reloadNavigation()
                : Promise.resolve());
            })
            .catch((moveError) => {
              console.error("Failed to move menu items:", moveError);
            });
          return;
        }
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
