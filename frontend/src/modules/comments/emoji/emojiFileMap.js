const emojiModules = import.meta.glob(
  "../../../assets/emojis/*",
  {
    eager: true,
    import: "default",
  }
);

function getEmojiCodeFromPath(path) {
  const fileName = path.split("/").pop() || "";

  return fileName.replace(/\.[^/.]+$/, "");
}

export const emojiFileMap = Object.entries(emojiModules).reduce(
  (acc, [path, src]) => {
    const code = getEmojiCodeFromPath(path);

    if (code) {
      acc[code] = src;
    }

    return acc;
  },
  {}
);