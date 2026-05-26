import { useMemo } from "react";

import BlockEditorModal from "../../modules/blocks/components/BlockEditorModal";
import SectionEditorModal from "../../modules/sections/components/SectionEditorModal";

import useDraggablePanel, {
  getDefaultPanelLayout,
} from "../hooks/useDraggablePanel";

function getAnchorRect({ blockId, sectionId }) {
  if (blockId) {
    const element = document.querySelector(`[data-block-host-id="${blockId}"]`);

    if (element) {
      return element.getBoundingClientRect();
    }
  }

  if (sectionId) {
    const element = document.querySelector(
      `[data-section-host-id="${sectionId}"]`
    );

    if (element) {
      return element.getBoundingClientRect();
    }
  }

  return null;
}

export default function BlockSettingsModal({
  selectedBlock,
  selectedSection,
  onSaveBlock,
  onPatchBlock,
  onCloseBlockEditor,
  onRemoveBlockFromSection,
  onSaveSection,
  onCloseSectionEditor,
}) {
  const isOpen = Boolean(selectedBlock || selectedSection);

  const anchorRect = useMemo(() => {
    if (!isOpen) return null;

    return getAnchorRect({
      blockId: selectedBlock?.id,
      sectionId: selectedSection?.id,
    });
  }, [isOpen, selectedBlock?.id, selectedSection?.id]);

  const storageKey = selectedBlock
    ? `yasnopro-block-settings-modal-${selectedBlock.id}`
    : selectedSection
      ? `yasnopro-section-settings-modal-${selectedSection.id}`
      : null;

  const defaultLayout = useMemo(
    () =>
      getDefaultPanelLayout({
        anchorRect,
        width: 360,
        height: 480,
      }),
    [anchorRect]
  );

  const {
    panelRef,
    layout,
    handleHeaderPointerDown,
    handleResizePointerDown,
  } = useDraggablePanel({
    storageKey,
    isOpen,
    defaultWidth: defaultLayout.width,
    defaultHeight: defaultLayout.height,
    anchorRect,
  });

  if (!isOpen) return null;

  const title = selectedBlock
    ? `Настройки блока`
    : selectedSection
      ? `Настройки раздела`
      : "";

  return (
    <div
      ref={panelRef}
      data-block-settings-modal="true"
      onMouseDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
      style={{
        position: "fixed",
        top: layout.top,
        left: layout.left,
        width: layout.width,
        height: layout.height,
        zIndex: 10040,
        display: "flex",
        flexDirection: "column",
        background: "#0f1b2d",
        border: "1px solid #24364f",
        borderRadius: 12,
        boxShadow: "0 18px 48px rgba(15, 23, 42, 0.28)",
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      <div
        onPointerDown={handleHeaderPointerDown}
        style={{
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: "10px 12px",
          borderBottom: "1px solid #24364f",
          cursor: "grab",
          userSelect: "none",
          background: "#16243a",
        }}
      >
        <span
          style={{
            fontSize: 13,
            fontWeight: 800,
            color: "#e5f0ff",
          }}
        >
          {title}
        </span>

        <button
          type="button"
          onClick={() => {
            onCloseBlockEditor?.();
            onCloseSectionEditor?.();
          }}
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            border: "1px solid #334155",
            background: "#0f1b2d",
            color: "#ffffff",
            cursor: "pointer",
          }}
        >
          ×
        </button>
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflow: "auto",
          padding: 14,
          boxSizing: "border-box",
        }}
      >
        {selectedBlock ? (
          <BlockEditorModal
            block={selectedBlock}
            onSave={onSaveBlock}
            onPatchBlock={onPatchBlock}
            onClose={onCloseBlockEditor}
            onRemoveFromSection={onRemoveBlockFromSection}
          />
        ) : null}

        {selectedSection ? (
          <SectionEditorModal
            section={selectedSection}
            onSave={onSaveSection}
            onClose={onCloseSectionEditor}
          />
        ) : null}
      </div>

      <div
        data-panel-resize-handle="true"
        onPointerDown={handleResizePointerDown}
        title="Изменить размер"
        style={{
          position: "absolute",
          right: 0,
          bottom: 0,
          width: 16,
          height: 16,
          cursor: "nwse-resize",
          zIndex: 2,
        }}
      />
    </div>
  );
}
