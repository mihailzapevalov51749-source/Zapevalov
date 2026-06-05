import {
  applyPageStatusToPublicationPaths,
  buildBlockTreeLines,
  buildUnifiedUsageTreeLines,
  collectBindingPaths,
  formatAuditLine,
  formatBlockCountLabel,
  resolveCreatedAuthor,
  resolveRelatedObjects,
  resolveUpdatedAuthor,
} from "../../utils/pagesRegistryUtils";

function TreeLines({ lines, emptyLabel }) {
  if (!lines?.length) {
    return emptyLabel ? <p className="designer-pages-detail__muted">{emptyLabel}</p> : null;
  }

  return (
    <ul className="designer-pages-detail__tree">
      {lines.map((line, index) => (
        <li
          key={`${index}-${line.treePrefix || line.prefix}-${line.label}`}
          className="designer-pages-detail__tree-item"
          style={{ paddingLeft: `${(line.depth || 0) * 14}px` }}
        >
          {line.treePrefix ? (
            <span className="designer-pages-detail__tree-prefix">{line.treePrefix} </span>
          ) : line.prefix ? (
            `${line.prefix} `
          ) : (
            ""
          )}
          {line.label}
        </li>
      ))}
    </ul>
  );
}

function UsageTree({ paths, emptyLabel }) {
  if (!paths?.length) {
    return <p className="designer-pages-detail__muted">{emptyLabel}</p>;
  }

  const lines = buildUnifiedUsageTreeLines(paths);
  return <TreeLines lines={lines} />;
}

function DetailSection({ title, children, className = "" }) {
  return (
    <section className={`designer-pages-detail__section${className ? ` ${className}` : ""}`}>
      <h4 className="designer-pages-detail__section-title">{title}</h4>
      {children}
    </section>
  );
}

function StatusBadge({ status, label }) {
  const normalized = String(status || "").toLowerCase();
  const className =
    normalized === "published"
      ? "designer-pages-detail__status designer-pages-detail__status--published"
      : normalized === "hidden"
        ? "designer-pages-detail__status designer-pages-detail__status--hidden"
        : "designer-pages-detail__status designer-pages-detail__status--draft";

  return <span className={className}>{label}</span>;
}

export default function PageDetailPanel({
  page,
  loading,
  actionError,
  isSubmittingAction,
  onOpen,
  onDuplicate,
  onPublish,
  onUnpublish,
  onHideFromNavigation,
  onRestoreToNavigation,
  onDelete,
}) {
  if (loading) {
    return <div className="designer-loading">Загрузка карточки страницы...</div>;
  }

  if (!page) {
    return (
      <div className="designer-empty designer-pages-detail__empty">
        Выберите страницу в таблице слева.
      </div>
    );
  }

  const publicationBasePaths = collectBindingPaths(
    Array.isArray(page.bindings) && page.bindings.length > 0 ? page.bindings : page.usages,
  );
  const publicationPaths = applyPageStatusToPublicationPaths(
    publicationBasePaths,
    page.status,
  );
  const relatedObjects = resolveRelatedObjects(page);
  const blockTreeLines = buildBlockTreeLines(page.blocks);
  const hasBlocks = blockTreeLines.length > 0;
  const workspaceLabel =
    page.workspace_label && page.workspace_label !== "—" ? page.workspace_label : "—";
  const pageStatus = String(page.status || "draft").toLowerCase();
  const isPublished = pageStatus === "published";
  const isHidden = pageStatus === "hidden";
  const isDraft = pageStatus === "draft";

  const metaLine = [
    page.page_type,
    `Workspace: ${workspaceLabel}`,
    `Slug: ${page.slug}`,
  ].join(" • ");

  const createdLine = formatAuditLine(
    "Создана",
    page.created_at,
    resolveCreatedAuthor(page),
  );
  const updatedLine = formatAuditLine(
    "Изменена",
    page.updated_at,
    resolveUpdatedAuthor(page),
  );

  return (
    <div className="designer-pages-detail">
      <header className="designer-pages-detail__header">
        <div className="designer-pages-detail__header-top">
          <h3 className="designer-pages-detail__title">{page.title}</h3>
          <StatusBadge status={page.status} label={page.status_label} />
        </div>
        <p className="designer-pages-detail__header-meta">{metaLine}</p>
        <p className="designer-pages-detail__header-dates">{createdLine}</p>
        <p className="designer-pages-detail__header-dates">{updatedLine}</p>
      </header>

      <section className="designer-pages-detail__toolbar" aria-label="Действия">
        <button
          type="button"
          className="designer-btn designer-btn--compact"
          onClick={onOpen}
          disabled={isSubmittingAction}
        >
          Открыть
        </button>
        <button
          type="button"
          className="designer-btn designer-btn--compact"
          onClick={onDuplicate}
          disabled={isSubmittingAction}
        >
          Дублировать
        </button>
        {isDraft ? (
          <button
            type="button"
            className="designer-btn designer-btn--compact"
            onClick={onPublish}
            disabled={isSubmittingAction}
          >
            Опубликовать
          </button>
        ) : null}
        {isPublished ? (
          <>
            <button
              type="button"
              className="designer-btn designer-btn--compact"
              onClick={onHideFromNavigation}
              disabled={isSubmittingAction}
            >
              Скрыть из навигации
            </button>
            <button
              type="button"
              className="designer-btn designer-btn--compact"
              onClick={onUnpublish}
              disabled={isSubmittingAction}
            >
              Снять публикацию
            </button>
          </>
        ) : null}
        {isHidden ? (
          <>
            <button
              type="button"
              className="designer-btn designer-btn--compact"
              onClick={onRestoreToNavigation}
              disabled={isSubmittingAction}
            >
              Вернуть в навигацию
            </button>
            <button
              type="button"
              className="designer-btn designer-btn--compact"
              onClick={onUnpublish}
              disabled={isSubmittingAction}
            >
              Снять публикацию
            </button>
          </>
        ) : null}
        <button
          type="button"
          className="designer-btn designer-btn--compact designer-btn--danger"
          onClick={onDelete}
          disabled={isSubmittingAction}
        >
          Удалить
        </button>
      </section>

      {actionError ? <p className="designer-error designer-pages-detail__error">{actionError}</p> : null}

      <div className="designer-pages-detail__sections">
        <DetailSection title="Места публикации">
          <UsageTree paths={publicationPaths} emptyLabel="Нет мест публикации" />
        </DetailSection>

        <DetailSection title="Состав страницы">
          <p className="designer-pages-detail__summary-line">
            {formatBlockCountLabel(page.block_count)}
          </p>
          {hasBlocks ? <TreeLines lines={blockTreeLines} /> : null}
        </DetailSection>

        <DetailSection title="Используемые объекты" className="designer-pages-detail__section--full">
          {relatedObjects.length ? (
            <ul className="designer-pages-detail__objects-list">
              {relatedObjects.map((name) => (
                <li key={name}>{name}</li>
              ))}
            </ul>
          ) : (
            <p className="designer-pages-detail__muted">Нет связанных объектов</p>
          )}
        </DetailSection>
      </div>
    </div>
  );
}
