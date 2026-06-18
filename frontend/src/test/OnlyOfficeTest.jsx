import { DocumentEditor } from "@onlyoffice/document-editor-react";

import {
  API_BASE_URL,
  resolveDockerAccessibleApiUrl,
} from "../config/apiConfig.js";

export default function OnlyOfficeTest() {
  const config = {
    document: {
      fileType: "docx",

      key: "docx_test_static_001",

      title: "Тест.docx",

      url: resolveDockerAccessibleApiUrl(
        `${API_BASE_URL}/files/documents/60f73de6cad74453a7e15a5cb1bd7e61.docx`,
      ),

      permissions: {
        edit: false,
        download: true,
        print: true,
      },
    },

    documentType: "word",

    editorConfig: {
      mode: "view",

      lang: "ru",

      callbackUrl: resolveDockerAccessibleApiUrl(`${API_BASE_URL}/`),

      customization: {
        compactToolbar: true,
        compactHeader: true,
        toolbarHideFileName: false,
      },
    },
  };

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        background: "#FFFFFF",
      }}
    >
      <DocumentEditor
        id="onlyoffice-docx-viewer"
        documentServerUrl="http://localhost:8082"
        config={config}
        width="100%"
        height="100%"
      />
    </div>
  );
}