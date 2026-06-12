import { useState } from "react";

import { resolveNavigationDeleteError } from "../../../api/navigationApi";
import { getLegacyTableNavigationBlockedMessage } from "../../blocks/registry/legacyTableBlockTypes";
import { navigationService } from "../services/navigationService";
import { getNavigationDeleteBlockReason } from "../utils/navigationDeletePolicy";

export default function useMenuEditor({ portalId, reload, navigationItems = [] }) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const [deleteError, setDeleteError] = useState(null);
  const [deleteNotice, setDeleteNotice] = useState(null);

  const enterEditMode = () => setIsEditMode(true);
  const exitEditMode = () => setIsEditMode(false);

  const findNavigationItem = (itemId) => {
    const normalizedId = String(itemId ?? "").trim();
    if (!normalizedId) {
      return null;
    }

    const stack = Array.isArray(navigationItems) ? [...navigationItems] : [];

    while (stack.length) {
      const current = stack.shift();
      if (String(current?.id ?? "") === normalizedId) {
        return current;
      }

      if (Array.isArray(current?.children) && current.children.length) {
        stack.push(...current.children);
      }
    }

    return null;
  };

  const createItem = async ({
    type,
    title,
    url,
    parent_id = null,
    scope,
    mode,
    context,
  }) => {
    setIsSaving(true);

    try {
      const legacyNavBlockedMessage = getLegacyTableNavigationBlockedMessage(type);

      if (legacyNavBlockedMessage) {
        throw new Error(legacyNavBlockedMessage);
      }

      if (type === "document_library") {
        await navigationService.createDocumentLibrary({
          portal_id: portalId,
          parent_id,
          title,
          description: "",
        });

        await reload();
        return;
      }

      let pageId = null;

      if (type === "page") {
        const page = await navigationService.createPage({
          portal_id: portalId,
          title,
          description: "",
          status: "published",
          is_home: false,
          is_visible: true,
          sort_order: 0,
        });

        pageId = page.id;
      }

      await navigationService.createItem({
        portal_id: portalId,
        parent_id,
        type,
        title,
        page_id: pageId,
        url: type === "external_link" ? url : null,
        sort_order: 0,
        is_visible: true,
        icon: null,
        icon_type: null,
        icon_file_url: null,
        color: null,
        is_bold: false,
        is_italic: false,
        scope,
        mode,
        context,
      });

      await reload();
    } finally {
      setIsSaving(false);
    }
  };

  const updateItem = async (id, data) => {
    setIsSaving(true);

    try {
      await navigationService.updateItem(id, data);
      await reload();
    } finally {
      setIsSaving(false);
    }
  };

  const requestDeleteItem = (id) => {
    const item = findNavigationItem(id);
    const blockReason = getNavigationDeleteBlockReason(item);

    setDeleteError(null);
    setDeleteNotice(null);

    if (blockReason) {
      setDeleteNotice(blockReason);
      return { ok: false, reason: blockReason };
    }

    setPendingDeleteId(id);
    return { ok: true };
  };

  const cancelDeleteItem = () => {
    setPendingDeleteId(null);
    setDeleteError(null);
  };

  const clearDeleteNotice = () => {
    setDeleteNotice(null);
  };

  const showDeleteNotice = (reason) => {
    setDeleteError(null);
    setPendingDeleteId(null);
    setDeleteNotice(reason || getNavigationDeleteBlockReason(null));
  };

  const confirmDeleteItem = async () => {
    if (pendingDeleteId == null) {
      return { ok: false };
    }

    setIsSaving(true);
    setDeleteError(null);

    try {
      await navigationService.deleteItem(pendingDeleteId);
      setPendingDeleteId(null);
      await reload();
      return { ok: true };
    } catch (error) {
      const message = resolveNavigationDeleteError(error);
      setDeleteError(message);
      return { ok: false, error: message };
    } finally {
      setIsSaving(false);
    }
  };

  const pendingDeleteItem = findNavigationItem(pendingDeleteId);

  return {
    isEditMode,
    isSaving,
    enterEditMode,
    exitEditMode,
    createItem,
    updateItem,
    requestDeleteItem,
    cancelDeleteItem,
    confirmDeleteItem,
    pendingDeleteId,
    pendingDeleteItem,
    deleteError,
    deleteNotice,
    clearDeleteNotice,
    showDeleteNotice,
  };
}
