import { useState } from "react";

import {
  getLegacyStorageExistingSupportMessage,
  LEGACY_STORAGE_EXISTING_SUPPORT_TITLE,
} from "../legacyStorageExistingMessages";
import LegacyStorageSupportModeBoundary from "../support/LegacyStorageSupportModeBoundary";

import "../styles/legacyStoragePlaceholder.css";

function resolveBlockDisplayTitle(block) {
  const title = String(block?.title || block?.name || "").trim();
  return title || "Legacy storage block";
}

function EditModeShell({ block, onPreview }) {
  return (
    <div
      className="legacy-storage-placeholder legacy-storage-placeholder--edit-shell"
      data-legacy-storage-placeholder="edit-shell"
    >
      <p className="legacy-storage-placeholder__title">
        {resolveBlockDisplayTitle(block)}
      </p>
      <p className="legacy-storage-placeholder__subtitle">
        {LEGACY_STORAGE_EXISTING_SUPPORT_TITLE}
      </p>
      <p className="legacy-storage-placeholder__message">
        Режим поддержки старого контура.
        {"\n"}
        {getLegacyStorageExistingSupportMessage()}
      </p>
      <div className="legacy-storage-placeholder__actions">
        <button
          type="button"
          className="legacy-storage-placeholder__button"
          onClick={onPreview}
        >
          Предпросмотр legacy-таблицы
        </button>
      </div>
    </div>
  );
}

/**
 * Placeholder boundary for existing legacy Universal Table storage blocks.
 * Replaces direct UniversalTableView mapping in blockRegistry.
 */
export default function LegacyStorageBlockPlaceholderView({
  block,
  isEditMode = false,
  embeddedInCanvas = false,
  onEdit,
  onDelete,
  onBlockUpdated,
  tableRepresentationProps,
}) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const inEditMode = Boolean(isEditMode);
  const shouldMountSupport = !inEditMode || isPreviewOpen;

  const supportProps = {
    block,
    isEditMode,
    embeddedInCanvas,
    onEdit,
    onDelete,
    onBlockUpdated,
    tableRepresentationProps,
  };

  if (!shouldMountSupport) {
    return (
      <EditModeShell
        block={block}
        onPreview={() => setIsPreviewOpen(true)}
      />
    );
  }

  return (
    <div
      className="legacy-storage-placeholder legacy-storage-placeholder--support"
      data-legacy-storage-placeholder="support"
    >
      {inEditMode && isPreviewOpen ? (
        <div
          className="legacy-storage-placeholder__actions"
          style={{ flex: "0 0 auto", padding: "8px 8px 0" }}
        >
          <button
            type="button"
            className="legacy-storage-placeholder__button"
            onClick={() => setIsPreviewOpen(false)}
          >
            Свернуть предпросмотр
          </button>
        </div>
      ) : null}

      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
        <LegacyStorageSupportModeBoundary {...supportProps} />
      </div>
    </div>
  );
}
