import { useRef, useState } from "react";

import { uploadIcon } from "../../api/filesApi";
import ObjectTypeIcon from "./ObjectTypeIcon";
import { ICON_FILE_ACCEPT } from "./iconFileUtils";

export default function IconFilePicker({
  iconType,
  iconFileUrl,
  color,
  onChange,
  disabled = false,
  previewClassName = "designer-object-general-icon-preview",
  previewSize = 32,
  chooseLabel = "Выбрать",
}) {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handleUploadIcon = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setUploading(true);

    try {
      const uploaded = await uploadIcon(file);
      onChange?.({
        icon_type: "upload",
        icon_file_url: uploaded.file_url,
      });
    } catch (error) {
      console.error(error);
      window.alert(
        "Не удалось загрузить иконку. Разрешены: SVG, PNG, JPG, JPEG, WEBP",
      );
    } finally {
      setUploading(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="designer-object-general-control-row">
      <ObjectTypeIcon
        iconType={iconType}
        iconFileUrl={iconFileUrl}
        color={color}
        size={previewSize}
        className={previewClassName}
        emptyClassName="is-empty"
      />
      <button
        type="button"
        className="designer-btn designer-object-general-inline-btn"
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled || uploading}
      >
        {uploading ? "Загрузка..." : chooseLabel}
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept={ICON_FILE_ACCEPT}
        onChange={handleUploadIcon}
        style={{ display: "none" }}
      />
    </div>
  );
}
