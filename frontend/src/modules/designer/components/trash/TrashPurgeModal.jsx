import { useEffect, useMemo, useState } from "react";
import { Eraser, Info, Trash2 } from "lucide-react";

import { PlatformModal } from "../../../../shared/platformModal";
import { getViewportMetrics } from "../../../../shared/platformModal/usePlatformModalLayout";
import { TRASH_PURGE_DELETE_MODES } from "../../utils/trashPurgeModalState";
import { buildTrashDependencyTreeLines } from "../../services/trashDependencyPresentation";
import TrashPurgeDependenciesPanel from "./TrashPurgeDependenciesPanel";
import TrashPurgeDependencyTree from "./TrashPurgeDependencyTree";

const MODAL_KEY = "designer_trash_purge_modal";

function getTrashPurgeModalBounds(isBlocked) {
  if (typeof window === "undefined") {
    return isBlocked ? { width: 1140, height: 720 } : { width: 520, height: 360 };
  }

  const metrics = getViewportMetrics();
  if (!isBlocked) {
    return { width: 520, height: 360 };
  }

  const maxAllowedWidth = Math.min(
    1200,
    metrics.maxWidth,
    Math.max(320, Math.round(window.innerWidth * 0.92)),
  );
  const preferredWidth =
    maxAllowedWidth >= 1100 ? Math.min(1140, maxAllowedWidth) : maxAllowedWidth;

  const height = Math.min(
    metrics.maxHeight,
    Math.max(metrics.minHeight, Math.round(window.innerHeight * 0.88)),
  );

  return { width: preferredWidth, height };
}

function TargetObjectCard({ item }) {
  if (!item) {
    return null;
  }

  return (
    <section className="designer-trash-purge-modal__target-card" aria-label="Удаляемый объект">
      <h4 className="designer-trash-purge-modal__section-title">Удаляемый объект</h4>
      <div className="designer-trash-purge-modal__target-name">{item.title}</div>
      <dl className="designer-trash-purge-modal__target-meta">
        <div>
          <dt>Тип</dt>
          <dd>{item.kind_label || "—"}</dd>
        </div>
        <div>
          <dt>Расположение</dt>
          <dd>{item.placement_label || "—"}</dd>
        </div>
      </dl>
    </section>
  );
}

function ActionCard({ icon: Icon, title, tone, selected, onSelect, children }) {
  return (
    <button
      type="button"
      className={`designer-trash-purge-modal__action-card designer-trash-purge-modal__action-card--${tone}${
        selected ? " designer-trash-purge-modal__action-card--selected" : ""
      }`}
      onClick={onSelect}
      aria-pressed={selected}
    >
      <span
        className={`designer-trash-purge-modal__action-radio${
          selected ? " designer-trash-purge-modal__action-radio--selected" : ""
        }`}
        aria-hidden="true"
      />
      <span className="designer-trash-purge-modal__action-icon" aria-hidden="true">
        <Icon size={18} />
      </span>
      <span className="designer-trash-purge-modal__action-body">
        <span className="designer-trash-purge-modal__action-title">{title}</span>
        <span className="designer-trash-purge-modal__action-desc">{children}</span>
      </span>
    </button>
  );
}

function CascadePreviewList({ tree }) {
  const lines = buildTrashDependencyTreeLines(tree);
  if (!lines.length) {
    return null;
  }

  return (
    <div className="designer-trash-purge-modal__cascade-preview">
      <h5 className="designer-trash-purge-modal__cascade-title">Будут удалены</h5>
      <ul className="designer-trash-purge-modal__cascade-list">
        {lines.slice(1).map((line) => (
          <li
            key={line.key}
            className="designer-trash-purge-modal__cascade-item"
            style={{ paddingLeft: `${Math.max(0, line.depth - 1) * 14}px` }}
          >
            {line.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ObjectTypePurgePreview({ preview }) {
  const internalCounts = preview?.internal_counts || [];
  const externalWarnings = preview?.external_warnings || [];

  return (
    <>
      <section className="designer-trash-purge-modal__cascade-preview" aria-label="Будут удалены">
        <h5 className="designer-trash-purge-modal__cascade-title">Будут удалены</h5>
        {internalCounts.length ? (
          <ul className="designer-trash-purge-modal__cascade-list">
            {internalCounts.map((item) => (
              <li key={item.category} className="designer-trash-purge-modal__cascade-item">
                {item.label}: {item.count}
              </li>
            ))}
          </ul>
        ) : (
          <p className="designer-trash-purge-modal__lead">
            Дополнительных внутренних сущностей не найдено.
          </p>
        )}
      </section>

      {externalWarnings.some((group) => group.items?.length) ? (
        <section className="designer-trash-purge-modal__info-box" aria-label="Внешние зависимости">
          <Info size={16} aria-hidden="true" />
          <div>
            <p>
              <strong>Внимание.</strong> Другие сущности используют этот объект. Удаление приведёт к
              разрыву ссылок.
            </p>
            <ul className="designer-trash-purge-modal__cascade-list">
              {externalWarnings.flatMap((group) =>
                (group.items || []).map((item) => (
                  <li key={`${group.category}-${item}`} className="designer-trash-purge-modal__cascade-item">
                    {item}
                  </li>
                )),
              )}
            </ul>
          </div>
        </section>
      ) : null}
    </>
  );
}

export default function TrashPurgeModal({
  open = false,
  targetItem = null,
  blocked = null,
  purgePreview = null,
  cascadePreview = null,
  isSubmitting = false,
  selectedDeleteMode = null,
  onSelectedDeleteModeChange,
  onClose,
  onConfirmPurge,
  onClearDependencies,
  onOpenRoute,
  onRequestCascadePreview,
  onConfirmCascadeDelete,
}) {
  const isBlocked = Boolean(blocked?.blocked);
  const isObjectTypeCascadePreview =
    targetItem?.kind === "object_type" && Boolean(purgePreview);
  const groups = blocked?.presentation?.groups || [];
  const dependencyTree = blocked?.tree || cascadePreview?.tree || null;

  const [cascadeConfirmReady, setCascadeConfirmReady] = useState(false);
  const [defaultBounds, setDefaultBounds] = useState(() => getTrashPurgeModalBounds(isBlocked));

  useEffect(() => {
    if (open) {
      setDefaultBounds(getTrashPurgeModalBounds(isBlocked));
    }
  }, [open, isBlocked]);

  useEffect(() => {
    if (!open) {
      setCascadeConfirmReady(false);
    }
  }, [open]);

  useEffect(() => {
    if (selectedDeleteMode !== TRASH_PURGE_DELETE_MODES.CASCADE) {
      setCascadeConfirmReady(false);
    }
  }, [selectedDeleteMode]);

  useEffect(() => {
    if (cascadePreview?.tree && selectedDeleteMode === TRASH_PURGE_DELETE_MODES.CASCADE) {
      setCascadeConfirmReady(true);
    }
  }, [cascadePreview, selectedDeleteMode]);

  const totalDepsCount = useMemo(
    () => groups.reduce((sum, group) => sum + (group.items?.length || group.count || 0), 0),
    [groups],
  );

  const handleDelete = async () => {
    if (!selectedDeleteMode) {
      return;
    }

    if (selectedDeleteMode === TRASH_PURGE_DELETE_MODES.CLEAR) {
      onClearDependencies?.();
      return;
    }

    if (!cascadeConfirmReady) {
      await onRequestCascadePreview?.();
      return;
    }
    onConfirmCascadeDelete?.();
  };

  const deleteButtonClass = !selectedDeleteMode
    ? "designer-btn designer-btn--primary"
    : selectedDeleteMode === TRASH_PURGE_DELETE_MODES.CASCADE
      ? "designer-btn designer-btn--danger-solid"
      : "designer-btn designer-btn--primary";

  const footer = isBlocked ? (
    <div className="designer-trash-purge-modal__footer-bar designer-trash-purge-modal__footer-bar--compact">
      <div className="designer-trash-purge-modal__footer-right">
        <button type="button" className="designer-btn" onClick={onClose} disabled={isSubmitting}>
          Отмена
        </button>
        <button
          type="button"
          className={deleteButtonClass}
          onClick={handleDelete}
          disabled={isSubmitting || !selectedDeleteMode}
        >
          {isSubmitting ? "Выполняется…" : "Удалить"}
        </button>
      </div>
    </div>
  ) : (
    <div className="designer-trash-purge-modal__footer-bar designer-trash-purge-modal__footer-bar--compact">
      <div className="designer-trash-purge-modal__footer-right">
        <button type="button" className="designer-btn" onClick={onClose} disabled={isSubmitting}>
          Отмена
        </button>
        <button
          type="button"
          className="designer-btn designer-btn--danger-solid"
          onClick={onConfirmPurge}
          disabled={isSubmitting}
        >
          {isSubmitting ? "Выполняется…" : isObjectTypeCascadePreview ? "Удалить окончательно" : "Удалить"}
        </button>
      </div>
    </div>
  );

  return (
    <PlatformModal
      open={open}
      modalKey={MODAL_KEY}
      onClose={onClose}
      title={isObjectTypeCascadePreview ? "Удалить окончательно?" : "Удаление объекта"}
      subtitle={
        isBlocked
          ? "Обнаружены зависимости. Выберите сценарий удаления."
          : isObjectTypeCascadePreview
            ? "Объект и его внутреннее содержимое будут удалены из базы данных без возможности восстановления."
            : "Подтвердите окончательное удаление объекта из корзины."
      }
      ariaLabel="Окно удаления объекта из корзины"
      footer={footer}
      canCustomizeLayout
      defaultBounds={defaultBounds}
      contentStyle={{ padding: "16px 20px" }}
    >
      <div className="designer-trash-purge-modal__layout">
        <TargetObjectCard item={targetItem} />

        {isBlocked ? (
          <div className="designer-trash-purge-modal__columns">
            <div className="designer-trash-purge-modal__column designer-trash-purge-modal__column--deps">
              <TrashPurgeDependenciesPanel
                key={targetItem?.id || "blocked-deps"}
                groups={groups}
                totalCount={totalDepsCount}
                onOpenRoute={onOpenRoute}
              />
              <TrashPurgeDependencyTree tree={dependencyTree} />
            </div>

            <div className="designer-trash-purge-modal__column-divider" aria-hidden="true" />

            <div className="designer-trash-purge-modal__column designer-trash-purge-modal__column--actions">
              <h4 className="designer-trash-purge-modal__column-title">Выбери сценарий действий</h4>

              <ActionCard
                icon={Eraser}
                tone="clear"
                title="Удалить и очистить зависимости"
                selected={selectedDeleteMode === TRASH_PURGE_DELETE_MODES.CLEAR}
                onSelect={() => onSelectedDeleteModeChange?.(TRASH_PURGE_DELETE_MODES.CLEAR)}
              >
                Связи будут удалены.
                <br />
                Зависимые элементы останутся.
              </ActionCard>

              <ActionCard
                icon={Trash2}
                tone="cascade"
                title="Удалить каскадно"
                selected={selectedDeleteMode === TRASH_PURGE_DELETE_MODES.CASCADE}
                onSelect={() => onSelectedDeleteModeChange?.(TRASH_PURGE_DELETE_MODES.CASCADE)}
              >
                Будут удалены объект и зависимые элементы.
                <br />
                <span className="designer-trash-purge-modal__action-desc-danger">
                  Действие необратимо.
                </span>
              </ActionCard>

              <div className="designer-trash-purge-modal__info-box">
                <Info size={16} aria-hidden="true" />
                <p>
                  Рекомендуем открыть зависимости и проверить последствия перед удалением.
                </p>
              </div>

              {selectedDeleteMode === TRASH_PURGE_DELETE_MODES.CASCADE && cascadePreview?.tree ? (
                <CascadePreviewList tree={cascadePreview.tree} />
              ) : null}
            </div>
          </div>
        ) : isObjectTypeCascadePreview ? (
          <ObjectTypePurgePreview preview={purgePreview} />
        ) : (
          <p className="designer-trash-purge-modal__lead">
            Запись будет удалена из базы данных без возможности восстановления.
          </p>
        )}
      </div>
    </PlatformModal>
  );
}
