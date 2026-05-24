import MessageDeleteConfirm from "../../../shared/communication/components/MessageDeleteConfirm";

export default function CommentDeleteConfirm(props) {
  return (
    <MessageDeleteConfirm
      title="Удалить комментарий?"
      text="Комментарий будет удалён без возможности восстановления."
      confirmLabel="Удалить"
      {...props}
    />
  );
}