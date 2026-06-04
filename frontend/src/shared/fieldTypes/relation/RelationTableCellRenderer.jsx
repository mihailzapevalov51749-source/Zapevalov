import {
  formatRelationTableDisplayLabel,
  isRelationTableValue,
} from "../../../modules/objectViews/services/relationTableValue";

const linkStyle = {
  border: "none",
  background: "transparent",
  padding: 0,
  margin: 0,
  fontSize: 12,
  fontWeight: 600,
  color: "#2563EB",
  cursor: "pointer",
  textAlign: "left",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  maxWidth: "100%",
};

const wrapStyle = {
  minWidth: 0,
  width: "100%",
  display: "flex",
  alignItems: "center",
  gap: 4,
  overflow: "hidden",
  whiteSpace: "nowrap",
  fontSize: 12,
  lineHeight: 1.3,
};

const emptyStyle = {
  fontSize: 12,
  color: "#94A3B8",
  fontWeight: 500,
};

const suffixStyle = {
  fontSize: 12,
  color: "#64748B",
  fontWeight: 600,
  flexShrink: 0,
};

const errorStyle = {
  fontSize: 11,
  color: "#DC2626",
  fontWeight: 600,
};

function stopRowActivation(event) {
  event.stopPropagation();
}

/**
 * Object Table cell renderer for relation field enriched values.
 */
export default function RelationTableCellRenderer({
  value = null,
  compact = false,
  emptyValue = "—",
  onOpenRelatedEntity = null,
}) {
  if (!isRelationTableValue(value)) {
    return <span style={emptyStyle}>{emptyValue}</span>;
  }

  if (value.loading) {
    return <span style={emptyStyle}>…</span>;
  }

  if (value.error) {
    return <span style={errorStyle}>{value.error}</span>;
  }

  const display = formatRelationTableDisplayLabel(value.items);

  if (display.mode === "empty") {
    return <span style={emptyStyle}>{emptyValue}</span>;
  }

  const openEntity = (item, event) => {
    stopRowActivation(event);

    if (!item?.entity_id || typeof onOpenRelatedEntity !== "function") {
      return;
    }

    onOpenRelatedEntity({
      entityId: item.entity_id,
      objectTypeKey: item.object_type_key || null,
      title: item.title,
    });
  };

  if (display.mode === "many_compact") {
    const primary = display.items[0];

    return (
      <div style={wrapStyle}>
        <button
          type="button"
          style={linkStyle}
          title={primary.title}
          onClick={(event) => openEntity(primary, event)}
          onMouseDown={stopRowActivation}
        >
          {primary.title}
        </button>
        {display.overflowCount > 0 ? (
          <span style={suffixStyle} title={`Ещё ${display.overflowCount}`}>
            (+{display.overflowCount})
          </span>
        ) : null}
      </div>
    );
  }

  if (display.mode === "many_inline") {
    return (
      <div style={wrapStyle}>
        {display.items.map((item, index) => (
          <span key={item.entity_id} style={{ display: "inline-flex", minWidth: 0 }}>
            {index > 0 ? (
              <span style={{ ...suffixStyle, marginRight: 4 }}>,</span>
            ) : null}
            <button
              type="button"
              style={linkStyle}
              title={item.title}
              onClick={(event) => openEntity(item, event)}
              onMouseDown={stopRowActivation}
            >
              {item.title}
            </button>
          </span>
        ))}
      </div>
    );
  }

  const primary = display.items[0];

  return (
    <button
      type="button"
      style={{
        ...linkStyle,
        fontSize: compact ? 12 : 13,
      }}
      title={primary.title}
      onClick={(event) => openEntity(primary, event)}
      onMouseDown={stopRowActivation}
    >
      {primary.title}
    </button>
  );
}
