import { useEffect, useRef, useState } from "react";

import { uploadAvatar } from "../../api/authApi.js";
import deleteIcon from "../../assets/icons/delet.png";
import updateIcon from "../../assets/icons/update.png";
import { showPlatformNotification } from "../platformNotification/PlatformNotification.js";
import { buildAvatarUrl } from "../files/api/filesApi.js";
import { getInitials } from "../fieldTypes/user/userUtils.js";
import {
  buildAvatarTransform,
  clamp,
  normalizeAvatarSettings,
} from "./avatarUtils.js";

import "./platformAvatarEditor.css";

const MIN_SCALE = 0.45;
const MAX_SCALE = 3;

export default function PlatformAvatarEditor({
  avatarUrl = "",
  avatarSettings = null,
  displayName = "",
  size = 120,
  disabled = false,
  className = "",
  avatarClassName = "",
  onChange,
}) {
  const fileInputRef = useRef(null);
  const avatarCircleRef = useRef(null);
  const dragStateRef = useRef(null);
  const suppressClickRef = useRef(false);
  const [isUploading, setIsUploading] = useState(false);

  const settings = normalizeAvatarSettings(avatarSettings);
  const initials = getInitials(displayName) || "?";

  useEffect(() => {
    function handleMouseMove(event) {
      if (!dragStateRef.current || disabled) {
        return;
      }

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
  }, [avatarUrl, disabled, onChange, settings]);

  useEffect(() => {
    const avatarElement = avatarCircleRef.current;
    if (!avatarElement) {
      return undefined;
    }

    function handleWheel(event) {
      if (!avatarUrl || disabled) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const direction = event.deltaY > 0 ? -0.06 : 0.06;

      onChange?.({
        avatar_url: avatarUrl,
        avatar_settings: {
          ...settings,
          scale: clamp(Number((settings.scale + direction).toFixed(2)), MIN_SCALE, MAX_SCALE),
        },
      });
    }

    avatarElement.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      avatarElement.removeEventListener("wheel", handleWheel);
    };
  }, [avatarUrl, disabled, onChange, settings]);

  const handleMouseDown = (event) => {
    if (!avatarUrl || disabled) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    suppressClickRef.current = false;

    dragStateRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      initialX: settings.x || 0,
      initialY: settings.y || 0,
    };
  };

  const handleAvatarClick = () => {
    if (disabled || isUploading) {
      return;
    }

    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }

    fileInputRef.current?.click();
  };

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      setIsUploading(true);
      const result = await uploadAvatar(file);
      onChange?.({
        avatar_url:
          result?.file_url ||
          result?.fileUrl ||
          result?.avatar_url ||
          result?.url ||
          "",
        avatar_settings: { x: 0, y: 0, scale: 1 },
      });
    } catch {
      showPlatformNotification({
        type: "error",
        message: "Не удалось загрузить аватар",
      });
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  };

  const handleReset = (event) => {
    event.stopPropagation();
    onChange?.({
      avatar_url: avatarUrl,
      avatar_settings: { x: 0, y: 0, scale: 1 },
    });
  };

  const handleDelete = (event) => {
    event.stopPropagation();
    onChange?.({
      avatar_url: "",
      avatar_settings: { x: 0, y: 0, scale: 1 },
    });
  };

  return (
    <div className={`platform-avatar-editor${className ? ` ${className}` : ""}`}>
      <div
        ref={avatarCircleRef}
        className={`platform-user-avatar platform-avatar-editor__circle${
          avatarUrl && !disabled ? " platform-avatar-editor__circle--interactive" : ""
        }${avatarClassName ? ` ${avatarClassName}` : ""}`}
        style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
        onMouseDown={handleMouseDown}
        onClick={handleAvatarClick}
        title={
          disabled
            ? ""
            : "Клик — заменить фото. Зажать и двигать — положение. Колесо — масштаб."
        }
      >
        {avatarUrl ? (
          <div className="platform-avatar-editor__viewport">
            <img
              src={buildAvatarUrl(avatarUrl)}
              alt=""
              draggable={false}
              style={{
                transform: buildAvatarTransform({
                  settings,
                  containerSize: size,
                }),
                transformOrigin: "center center",
                transition: dragStateRef.current ? "none" : "transform 0.08s ease",
              }}
            />
          </div>
        ) : (
          initials
        )}
      </div>

      {avatarUrl && !disabled && !isUploading ? (
        <div className="platform-avatar-editor__actions">
          <button
            type="button"
            className="platform-avatar-editor__icon-btn"
            onClick={handleReset}
            title="Сбросить положение"
          >
            <img src={updateIcon} alt="" className="platform-avatar-editor__icon" />
          </button>

          <button
            type="button"
            className="platform-avatar-editor__icon-btn"
            onClick={handleDelete}
            title="Удалить фото"
          >
            <img
              src={deleteIcon}
              alt=""
              className="platform-avatar-editor__icon platform-avatar-editor__icon--delete"
            />
          </button>
        </div>
      ) : null}

      {isUploading ? (
        <div className="platform-avatar-editor__status">Загрузка...</div>
      ) : null}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="platform-avatar-editor__file-input"
        onChange={handleUpload}
        disabled={disabled || isUploading}
      />
    </div>
  );
}
