import OfficeViewer from "./OfficeViewer";

function normalizeExtension(value = "") {
  const clean = String(value || "").toLowerCase().trim();

  if (!clean) return "";

  if (clean.includes("/")) {
    if (clean.includes("pdf")) return "pdf";

    if (
      clean.includes("wordprocessingml") ||
      clean.includes("officedocument.word") ||
      clean.includes("msword")
    ) {
      return clean.includes("msword") ? "doc" : "docx";
    }

    if (
      clean.includes("spreadsheetml") ||
      clean.includes("officedocument.spreadsheet") ||
      clean.includes("ms-excel") ||
      clean.includes("excel")
    ) {
      return clean.includes("ms-excel") ? "xls" : "xlsx";
    }

    if (
      clean.includes("presentationml") ||
      clean.includes("officedocument.presentation") ||
      clean.includes("ms-powerpoint") ||
      clean.includes("powerpoint")
    ) {
      return clean.includes("ms-powerpoint") ? "ppt" : "pptx";
    }

    if (clean.includes("png")) return "png";
    if (clean.includes("jpeg")) return "jpg";
    if (clean.includes("jpg")) return "jpg";
    if (clean.includes("gif")) return "gif";
    if (clean.includes("webp")) return "webp";
    if (clean.includes("svg")) return "svg";
  }

  return clean.replace(".", "");
}

function getExtension(fileType = "", fileName = "", fileUrl = "") {
  const normalizedFileType = normalizeExtension(fileType);

  if (normalizedFileType) return normalizedFileType;

  const sources = [fileName, fileUrl].filter(Boolean);

  for (const source of sources) {
    const clean = String(source).split("?")[0].split("#")[0];
    const parts = clean.split(".");

    if (parts.length > 1) {
      return parts.pop().toLowerCase();
    }
  }

  return "";
}

export default function FileViewer({
  fileUrl,
  fileName,
  fileType,
  userId,
  userName,
  mode = "view",
}) {
  const extension = getExtension(fileType, fileName, fileUrl);

  const officeExtensions = [
    "doc",
    "docx",
    "xls",
    "xlsx",
    "ppt",
    "pptx",
    "pdf",
  ];

  if (officeExtensions.includes(extension)) {
    return (
      <OfficeViewer
        fileUrl={fileUrl}
        fileName={fileName}
        userId={userId}
        userName={userName}
        mode={extension === "pdf" ? "view" : mode}
      />
    );
  }

  if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(extension)) {
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          overflow: "auto",
          background: "#F8FAFC",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          boxSizing: "border-box",
        }}
      >
        <img
          src={fileUrl}
          alt={fileName}
          style={{
            maxWidth: "100%",
            maxHeight: "100%",
            objectFit: "contain",
            borderRadius: 12,
          }}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 16,
        color: "#475569",
        background: "#FFFFFF",
      }}
    >
      Не удалось определить файл для просмотра.
    </div>
  );
}