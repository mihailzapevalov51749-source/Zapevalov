import {
  getLinkDisplayLabel,
  isSafeLinkHref,
  normalizeLinkStorageValue,
  normalizeLinkValue,
  resolveLinkHref,
} from "./linkUtils";

const emptyTextStyle = {
  minWidth: 0,
  fontSize: 13,
  fontWeight: 500,
  color: "#94A3B8",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const linkStyle = {
  minWidth: 0,
  display: "block",
  fontSize: 13,
  lineHeight: 1.3,
  fontWeight: 500,
  color: "#2563EB",
  textDecoration: "none",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const unsafeTextStyle = {
  ...linkStyle,
  color: "#0F172A",
  cursor: "default",
};

function stopRowActivation(event) {
  event.stopPropagation();
}

export default function LinkValueRenderer({
  value,
  compact = false,
  emptyValue = "—",
}) {
  const link = normalizeLinkValue(value, emptyValue);
  const storageValue = normalizeLinkStorageValue(value);
  const displayLabel = getLinkDisplayLabel(value, emptyValue);
  const href = resolveLinkHref(storageValue || link.url);
  const isEmpty = !storageValue;
  const isSafe = isSafeLinkHref(storageValue || link.url);
  const fontSize = compact ? 12 : 13;

  if (isEmpty) {
    return (
      <div
        style={{
          ...emptyTextStyle,
          fontSize,
        }}
      >
        {emptyValue}
      </div>
    );
  }

  if (!isSafe || !href) {
    return (
      <div
        style={{
          ...unsafeTextStyle,
          fontSize,
        }}
        title={displayLabel}
      >
        {displayLabel}
      </div>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={storageValue || href}
      onClick={stopRowActivation}
      onMouseDown={stopRowActivation}
      style={{
        ...linkStyle,
        fontSize,
      }}
    >
      {displayLabel}
    </a>
  );
}
