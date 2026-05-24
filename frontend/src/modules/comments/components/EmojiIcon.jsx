import { getEmojiByKey } from "../emoji/emojiRegistry";

export default function EmojiIcon({
  emojiKey,
  size = 16,
  opacity = 1,
}) {
  const emoji = getEmojiByKey(emojiKey);

  if (!emoji?.icon) {
    return null;
  }

  return (
    <img
      src={emoji.icon}
      alt={emoji.label || emojiKey}
      draggable={false}
      style={{
        width: size,
        height: size,
        objectFit: "contain",
        display: "block",
        flexShrink: 0,
        userSelect: "none",
        pointerEvents: "none",
        opacity,
      }}
    />
  );
}