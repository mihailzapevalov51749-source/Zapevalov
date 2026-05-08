import { useEffect, useRef, useState } from "react";
import BlockStyleToolbar from "../../blocks/components/BlockStyleToolbar";

const API_BASE_URL = "http://127.0.0.1:8010";
const IMAGE_STYLE_EDITOR_EVENT = "image-style-editor-opened";

export default function ImageBlockView({
  block,
  isEditMode,
  onEdit,
  onBlockUpdated,
}) {
  const blockRef = useRef(null);
  const [isEditingImage, setIsEditingImage] = useState(false);

  const imageSrc = getImageValue(block);
  const iconSrc = getIconValue(block);

  const settings = block.settings || {};
  const appearance = settings.appearance || {};

  const showTitle = settings.show_title === true;
  const radius = settings.borderRadius ?? 12;
  const fit = settings.fit || "cover";

  useEffect(() => {
    if (!isEditMode) {
      setIsEditingImage(false);
      return;
    }

    const handleGlobalPointerDown = (event) => {
      const clickedInside = blockRef.current?.contains(event.target);

      if (!clickedInside) {
        setIsEditingImage(false);
      }
    };

    const handleAnotherImageOpened = (event) => {
      const activeBlockId = event.detail?.blockId;

      if (String(activeBlockId) !== String(block.id)) {
        setIsEditingImage(false);
      }
    };

    window.addEventListener("pointerdown", handleGlobalPointerDown, true);
    window.addEventListener(IMAGE_STYLE_EDITOR_EVENT, handleAnotherImageOpened);

    return () => {
      window.removeEventListener("pointerdown", handleGlobalPointerDown, true);
      window.removeEventListener(
        IMAGE_STYLE_EDITOR_EVENT,
        handleAnotherImageOpened
      );
    };
  }, [isEditMode, block.id]);

  const backgroundEnabled =
    appearance.viewMode?.backgroundEnabled ??
    appearance.backgroundEnabled ??
    false;

  const borderEnabled =
    appearance.viewMode?.borderEnabled ??
    appearance.borderEnabled ??
    false;

  const shadowEnabled = appearance.shadowEnabled ?? false;

  const updateSettings = (nextSettings) => {
    onBlockUpdated?.({
      ...block,
      settings: {
        ...(block.settings || {}),
        ...nextSettings,
      },
    });
  };

  const updateAppearance = (nextAppearance) => {
    updateSettings({
      appearance: {
        ...(appearance || {}),
        ...nextAppearance,
      },
    });
  };

  const toggleBackground = () => {
    updateAppearance({
      backgroundEnabled: !backgroundEnabled,
      viewMode: {
        ...(appearance.viewMode || {}),
        backgroundEnabled: !backgroundEnabled,
      },
    });
  };

  const toggleBorder = () => {
    updateAppearance({
      borderEnabled: !borderEnabled,
      viewMode: {
        ...(appearance.viewMode || {}),
        borderEnabled: !borderEnabled,
      },
    });
  };

  const toggleShadow = () => {
    updateAppearance({
      shadowEnabled: !shadowEnabled,
    });
  };

  const changeDensity = (density) => {
    updateSettings({
      density,
      appearance: {
        ...(appearance || {}),
        padding: getDensityPadding(density),
      },
    });
  };

  const changeVariant = (variant) => {
    updateSettings({ variant });
  };

  const handleImageClick = (event) => {
    if (!isEditMode) return;

    event.preventDefault();
    event.stopPropagation();

    window.dispatchEvent(
      new CustomEvent(IMAGE_STYLE_EDITOR_EVENT, {
        detail: {
          blockId: block.id,
        },
      })
    );

    setIsEditingImage(true);
    onEdit?.(block);
  };

  return (
    <div
      ref={blockRef}
      data-image-block-content="true"
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        gap: showTitle ? 14 : 0,
        overflow: "hidden",
        borderRadius: radius,
        background: backgroundEnabled ? "#ffffff" : "transparent",
        border: borderEnabled ? "1px solid #e2e8f0" : "none",
        boxShadow: shadowEnabled ? "0 4px 16px rgba(0,0,0,0.08)" : "none",
        padding: appearance.padding ?? 0,
        position: "relative",
        boxSizing: "border-box",
        cursor: isEditMode ? "pointer" : "default",
      }}
    >
      {isEditMode && isEditingImage && (
        <div
          data-inline-editor="true"
          onPointerDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          style={{
            display: "flex",
            gap: 6,
            flexWrap: "wrap",
            marginBottom: 8,
          }}
        >
          <BlockStyleToolbar
            settings={settings}
            appearance={appearance}
            onBackground={toggleBackground}
            onBorder={toggleBorder}
            onShadow={toggleShadow}
            onDensityChange={changeDensity}
            onVariantChange={changeVariant}
          />
        </div>
      )}

      {showTitle && (
        <div
          onClick={handleImageClick}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexShrink: 0,
          }}
        >
          {iconSrc && (
            <img
              src={getFileSrc(iconSrc)}
              alt=""
              draggable={false}
              style={{
                width: 36,
                height: 36,
                objectFit: "contain",
                flexShrink: 0,
              }}
            />
          )}

          <h3
            style={{
              margin: 0,
              fontSize: 20,
              fontWeight: 800,
              color: "#020617",
            }}
          >
            {block.title || "Изображение"}
          </h3>
        </div>
      )}

      <div
        onClick={handleImageClick}
        style={{
          width: "100%",
          height: "100%",
          flex: 1,
          overflow: "hidden",
          borderRadius: radius,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {imageSrc ? (
          <img
            src={getFileSrc(imageSrc)}
            alt={block.title || ""}
            draggable={false}
            style={{
              width: fit === "cover" ? "100%" : "auto",
              height: fit === "cover" ? "100%" : "auto",
              maxWidth: "100%",
              maxHeight: "100%",
              objectFit: fit,
              objectPosition: "center",
              display: "block",
            }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              minHeight: 120,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#64748b",
              fontSize: 16,
            }}
          >
            Изображение не выбрано
          </div>
        )}
      </div>
    </div>
  );
}

function getDensityPadding(density) {
  const values = {
    compact: 6,
    normal: 10,
    spacious: 16,
  };

  return values[density] ?? values.normal;
}

function getImageValue(block) {
  return (
    block.content?.image_url ||
    block.content?.imageUrl ||
    block.content?.url ||
    block.content?.file_url ||
    block.content?.fileUrl ||
    block.settings?.image_url ||
    block.settings?.imageUrl ||
    block.settings?.url ||
    ""
  );
}

function getIconValue(block) {
  return (
    block.icon_url ||
    block.iconUrl ||
    block.icon ||
    block.content?.icon_url ||
    block.content?.iconUrl ||
    block.settings?.icon_url ||
    block.settings?.iconUrl ||
    ""
  );
}

function getFileSrc(src) {
  if (!src) return "";
  if (src.startsWith("blob:")) return src;
  if (src.startsWith("http")) return src;

  return `${API_BASE_URL}${src}`;
}