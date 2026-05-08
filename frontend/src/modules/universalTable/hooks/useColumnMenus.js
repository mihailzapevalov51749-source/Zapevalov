import { useEffect, useState } from "react";

import {
  normalizeAlign,
  normalizeOptions,
  normalizeLookup,
  getDefaultChoiceOptions,
  areOptionsEqual,
  areLookupEqual,
} from "../services/tableUtils";

const MULTIPLE_SUPPORTED_TYPES = ["choice", "user"];

export default function useColumnMenus({
  isAddColumnOpen,
  openedColumnMenuId,

  newColumnOptions,
  newColumnMultiple,
  newColumnAlign,
  newColumnLookup,
  newColumnTitle,

  handleCancelAddColumn,
  handleToggleAddColumn,
  handleAddColumn,
  handleDeleteColumn,

  updateColumn,
  handleSaveSystemColumnSettings,

  closeColumnMenu,
  openColumnMenu,

  setNewColumnType,
  setNewColumnOptions,
  setNewColumnMultiple,
  setNewColumnAlign,
  setNewColumnLookup,

  onAfterChange,
}) {
  const [createColumnAnchorRect, setCreateColumnAnchorRect] = useState(null);
  const [columnMenuAnchorRect, setColumnMenuAnchorRect] = useState(null);
  const [editingColumnDraft, setEditingColumnDraft] = useState(null);
  const [createColumnTitleError, setCreateColumnTitleError] = useState("");

  const safeNormalizeLookup = (lookup) => {
    const normalized = normalizeLookup(lookup || {});

    return {
      sourceTableId: normalized?.sourceTableId
        ? Number(normalized.sourceTableId)
        : null,

      displayColumnId: normalized?.displayColumnId
        ? Number(normalized.displayColumnId)
        : null,

      showAvatar: normalized?.showAvatar !== false,

      showTime:
        lookup?.showTime === true ||
        normalized?.showTime === true,

      showDateHint:
        lookup?.showDateHint !== false &&
        normalized?.showDateHint !== false,
    };
  };

  const resetCreateDraft = () => {
    setNewColumnLookup?.({});
    setNewColumnAlign?.("left");
    setNewColumnMultiple?.(false);
    setCreateColumnTitleError("");
  };

  const hasEditColumnChanges = () => {
    if (!editingColumnDraft) return false;

    return (
      editingColumnDraft.title !== editingColumnDraft.original.title ||

      Number(editingColumnDraft.width || 180) !==
        Number(editingColumnDraft.original.width || 180) ||

      editingColumnDraft.type !== editingColumnDraft.original.type ||

      editingColumnDraft.required !== editingColumnDraft.original.required ||

      Boolean(editingColumnDraft.multiple) !==
        Boolean(editingColumnDraft.original.multiple) ||

      normalizeAlign(editingColumnDraft.align) !==
        normalizeAlign(editingColumnDraft.original.align) ||

      !areOptionsEqual(
        editingColumnDraft.options,
        editingColumnDraft.original.options
      ) ||

      !areLookupEqual(
        safeNormalizeLookup(editingColumnDraft.lookup),
        safeNormalizeLookup(editingColumnDraft.original.lookup)
      )
    );
  };

  const saveEditingColumnDraft = async () => {
    if (!editingColumnDraft) return null;

    const title = editingColumnDraft.title.trim();

    if (!title) return null;

    const width = Number(editingColumnDraft.width || 180);

    const isSystem = Boolean(
      editingColumnDraft.isSystem ||
        editingColumnDraft.system ||
        editingColumnDraft.is_system
    );

    if (isSystem) {
      return handleSaveSystemColumnSettings?.(editingColumnDraft.id, {
        title,
        width,
        align: normalizeAlign(editingColumnDraft.align),
        lookup: safeNormalizeLookup(editingColumnDraft.lookup),
      });
    }

    return updateColumn(editingColumnDraft.id, {
      title,

      type: editingColumnDraft.type || "text",

      required: Boolean(editingColumnDraft.required),

      multiple: MULTIPLE_SUPPORTED_TYPES.includes(
        editingColumnDraft.type
      )
        ? Boolean(editingColumnDraft.multiple)
        : false,

      width,

      options:
        editingColumnDraft.type === "choice"
          ? normalizeOptions(editingColumnDraft.options)
          : [],

      align: normalizeAlign(editingColumnDraft.align),

      lookup:
        editingColumnDraft.type === "lookup" ||
        editingColumnDraft.type === "user" ||
        editingColumnDraft.type === "date"
          ? safeNormalizeLookup(editingColumnDraft.lookup)
          : {},
    });
  };

  const handleSaveEditColumn = async () => {
    await saveEditingColumnDraft();

    closeAllMenus({
      askToSave: false,
    });

    onAfterChange?.();
  };

  const handleCancelEditColumn = async () => {
    await closeAllMenus({
      askToSave: false,
    });
  };

  const handleDeleteColumnAndClose = async (columnId) => {
    if (editingColumnDraft?.allow_delete === false) {
      return;
    }

    await handleDeleteColumn?.(columnId);

    await closeAllMenus({
      askToSave: false,
    });

    onAfterChange?.();
  };

  const handleCancelCreateColumn = async () => {
    await closeAllMenus({
      askToSave: false,
    });
  };

  const closeAllMenus = async ({ askToSave = true } = {}) => {
    if (askToSave && editingColumnDraft && hasEditColumnChanges()) {
      const shouldSave = window.confirm(
        "Есть несохранённые изменения. Сохранить?"
      );

      if (shouldSave) {
        await saveEditingColumnDraft();
      }
    }

    if (isAddColumnOpen) {
      handleCancelAddColumn?.();
      resetCreateDraft();
    }

    closeColumnMenu?.();

    setEditingColumnDraft(null);

    setCreateColumnAnchorRect(null);
    setColumnMenuAnchorRect(null);

    setCreateColumnTitleError("");
  };

  useEffect(() => {
    const handleClick = async (event) => {
      const insideMenu = event.target.closest("[data-column-menu='true']");
      const button = event.target.closest("[data-column-menu-button='true']");
      const resize = event.target.closest("[data-column-resize-handle='true']");

      if (insideMenu || button || resize) return;

      if (isAddColumnOpen || openedColumnMenuId || editingColumnDraft) {
        await closeAllMenus({
          askToSave: true,
        });
      }
    };

    document.addEventListener("mousedown", handleClick);

    return () => {
      document.removeEventListener("mousedown", handleClick);
    };
  }, [isAddColumnOpen, openedColumnMenuId, editingColumnDraft]);

  const handleOpenCreateColumnMenu = async (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (openedColumnMenuId || editingColumnDraft) {
      await closeAllMenus({
        askToSave: true,
      });
    }

    setColumnMenuAnchorRect(null);

    setEditingColumnDraft(null);

    setCreateColumnTitleError("");

    if (isAddColumnOpen) {
      handleCancelAddColumn?.();

      setCreateColumnAnchorRect(null);

      resetCreateDraft();

      return;
    }

    setCreateColumnAnchorRect(event.currentTarget.getBoundingClientRect());

    handleToggleAddColumn?.();
  };

  const handleOpenEditColumnMenu = async ({ event, column }) => {
    event.preventDefault();
    event.stopPropagation();

    const columnOptions = normalizeOptions(column.options);

    const columnAlign = normalizeAlign(column.align);

    const columnLookup = safeNormalizeLookup(
      column.lookup || column.settings?.lookup
    );

    setEditingColumnDraft({
      id: column.id,

      title: column.title || "",

      type: column.type || "text",

      required: Boolean(column.required),

      multiple: Boolean(column.multiple),

      width: Number(column.width || 180),

      options: columnOptions,

      align: columnAlign,

      lookup: columnLookup,

      isSystem: Boolean(
        column?.system ||
          column?.isSystem ||
          column?.is_system
      ),

      allow_title_edit: column?.allow_title_edit !== false,

      allow_width_edit: column?.allow_width_edit !== false,

      allow_align_edit: column?.allow_align_edit !== false,

      allow_type_edit: column?.allow_type_edit !== false,

      allow_required_edit: column?.allow_required_edit !== false,

      allow_options_edit: column?.allow_options_edit !== false,

      allow_lookup_edit: column?.allow_lookup_edit !== false,

      allow_delete: column?.allow_delete !== false,

      original: {
        title: column.title || "",

        type: column.type || "text",

        required: Boolean(column.required),

        multiple: Boolean(column.multiple),

        width: Number(column.width || 180),

        options: columnOptions,

        align: columnAlign,

        lookup: columnLookup,
      },
    });

    setColumnMenuAnchorRect(event.currentTarget.getBoundingClientRect());

    openColumnMenu?.(column.id);
  };

  const handleCreateColumnTypeChange = (type) => {
    setNewColumnType(type);

    if (type === "choice" && normalizeOptions(newColumnOptions).length === 0) {
      setNewColumnOptions(getDefaultChoiceOptions());
    }

    if (!MULTIPLE_SUPPORTED_TYPES.includes(type)) {
      setNewColumnMultiple?.(false);
    }

    if (type !== "choice") {
      setNewColumnOptions([]);
    }

    if (type === "user") {
      setNewColumnLookup?.({
        showAvatar: true,
      });

      return;
    }

    if (type === "date") {
      setNewColumnLookup?.({
        showTime: false,
        showDateHint: true,
      });

      return;
    }

    if (type !== "lookup") {
      setNewColumnLookup({});
    }
  };

  const handleEditColumnLookupChange = (lookup) => {
    setEditingColumnDraft((draft) => {
      if (!draft) return draft;

      return {
        ...draft,
        lookup: safeNormalizeLookup(lookup),
      };
    });
  };

  const handleCreateColumnLookupChange = (lookup) => {
    setNewColumnLookup?.(safeNormalizeLookup(lookup));
  };

  const handleSaveCreateColumn = async () => {
    if (!newColumnTitle?.trim()) {
      setCreateColumnTitleError("Введите название столбца");

      return;
    }

    setCreateColumnTitleError("");

    await handleAddColumn?.();

    setCreateColumnAnchorRect(null);

    resetCreateDraft();

    onAfterChange?.();
  };

  return {
    createColumnAnchorRect,
    columnMenuAnchorRect,

    editingColumnDraft,

    createColumnTitleError,

    setEditingColumnDraft,
    setColumnMenuAnchorRect,
    setCreateColumnTitleError,

    handleOpenCreateColumnMenu,
    handleOpenEditColumnMenu,

    handleCreateColumnTypeChange,

    handleEditColumnLookupChange,
    handleCreateColumnLookupChange,

    handleSaveCreateColumn,
    handleSaveEditColumn,

    handleCancelEditColumn,

    handleDeleteColumnAndClose,

    handleCancelCreateColumn,

    closeAllMenus,
  };
}