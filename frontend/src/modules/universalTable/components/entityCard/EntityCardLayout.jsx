import {
  entityCardLayoutStyle,
  entityCardHeaderContainerStyle,
  entityCardBodyStyle,
  entityCardContentStyle,
  entityCardSidebarStyle,
} from "./styles/entityCardLayoutStyles";

export default function EntityCardLayout({
  header,
  content,
  sidebar,
}) {
  return (
    <div style={entityCardLayoutStyle}>
      <div style={entityCardHeaderContainerStyle}>
        {header}
      </div>

      <div style={entityCardBodyStyle}>
        <div style={entityCardContentStyle}>
          {content}
        </div>

        {!!sidebar && (
          <div style={entityCardSidebarStyle}>
            {sidebar}
          </div>
        )}
      </div>
    </div>
  );
}