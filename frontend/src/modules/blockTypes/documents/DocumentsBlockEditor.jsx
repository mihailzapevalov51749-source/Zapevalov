import { useEffect, useState } from "react";

export default function DocumentsBlockEditor({
  block,
  title,
  setTitle,
  showTitle,
  setShowTitle,
  onSave,
  onClose,
  uploadFile,
  styles,
}) {
  const {
    inputStyle,
    checkboxStyle,
    saveButtonStyle,
    smallButtonStyle,
    dangerSmallButtonStyle,
  } = styles;

  const [fileName, setFileName] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    if (!block) return;

    setFileName(block.content?.file_name || "");
    setFileUrl(block.content?.file_url || "");
    setSelectedFile(null);
  }, [block]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    let uploadedUrl = fileUrl;

    if (selectedFile) {
      uploadedUrl = await uploadFile(selectedFile, "document");
    }

    await onSave({
      title,
      content: {
        ...(block.content || {}),
        file_name: fileName,
        file_url: uploadedUrl,
      },
      settings: {
        ...(block.settings || {}),
        show_title: showTitle,
      },
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        color: "#e5f0ff",
      }}
    >
      <div style={headerStyle}>
        <h3 style={titleStyle}>Редактирование документа</h3>

        {onClose && (
          <button type="button" onClick={onClose} style={smallButtonStyle}>
            ×
          </button>
        )}
      </div>

      <Field label="Название">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={inputStyle}
        />
      </Field>

      <label style={checkboxStyle}>
        <input
          type="checkbox"
          checked={showTitle}
          onChange={(e) => setShowTitle(e.target.checked)}
        />
        Показывать название
      </label>

      <Field label="Название файла">
        <input
          value={fileName}
          onChange={(e) => setFileName(e.target.value)}
          style={inputStyle}
        />
      </Field>

      <Field label="Файл">
        <input
          type="file"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;

            setSelectedFile(file);
            setFileName(file.name);
          }}
          style={{ color: "#cbd5e1", fontSize: 12 }}
        />
      </Field>

      {fileUrl && (
        <div style={fileBoxStyle}>
          Текущий файл: {fileUrl}
        </div>
      )}

      {(fileUrl || selectedFile) && (
        <button
          type="button"
          onClick={() => {
            setFileUrl("");
            setSelectedFile(null);
            setFileName("");
          }}
          style={dangerSmallButtonStyle}
        >
          Удалить файл
        </button>
      )}

      <button type="submit" style={saveButtonStyle}>
        Сохранить
      </button>
    </form>
  );
}

function Field({ label, children }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ fontSize: 12, color: "#cbd5e1" }}>{label}</span>
      {children}
    </label>
  );
}

const headerStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
};

const titleStyle = {
  margin: 0,
  fontSize: 14,
  fontWeight: 700,
  color: "#fff",
};

const fileBoxStyle = {
  padding: 10,
  borderRadius: 8,
  background: "#0f1b2d",
  border: "1px solid #24364f",
  color: "#94a3b8",
  fontSize: 12,
  overflowWrap: "anywhere",
};