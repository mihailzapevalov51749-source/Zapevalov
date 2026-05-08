export default function useUniversalTableActions({
  isEditMode,
  isInlineEditMode,

  handleAddRow,
  handleAddSubtask,
  handleDeleteRow,
  handleCellChange,
  handleRowValuesChange,

  expandRow,
  requestTableHeightReport,

  markShouldOpenCreatedRowCard,
  clearShouldOpenCreatedRowCard,
}) {
  const normalizeAddRowPayload = (payloadOrEvent) => {
    payloadOrEvent?.preventDefault?.();
    payloadOrEvent?.stopPropagation?.();

    const isEventLike =
      payloadOrEvent?.preventDefault || payloadOrEvent?.stopPropagation;

    if (!payloadOrEvent || isEventLike) {
      return {
        position: "bottom",
        openCard: false,
        focusFirstCell: true,
      };
    }

    return {
      position: payloadOrEvent.position === "top" ? "top" : "bottom",
      openCard: Boolean(payloadOrEvent.openCard),
      focusFirstCell: payloadOrEvent.focusFirstCell !== false,
    };
  };

  const handleAddRowAndUpdateHeight = async (payloadOrEvent) => {
    const payload = normalizeAddRowPayload(payloadOrEvent);

    const shouldOpenCard =
      Boolean(payload.openCard) && !isEditMode && !isInlineEditMode;

    if (shouldOpenCard) {
      markShouldOpenCreatedRowCard?.();
    }

    const newRow = await handleAddRow?.({
      position: payload.position,
    });

    if (!newRow?.id) {
      clearShouldOpenCreatedRowCard?.();
    }

    requestTableHeightReport?.();

    return {
      row: newRow,
      position: payload.position,
      openCard: shouldOpenCard,
      focusFirstCell: payload.focusFirstCell,
      forceVisible: true,
    };
  };

  const handleAddSubtaskAndUpdateHeight = async (parentRow) => {
    const newRow = await handleAddSubtask?.(parentRow);

    if (parentRow?.id) {
      expandRow?.(parentRow.id);
    }

    requestTableHeightReport?.();

    return newRow;
  };

  const handleDeleteRowAndUpdateHeight = async (row) => {
    await handleDeleteRow?.(row);
    requestTableHeightReport?.();
  };

  const handleCardCellChange = async (rowId, columnId, value) => {
    await handleCellChange?.(rowId, columnId, value);
    requestTableHeightReport?.();
  };

  const handleSaveRowValues = async (rowId, nextValues) => {
    const updatedRow = await handleRowValuesChange?.(rowId, nextValues);
    requestTableHeightReport?.();
    return updatedRow;
  };

  return {
    handleAddRowAndUpdateHeight,
    handleAddSubtaskAndUpdateHeight,
    handleDeleteRowAndUpdateHeight,
    handleCardCellChange,
    handleSaveRowValues,
  };
}