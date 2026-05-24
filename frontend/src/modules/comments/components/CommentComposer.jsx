import MessageComposer from "../../../shared/communication/components/MessageComposer";

export default function CommentComposer({
  placeholder = "Написать комментарий...",
  disabled = false,
  autoFocus = false,
  onSubmit,
}) {
  return (
    <MessageComposer
      placeholder={placeholder}
      disabled={disabled}
      autoFocus={autoFocus}
      submitErrorLabel="Ошибка отправки комментария"
      onSubmit={onSubmit}
    />
  );
}