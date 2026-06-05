import NavigationDeleteConfirmModal from "./NavigationDeleteConfirmModal";
import NavigationDeleteNoticeModal from "./NavigationDeleteNoticeModal";

export default function NavigationDeleteDialogs({
  pendingDeleteItem = null,
  pendingDeleteId = null,
  deleteError = null,
  deleteNotice = null,
  isSubmitting = false,
  onCancelDelete,
  onConfirmDelete,
  onCloseNotice,
}) {
  return (
    <>
      <NavigationDeleteConfirmModal
        open={pendingDeleteId != null}
        itemTitle={
          pendingDeleteItem?.display_title ||
          pendingDeleteItem?.title ||
          ""
        }
        isSubmitting={isSubmitting}
        error={deleteError}
        onCancel={onCancelDelete}
        onConfirm={onConfirmDelete}
      />
      <NavigationDeleteNoticeModal
        open={Boolean(deleteNotice)}
        message={deleteNotice}
        onClose={onCloseNotice}
      />
    </>
  );
}
