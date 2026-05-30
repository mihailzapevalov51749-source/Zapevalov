import { useEffect, useState } from "react";

import eyeOpenIcon from "../../../assets/icons/eye-open.png";
import eyeClosedIcon from "../../../assets/icons/eye-closed.png";

import { LegacyStorageExistingSupportNotice } from "../../../shared/legacy";
import { resolveBlockShowTitle } from "../../universalTable/utils/resolveBlockShowTitle";
import {
  hiddenVisibilityIconStyle,
  visibilityButtonStyle,
  visibilityIconStyle,
} from "../../universalTable/components/entityCard/styles/entityCardSettingsPanelStyles";

export default function UniversalTableBlockEditor({
  block,
  onPatchBlock,
  onRemoveFromSection,
  styles = {},
}) {
  const { dangerButtonStyle = defaultDangerButtonStyle } = styles;

  const [showTitle, setShowTitle] = useState(true);
  const [isTogglingTitle, setIsTogglingTitle] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  useEffect(() => {
    if (!block) return;
    setShowTitle(resolveBlockShowTitle(block));
  }, [block]);

  const handleToggleShowTitle = async () => {
    if (!block || !onPatchBlock) return;

    const nextShowTitle = !showTitle;

    setShowTitle(nextShowTitle);

    try {
      setIsTogglingTitle(true);

      await onPatchBlock({
        settings: {
          ...(block.settings || {}),
          showTitle: nextShowTitle,
        },
      });
    } catch (error) {
      console.error(error);
      setShowTitle(showTitle);
    } finally {
      setIsTogglingTitle(false);
    }
  };

  const handleRemove = async () => {
    const confirmed = window.confirm(
      "Удалить таблицу из раздела? Блок будет удалён, универсальная таблица и её данные останутся."
    );

    if (!confirmed) return;

    try {
      setIsRemoving(true);
      await onRemoveFromSection?.(block);
    } finally {
      setIsRemoving(false);
    }
  };

  if (!block) {
    return (
      <div style={{ color: "#94a3b8", fontSize: 13 }}>
        Выберите блок для редактирования
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 14,
        color: "#e5f0ff",
      }}
    >
      <LegacyStorageExistingSupportNotice />

      <div style={rowStyle}>
        <div style={labelGroupStyle}>
          <span style={labelStyle}>Название таблицы</span>
          <span style={hintInlineStyle}>
            {showTitle ? "Видно в этом блоке" : "Скрыто в этом блоке"}
          </span>
        </div>

        <button
          type="button"
          data-block-settings-visibility="true"
          disabled={isTogglingTitle}
          onClick={handleToggleShowTitle}
          style={{
            ...visibilityButtonStyle,
            opacity: isTogglingTitle ? 0.6 : 1,
          }}
          title={showTitle ? "Скрыть название" : "Показать название"}
        >
          <img
            src={showTitle ? eyeOpenIcon : eyeClosedIcon}
            alt=""
            draggable={false}
            style={showTitle ? visibilityIconStyle : hiddenVisibilityIconStyle}
          />
        </button>
      </div>

      {onRemoveFromSection ? (
        <button
          type="button"
          onClick={handleRemove}
          style={dangerButtonStyle}
          disabled={isRemoving}
        >
          {isRemoving ? "Удаление..." : "Удалить из раздела"}
        </button>
      ) : null}
    </div>
  );
}

const rowStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
};

const labelGroupStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
  minWidth: 0,
};

const labelStyle = {
  fontSize: 13,
  fontWeight: 600,
  color: "#e5f0ff",
};

const hintInlineStyle = {
  fontSize: 12,
  color: "#94a3b8",
};

const defaultDangerButtonStyle = {
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid #7f1d1d",
  background: "#450a0a",
  color: "#fecaca",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 700,
};
