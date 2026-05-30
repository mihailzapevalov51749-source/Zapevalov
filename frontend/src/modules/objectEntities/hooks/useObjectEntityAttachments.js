import { useCallback, useMemo, useState } from "react";

import { getApiErrorMessage } from "../../designer/api/platformApiClient";
import { runtimeWriteGateway } from "../../runtimeWriteGateway";
import { uploadFile } from "../../../shared/files/api/filesApi";
import { collectAttachmentFiles } from "../../../shared/files/attachments/utils/collectAttachmentFiles";
import { getFileFieldsFromCatalog } from "../services/getFileFieldsFromCatalog";

function getFileKey(file) {
  return (
    file?.id ||
    file?.fileId ||
    file?.file_id ||
    file?.stored_file_name ||
    file?.storedFileName ||
    file?.file_url ||
    file?.fileUrl
  );
}

/**
 * Runtime entity file-field attachments (values patch via Runtime Entity API).
 */
export default function useObjectEntityAttachments({
  tenantId = null,
  objectTypeKey = null,
  catalog = null,
  entity = null,
  onEntityUpdated = null,
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const entityId = String(entity?.id || "").trim();
  const entityValues =
    entity?.values && typeof entity.values === "object" ? entity.values : {};

  const fileFields = useMemo(
    () => getFileFieldsFromCatalog(catalog, objectTypeKey),
    [catalog, objectTypeKey],
  );

  const attachments = useMemo(
    () => collectAttachmentFiles(entityValues, fileFields),
    [entityValues, fileFields],
  );

  const primaryFileField = fileFields[0] || null;

  const patchEntityValues = useCallback(
    async (nextValues) => {
      if (!tenantId || !objectTypeKey || !entityId) {
        setError("Не задан контекст объекта");
        return null;
      }

      setSubmitting(true);
      setError("");

      try {
        const updated = await runtimeWriteGateway.updateEntity({
          tenantId,
          objectTypeKey,
          entityId,
          values: nextValues,
        });

        await onEntityUpdated?.(updated);
        return updated;
      } catch (err) {
        setError(getApiErrorMessage(err, "Не удалось обновить вложения"));
        return null;
      } finally {
        setSubmitting(false);
      }
    },
    [tenantId, objectTypeKey, entityId, onEntityUpdated],
  );

  const uploadAttachments = useCallback(async () => {
    if (!primaryFileField) {
      setError("В типе объекта нет файлового поля для вложений");
      return;
    }

    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;

    input.onchange = async (event) => {
      const selectedFiles = Array.from(event.target.files || []);

      if (!selectedFiles.length) {
        return;
      }

      try {
        const uploadedFiles = [];

        for (const file of selectedFiles) {
          const uploaded = await uploadFile({ file });

          if (uploaded) {
            uploadedFiles.push({
              ...uploaded,
              owner_entity_type: "runtime_entity",
              owner_entity_id: entityId,
            });
          }
        }

        if (!uploadedFiles.length) {
          return;
        }

        const fieldKey = primaryFileField.key;
        const currentFiles = collectAttachmentFiles(
          { [fieldKey]: entityValues[fieldKey] },
          [{ key: fieldKey }],
        );

        const nextFiles = [...currentFiles, ...uploadedFiles];

        await patchEntityValues({
          ...entityValues,
          [fieldKey]: nextFiles,
        });
      } catch (err) {
        console.error("Ошибка загрузки вложения:", err);
        setError(getApiErrorMessage(err, "Не удалось загрузить файл"));
      }
    };

    input.click();
  }, [primaryFileField, entityValues, entityId, patchEntityValues]);

  const deleteAttachment = useCallback(
    async (fileToDelete) => {
      const fieldKey =
        fileToDelete?.__fieldKey || primaryFileField?.key || null;

      if (!fieldKey) {
        return;
      }

      const deleteKey = getFileKey(fileToDelete);
      const currentFiles = collectAttachmentFiles(
        { [fieldKey]: entityValues[fieldKey] },
        [{ key: fieldKey }],
      );

      const nextFiles = currentFiles.filter(
        (file) => String(getFileKey(file)) !== String(deleteKey),
      );

      await patchEntityValues({
        ...entityValues,
        [fieldKey]: nextFiles.length ? nextFiles : null,
      });
    },
    [entityValues, primaryFileField, patchEntityValues],
  );

  return {
    attachments,
    fileFields,
    canUpload: Boolean(primaryFileField) && !submitting,
    uploadDisabledHint: primaryFileField
      ? ""
      : "Добавьте файловое поле в тип объекта",
    submitting,
    error,
    uploadAttachments,
    deleteAttachment,
  };
}
