import docIcon from "../../assets/fileicons/doc.png";
import gifIcon from "../../assets/fileicons/gif.png";
import jpgIcon from "../../assets/fileicons/jpg.png";
import mp3Icon from "../../assets/fileicons/mp3.png";
import pdfIcon from "../../assets/fileicons/pdf.png";
import pngIcon from "../../assets/fileicons/png.png";
import xlsIcon from "../../assets/fileicons/xls.png";
import zipIcon from "../../assets/fileicons/zip.png";

const fileIconMap = {
  pdf: pdfIcon,

  doc: docIcon,
  docx: docIcon,

  xls: xlsIcon,
  xlsx: xlsIcon,
  csv: xlsIcon,

  jpg: jpgIcon,
  jpeg: jpgIcon,

  png: pngIcon,
  gif: gifIcon,

  mp3: mp3Icon,
  wav: mp3Icon,
  m4a: mp3Icon,

  zip: zipIcon,
  rar: zipIcon,
  "7z": zipIcon,
};

export function getFileExtension(fileName = "") {
  if (!fileName || typeof fileName !== "string") return "";

  const cleanName = fileName.split("?")[0].split("#")[0];
  const parts = cleanName.split(".");

  if (parts.length < 2) return "";

  return parts.pop().toLowerCase();
}

export function getFileIconByName(fileName = "") {
  const extension = getFileExtension(fileName);

  return fileIconMap[extension] || docIcon;
}