const ROW_STYLE = {
  margin: 0,
  color: "#475569",
  fontSize: 13,
  lineHeight: 1.45,
};

const LABEL_STYLE = {
  color: "#64748b",
};

export default function StudioPreviewContextBlock({
  usagePaths = [],
}) {
  const hasUsage = Array.isArray(usagePaths) && usagePaths.length > 0;

  return (
    <div className="designer-preview-context">
      <p style={ROW_STYLE}>
        <span style={LABEL_STYLE}>Используется:</span>
        <br />
        {hasUsage ? (
          usagePaths.length === 1 ? (
            usagePaths[0]
          ) : (
            <ul className="designer-preview-context__usage-list">
              {usagePaths.map((path) => (
                <li key={path}>{path}</li>
              ))}
            </ul>
          )
        ) : (
          "Не размещена"
        )}
      </p>
    </div>
  );
}
