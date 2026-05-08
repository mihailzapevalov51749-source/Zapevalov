import { useEffect, useState } from "react";

export default function useRowSelection({
  rows = [],
  onDeleteRows,
  onAfterChange,
}) {
  const [selectedRowIds, setSelectedRowIds] = useState([]);

  const selectedRowsCount = selectedRowIds.length;
  const allRowsSelected = rows.length > 0 && selectedRowsCount === rows.length;
  const someRowsSelected =
    selectedRowsCount > 0 && selectedRowsCount < rows.length;

  useEffect(() => {
    setSelectedRowIds((current) => {
      const existingRowIds = new Set(rows.map((row) => String(row.id)));

      return current.filter((rowId) => existingRowIds.has(String(rowId)));
    });
  }, [rows]);

  const handleToggleRowSelection = (rowId) => {
    setSelectedRowIds((current) => {
      const normalizedRowId = String(rowId);
      const exists = current.some((id) => String(id) === normalizedRowId);

      if (exists) {
        return current.filter((id) => String(id) !== normalizedRowId);
      }

      return [...current, rowId];
    });
  };

  const handleToggleAllRowsSelection = () => {
    if (allRowsSelected) {
      setSelectedRowIds([]);
      return;
    }

    setSelectedRowIds(rows.map((row) => row.id));
  };

  const handleDeleteSelectedRows = async () => {
    if (selectedRowIds.length === 0) return;

    await onDeleteRows?.(selectedRowIds);

    setSelectedRowIds([]);
    onAfterChange?.();
  };

  const handleClearSelection = () => {
    setSelectedRowIds([]);
    onAfterChange?.();
  };

  return {
    selectedRowIds,
    selectedRowsCount,
    allRowsSelected,
    someRowsSelected,
    handleToggleRowSelection,
    handleToggleAllRowsSelection,
    handleDeleteSelectedRows,
    handleClearSelection,
  };
}