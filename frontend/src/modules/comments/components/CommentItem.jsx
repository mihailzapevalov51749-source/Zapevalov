import MessageItem from "../../../shared/communication/components/MessageItem";

export default function CommentItem(props) {
  return (
    <MessageItem
      mode="comment"
      message={props.comment}
      highlightedMessageId={props.highlightedCommentId}
      {...props}
    />
  );
}