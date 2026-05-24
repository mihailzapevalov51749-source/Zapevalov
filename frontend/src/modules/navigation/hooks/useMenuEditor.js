import { useState } from "react";
import { navigationService } from "../services/navigationService";

export default function useMenuEditor({ portalId, reload }) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const enterEditMode = () => setIsEditMode(true);
  const exitEditMode = () => setIsEditMode(false);

  const createItem = async ({ type, title, url, parent_id = null }) => {
    setIsSaving(true);

    try {
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

      if (type === "universal_table") {
        const page = await navigationService.createPage({
          portal_id: portalId,
          title,
          description: "",
          status: "published",
          is_home: false,
          is_visible: true,
          sort_order: 0,
        });

        await navigationService.createItem({
          portal_id: portalId,
          parent_id,
          type: "universal_table",
          title,
          page_id: page.id,
          url: null,
          sort_order: 0,
          is_visible: true,
          icon: null,
          icon_type: null,
          icon_file_url: null,
          color: null,
          is_bold: false,
          is_italic: false,
        });

        const section = await navigationService.createSection({
          page_id: page.id,
          title: "",
          description: "",
          layout: "one_column",
          sort_order: 0,
        });

        await navigationService.createBlock({
          section_id: section.id,
          type: "universal_table",
          title,
          content: {},
          settings: {
            show_title: true,
          },
          sort_order: 0,
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

  const deleteItem = async (id) => {
    const confirmed = window.confirm("Удалить этот элемент меню?");
    if (!confirmed) return;

    setIsSaving(true);

    try {
      await navigationService.deleteItem(id);
      await reload();
    } finally {
      setIsSaving(false);
    }
  };

  return {
    isEditMode,
    isSaving,
    enterEditMode,
    exitEditMode,
    createItem,
    updateItem,
    deleteItem,
  };
}