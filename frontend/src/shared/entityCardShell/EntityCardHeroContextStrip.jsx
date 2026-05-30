import {
  entityCardHeroContextSegmentStyle,
  entityCardHeroContextSeparatorStyle,
  entityCardHeroContextStripStyle,
} from "./styles/entityCardHeroHeaderStyles";

/**
 * Breadcrumb / parent context under Hero title (object-centric card).
 */
export default function EntityCardHeroContextStrip({
  segments = [],
  onSegmentClick = null,
}) {
  if (!segments.length) {
    return null;
  }

  return (
    <nav
      style={entityCardHeroContextStripStyle}
      aria-label="Контекст объекта"
    >
      {segments.map((segment, index) => {
        const label = String(segment?.label || "").trim();

        if (!label) {
          return null;
        }

        const isClickable =
          typeof onSegmentClick === "function" &&
          segment?.entityId &&
          segment?.objectTypeKey;

        return (
          <span
            key={segment.key || `${label}-${index}`}
            style={{ display: "inline-flex", alignItems: "center", minWidth: 0 }}
          >
            {index > 0 ? (
              <span style={entityCardHeroContextSeparatorStyle} aria-hidden="true">
                →
              </span>
            ) : null}
            {isClickable ? (
              <button
                type="button"
                style={{
                  ...entityCardHeroContextSegmentStyle,
                  color: "#2563eb",
                  cursor: "pointer",
                }}
                onClick={() =>
                  onSegmentClick({
                    entityId: segment.entityId,
                    objectTypeKey: segment.objectTypeKey,
                  })
                }
              >
                {label}
              </button>
            ) : (
              <span
                style={{
                  ...entityCardHeroContextSegmentStyle,
                  cursor: "default",
                }}
              >
                {label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
