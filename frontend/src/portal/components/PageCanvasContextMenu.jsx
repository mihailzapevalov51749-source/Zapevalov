import { PAGE_CANVAS_BLOCK_TYPES } from "../constants/pageCanvasBlockTypes";

export default function PageCanvasContextMenu({
  menuState,
  menuRef,
  onSelect,
}) {
  if (!menuState) return null;

  return (
    <>
      <div
        ref={menuRef}
        role="menu"
        style={{
          position: "fixed",
          top: menuState.y,
          left: menuState.x,
          zIndex: 10050,
          minWidth: 200,
          maxWidth: 240,
          background: "#FFFFFF",
          border: "1px solid #E2E8F0",
          borderRadius: 10,
          boxShadow: "0 12px 32px rgba(15, 23, 42, 0.14)",
          padding: 6,
          boxSizing: "border-box",
        }}
      >
        {PAGE_CANVAS_BLOCK_TYPES.map((item) => (
          <button
            key={item.type}
            type="button"
            role="menuitem"
            onClick={() => onSelect(item.type)}
            style={menuItemStyle}
          >
            {item.title}
          </button>
        ))}
      </div>
    </>
  );
}

const menuItemStyle = {
  width: "100%",
  display: "block",
  textAlign: "left",
  padding: "8px 10px",
  border: "none",
  borderRadius: 8,
  background: "transparent",
  color: "#0F172A",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  boxSizing: "border-box",
};
