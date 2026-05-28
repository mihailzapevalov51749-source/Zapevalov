import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import {
  getNote,
  upsertNote,
  publishNote,
} from "../../../../shared/notes/notesApi";

import EntityCardNotesToolbar from "./EntityCardNotesToolbar";

import {
  loadSystemUsers,
  normalizeUser,
  getInitials,
  getPopoverPosition,
  getEntityId,
  getTableId,
  hasContent,
  getCurrentTimeLabel,
  collectMentionPayloadFromHtml,
} from "./services/entityCardNotesUtils";

import {
  wrapperStyle,
  fullscreenOverlayStyle,
  fullscreenInnerStyle,
  editorBoxStyle,
  fullscreenEditorBoxStyle,
  editorStyle,
  fullscreenEditorStyle,
  placeholderStyle,
  saveStatusStyle,
  loadingStyle,
  mentionPopoverOverlayStyle,
  mentionPopoverStyle,
  mentionUserButtonStyle,
  mentionAvatarStyle,
  mentionChipStyle,
  publishConfirmOverlayStyle,
  publishConfirmModalStyle,
  publishConfirmTitleStyle,
  publishConfirmTextStyle,
  publishConfirmActionsStyle,
  publishConfirmSecondaryButtonStyle,
  publishConfirmPrimaryButtonStyle,
} from "./styles/entityCardNotesStyles";

function getMentionKeySet(html) {
  const { mentionKeys } = collectMentionPayloadFromHtml(html);
  return new Set(mentionKeys);
}

function hasNewMentionsAfterPublish(currentHtml, lastPublishedHtml) {
  const currentKeys = getMentionKeySet(currentHtml);
  const publishedKeys = getMentionKeySet(lastPublishedHtml);

  for (const key of currentKeys) {
    if (!publishedKeys.has(key)) return true;
  }

  return false;
}

function getLastPublishedStorageKey({ entityType, entityId }) {
  return `yasnopro:note:last-published:${entityType}:${entityId}`;
}

function scrollToHighlight({ editorRef, highlightId }) {
  if (!editorRef.current) return;

  const targetElement = editorRef.current.querySelector(
    `#${CSS.escape(highlightId)}`
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
    }
  );
}

function resolvePublishedRuntimeRef({ row, publishedRuntimeRef }) {
  if (
    publishedRuntimeRef &&
    typeof publishedRuntimeRef === "object" &&
    typeof publishedRuntimeRef.object_type_key === "string" &&
    typeof publishedRuntimeRef.runtime_entity_id === "string"
  ) {
    return {
      object_type_key: publishedRuntimeRef.object_type_key,
      runtime_entity_id: publishedRuntimeRef.runtime_entity_id,
      view_key:
        typeof publishedRuntimeRef.view_key === "string"
          ? publishedRuntimeRef.view_key
          : null,
      catalog_version:
        typeof publishedRuntimeRef.catalog_version === "string"
          ? publishedRuntimeRef.catalog_version
          : null,
      runtime_route:
        typeof publishedRuntimeRef.runtime_route === "string"
          ? publishedRuntimeRef.runtime_route
          : null,
    };
  }

  const rowRef = row && typeof row === "object" ? row : {};
  const objectTypeKey =
    typeof rowRef.object_type_key === "string"
      ? rowRef.object_type_key
      : typeof rowRef.objectTypeKey === "string"
        ? rowRef.objectTypeKey
        : null;
  const runtimeEntityId =
    typeof rowRef.runtime_entity_id === "string"
      ? rowRef.runtime_entity_id
      : typeof rowRef.runtimeEntityId === "string"
        ? rowRef.runtimeEntityId
        : null;
  const viewKey =
    typeof rowRef.view_key === "string"
      ? rowRef.view_key
      : typeof rowRef.viewKey === "string"
        ? rowRef.viewKey
        : null;
  const catalogVersion =
    typeof rowRef.catalog_version === "string"
      ? rowRef.catalog_version
      : typeof rowRef.catalogVersion === "string"
        ? rowRef.catalogVersion
        : null;
  const runtimeRoute =
    typeof rowRef.runtime_route === "string"
      ? rowRef.runtime_route
      : typeof rowRef.runtimeRoute === "string"
        ? rowRef.runtimeRoute
        : null;

  if (!objectTypeKey || !runtimeEntityId) {
    return null;
  }

  return {
    object_type_key: objectTypeKey,
    runtime_entity_id: runtimeEntityId,
    view_key: viewKey,
    catalog_version: catalogVersion,
    runtime_route: runtimeRoute,
  };
}

export default function EntityCardNotes({
  row,
  entityType = "table_row",
  initialContext = null,
  publishedRuntimeRef = null,
  onCountChange,
}) {
  const entityId = getEntityId(row);
  const tableId = getTableId(row);
  const resolvedPublishedRuntimeRef = resolvePublishedRuntimeRef({
    row,
    publishedRuntimeRef,
  });

  const shouldOpenFullscreenInitially = initialContext?.tab === "notes";

  const editorRef = useRef(null);
  const saveTimeoutRef = useRef(null);
  const onCountChangeRef = useRef(onCountChange);
  const colorPickerRef = useRef(null);
  const mentionButtonRef = useRef(null);
  const savedSelectionRef = useRef(null);

  const [content, setContent] = useState("");
  const [lastPublishedContent, setLastPublishedContent] = useState("");
  const [hasUnpublishedMentions, setHasUnpublishedMentions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");

  const [isFullscreen, setIsFullscreen] = useState(
    shouldOpenFullscreenInitially
  );

  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [isMentionOpen, setIsMentionOpen] = useState(false);
  const [mentionPosition, setMentionPosition] = useState(null);
  const [users, setUsers] = useState([]);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isPublishConfirmOpen, setIsPublishConfirmOpen] = useState(false);

  const publishStatus = hasUnpublishedMentions
    ? "Есть неопубликованные упоминания"
    : saveStatus;

  useEffect(() => {
    onCountChangeRef.current = onCountChange;
  }, [onCountChange]);

  useEffect(() => {
    if (initialContext?.tab !== "notes") return;

    setIsFullscreen(true);
  }, [initialContext]);

  useEffect(() => {
    function handleBeforeUnload(event) {
      if (!hasUnpublishedMentions) return;

      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasUnpublishedMentions]);

  useEffect(() => {
    async function loadUsers() {
      try {
        const data = await loadSystemUsers();

        setUsers(data.map(normalizeUser).filter((user) => user.id));
      } catch (error) {
        console.error("Ошибка загрузки пользователей:", error);
        setUsers([]);
      }
    }

    loadUsers();
  }, []);

  useEffect(() => {
    function handlePointerDown(event) {
      if (!isColorPickerOpen) return;

      if (
        colorPickerRef.current &&
        colorPickerRef.current.contains(event.target)
      ) {
        return;
      }

      setIsColorPickerOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown, true);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
    };
  }, [isColorPickerOpen]);

  useEffect(() => {
    let isMounted = true;

    async function loadNote() {
      if (!entityId) {
        setContent("");
        setLastPublishedContent("");
        setHasUnpublishedMentions(false);
        return;
      }

      setIsLoading(true);

      try {
        const note = await getNote({
          entityType,
          entityId: String(entityId),
        });

        if (!isMounted) return;

        const nextContent = note?.content || "";

        const storageKey = getLastPublishedStorageKey({
          entityType,
          entityId: String(entityId),
        });

        const storedLastPublishedContent = localStorage.getItem(storageKey);

        const nextLastPublishedContent =
          storedLastPublishedContent ?? nextContent;

        if (!storedLastPublishedContent) {
          localStorage.setItem(storageKey, nextContent);
        }

        setContent(nextContent);
        setLastPublishedContent(nextLastPublishedContent);

        setHasUnpublishedMentions(
          hasNewMentionsAfterPublish(nextContent, nextLastPublishedContent)
        );

        if (typeof onCountChangeRef.current === "function") {
          onCountChangeRef.current(hasContent(nextContent) ? 1 : 0);
        }

        setSaveStatus(
          hasContent(nextContent) ? `Сохранено в ${getCurrentTimeLabel()}` : ""
        );
      } catch (error) {
        console.error("Ошибка загрузки заметки:", error);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadNote();

    return () => {
      isMounted = false;

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [entityId, entityType]);

  useEffect(() => {
    if (isLoading) return;

    requestAnimationFrame(() => {
      if (!editorRef.current) return;

      const currentHtml = editorRef.current.innerHTML || "";

      if (currentHtml === (content || "")) return;

      editorRef.current.innerHTML = content || "";
    });
  }, [isLoading, isFullscreen, entityId]);

  useEffect(() => {
    const highlightId = initialContext?.highlight_id || initialContext?.highlightId;

    if (!highlightId) return;

    requestAnimationFrame(() => {
      scrollToHighlight({
        editorRef,
        highlightId,
      });
    });
  }, [isFullscreen, entityId, initialContext, content]);

  function saveCurrentSelection() {
    const selection = window.getSelection();

    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);

    if (
      editorRef.current &&
      editorRef.current.contains(range.commonAncestorContainer)
    ) {
      savedSelectionRef.current = range.cloneRange();
    }
  }

  function restoreSelection() {
    const range = savedSelectionRef.current;

    if (!range) return;

    const selection = window.getSelection();

    if (!selection) return;

    selection.removeAllRanges();
    selection.addRange(range);
  }

  function scheduleSave(nextContent) {
    setContent(nextContent);

    if (hasNewMentionsAfterPublish(nextContent, lastPublishedContent)) {
      setHasUnpublishedMentions(true);
    }

    if (typeof onCountChangeRef.current === "function") {
      onCountChangeRef.current(hasContent(nextContent) ? 1 : 0);
    }

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    setSaveStatus(hasContent(nextContent) ? "Автосохранение..." : "");

    saveTimeoutRef.current = setTimeout(async () => {
      if (!entityId) return;

      try {
        await upsertNote({
          entityType,
          entityId: String(entityId),
          content: nextContent,
          format: "html",
        });

        setSaveStatus(`Автосохранено в ${getCurrentTimeLabel()}`);
      } catch (error) {
        console.error("Ошибка автосохранения заметки:", error);
        setSaveStatus("Не удалось автосохранить");
      }
    }, 500);
  }

  function exec(command, value = null) {
    editorRef.current?.focus();

    document.execCommand(command, false, value);

    const html = editorRef.current?.innerHTML || "";

    scheduleSave(html);
  }

  function closeMentionPopover() {
    setIsMentionOpen(false);
    setMentionPosition(null);
  }

  function handleToggleMention() {
    setIsColorPickerOpen(false);

    saveCurrentSelection();

    const rect = mentionButtonRef.current?.getBoundingClientRect();

    setMentionPosition(getPopoverPosition(rect));
    setIsMentionOpen((value) => !value);
  }

  function insertMention(user) {
    const normalizedUser = normalizeUser(user);

    if (!normalizedUser.id) return;

    const mentionKey = `note-mention-user-${normalizedUser.id}-${Date.now()}`;

    restoreSelection();

    editorRef.current?.focus();

    const html = `
      <span
        id="${mentionKey}"
        data-note-mention-user-id="${normalizedUser.id}"
        data-note-mention-key="${mentionKey}"
        contenteditable="false"
        style="${mentionChipStyle}"
      >@${normalizedUser.label}</span>&nbsp;
    `;

    document.execCommand("insertHTML", false, html);

    const nextContent = editorRef.current?.innerHTML || "";

    scheduleSave(nextContent);
    setHasUnpublishedMentions(true);
    closeMentionPopover();
  }

  function handleSelectColor(color) {
    setIsColorPickerOpen(false);
    exec("foreColor", color);
  }

  function handleToggleColorPicker(event) {
    event.stopPropagation();

    setIsMentionOpen(false);
    setIsColorPickerOpen((value) => !value);
  }

  function handleToggleFullscreen() {
    setIsColorPickerOpen(false);
    setIsMentionOpen(false);
    setIsFullscreen((value) => !value);
  }

  async function handlePublishNote() {
    if (!entityId || isPublishing) return;

    const html = editorRef.current?.innerHTML || content || "";

    const { mentionedUserIds, mentionKeys } = collectMentionPayloadFromHtml(html);

    try {
      setIsPublishing(true);
      setSaveStatus("Сохранение...");

      if (!resolvedPublishedRuntimeRef) {
        console.warn(
          "[EntityCardNotes] publishedRuntimeRef is missing; note_mention will not include canonical runtime reference."
        );
      }

      const note = await publishNote({
        entityType,
        entityId: String(entityId),
        tableId,
        publishedRuntimeRef: resolvedPublishedRuntimeRef,
        content: html,
        format: "html",
        mentionedUserIds,
        mentionKeys,
      });

      const nextContent = note?.content || html;

      setContent(nextContent);
      setLastPublishedContent(nextContent);
      setHasUnpublishedMentions(false);
      setSaveStatus(`Сохранено в ${getCurrentTimeLabel()}`);
      setIsPublishConfirmOpen(false);

      localStorage.setItem(
        getLastPublishedStorageKey({
          entityType,
          entityId: String(entityId),
        }),
        nextContent
      );
    } catch (error) {
      console.error("Ошибка публикации заметки:", error);
      setSaveStatus("Не удалось сохранить");
    } finally {
      setIsPublishing(false);
    }
  }

  function handleIgnorePublishWarning() {
    const html = editorRef.current?.innerHTML || content || "";

    setLastPublishedContent(html);
    setHasUnpublishedMentions(false);
    setIsPublishConfirmOpen(false);

    localStorage.setItem(
      getLastPublishedStorageKey({
        entityType,
        entityId: String(entityId),
      }),
      html
    );
  }

  const editorContent = (
    <>
      <EntityCardNotesToolbar
        isFullscreen={isFullscreen}
        isPublishing={isPublishing}
        isColorPickerOpen={isColorPickerOpen}
        publishStatus={publishStatus}
        hasUnpublishedMentions={hasUnpublishedMentions}
        colorPickerRef={colorPickerRef}
        mentionButtonRef={mentionButtonRef}
        onSaveSelection={saveCurrentSelection}
        onExec={exec}
        onSelectColor={handleSelectColor}
        onToggleColorPicker={handleToggleColorPicker}
        onToggleMention={handleToggleMention}
        onToggleFullscreen={handleToggleFullscreen}
        onPublish={handlePublishNote}
      />

      {isLoading ? (
        <div style={loadingStyle}>Загрузка...</div>
      ) : (
        <div
          style={{
            ...editorBoxStyle,
            ...(isFullscreen ? fullscreenEditorBoxStyle : {}),
          }}
        >
          {!hasContent(content) && (
            <div style={placeholderStyle}>Начните писать заметки...</div>
          )}

          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            style={{
              ...editorStyle,
              ...(isFullscreen ? fullscreenEditorStyle : {}),
            }}
            onMouseUp={saveCurrentSelection}
            onKeyUp={saveCurrentSelection}
            onInput={(event) => {
              scheduleSave(event.currentTarget.innerHTML);
            }}
          />

          {saveStatus && <div style={saveStatusStyle}>{saveStatus}</div>}
        </div>
      )}

      {isMentionOpen &&
        mentionPosition &&
        createPortal(
          <>
            <div
              style={mentionPopoverOverlayStyle}
              onMouseDown={closeMentionPopover}
            />

            <div
              style={{
                ...mentionPopoverStyle,
                top: mentionPosition.top,
                left: mentionPosition.left,
              }}
              onMouseDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
              }}
            >
              {users.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  style={mentionUserButtonStyle}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    insertMention(user);
                  }}
                >
                  <div style={mentionAvatarStyle}>
                    {user.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt=""
                        draggable={false}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          display: "block",
                        }}
                      />
                    ) : (
                      getInitials(user.label)
                    )}
                  </div>

                  <div
                    style={{
                      minWidth: 0,
                      display: "flex",
                      flexDirection: "column",
                      gap: 2,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: "#0F172A",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {user.label}
                    </div>

                    <div
                      style={{
                        fontSize: 12,
                        color: "#64748B",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {user.email}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </>,
          document.body
        )}

      {isPublishConfirmOpen &&
        createPortal(
          <div style={publishConfirmOverlayStyle}>
            <div style={publishConfirmModalStyle}>
              <div style={publishConfirmTitleStyle}>
                Есть неопубликованные упоминания
              </div>

              <div style={publishConfirmTextStyle}>
                В заметке есть новые упоминания пользователей. Нужно опубликовать
                заметку, чтобы отправить уведомления.
              </div>

              <div style={publishConfirmActionsStyle}>
                <button
                  type="button"
                  style={publishConfirmSecondaryButtonStyle}
                  onClick={handleIgnorePublishWarning}
                >
                  Не отправлять
                </button>

                <button
                  type="button"
                  style={publishConfirmPrimaryButtonStyle}
                  disabled={isPublishing}
                  onClick={handlePublishNote}
                >
                  Опубликовать
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );

  if (isFullscreen) {
    return (
      <div style={fullscreenOverlayStyle}>
        <div style={fullscreenInnerStyle}>{editorContent}</div>
      </div>
    );
  }

  return <div style={wrapperStyle}>{editorContent}</div>;
}