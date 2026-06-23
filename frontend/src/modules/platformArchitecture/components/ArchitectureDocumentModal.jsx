import PlatformModal from "../../../shared/platformModal/PlatformModal";

function formatUpdatedAt(value) {
  if (!value) {
    return "—";
  }
  return new Date(value).toLocaleString("ru-RU");
}

export default function ArchitectureDocumentModal({
  open,
  onClose,
  loading,
  documentData,
  errorMessage,
  registryLabel,
}) {
  const title = documentData?.document_title || "Документ";
  const subtitleParts = [
    registryLabel ? `Вкладка: ${registryLabel}` : null,
    documentData?.document_path ? `Источник: ${documentData.document_path}` : null,
    documentData?.updated_at ? `Обновлён: ${formatUpdatedAt(documentData.updated_at)}` : null,
  ].filter(Boolean);

  return (
    <PlatformModal
      modalKey="architecture_registry_document_viewer"
      open={open}
      onClose={onClose}
      title={title}
      subtitle={subtitleParts.length ? subtitleParts.join(" · ") : null}
      canCustomizeLayout
      defaultBounds={{ width: 920, height: 640 }}
      ariaLabel="Просмотр архитектурного документа"
      footer={
        <div className="platform-architecture__document-footer">
          <button type="button" className="designer-btn designer-btn--primary" onClick={() => onClose?.("footer")}>
            Закрыть
          </button>
        </div>
      }
    >
      {loading ? <p className="platform-architecture__status">Загрузка документа…</p> : null}
      {!loading && errorMessage ? (
        <p className="platform-architecture__status platform-architecture__status--error">{errorMessage}</p>
      ) : null}
      {!loading && !errorMessage && documentData?.content ? (
        <pre className="platform-architecture__document-content">{documentData.content}</pre>
      ) : null}
    </PlatformModal>
  );
}
