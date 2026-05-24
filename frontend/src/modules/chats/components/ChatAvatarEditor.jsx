import { useEffect, useRef, useState } from "react";

import { uploadAvatar } from "../../../api/authApi";

import deleteIcon from "../../../assets/icons/delet.png";
import updateIcon from "../../../assets/icons/update.png";

import { chatModalStyles } from "../styles/chatModalStyles";

export const DEFAULT_AVATAR_SETTINGS = {
  x: 0,
  y: 0,
  scale: 1,
};

const MIN_SCALE = 0.45;
const MAX_SCALE = 3;

export function normalizeAvatarSettings(settings) {
  if (!settings) return DEFAULT_AVATAR_SETTINGS;

  if (typeof settings === "string") {
    try {
      return {
        ...DEFAULT_AVATAR_SETTINGS,
        ...JSON.parse(settings),
      };
    } catch {
      return DEFAULT_AVATAR_SETTINGS;
    }
  }

  if (typeof settings === "object") {
    return {
      ...DEFAULT_AVATAR_SETTINGS,
      ...settings,
    };
  }

  return DEFAULT_AVATAR_SETTINGS;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getAvatarTransform(settings) {
  const normalized = normalizeAvatarSettings(settings);

  return `translate(${normalized.x}px, ${normalized.y}px) scale(${normalized.scale})`;
}

export default function ChatAvatarEditor({
  avatarUrl,
  avatarSettings,
  title,
  onChange,
}) {
  const fileInputRef = useRef(null);
  const avatarCircleRef = useRef(null);
  const dragStateRef = useRef(null);
  const suppressClickRef = useRef(false);

  const [isUploading, setIsUploading] = useState(false);

  const settings = normalizeAvatarSettings(avatarSettings);

  const initials =
    String(title || "Ч").trim().charAt(0).toUpperCase() || "Ч";

  useEffect(() => {
    function handleMouseMove(event) {
      if (!dragStateRef.current) return;

      event.preventDefault();

      const dx = event.clientX - dragStateRef.current.startX;
      const dy = event.clientY - dragStateRef.current.startY;

      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        suppressClickRef.current = true;
      }

      onChange?.({
        avatar_url: avatarUrl,
        avatar_settings: {
          ...settings,
          x: clamp(dragStateRef.current.initialX + dx, -120, 120),
          y: clamp(dragStateRef.current.initialY + dy, -120, 120),
        },
      });
    }

    function handleMouseUp() {
      dragStateRef.current = null;
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [avatarUrl, settings, onChange]);

  useEffect(() => {
    const avatarElement = avatarCircleRef.current;

    if (!avatarElement) return;

    function handleWheel(event) {
      if (!avatarUrl) return;

      event.preventDefault();
      event.stopPropagation();

      const direction = event.deltaY > 0 ? -0.06 : 0.06;

      onChange?.({
        avatar_url: avatarUrl,
        avatar_settings: {
          ...settings,
          scale: clamp(
            Number((settings.scale + direction).toFixed(2)),
            MIN_SCALE,
            MAX_SCALE
          ),
        },
      });
    }

    avatarElement.addEventListener("wheel", handleWheel, {
      passive: false,
    });

    return () => {
      avatarElement.removeEventListener("wheel", handleWheel);
    };
  }, [avatarUrl, settings, onChange]);

  function handleMouseDown(event) {
    if (!avatarUrl) return;

    event.preventDefault();
    event.stopPropagation();

    suppressClickRef.current = false;

    dragStateRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      initialX: settings.x || 0,
      initialY: settings.y || 0,
    };
  }

  function handleAvatarClick() {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }

    fileInputRef.current?.click();
  }

  async function handleUpload(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    try {
      setIsUploading(true);

      const result = await uploadAvatar(file);

      onChange?.({
        avatar_url:
          result?.absolute_url ||
          result?.avatar_url ||
          result?.url ||
          "",
        avatar_settings: DEFAULT_AVATAR_SETTINGS,
      });
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  }

  function handleReset(event) {
    event.stopPropagation();

    onChange?.({
      avatar_url: avatarUrl,
      avatar_settings: DEFAULT_AVATAR_SETTINGS,
    });
  }

  function handleDelete(event) {
    event.stopPropagation();

    onChange?.({
      avatar_url: "",
      avatar_settings: DEFAULT_AVATAR_SETTINGS,
    });
  }

  return (
    <div style={chatModalStyles.avatarEditor}>
      <div
        ref={avatarCircleRef}
        style={chatModalStyles.avatarCircle}
        onMouseDown={handleMouseDown}
        onClick={handleAvatarClick}
        title="Клик — заменить фото. Зажать и двигать — положение. Колесо — масштаб."
      >
        {avatarUrl ? (
          <div style={chatModalStyles.avatarViewport}>
            <img
              src={avatarUrl}
              alt=""
              draggable={false}
              style={{
                ...chatModalStyles.avatarImage,
                transform: getAvatarTransform(settings),
                transition: dragStateRef.current
                  ? "none"
                  : "transform 0.08s ease",
              }}
            />
          </div>
        ) : (
          <span style={chatModalStyles.avatarLetter}>{initials}</span>
        )}
      </div>

      {avatarUrl && (
        <div style={chatModalStyles.avatarActions}>
          <button
            type="button"
            onClick={handleReset}
            title="Сбросить положение"
            style={chatModalStyles.avatarIconButton}
          >
            <img src={updateIcon} alt="" style={chatModalStyles.avatarIcon} />
          </button>

          <button
            type="button"
            onClick={handleDelete}
            title="Удалить фото"
            style={chatModalStyles.avatarIconButton}
          >
            <img
              src={deleteIcon}
              alt=""
              style={{
                ...chatModalStyles.avatarIcon,
                filter: chatModalStyles.filters.red,
              }}
            />
          </button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={chatModalStyles.hiddenInput}
        onChange={handleUpload}
        disabled={isUploading}
      />
    </div>
  );
}