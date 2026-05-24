import { DocumentEditor } from "@onlyoffice/document-editor-react";

function getFileExtensionFromValue(value = "") {
  const clean = String(value || "")
    .toLowerCase()
    .split("?")[0]
    .split("#")[0];

  const parts = clean.split(".");

  if (parts.length < 2) return "";

  return parts.pop();
}

function getFileExtension(fileName = "", fileUrl = "") {
  return (
    getFileExtensionFromValue(fileName) ||
    getFileExtensionFromValue(fileUrl)
  );
}

function getDocumentType(fileType = "") {
  if (fileType === "pdf") return "pdf";

  if (["doc", "docx", "odt", "rtf", "txt"].includes(fileType)) {
    return "word";
  }

  if (["xls", "xlsx", "ods", "csv"].includes(fileType)) {
    return "cell";
  }

  if (["ppt", "pptx", "odp"].includes(fileType)) {
    return "slide";
  }

  return "word";
}

function normalizeOfficeUrl(fileUrl = "") {
  if (!fileUrl) return "";

  return fileUrl
    .replace("http://127.0.0.1:8010", "http://host.docker.internal:8010")
    .replace("http://localhost:8010", "http://host.docker.internal:8010");
}

function createDocumentKey(fileUrl = "", fileName = "") {
  const source = `${fileUrl}_${fileName}`;

  let hash = 0;

  for (let index = 0; index < source.length; index += 1) {
    hash = (hash << 5) - hash + source.charCodeAt(index);
    hash |= 0;
  }

  return `yasnopro_${Math.abs(hash)}_${Date.now()}`;
}

export default function OfficeViewer({
  fileUrl,
  fileName = "Документ",
  userId = "1",
  userName = "Михаил",
  mode = "view",
}) {
  const fileType = getFileExtension(fileName, fileUrl);
  const documentType = getDocumentType(fileType);
  const normalizedUrl = normalizeOfficeUrl(fileUrl);

  if (!normalizedUrl || !fileType) {
    return (
      <div style={{ padding: 20, color: "#475569" }}>
        Не удалось определить файл для просмотра.
      </div>
    );
  }

  const safeFileName =
    fileName && getFileExtensionFromValue(fileName)
      ? fileName
      : `Документ.${fileType}`;

  const documentKey = createDocumentKey(normalizedUrl, safeFileName);

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: 132,
          height: 34,
          background: "#F3F3F3",
          zIndex: 10,
          pointerEvents: "none",
        }}
      />

      <DocumentEditor
        id={`office-viewer-${documentKey}`}
        documentServerUrl="http://localhost:8082"
        config={{
          document: {
            fileType,
            key: documentKey,
            title: safeFileName,
            url: normalizedUrl,
            permissions: {
              edit: mode === "edit" && fileType !== "pdf",
              download: true,
              print: true,
              comment: false,
              chat: false,
            },
          },
          documentType,
          editorConfig: {
            mode: fileType === "pdf" ? "view" : mode,
            lang: "ru",
            user: {
              id: String(userId || "1"),
              name: userName || "Пользователь",
            },
            customization: {
              compactHeader: true,
              compactToolbar: true,
              toolbarHideFileName: false,
              comments: false,
              chat: false,
              logo: {
                visible: false,
              },
              about: false,
              feedback: false,
              help: false,
            },
          },
        }}
        width="100%"
        height="100%"
      />
    </div>
  );
}