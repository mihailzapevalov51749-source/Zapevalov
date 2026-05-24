import { buildFileUrl } from "../../files/api/filesApi";

import docIcon from "../../../assets/fileicons/doc.png";
import gifIcon from "../../../assets/fileicons/gif.png";
import jpgIcon from "../../../assets/fileicons/jpg.png";
import mp3Icon from "../../../assets/fileicons/mp3.png";
import pdfIcon from "../../../assets/fileicons/pdf.png";
import pngIcon from "../../../assets/fileicons/png.png";
import rarIcon from "../../../assets/fileicons/rar.png";
import xlsIcon from "../../../assets/fileicons/xls.png";
import zipIcon from "../../../assets/fileicons/zip.png";

export function normalizeFiles(value) {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);

      if (Array.isArray(parsed)) {
        return parsed.filter(Boolean);
      }

      if (parsed && typeof parsed === "object") {
        return [parsed];
      }
    } catch {
      return [
        {
          name: value,
          url: value,
        },
      ];
    }
  }

  if (typeof value === "object") {
    return [value];
  }

  return [];
}

export function getFileName(file) {
  if (!file) return "Файл";

  if (typeof file === "string") {
    return file;
  }

  return (
    file.file_name ||
    file.fileName ||
    file.filename ||
    file.originalName ||
    file.original_name ||
    file.name ||
    file.title ||
    "Файл"
  );
}

export function getFileSize(file) {
  const rawSize =
    file?.size ||
    file?.fileSize ||
    file?.file_size ||
    file?.size_bytes ||
    file?.sizeBytes ||
    null;

  if (!rawSize) return "—";

  const size = Number(rawSize);

  if (Number.isNaN(size)) return String(rawSize);

  if (size < 1024) return `${size} Б`;

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} КБ`;
  }

  return `${(size / 1024 / 1024).toFixed(1)} МБ`;
}

export function getFileUrl(file) {
  if (!file) return "";

  if (typeof file === "string") {
    return buildFileUrl(file);
  }

  const rawUrl =
    file.url ||
    file.fileUrl ||
    file.file_url ||
    file.downloadUrl ||
    file.download_url ||
    "";

  return buildFileUrl(rawUrl);
}

export function getFileExtension(file) {
  const fileName = getFileName(file);

  const extension = String(fileName).split(".").pop()?.toLowerCase();

  if (!extension || extension === fileName) {
    return "";
  }

  return extension;
}

export function getFileIcon(file) {
  const extension = getFileExtension(file);

  if (extension === "pdf") return pdfIcon;

  if (["doc", "docx", "rtf"].includes(extension)) return docIcon;

  if (["xls", "xlsx", "csv"].includes(extension)) return xlsIcon;

  if (extension === "jpg" || extension === "jpeg") return jpgIcon;

  if (extension === "png") return pngIcon;

  if (extension === "gif") return gifIcon;

  if (["zip", "7z"].includes(extension)) return zipIcon;

  if (extension === "rar") return rarIcon;

  if (["mp3", "wav", "ogg"].includes(extension)) return mp3Icon;

  return docIcon;
}