export default function useTableSortActions({
  setActiveSort,
  setSortDirection,

  markCurrentViewDirty,

  dispatchChangeSort,
  dispatchChangeSortDirection,
}) {
  const handleSortChange = (nextSort) => {
    setActiveSort(nextSort);
    markCurrentViewDirty();
    dispatchChangeSort(nextSort);
  };

  const handleSortDirectionChange = (nextDirection) => {
    setSortDirection(nextDirection);
    markCurrentViewDirty();
    dispatchChangeSortDirection(nextDirection);
  };

  return {
    handleSortChange,
    handleSortDirectionChange,
  };
}