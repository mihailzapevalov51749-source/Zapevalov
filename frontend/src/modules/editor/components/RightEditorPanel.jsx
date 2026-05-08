import { useState } from "react";

import WidgetLibrary from "./WidgetLibrary";
import ThemeEditor from "./ThemeEditor";
import BlockEditorModal from "../../blocks/components/BlockEditorModal";
import SectionEditorModal from "../../sections/components/SectionEditorModal";

const DEFAULT_WIDTH = 360;

export default function RightEditorPanel({
  topOffset = 64,
  width = DEFAULT_WIDTH,
  onAddSection,
  onAddBlock,
  theme,
  onChangeTheme,

  selectedBlock,
  onSaveBlock,
  onCloseBlockEditor,

  selectedSection,
  onSaveSection,
  onCloseSectionEditor,
}) {
  const [activeTab, setActiveTab] = useState("widgets");

  const hasSelectedEditor = selectedBlock || selectedSection;

  return (
    <aside
      style={{
        width,
        height: `calc(100vh - ${topOffset}px)`,
        position: "fixed",
        right: 0,
        top: topOffset,
        background: "#0f1b2d",
        overflowY: "auto",
        boxSizing: "border-box",
        padding: 14,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {hasSelectedEditor ? (
        <PanelCard>
          {selectedBlock && (
            <BlockEditorModal
              block={selectedBlock}
              onSave={onSaveBlock}
              onClose={onCloseBlockEditor}
            />
          )}

          {selectedSection && (
            <SectionEditorModal
              section={selectedSection}
              onSave={onSaveSection}
              onClose={onCloseSectionEditor}
            />
          )}
        </PanelCard>
      ) : (
        <>
          <div
            style={{
              display: "flex",
              padding: 8,
              gap: 8,
              border: "1px solid #24364f",
              borderRadius: 14,
              background: "#0b1626",
              marginBottom: 18,
            }}
          >
            <Tab
              active={activeTab === "widgets"}
              onClick={() => setActiveTab("widgets")}
            >
              Виджеты
            </Tab>

            <Tab
              active={activeTab === "theme"}
              onClick={() => setActiveTab("theme")}
            >
              Тема
            </Tab>
          </div>

          <PanelCard>
            {activeTab === "widgets" && (
              <WidgetLibrary
                onAddSection={onAddSection}
                onAddBlock={onAddBlock}
              />
            )}

            {activeTab === "theme" && (
              <ThemeEditor theme={theme} onChangeTheme={onChangeTheme} />
            )}
          </PanelCard>
        </>
      )}
    </aside>
  );
}

function PanelCard({ children }) {
  return (
    <div
      style={{
        border: "1px solid #24364f",
        borderRadius: 14,
        background: "#16243a",
        padding: 14,
      }}
    >
      {children}
    </div>
  );
}

function Tab({ children, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1,
        height: 52,
        borderRadius: 10,
        border: active ? "1px solid #3b82f6" : "1px solid transparent",
        background: active ? "#1e3a5f" : "transparent",
        color: "#e5f0ff",
        cursor: "pointer",
        fontSize: 12,
        fontWeight: 800,
      }}
    >
      {children}
    </button>
  );
}