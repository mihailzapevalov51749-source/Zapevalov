import { uploadFile } from "../shared/files/api/filesApi";

export async function uploadIcon(file) {
  return uploadFile({ file, endpoint: "/files/upload-icon" });
}
