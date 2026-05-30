import { getFileName, getFileUrl } from "../../../fieldTypes/file/fileUtils";

export function getAttachmentFileId(file) {
  return (
    file?.stored_file_name ||
    file?.storedFileName ||
    file?.id ||
    file?.fileId ||
    file?.file_id ||
    null
  );
}

export function getAttachmentFileType(file) {
  return (
    file?.fileType ||
    file?.file_type ||
    file?.type ||
    file?.mime_type ||
    file?.mimeType ||
    ""
  );
}

export { getFileName, getFileUrl };
