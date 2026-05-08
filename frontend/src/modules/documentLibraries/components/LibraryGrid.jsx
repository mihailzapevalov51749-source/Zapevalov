import LibraryCard from "./LibraryCard";

export default function LibraryGrid({
  documents,
  isLoading,
  searchQuery,
  openedMenuId,
  setOpenedMenuId,

  selectedIds = [],
  onToggleSelectDocument,

  onOpenFolder,
  onRenameDocument,
  onDeleteDocument,
  onMoveDocument,
  onDropMoveDocument,
  onDropMoveDocuments,

  getFileUrl,
  getTypeLabel,
  getIcon,
  formatDocumentDate,
  styles,
}) {
  if (isLoading) {
    return <div style={styles.emptyState}>Загрузка документов...</div>;
  }

  if (!documents.length) {
    return (
      <div style={styles.emptyState}>
        {searchQuery.trim()
          ? "По запросу ничего не найдено"
          : "В этой папке пока нет документов"}
      </div>
    );
  }

  return (
    <div style={styles.gridShell}>
      {documents.map((documentItem) => (
        <LibraryCard
          key={documentItem.id}
          document={documentItem}
          isSelected={selectedIds.includes(documentItem.id)}
          selectedIds={selectedIds}
          isMenuOpen={openedMenuId === documentItem.id}
          onToggleSelect={onToggleSelectDocument}
          onToggleMenu={() =>
            setOpenedMenuId(
              openedMenuId === documentItem.id ? null : documentItem.id
            )
          }
          onOpenFolder={onOpenFolder}
          onRename={onRenameDocument}
          onDelete={onDeleteDocument}
          onMove={onMoveDocument}
          onDropMove={onDropMoveDocument}
          onDropMoveDocuments={onDropMoveDocuments}
          getFileUrl={getFileUrl}
          getTypeLabel={getTypeLabel}
          getIcon={getIcon}
          formatDocumentDate={formatDocumentDate}
          styles={styles}
        />
      ))}
    </div>
  );
}