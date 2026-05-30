import { collectMentionPayloadFromHtml } from "./noteEditorDom";

function getMentionKeySet(html) {
  const { mentionKeys } = collectMentionPayloadFromHtml(html);
  return new Set(mentionKeys);
}

export function hasNewMentionsAfterPublish(currentHtml, lastPublishedHtml) {
  const currentKeys = getMentionKeySet(currentHtml);
  const publishedKeys = getMentionKeySet(lastPublishedHtml);

  for (const key of currentKeys) {
    if (!publishedKeys.has(key)) return true;
  }

  return false;
}

export function getLastPublishedStorageKey({ entityType, entityId }) {
  return `yasnopro:note:last-published:${entityType}:${entityId}`;
}

export function scrollToHighlight({ editorRef, highlightId }) {
  if (!editorRef.current) return;

  const targetElement = editorRef.current.querySelector(
    `#${CSS.escape(highlightId)}`,
  );

  if (!targetElement) return;

  targetElement.scrollIntoView({
    behavior: "smooth",
    block: "center",
  });

  targetElement.animate(
    [
      { boxShadow: "0 0 0 0 rgba(37,99,235,0)" },
      { boxShadow: "0 0 0 6px rgba(37,99,235,0.25)" },
      { boxShadow: "0 0 0 0 rgba(37,99,235,0)" },
    ],
    {
      duration: 1800,
      easing: "ease",
    },
  );
}
