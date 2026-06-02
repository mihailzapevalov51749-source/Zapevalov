export default function YasiiEmbeddedContextHeader({ sourceLabel }) {
  const label = String(sourceLabel ?? "").trim() || "Платформа";

  return (
    <div className="yasii-embedded-source-hint" role="status">
      <span className="yasii-embedded-source-hint__label">Источник:</span>
      <span className="yasii-embedded-source-hint__value">{label}</span>
    </div>
  );
}
