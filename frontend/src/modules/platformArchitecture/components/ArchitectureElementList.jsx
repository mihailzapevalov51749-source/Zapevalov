export default function ArchitectureElementList({
  elements,
  selectedKey,
  onSelect,
  loading,
  registryLabel,
}) {
  if (loading) {
    return <p className="platform-architecture__status">Загрузка реестра…</p>;
  }

  return (
    <nav className="platform-architecture__tree" aria-label={`Реестр ${registryLabel || ""}`}>
      <h2 className="platform-architecture__category-title">{registryLabel}</h2>
      <ul className="platform-architecture__nodes">
        {(elements || []).map((element) => {
          const isActive = element.key === selectedKey;
          return (
            <li key={element.key}>
              <button
                type="button"
                className={`platform-architecture__node-btn${
                  isActive ? " platform-architecture__node-btn--active" : ""
                }`}
                onClick={() => onSelect(element.key)}
              >
                <span className="platform-architecture__node-title">{element.title}</span>
                <span className="platform-architecture__node-tech">{element.technical_name}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
