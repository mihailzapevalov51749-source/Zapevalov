import { uploadFile } from "../../../shared/files/api/filesApi";

function isFileColumn(column) {
  const type = String(column?.type || "").toLowerCase();

  return ["file", "files", "attachment", "attachments"].includes(type);
}

function getFileKey(file) {
  return (
    file?.id ||
    file?.fileId ||
    file?.file_id ||
    file?.url ||
    file?.fileUrl ||
    file?.file_url
  );
}

export default function useTableRowAttachments({
  columns = [],
  rows = [],
  handleRowValuesChange,
  handleOpenRowCard,
}) {
  const getFileColumn = () => columns.find(isFileColumn) || null;

  const handleUploadAttachment = async (row) => {
    if (!row?.id) return;

    const fileColumn = getFileColumn();

    if (!fileColumn) {
      console.error("Файловое поле не найдено");
      return;
    }

    const input = document.createElement("input");

    input.type = "file";
    input.multiple = true;

    input.onchange = async (event) => {
      const selectedFiles = Array.from(event.target.files || []);

      if (!selectedFiles.length) return;

      try {
        const uploadedFiles = [];

        for (const file of selectedFiles) {
          const uploaded = await uploadFile({ file });

          if (uploaded) uploadedFiles.push(uploaded);
        }

        if (!uploadedFiles.length) return;

        const columnId = String(fileColumn.id);

        const currentFiles = Array.isArray(row?.values?.[columnId])
          ? row.values[columnId]
          : row?.values?.[columnId]
            ? [row.values[columnId]]
            : [];

        const nextFiles = [...currentFiles, ...uploadedFiles];

        await handleRowValuesChange?.(row.id, {
          ...(row.values || {}),
          [columnId]: nextFiles,
        });

        const updatedRow =
          rows.find((item) => String(item.id) === String(row.id)) || row;

        handleOpenRowCard?.({
          ...updatedRow,
          values: {
            ...(updatedRow.values || {}),
            [columnId]: nextFiles,
          },
        });
      } catch (error) {
        console.error("Ошибка загрузки файла", error);
      }
    };

    input.click();
  };

  const handleDeleteAttachment = async (row, fileToDelete) => {
    if (!row?.id) return;

    const fileColumn = getFileColumn();

    if (!fileColumn) {
      console.error("Файловое поле не найдено");
      return;
    }

    try {
      const columnId = String(fileColumn.id);

      const currentFiles = Array.isArray(row?.values?.[columnId])
        ? row.values[columnId]
        : row?.values?.[columnId]
          ? [row.values[columnId]]
          : [];

      const deleteKey = getFileKey(fileToDelete);

      const nextFiles = currentFiles.filter(
        (file) => String(getFileKey(file)) !== String(deleteKey)
      );

      await handleRowValuesChange?.(row.id, {
        ...(row.values || {}),
        [columnId]: nextFiles,
      });

      const updatedRow =
        rows.find((item) => String(item.id) === String(row.id)) || row;

      handleOpenRowCard?.({
        ...updatedRow,
        values: {
          ...(updatedRow.values || {}),
          [columnId]: nextFiles,
        },
      });
    } catch (error) {
      console.error("Ошибка удаления файла", error);
    }
  };

  return {
    handleUploadAttachment,
    handleDeleteAttachment,
  };
}