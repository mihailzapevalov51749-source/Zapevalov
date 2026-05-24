import { useEffect, useState } from "react";

import BlockEditorModal from "../../modules/blocks/components/BlockEditorModal";
import SectionEditorModal from "../../modules/sections/components/SectionEditorModal";

import {
  popoverOverlayStyle,
  popoverStyle,
} from "../../modules/comments/styles/commentPopoverStyles";

const PANEL_WIDTH = 320;
const PANEL_MAX_HEIGHT = 480;
const VIEWPORT_PADDING = 12;

function getAnchorRect({ blockId, sectionId }) {
  if (blockId) {
    const element = document.querySelector(
      `[data-block-host-id="${blockId}"]`
    );

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

function getPanelPosition(anchorRect) {
  if (!anchorRect) {
    return {
      top: VIEWPORT_PADDING,
      left: VIEWPORT_PADDING,
    };
  }

  let left = anchorRect.right + 12;
  let top = anchorRect.top;

  if (left + PANEL_WIDTH > window.innerWidth - VIEWPORT_PADDING) {
    left = Math.max(
      VIEWPORT_PADDING,
      anchorRect.left - PANEL_WIDTH - 12
    );
  }

  const maxTop = window.innerHeight - PANEL_MAX_HEIGHT - VIEWPORT_PADDING;

  top = Math.min(Math.max(VIEWPORT_PADDING, top), maxTop);

  return { top, left };
}

export default function CanvasInlineEditor({
  selectedBlock,
  selectedSection,
  onSaveBlock,
  onCloseBlockEditor,
  onSaveSection,
  onCloseSectionEditor,
}) {
  const [position, setPosition] = useState({ top: 12, left: 12 });

  const isOpen = Boolean(selectedBlock || selectedSection);

  useEffect(() => {
    if (!isOpen) return;

    function updatePosition() {
      const anchorRect = getAnchorRect({
        blockId: selectedBlock?.id,
        sectionId: selectedSection?.id,
      });

      setPosition(getPanelPosition(anchorRect));
    }

    updatePosition();

    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen, selectedBlock?.id, selectedSection?.id]);

  if (!isOpen) return null;

  return (
    <>
      <div
        style={popoverOverlayStyle}
        onMouseDown={() => {
          onCloseBlockEditor?.();
          onCloseSectionEditor?.();
        }}
      />

      <div
        style={{
          ...popoverStyle,
          top: position.top,
          left: position.left,
          width: PANEL_WIDTH,
          maxHeight: PANEL_MAX_HEIGHT,
          padding: 14,
          background: "#0f1b2d",
          border: "1px solid #24364f",
        }}
        onMouseDown={(event) => event.stopPropagation()}
      >
        {selectedBlock ? (
          <BlockEditorModal
            block={selectedBlock}
            onSave={onSaveBlock}
            onClose={onCloseBlockEditor}
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
    </>
  );
}
