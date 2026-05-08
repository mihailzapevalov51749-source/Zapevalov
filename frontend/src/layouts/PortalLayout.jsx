import LeftSidebar from "../modules/navigation/components/LeftSidebar";

export default function PortalLayout({
  navigation,
  activePageId,
  onSelectPage,
  onEnterEditMode,
  reloadNavigation,
  sidebarWidth,
  menuScale,
  onChangeMenuScale,
  children,
}) {
  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        minHeight: "100vh",
        maxHeight: "100vh",
        background: "#f1f5f9",
        overflow: "hidden",
        boxSizing: "border-box",
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
          right: 0,
          bottom: 0,
          height: "100vh",
          minHeight: 0,
          background: "#f1f5f9",
          overflow: "hidden",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            flex: 1,
            minHeight: 0,
            width: "100%",
            overflow: "hidden",
            boxSizing: "border-box",
          }}
        >
          {children}
        </div>
      </main>
    </div>
  );
}