import { useEffect, useRef } from "react";

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
  resetScrollKey,
}) {
  const contentRef = useRef(null);

  useEffect(() => {
    if (!contentRef.current) return;

    contentRef.current.scrollTo({
      top: 0,
      left: 0,
      behavior: "auto",
    });
  }, [resetScrollKey]);

  return (
    <div style={entityCardLayoutStyle}>
      <div style={entityCardBodyStyle}>
        <div
          style={{
            flex: 1,
            minWidth: 0,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <div style={entityCardHeaderContainerStyle}>
            {header}
          </div>

          <div
            ref={contentRef}
            style={{
              ...entityCardContentStyle,
              minHeight: 0,
            }}
          >
            {content}
          </div>
        </div>

        {!!sidebar && (
          <div
            style={{
              ...entityCardSidebarStyle,
              height: "100%",
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
            }}
          >
            {sidebar}
          </div>
        )}
      </div>
    </div>
  );
}