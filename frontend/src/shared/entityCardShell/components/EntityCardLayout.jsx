import { useEffect, useRef } from "react";

import {
  entityCardBodyStyle,
  entityCardContentStyle,
  entityCardHeaderContainerStyle,
  entityCardLayoutStyle,
  entityCardSidebarStyle,
  entityCardTabsContainerStyle,
} from "../styles/entityCardLayoutStyles";

export default function EntityCardLayout({
  header,
  tabs = null,
  content,
  sidebar = null,
  footer = null,
  resetScrollKey,
}) {
  const contentRef = useRef(null);

  useEffect(() => {
    if (!contentRef.current) {
      return;
    }

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
            {tabs ? (
              <div style={entityCardTabsContainerStyle}>{tabs}</div>
            ) : null}
          </div>

          <div
            ref={contentRef}
            style={{
              ...entityCardContentStyle,
              flex: "1 1 auto",
              minHeight: 0,
            }}
          >
            {content}
          </div>

          {footer ? (
            <div
              style={{
                flexShrink: 0,
                marginTop: "auto",
              }}
            >
              {footer}
            </div>
          ) : null}
        </div>

        {sidebar ? (
          <div
            data-entity-card-sidebar=""
            className="entity-card-layout__sidebar"
            style={{
              ...entityCardSidebarStyle,
              height: "100%",
              minHeight: 0,
            }}
          >
            {sidebar}
          </div>
        ) : null}
      </div>
    </div>
  );
}
