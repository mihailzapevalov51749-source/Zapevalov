import LeftSidebar from "../modules/navigation/components/LeftSidebar";
import RightEditorPanel from "../modules/editor/components/RightEditorPanel";

const RIGHT_PANEL_WIDTH = 320;

export default function EditorLayout({
  navigation,
  activePageId,
  onSelectPage,
  onExitEditMode,
  reloadNavigation,
  sidebarWidth,
  menuScale,
  onChangeMenuScale,
  onAddSection,
  onAddBlock,

  selectedBlock,
  onSaveBlock,
  onCloseBlockEditor,

  selectedSection,
  onSaveSection,
  onCloseSectionEditor,

  children,
}) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f1f5f9",
      }}
    >
      <LeftSidebar
        items={navigation}
        activePageId={activePageId}
        onSelectPage={onSelectPage}
        topOffset={0}
        width={sidebarWidth}
        portalId={1}
        reloadNavigation={reloadNavigation}
        menuScale={menuScale}
        onChangeMenuScale={onChangeMenuScale}
      />

      <main
        style={{
          position: "fixed",
          top: 0,
          left: sidebarWidth,
          right: RIGHT_PANEL_WIDTH,
          bottom: 0,
          background: "#f1f5f9",
          overflow: "hidden",
          boxSizing: "border-box",
        }}
      >
        {children}
      </main>

      <RightEditorPanel
        topOffset={0}
        width={RIGHT_PANEL_WIDTH}
        onAddSection={onAddSection}
        onAddBlock={onAddBlock}
        selectedBlock={selectedBlock}
        onSaveBlock={onSaveBlock}
        onCloseBlockEditor={onCloseBlockEditor}
        selectedSection={selectedSection}
        onSaveSection={onSaveSection}
        onCloseSectionEditor={onCloseSectionEditor}
        onExitEditMode={onExitEditMode}
      />
    </div>
  );
}