export default function LibraryBreadcrumbs({
  title,
  folderPath,
  onGoRoot,
  onGoToBreadcrumb,
  onDropToRoot,
  onDropToBreadcrumb,
  styles,
}) {
  const { breadcrumbs, breadcrumbLink } = styles;

  const getDraggedDocuments = (event) => {
    const raw = event.dataTransfer.getData("application/json");

    if (!raw) return [];

    try {
      const parsed = JSON.parse(raw);

      if (Array.isArray(parsed)) {
        return parsed;
      }

      if (parsed?.id) {
        return [parsed];
      }

      return [];
    } catch {
      return [];
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "move";
  };

  const handleDropToRoot = async (event) => {
    event.preventDefault();
    event.stopPropagation();

    const draggedDocuments = getDraggedDocuments(event);

    if (!draggedDocuments.length) return;

    await onDropToRoot?.(draggedDocuments);
  };

  const handleDropToFolder = async (event, folder, index) => {
    event.preventDefault();
    event.stopPropagation();

    const draggedDocuments = getDraggedDocuments(event);

    if (!draggedDocuments.length) return;

    await onDropToBreadcrumb?.(draggedDocuments, folder, index);
  };

  return (
    <div style={breadcrumbs}>
      <span
        style={breadcrumbLink}
        onClick={onGoRoot}
        onDragOver={handleDragOver}
        onDrop={handleDropToRoot}
        title="Переместить в корень"
      >
        Документы
      </span>

      <span> / </span>

      <span
        style={breadcrumbLink}
        onClick={onGoRoot}
        onDragOver={handleDragOver}
        onDrop={handleDropToRoot}
        title="Переместить в корень библиотеки"
      >
        {title}
      </span>

      {folderPath.map((folder, index) => (
        <span key={folder.id}>
          <span> / </span>

          <span
            style={breadcrumbLink}
            onClick={() => onGoToBreadcrumb(index)}
            onDragOver={handleDragOver}
            onDrop={(event) => handleDropToFolder(event, folder, index)}
            title={`Переместить в папку: ${folder.title}`}
          >
            {folder.title}
          </span>
        </span>
      ))}
    </div>
  );
}