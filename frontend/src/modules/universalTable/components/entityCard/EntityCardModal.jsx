import { useEffect, useMemo } from "react";
import { createPortal } from "react-dom";

import EntityCardView from "./EntityCardView";

import {
  entityCardOverlayStyle,
  entityCardModalStyle,
} from "./styles/entityCardModalStyles";

function normalizeInitialContext(initialContext) {
  if (!initialContext) return null;

  const type = String(
    initialContext?.type || ""
  ).trim();

  const tab =
    initialContext?.tab ||
    (type === "card_note"
      ? "notes"
      : type === "card_attachment_file"
      ? "attachments"
      : "comments");

  return {
    ...initialContext,
    tab,
  };
}

function normalizePublishedRuntimeRef(rawRef) {
  if (!rawRef || typeof rawRef !== "object") return null;

  const objectTypeKey =
    typeof rawRef.object_type_key === "string"
      ? rawRef.object_type_key
      : typeof rawRef.objectTypeKey === "string"
      ? rawRef.objectTypeKey
      : null;

  const runtimeEntityId =
    typeof rawRef.runtime_entity_id === "string"
      ? rawRef.runtime_entity_id
      : typeof rawRef.runtimeEntityId === "string"
      ? rawRef.runtimeEntityId
      : null;

  if (!objectTypeKey || !runtimeEntityId) return null;

  return {
    object_type_key: objectTypeKey,
    runtime_entity_id: runtimeEntityId,
    runtime_route:
      typeof rawRef.runtime_route === "string"
        ? rawRef.runtime_route
        : typeof rawRef.runtimeRoute === "string"
        ? rawRef.runtimeRoute
        : null,
    view_key:
      typeof rawRef.view_key === "string"
        ? rawRef.view_key
        : typeof rawRef.viewKey === "string"
        ? rawRef.viewKey
        : null,
    catalog_version:
      typeof rawRef.catalog_version === "string"
        ? rawRef.catalog_version
        : typeof rawRef.catalogVersion === "string"
        ? rawRef.catalogVersion
        : null,
  };
}

export default function EntityCardModal({
  row,
  rows = [],
  columns = [],
  table,
  onClose,
  onBack,
  initialContext = null,
  onOpenParent,
  onOpenRelatedRow,
  onOpenFile,
  onUploadAttachment,
  onDeleteAttachment,
  onSaveCardSettings,
  onUpdateRowField,
}) {
  const normalizedContext = useMemo(() => {
    return normalizeInitialContext(
      initialContext
    );
  }, [initialContext]);

  const publishedRuntimeRef = useMemo(() => {
    const fromContext = normalizePublishedRuntimeRef(
      normalizedContext?.published_runtime_ref
    );
    if (fromContext) return fromContext;

    return normalizePublishedRuntimeRef(row);
  }, [normalizedContext, row]);

  useEffect(() => {
    if (!row) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose?.();
      }
    };

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [row, onClose]);

  useEffect(() => {
    if (!normalizedContext) return;

    console.log(
      "ENTITY CARD INITIAL CONTEXT:",
      normalizedContext
    );
  }, [normalizedContext]);

  if (!row) return null;

  return createPortal(
    <div
      style={entityCardOverlayStyle}
      onMouseDown={onClose}
    >
      <div
        style={entityCardModalStyle}
        onMouseDown={(event) =>
          event.stopPropagation()
        }
      >
        <EntityCardView
          row={row}
          rows={rows}
          table={table}
          columns={columns}
          onClose={onClose}
          onBack={onBack}
          initialContext={normalizedContext}
          publishedRuntimeRef={publishedRuntimeRef}
          onOpenParent={onOpenParent}
          onOpenRelatedRow={onOpenRelatedRow}
          onOpenFile={onOpenFile}
          onUploadAttachment={
            onUploadAttachment
          }
          onDeleteAttachment={
            onDeleteAttachment
          }
          onSaveCardSettings={
            onSaveCardSettings
          }
          onUpdateRowField={
            onUpdateRowField
          }
        />
      </div>
    </div>,
    document.body
  );
}