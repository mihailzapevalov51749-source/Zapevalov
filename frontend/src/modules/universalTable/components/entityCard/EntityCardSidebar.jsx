import {
  entityCardSidebarWrapperStyle,
  entityCardSidebarInnerStyle,
} from "./styles/entityCardSidebarStyles";

export default function EntityCardSidebar({
  children,
}) {
  return (
    <div style={entityCardSidebarWrapperStyle}>
      <div style={entityCardSidebarInnerStyle}>
        {children}
      </div>
    </div>
  );
}