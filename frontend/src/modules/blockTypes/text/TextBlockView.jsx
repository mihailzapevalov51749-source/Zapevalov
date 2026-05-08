import { useEffect, useRef, useState } from "react";
import { updateBlock } from "../../blocks/services/blockService";
import BlockStyleToolbar from "../../blocks/components/BlockStyleToolbar";
import { getBlockAppearanceStyles } from "../../blocks/utils/blockAppearance";

const GRID_ROW_HEIGHT = 10;
const GRID_GAP = 2;
const MIN_TEXT_BLOCK_ROWS = 4;

export default function TextBlockView({ block, isEditMode, onBlockUpdated }) {
  const textareaRef = useRef(null);
  const textViewRef = useRef(null);
  const toolbarRef = useRef(null);

  const settings = block?.settings || {};
  const appearance = settings.appearance || {};
  const content = block?.content || {};
  const position = settings.position || {};

  const initialText =
    content.text || content.value || block?.text || settings.text || "";

  const [draftText, setDraftText] = useState(initialText);
  const [savedText, setSavedText] = useState(initialText);
  const [isEditingText, setIsEditingText] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const showTitle = settings.show_title !== false;
  const variant = settings.variant || "default";
  const density = settings.density || "normal";
  const textWidth = settings.textWidth || appearance.contentWidth || "full";

  const variantStyle = getVariantStyle(variant);
  const densityStyle = getDensityStyle(density);
  const maxWidth = getTextMaxWidth(textWidth);

  const blockAppearanceStyle = getBlockAppearanceStyles({
    settings,
    appearance,
    variantStyle,
    densityStyle,
    isEditMode,
  });

  const DragHandle = () => (
    <div
      data-block-drag-handle="true"
      title="Переместить"
      style={{
        position: "absolute",
        left: 0,
        top: 6,
        width: 10,
        height: 18,
        display: "grid",
        gridTemplateColumns: "repeat(2, 2px)",
        gridTemplateRows: "repeat(3, 2px)",
        gap: 2,
        alignItems: "center",
        justifyContent: "center",
        cursor: "grab",
        opacity: 0.5,
        zIndex: 10,
      }}
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <span
          key={i}
          style={{
            width: 2,
            height: 2,
            borderRadius: "50%",
            background: "#64748b",
            pointerEvents: "none",
          }}
        />
      ))}
    </div>
  );

  useEffect(() => {
    setDraftText(initialText);
    setSavedText(initialText);
  }, [initialText]);

  useEffect(() => {
    if (!isEditingText && textViewRef.current) {
      setTimeout(() => {
        updateLocalHeight(textViewRef.current, false);
      }, 0);
    }
  }, [savedText, isEditingText]);

  useEffect(() => {
    if (isEditingText && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(
        textareaRef.current.value.length,
        textareaRef.current.value.length
      );

      recalculateEditingHeight();
    }
  }, [isEditingText]);

  const recalculateEditingHeight = () => {
    [0, 50, 150].forEach((delay) => {
      setTimeout(() => {
        if (textareaRef.current) {
          autoResizeTextarea(textareaRef.current);
          updateLocalHeight(textareaRef.current, true);
        }
      }, delay);
    });
  };

  const startEdit = (event) => {
    if (!isEditMode) return;

    event.preventDefault();
    event.stopPropagation();

    setIsEditingText(true);
    recalculateEditingHeight();
  };

  const getNextRows = (element, includeToolbar = false) => {
    return calculateTextBlockRows({
      textElement: element,
      toolbarElement: includeToolbar ? toolbarRef.current : null,
      settings,
      appearance,
      showTitle: showTitle && Boolean(block?.title),
    });
  };

  const updateLocalHeight = (element, includeToolbar = false) => {
    if (!element || !block?.id) return;

    const nextRows = getNextRows(element, includeToolbar);
    const currentRows = Number(position.h || MIN_TEXT_BLOCK_ROWS);

    if (nextRows === currentRows) return;

    onBlockUpdated?.({
      ...block,
      settings: {
        ...(block.settings || {}),
        position: {
          ...(position || {}),
          h: nextRows,
        },
      },
    });
  };

  const saveText = async () => {
    if (!block?.id || isSaving) return;

    const nextText = draftText;
    const measureElement = textareaRef.current || textViewRef.current;

    const nextRows = measureElement
      ? getNextRows(measureElement, false)
      : Number(position.h || MIN_TEXT_BLOCK_ROWS);

    try {
      setIsSaving(true);

      const nextSettings = {
        ...(block.settings || {}),
        position: {
          ...(position || {}),
          h: nextRows,
        },
      };

      const savedBlock = await updateBlock(block.id, {
        content: {
          ...(block.content || {}),
          text: nextText,
        },
        settings: nextSettings,
      });

      const updatedBlock = {
        ...block,
        ...savedBlock,
        content: {
          ...(block.content || {}),
          ...(savedBlock?.content || {}),
          text: nextText,
        },
        settings: {
          ...(block.settings || {}),
          ...(savedBlock?.settings || {}),
          position: {
            ...(position || {}),
            ...(savedBlock?.settings?.position || {}),
            h: nextRows,
          },
        },
      };

      setSavedText(nextText);
      setDraftText(nextText);
      onBlockUpdated?.(updatedBlock);
      setIsEditingText(false);
    } catch (error) {
      console.error("Ошибка сохранения текста", error);
    } finally {
      setIsSaving(false);
    }
  };

  const cancelEdit = () => {
    setDraftText(savedText);
    setIsEditingText(false);

    setTimeout(() => {
      if (textViewRef.current) {
        updateLocalHeight(textViewRef.current, false);
      }
    }, 0);
  };

  const handleKeyDown = async (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      await saveText();
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      cancelEdit();
    }
  };

  const handleTextChange = (event) => {
    setDraftText(event.target.value);
    autoResizeTextarea(event.target);
    updateLocalHeight(event.target, true);
  };

  const updateTextSettings = async (nextPartialSettings) => {
    if (!block?.id || isSaving) return;

    try {
      setIsSaving(true);

      const nextSettings = {
        ...(block.settings || {}),
        ...nextPartialSettings,
        position: {
          ...(block.settings?.position || {}),
        },
      };

      const savedBlock = await updateBlock(block.id, {
        content: {
          ...(block.content || {}),
          text: draftText,
        },
        settings: nextSettings,
      });

      onBlockUpdated?.({
        ...block,
        ...savedBlock,
        content: {
          ...(block.content || {}),
          ...(savedBlock?.content || {}),
          text: draftText,
        },
        settings: {
          ...(block.settings || {}),
          ...(savedBlock?.settings || {}),
          ...nextPartialSettings,
          position: {
            ...(block.settings?.position || {}),
            ...(savedBlock?.settings?.position || {}),
          },
        },
      });

      setTimeout(() => {
        const element = isEditingText ? textareaRef.current : textViewRef.current;
        if (element) {
          updateLocalHeight(element, isEditingText);
        }
      }, 0);
    } catch (error) {
      console.error("Ошибка сохранения настроек текста", error);
    } finally {
      setIsSaving(false);
    }
  };

  const updateAppearanceSettings = (nextPartialAppearance) => {
    updateTextSettings({
      appearance: {
        ...(settings.appearance || {}),
        ...nextPartialAppearance,
      },
    });
  };

  const toggleBold = () => {
    const nextWeight = Number(settings.fontWeight || 400) >= 700 ? 400 : 700;
    updateTextSettings({ fontWeight: nextWeight });
  };

  const toggleItalic = () => {
    const nextStyle = settings.fontStyle === "italic" ? "normal" : "italic";
    updateTextSettings({ fontStyle: nextStyle });
  };

  const toggleBackground = () => {
    const currentValue =
      appearance.viewMode?.backgroundEnabled ??
      appearance.backgroundEnabled ??
      settings.showBackground !== false;

    updateAppearanceSettings({
      backgroundEnabled: !currentValue,
      viewMode: {
        ...(appearance.viewMode || {}),
        backgroundEnabled: !currentValue,
      },
      editMode: {
        ...(appearance.editMode || {}),
        backgroundEnabled: true,
      },
    });
  };

  const toggleBorder = () => {
    const currentValue =
      appearance.viewMode?.borderEnabled ??
      appearance.borderEnabled ??
      settings.showBackground !== false;

    updateAppearanceSettings({
      borderEnabled: !currentValue,
      viewMode: {
        ...(appearance.viewMode || {}),
        borderEnabled: !currentValue,
      },
      editMode: {
        ...(appearance.editMode || {}),
        borderEnabled: true,
      },
    });
  };

  const toggleShadow = () => {
    updateAppearanceSettings({
      shadowEnabled: !(appearance.shadowEnabled ?? false),
    });
  };

  const changeFontSize = (delta) => {
    const currentSize = Number(settings.fontSize || 16);
    updateTextSettings({ fontSize: clamp(currentSize + delta, 10, 72) });
  };

  const changeAlign = (textAlign) => {
    updateTextSettings({ textAlign });
  };

  const changeVariant = (nextVariant) => {
    updateTextSettings({ variant: nextVariant });
  };

  const changeDensity = (nextDensity) => {
    const nextPadding = getDensityStyle(nextDensity).padding;

    updateTextSettings({
      density: nextDensity,
      appearance: {
        ...(settings.appearance || {}),
        padding: nextPadding,
      },
    });
  };

  return (
    <div
      data-text-block-content="true"
      onMouseDown={(event) => {
        if (isEditingText) event.stopPropagation();
      }}
      style={{
        width: "100%",
        minHeight: "fit-content",
        fontFamily: "inherit",
        color: settings.color || "#0f172a",
        position: "relative",
        paddingLeft: isEditMode ? 16 : 0,
        boxSizing: "border-box",
        ...blockAppearanceStyle,
      }}
    >
      {isEditMode && !isEditingText && <DragHandle />}

      {isSaving && (
        <div
          style={{
            position: "absolute",
            right: 10,
            top: 8,
            zIndex: 10,
            fontSize: 11,
            color: "#64748b",
            background: "rgba(255,255,255,0.86)",
            borderRadius: 6,
            padding: "2px 6px",
          }}
        >
          Сохранение...
        </div>
      )}

      {isEditingText && (
        <InlineTextToolbar
          refElement={toolbarRef}
          settings={settings}
          appearance={appearance}
          onBold={toggleBold}
          onItalic={toggleItalic}
          onFontSizeIncrease={() => changeFontSize(1)}
          onFontSizeDecrease={() => changeFontSize(-1)}
          onAlignLeft={() => changeAlign("left")}
          onAlignCenter={() => changeAlign("center")}
          onAlignRight={() => changeAlign("right")}
          onBackground={toggleBackground}
          onBorder={toggleBorder}
          onShadow={toggleShadow}
          onDensityChange={changeDensity}
          onVariantChange={changeVariant}
        />
      )}

      <div
        style={{
          width: "100%",
          maxWidth,
          margin:
            settings.textAlign === "center" || textWidth !== "full"
              ? "0 auto"
              : 0,
        }}
      >
        {showTitle && block?.title && (
          <h3
            style={{
              margin: "0 0 12px",
              fontSize: settings.titleSize || 22,
              lineHeight: 1.25,
              fontWeight: 800,
              color: settings.titleColor || "#0f172a",
            }}
          >
            {block.title}
          </h3>
        )}

        {isEditingText ? (
          <textarea
            ref={textareaRef}
            data-inline-editor="true"
            value={draftText}
            onChange={handleTextChange}
            onBlur={saveText}
            onKeyDown={handleKeyDown}
            onClick={(event) => event.stopPropagation()}
            style={{
              width: "100%",
              minHeight: 24,
              height: "auto",
              resize: "none",
              overflow: "hidden",
              border: "1px dashed #2563eb",
              outline: "none",
              borderRadius: 8,
              padding: 8,
              boxSizing: "border-box",
              background: "rgba(255,255,255,0.72)",
              color: settings.color || "#0f172a",
              fontFamily: "inherit",
              whiteSpace: "pre-wrap",
              fontSize: settings.fontSize || 16,
              lineHeight: settings.lineHeight || 1.6,
              textAlign: settings.textAlign || "left",
              fontWeight: settings.fontWeight || 400,
              fontStyle: settings.fontStyle || "normal",
              letterSpacing: settings.letterSpacing || 0,
            }}
          />
        ) : (
          <div
            ref={textViewRef}
            onClick={startEdit}
            style={{
              minHeight: 24,
              whiteSpace: "pre-wrap",
              fontSize: settings.fontSize || 16,
              lineHeight: settings.lineHeight || 1.6,
              textAlign: settings.textAlign || "left",
              fontWeight: settings.fontWeight || 400,
              fontStyle: settings.fontStyle || "normal",
              letterSpacing: settings.letterSpacing || 0,
              wordBreak: "break-word",
              color: savedText ? settings.color || "#0f172a" : "#94a3b8",
              cursor: isEditMode ? "text" : "default",
            }}
          >
            {savedText || (isEditMode ? "Введите текст блока" : "")}
          </div>
        )}
      </div>
    </div>
  );
}

function InlineTextToolbar({
  refElement,
  settings,
  appearance,
  onBold,
  onItalic,
  onFontSizeIncrease,
  onFontSizeDecrease,
  onAlignLeft,
  onAlignCenter,
  onAlignRight,
  onBackground,
  onBorder,
  onShadow,
  onDensityChange,
  onVariantChange,
}) {
  return (
    <div
      ref={refElement}
      data-inline-editor="true"
      onMouseDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      style={{
        display: "flex",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 6,
        marginBottom: 10,
        padding: "0 0 8px",
        background: "transparent",
        border: "none",
      }}
    >
      <ToolbarButton
        active={Number(settings.fontWeight || 400) >= 700}
        onClick={onBold}
      >
        B
      </ToolbarButton>

      <ToolbarButton active={settings.fontStyle === "italic"} onClick={onItalic}>
        I
      </ToolbarButton>

      <ToolbarButton onClick={onFontSizeDecrease}>A-</ToolbarButton>
      <ToolbarButton onClick={onFontSizeIncrease}>A+</ToolbarButton>

      <ToolbarButton active={settings.textAlign === "left"} onClick={onAlignLeft}>
        ←
      </ToolbarButton>

      <ToolbarButton
        active={settings.textAlign === "center"}
        onClick={onAlignCenter}
      >
        ↔
      </ToolbarButton>

      <ToolbarButton active={settings.textAlign === "right"} onClick={onAlignRight}>
        →
      </ToolbarButton>

      <BlockStyleToolbar
        settings={settings}
        appearance={appearance}
        onBackground={onBackground}
        onBorder={onBorder}
        onShadow={onShadow}
        onDensityChange={onDensityChange}
        onVariantChange={onVariantChange}
      />
    </div>
  );
}

function ToolbarButton({ children, active = false, onClick }) {
  return (
    <button
      type="button"
      data-inline-editor="true"
      onMouseDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClick?.();
      }}
      style={{
        minWidth: 28,
        height: 28,
        padding: "0 8px",
        borderRadius: 6,
        border: active ? "1px solid #2563eb" : "1px solid #cbd5e1",
        background: active ? "#dbeafe" : "#ffffff",
        color: active ? "#1d4ed8" : "#0f172a",
        cursor: "pointer",
        fontSize: 12,
        fontWeight: 800,
      }}
    >
      {children}
    </button>
  );
}

function autoResizeTextarea(element) {
  if (!element) return;

  element.style.height = "auto";
  element.style.height = `${Math.max(24, element.scrollHeight)}px`;
}

function calculateTextBlockRows({
  textElement,
  toolbarElement,
  settings,
  appearance,
  showTitle,
}) {
  if (!textElement) return MIN_TEXT_BLOCK_ROWS;

  const padding = Number(
    appearance.padding ??
      settings.padding ??
      getDensityStyle(settings.density || "normal").padding
  );

  const titleReserve = showTitle ? 40 : 0;

  const toolbarReserve = toolbarElement
    ? toolbarElement.getBoundingClientRect().height + 14
    : 0;

  const textHeight = Math.max(
    textElement.scrollHeight || 0,
    textElement.getBoundingClientRect().height || 0,
    24
  );

  const fullHeight =
    toolbarReserve + titleReserve + textHeight + padding * 2 + 18;

  return Math.max(
    MIN_TEXT_BLOCK_ROWS,
    Math.ceil(fullHeight / (GRID_ROW_HEIGHT + GRID_GAP))
  );
}

function getVariantStyle(variant) {
  const variants = {
    default: { background: "#ffffff", border: "1px solid #e2e8f0" },
    clean: { background: "transparent", border: "none" },
    card: { background: "#ffffff", border: "1px solid #e2e8f0" },
    accent: { background: "#f8fafc", border: "1px solid #e2e8f0" },
    instruction: {
      background: "#eff6ff",
      border: "1px solid #bfdbfe",
      borderLeft: "4px solid #2563eb",
    },
    warning: {
      background: "#fff7ed",
      border: "1px solid #fed7aa",
      borderLeft: "4px solid #f97316",
    },
    quote: {
      background: "#f8fafc",
      border: "none",
      borderLeft: "4px solid #64748b",
    },
  };

  return variants[variant] || variants.default;
}

function getDensityStyle(density) {
  const densities = {
    compact: { padding: 12 },
    normal: { padding: 18 },
    spacious: { padding: 24 },
  };

  return densities[density] || densities.normal;
}

function getTextMaxWidth(textWidth) {
  const widths = {
    narrow: 560,
    medium: 760,
    wide: 960,
    full: "100%",
  };

  return widths[textWidth] || widths.full;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}