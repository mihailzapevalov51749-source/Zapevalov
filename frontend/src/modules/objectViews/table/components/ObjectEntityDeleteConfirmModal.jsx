import ObjectEntityDeleteModalBase, {
  ObjectEntityDeleteModalFooterActions,
  ObjectEntityDeleteModalFooterShell,
  ObjectEntityDeleteRecordInfo,
} from "./ObjectEntityDeleteModalBase";
import {
  OBJECT_ENTITY_DELETE_CONFIRM_DEFAULT_BOUNDS,
  OBJECT_ENTITY_DELETE_CONFIRM_MODAL_KEY,
} from "./objectEntityDeleteModalKeys";
import {
  BULK_DELETE_MODAL_TITLE,
  buildBulkDeleteConfirmMessage,
} from "../services/objectEntityBulkDeletePresentation";

const CONFIRM_SUBTITLE = (
  <>
    Вы собираетесь удалить запись.
    <br />
    Проверьте действие перед подтверждением.
  </>
);

export default function ObjectEntityDeleteConfirmModal({
  open = false,
  mode = "single",
  entityTitle = "",
  bulkCount = 0,
  deleting = false,
  error = "",
  onCancel,
  onConfirm,
}) {
  const isBulkMode = mode === "bulk";
  const title = isBulkMode ? BULK_DELETE_MODAL_TITLE : "Удаление записи";
  const subtitle = isBulkMode ? null : CONFIRM_SUBTITLE;
  const infoValue = isBulkMode
    ? buildBulkDeleteConfirmMessage(bulkCount)
    : entityTitle;

  const footer = (
    <ObjectEntityDeleteModalFooterShell>
      <ObjectEntityDeleteModalFooterActions
        deleting={deleting}
        onCancel={onCancel}
        onConfirm={onConfirm}
      />
    </ObjectEntityDeleteModalFooterShell>
  );

  return (
    <ObjectEntityDeleteModalBase
      open={open}
      modalKey={OBJECT_ENTITY_DELETE_CONFIRM_MODAL_KEY}
      defaultBounds={OBJECT_ENTITY_DELETE_CONFIRM_DEFAULT_BOUNDS}
      ariaLabel={title}
      title={title}
      subtitle={subtitle}
      deleting={deleting}
      onCancel={onCancel}
      footer={footer}
    >
      <ObjectEntityDeleteRecordInfo
        label={isBulkMode ? "" : "Удаляемая запись"}
        value={infoValue}
      />

      {error ? <p className="ot-entity-delete-modal__error">{error}</p> : null}
    </ObjectEntityDeleteModalBase>
  );
}
