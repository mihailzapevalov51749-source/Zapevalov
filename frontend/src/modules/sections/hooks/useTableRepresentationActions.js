import {
  getRepresentationId,
  getRepresentationName,
} from "./useTableRepresentationPayload";

export default function useTableRepresentationActions({
  representations = [],
  activeRepresentationId = null,

  createRepresentation,
  updateRepresentation,
  deleteRepresentation,

  setDefaultRepresentation,

  buildCurrentRepresentationPayload,

  clearRepresentationDirty,
  clearDirty,

  applyRepresentationToTable,
  resetTableToAllItems,
  handleSelectRepresentation,
}) {
  const getActiveRepresentation = () => {
    return (
      representations.find(
        (item) =>
          String(item?.id ?? item?.key) === String(activeRepresentationId)
      ) || null
    );
  };

  const getTargetRepresentation = (representationOrId) => {
    const targetId = getRepresentationId(representationOrId);

    if (targetId) {
      const found = representations.find(
        (item) => String(item?.id ?? item?.key) === String(targetId)
      );

      if (found) return found;
    }

    if (representationOrId && typeof representationOrId === "object") {
      return representationOrId;
    }

    return getActiveRepresentation();
  };

  const handleCreateRepresentation = async (payloadOrEvent = {}) => {
    payloadOrEvent?.preventDefault?.();
    payloadOrEvent?.stopPropagation?.();

    if (!createRepresentation) return null;

    const payload =
      payloadOrEvent && typeof payloadOrEvent === "object"
        ? payloadOrEvent
        : {};

    const name = payload?.name || payload?.title || "Новое представление";

    const isDefault = Boolean(
      payload?.isDefault ?? payload?.is_default ?? representations.length === 0
    );

    const createPayload = {
      ...buildCurrentRepresentationPayload({
        name,
        isDefault,
        isVisible: true,
      }),

      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    console.log("CREATE REPRESENTATION PAYLOAD", createPayload);

    const newRepresentation = await createRepresentation(createPayload);

    clearRepresentationDirty?.();
    clearDirty?.();

    applyRepresentationToTable?.(newRepresentation);

    return newRepresentation;
  };

  const handleDeleteRepresentation = async (representationOrId) => {
    if (!deleteRepresentation) return null;

    const representationId = getRepresentationId(representationOrId);
    if (!representationId) return null;

    const isDeletingActive =
      String(activeRepresentationId) === String(representationId);

    const deletedIndex = representations.findIndex(
      (item) => String(item?.id ?? item?.key) === representationId
    );

    const nextActive = await deleteRepresentation(representationId);

    const nextRepresentations = representations.filter(
      (item) => String(item?.id ?? item?.key) !== representationId
    );

    const nextRepresentation =
      nextActive ||
      nextRepresentations[deletedIndex] ||
      nextRepresentations[deletedIndex - 1] ||
      nextRepresentations[0] ||
      null;

    if (!nextRepresentation) {
      resetTableToAllItems?.();
      return null;
    }

    if (isDeletingActive) {
      setTimeout(() => {
        handleSelectRepresentation?.(nextRepresentation);
      }, 0);
    }

    return nextRepresentation;
  };

  const handleRenameRepresentation = async (
    representationOrId,
    nextName
  ) => {
    if (!updateRepresentation) return null;

    const targetRepresentation = getTargetRepresentation(representationOrId);
    if (!targetRepresentation) return null;

    const name = String(nextName || "").trim();
    if (!name) return null;

    const patch = {
      name,
      title: name,
      label: name,
      updatedAt: new Date().toISOString(),
    };

    console.log("RENAME REPRESENTATION PATCH", patch);

    await updateRepresentation(targetRepresentation, patch);

    return {
      ...targetRepresentation,
      ...patch,
    };
  };

  const handleSaveRepresentation = async (representationOrId) => {
    if (!updateRepresentation) return null;

    const targetRepresentation = getTargetRepresentation(representationOrId);
    if (!targetRepresentation) return null;

    const currentName = getRepresentationName(targetRepresentation);

    const isDefault = Boolean(
      targetRepresentation?.isDefault ||
        targetRepresentation?.is_default ||
        targetRepresentation?.default
    );

    const isVisible =
      targetRepresentation?.isVisible ??
      targetRepresentation?.is_visible ??
      true;

    const payload = buildCurrentRepresentationPayload({
      name: currentName,
      isDefault,
      isVisible,
    });

    const patch = {
      ...payload,

      id: targetRepresentation.id,
      key: targetRepresentation.key,

      name: currentName,
      title: currentName,
      label: currentName,

      updatedAt: new Date().toISOString(),
    };

    console.log("UPDATE REPRESENTATION PATCH", patch);

    await updateRepresentation(targetRepresentation, patch);

    clearRepresentationDirty?.();
    clearDirty?.();

    return {
      ...targetRepresentation,
      ...patch,
    };
  };

  const handleSaveAsRepresentation = async (representationOrId) => {
    if (!createRepresentation) return null;

    const targetRepresentation = getTargetRepresentation(representationOrId);

    const baseName = getRepresentationName(
      targetRepresentation,
      "Представление"
    );

    const name = `${baseName} — копия`;

    const createPayload = {
      ...buildCurrentRepresentationPayload({
        name,
        isDefault: false,
        isVisible: true,
      }),

      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    console.log("SAVE AS REPRESENTATION PAYLOAD", createPayload);

    const newRepresentation = await createRepresentation(createPayload);

    clearRepresentationDirty?.();
    clearDirty?.();

    applyRepresentationToTable?.(newRepresentation);

    return newRepresentation;
  };

  const handleDuplicateRepresentation = async (representationOrId) => {
    if (!createRepresentation) return null;

    const currentRepresentation = getTargetRepresentation(representationOrId);
    if (!currentRepresentation) return null;

    const baseName = getRepresentationName(currentRepresentation);
    const name = `${baseName} — дубль`;

    const createPayload = {
      ...currentRepresentation,

      id: undefined,
      key: undefined,

      name,
      title: name,
      label: name,

      isDefault: false,
      is_default: false,
      default: false,

      isVisible: currentRepresentation.isVisible ?? true,
      is_visible: currentRepresentation.is_visible ?? true,

      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    console.log("DUPLICATE REPRESENTATION PAYLOAD", createPayload);

    const newRepresentation = await createRepresentation(createPayload);

    clearRepresentationDirty?.();
    clearDirty?.();

    applyRepresentationToTable?.(newRepresentation);

    return newRepresentation;
  };

  const handleSetDefaultRepresentation = async (representationOrId) => {
    const targetId = getRepresentationId(representationOrId);
    if (!targetId) return null;

    if (typeof setDefaultRepresentation === "function") {
      await setDefaultRepresentation(targetId);
      return targetId;
    }

    if (!updateRepresentation) return null;

    await Promise.all(
      representations.map(async (representation) => {
        const representationId = getRepresentationId(representation);
        const isDefault =
          String(representationId) === String(targetId);

        const patch = {
          isDefault,
          is_default: isDefault,
          default: isDefault,
          updatedAt: new Date().toISOString(),
        };

        console.log("SET DEFAULT PATCH", {
          representationId,
          patch,
        });

        await updateRepresentation(representation, patch);
      })
    );

    return targetId;
  };

  return {
    handleCreateRepresentation,
    handleDeleteRepresentation,
    handleRenameRepresentation,
    handleSaveRepresentation,
    handleSaveAsRepresentation,
    handleDuplicateRepresentation,
    handleSetDefaultRepresentation,
  };
}