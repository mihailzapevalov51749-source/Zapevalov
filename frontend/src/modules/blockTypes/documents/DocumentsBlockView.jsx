const API_BASE_URL = "http://127.0.0.1:8010";

export default function DocumentsBlockView({ block, isEditMode, onEdit }) {
  const documents =
    block.content?.documents || normalizeSingleDocument(block.content) || [];

  const handleEdit = (event) => {
    if (!isEditMode) return;

    event.preventDefault();
    event.stopPropagation();

    onEdit?.(block);
  };

  const DragHandle = () => (
    <div
      data-block-drag-handle="true"
      title="Переместить документ"
      style={{
        position: "absolute",
        left: 0,
        top: 4,
        width: 10,
        height: 18,
        display: "grid",
        gridTemplateColumns: "repeat(2, 2px)",
        gridTemplateRows: "repeat(3, 2px)",
        gap: 2,
        alignItems: "center",
        justifyContent: "center",
        cursor: "grab",
        opacity: 0.5,
        zIndex: 5,
      }}
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <span
          key={i}
          style={{
            width: 2,
            height: 2,
            borderRadius: "50%",
            background: "#64748b",
            pointerEvents: "none",
          }}
        />
      ))}
    </div>
  );

  return (
    <div
      data-document-block-content="true"
      onClick={handleEdit}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 4,
        width: "100%",
        height: "100%",
        position: "relative",
        paddingLeft: isEditMode ? 16 : 0,
        boxSizing: "border-box",
        cursor: "default",
      }}
    >
      {isEditMode && <DragHandle />}

      {documents.length > 0 ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          {documents.map((doc, index) => {
            const href = getFileSrc(doc.url || doc.file_url || doc.fileUrl);

            const fileName =
              doc.name ||
              doc.file_name ||
              doc.fileName ||
              block.content?.file_name ||
              block.content?.fileName ||
              `Документ ${index + 1}`;

            const displayName =
              block.settings?.show_title !== false
                ? block.title || doc.title || doc.label || fileName
                : fileName;

            const type = getFileType(fileName);

            return (
              <a
                key={`${href}-${index}`}
                data-document-block-content="true"
                href={isEditMode ? undefined : href}
                target={isEditMode ? undefined : "_blank"}
                rel={isEditMode ? undefined : "noreferrer"}
                onClick={(event) => {
                  if (isEditMode) {
                    event.preventDefault();
                    event.stopPropagation();
                    onEdit?.(block);
                  }
                }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 3,
                  width: "fit-content",
                  maxWidth: "100%",
                  padding: "2px 0",
                  textDecoration: "none",
                  color: "#0f172a",
                  fontSize: 14,
                  fontWeight: 600,
                  lineHeight: 1.2,
                  cursor: isEditMode ? "default" : "pointer",
                }}
              >
                <FileIcon type={type} />

                <span
                  style={{
                    minWidth: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {displayName}
                </span>
              </a>
            );
          })}
        </div>
      ) : (
        <div
          data-document-block-content="true"
          onClick={handleEdit}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
            color: "#64748b",
            fontSize: 14,
            lineHeight: 1.35,
            cursor: isEditMode ? "pointer" : "default",
          }}
        >
          <span>
            {block.settings?.show_title !== false && block.title
              ? block.title
              : "Документы не выбраны"}
          </span>
        </div>
      )}
    </div>
  );
}

function FileIcon({ type }) {
  const srcMap = {
    pdf: "/file-icons/pdf.png",
    doc: "/file-icons/doc.png",
    xls: "/file-icons/xls.png",
    ppt: "/file-icons/ppt.png",
    file: "/file-icons/file.png",
  };

  return (
    <img
      src={srcMap[type] || srcMap.file}
      alt=""
      style={{
        width: 24,
        height: 24,
        flexShrink: 0,
      }}
    />
  );
}

function normalizeSingleDocument(content) {
  if (!content?.file_url && !content?.fileUrl) return null;

  return [
    {
      name: content.file_name || content.fileName || "Документ",
      url: content.file_url || content.fileUrl,
      title: content.title,
      label: content.label,
    },
  ];
}

function getFileType(fileName = "") {
  const ext = fileName.split(".").pop()?.toLowerCase();

  if (["doc", "docx"].includes(ext)) return "doc";
  if (["xls", "xlsx"].includes(ext)) return "xls";
  if (ext === "pdf") return "pdf";
  if (["ppt", "pptx"].includes(ext)) return "ppt";

  return "file";
}

function getFileSrc(fileUrl) {
  if (!fileUrl) return "";
  if (fileUrl.startsWith("http")) return fileUrl;
  return `${API_BASE_URL}${fileUrl}`;
}