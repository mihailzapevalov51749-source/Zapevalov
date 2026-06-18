export default function TenantPlatformUpdateContent({ offer, error = "" }) {
  if (!offer) {
    return error ? <p className="platform-releases__error">{error}</p> : null;
  }

  return (
    <div className="platform-update-panel__body" data-testid="tenant-platform-update-content">
      <p className="platform-update-panel__meta">
        Версия
        {" "}
        {offer.from_version}
        {" "}
        →
        {" "}
        {offer.to_version}
        {offer.release_title ? ` · ${offer.release_title}` : ""}
      </p>
      {offer.release_description ? (
        <p className="platform-update-panel__meta">{offer.release_description}</p>
      ) : null}
      {offer.changes?.length ? (
        <ul className="platform-update-panel__changes">
          {offer.changes.map((change) => (
            <li key={`${offer.id}-${change.id || change.title}`}>
              {change.title}
            </li>
          ))}
        </ul>
      ) : null}
      {error ? <p className="platform-releases__error">{error}</p> : null}
    </div>
  );
}
