import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { getLookupSources, getTable } from "../services/tableApi";

import {
  buttonStyle,
  primaryButtonStyle,
  inputStyle,
  selectStyle,
  menuSelectRowStyle,
  menuLabelStyle,
  createColumnMenuStyle,
  createColumnActionsStyle,
  createColumnCheckboxStyle,
  menuDangerItemStyle,
} from "../styles/tableStyles";

const COLUMN_TYPES = [
  { value: "text", label: "Однострочный текст" },
  { value: "number", label: "Число" },
  { value: "date", label: "Дата" },
  { value: "choice", label: "Выбор" },
  { value: "boolean", label: "Да/Нет" },
  { value: "link", label: "Ссылка" },
  { value: "lookup", label: "Подстановка" },
  { value: "file", label: "Вложение" },
  { value: "user", label: "Пользователь" },
];

const ALIGN_OPTIONS = [
  { value: "left", label: "Слева" },
  { value: "center", label: "По центру" },
  { value: "right", label: "Справа" },
];

const OPTION_COLORS = [
  { value: "#6b7280", label: "Серый" },
  { value: "#ef4444", label: "Красный" },
  { value: "#f97316", label: "Оранжевый" },
  { value: "#f59e0b", label: "Жёлтый" },
  { value: "#84cc16", label: "Лайм" },
  { value: "#22c55e", label: "Зелёный" },
  { value: "#14b8a6", label: "Бирюзовый" },
  { value: "#06b6d4", label: "Голубой" },
  { value: "#3b82f6", label: "Синий" },
  { value: "#6366f1", label: "Индиго" },
  { value: "#8b5cf6", label: "Фиолетовый" },
  { value: "#d946ef", label: "Пурпурный" },
  { value: "#ec4899", label: "Розовый" },
  { value: "#64748b", label: "Сланцевый" },
];

const MENU_WIDTH = 320;
const MENU_PADDING = 8;
const MENU_GAP = 6;
const DEFAULT_COLOR = "#6b7280";

const normalizeOptions = (options) => {
  if (!Array.isArray(options)) return [];

  return options.map((option, index) => {
    if (typeof option === "string") {
      return {
        id: `option-${index}-${option}`,
        label: option,
        color: DEFAULT_COLOR,
      };
    }

    return {
      id: option?.id || `option-${index}`,
      label: option?.label || "",
      color: option?.color || DEFAULT_COLOR,
    };
  });
};

const getSourceTableId = (source) => {
  return source?.table_id ?? source?.tableId ?? source?.id ?? null;
};

const getLookupSourceLabel = (source) => {
  const sourceId = getSourceTableId(source);

  const tableTitle =
    source?.title ||
    source?.table_title ||
    source?.label ||
    source?.name ||
    (sourceId ? `Таблица ${sourceId}` : "Без названия");

  const path = [
    source?.portal_title,
    source?.page_title,
    source?.section_title,
  ]
    .filter(Boolean)
    .join(" / ");

  return path ? `${tableTitle} — ${path}` : tableTitle;
};

const getMenuPositionStyle = ({ anchorRect, isCreateMode }) => {
  if (!anchorRect) {
    return {
      position: "fixed",
      top: MENU_PADDING,
      left: MENU_PADDING,
      maxHeight: `calc(100vh - ${MENU_PADDING * 2}px)`,
      zIndex: 99999,
    };
  }

  const viewportWidth =
    window.innerWidth || document.documentElement.clientWidth;
  const viewportHeight =
    window.innerHeight || document.documentElement.clientHeight;

  let left = isCreateMode ? anchorRect.left : anchorRect.right - MENU_WIDTH;

  if (left + MENU_WIDTH > viewportWidth - MENU_PADDING) {
    left = viewportWidth - MENU_WIDTH - MENU_PADDING;
  }

  if (left < MENU_PADDING) {
    left = MENU_PADDING;
  }

  const spaceBelow =
    viewportHeight - anchorRect.bottom - MENU_GAP - MENU_PADDING;
  const spaceAbove = anchorRect.top - MENU_GAP - MENU_PADDING;

  const openUp = spaceBelow < 360 && spaceAbove > spaceBelow;
  const maxHeight = Math.max(220, openUp ? spaceAbove : spaceBelow);

  const top = openUp
    ? Math.max(MENU_PADDING, anchorRect.top - MENU_GAP - maxHeight)
    : Math.min(
        anchorRect.bottom + MENU_GAP,
        viewportHeight - MENU_PADDING - maxHeight
      );

  return {
    position: "fixed",
    top,
    left,
    maxHeight,
    zIndex: 99999,
  };
};

export default function TableColumnMenu({
  mode = "edit",
  anchorRect,

  title,
  type,
  required,
  options = [],
  multiple = false,
  align = "left",
  width = 180,

  lookup = {},

  onTitleChange,
  onTypeChange,
  onRequiredChange,
  onOptionsChange,
  onMultipleChange,
  onAlignChange,
  onWidthChange,
  onLookupChange,

  onSave,
  onCancel,
  onDelete,

  titleError = "",
  onClearTitleError,

  isSystemColumn = false,
  canDelete = true,

  allowTitleEdit = true,
  allowWidthEdit = true,
  allowAlignEdit = true,
  allowTypeEdit = true,
  allowRequiredEdit = true,
  allowOptionsEdit = true,
  allowLookupEdit = true,

  lockType = false,
  lockRequired = false,
  lockOptions = false,
  lockLookup = false,
}) {
  const [lookupSources, setLookupSources] = useState([]);
  const [lookupColumns, setLookupColumns] = useState([]);
  const [isLoadingSources, setIsLoadingSources] = useState(false);
  const [isLoadingColumns, setIsLoadingColumns] = useState(false);
  const [openColorOptionId, setOpenColorOptionId] = useState(null);

  const isCreateMode = mode === "create";
  const normalizedOptions = normalizeOptions(options);

  const isTitleLocked = Boolean(allowTitleEdit === false);
  const isWidthLocked = Boolean(allowWidthEdit === false);
  const isAlignLocked = Boolean(allowAlignEdit === false);
  const isTypeLocked = Boolean(lockType || allowTypeEdit === false);
  const isRequiredLocked = Boolean(lockRequired || allowRequiredEdit === false);
  const isOptionsLocked = Boolean(lockOptions || allowOptionsEdit === false);
  const isLookupLocked = Boolean(lockLookup || allowLookupEdit === false);
  const isDeleteDisabled = Boolean(!canDelete);

  const menuPositionStyle = getMenuPositionStyle({
    anchorRect,
    isCreateMode,
  });

  useEffect(() => {
    if (type !== "lookup") return;

    let isMounted = true;

    const loadSources = async () => {
      try {
        setIsLoadingSources(true);
        const data = await getLookupSources();

        if (isMounted) {
          setLookupSources(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error("Не удалось загрузить источники подстановки:", error);

        if (isMounted) {
          setLookupSources([]);
        }
      } finally {
        if (isMounted) {
          setIsLoadingSources(false);
        }
      }
    };

    loadSources();

    return () => {
      isMounted = false;
    };
  }, [type]);

  useEffect(() => {
    if (type !== "lookup" || !lookup?.sourceTableId) {
      setLookupColumns([]);
      return;
    }

    let isMounted = true;

    const loadColumns = async () => {
      try {
        setIsLoadingColumns(true);
        const data = await getTable(lookup.sourceTableId);

        if (isMounted) {
          setLookupColumns(Array.isArray(data?.columns) ? data.columns : []);
        }
      } catch (error) {
        console.error("Не удалось загрузить столбцы таблицы-источника:", error);

        if (isMounted) {
          setLookupColumns([]);
        }
      } finally {
        if (isMounted) {
          setIsLoadingColumns(false);
        }
      }
    };

    loadColumns();

    return () => {
      isMounted = false;
    };
  }, [type, lookup?.sourceTableId]);

  const updateOption = (index, patch) => {
    if (isOptionsLocked) return;

    const nextOptions = [...normalizedOptions];
    nextOptions[index] = { ...nextOptions[index], ...patch };
    onOptionsChange?.(nextOptions);
  };

  const addOption = () => {
    if (isOptionsLocked) return;

    onOptionsChange?.([
      ...normalizedOptions,
      {
        id: `option-${Date.now()}`,
        label: `Вариант ${normalizedOptions.length + 1}`,
        color: DEFAULT_COLOR,
      },
    ]);
  };

  const removeOption = (index) => {
    if (isOptionsLocked) return;

    onOptionsChange?.(normalizedOptions.filter((_, i) => i !== index));
  };

  const moveOptionUp = (index) => {
    if (isOptionsLocked || index <= 0) return;

    const next = [...normalizedOptions];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];

    onOptionsChange?.(next);
  };

  const moveOptionDown = (index) => {
    if (isOptionsLocked || index >= normalizedOptions.length - 1) return;

    const next = [...normalizedOptions];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];

    onOptionsChange?.(next);
  };

  const handleTypeChange = (nextType) => {
    if (isTypeLocked) return;

    onTypeChange?.(nextType);

    if (nextType === "user") {
      onLookupChange?.({
        showAvatar: lookup?.showAvatar !== false,
      });
    } else if (nextType === "date") {
      onLookupChange?.({
        showTime: lookup?.showTime === true,
        showDateHint: lookup?.showDateHint !== false,
      });
    } else if (nextType !== "lookup") {
      onLookupChange?.({});
    }

    if (nextType !== "choice" && nextType !== "user") {
      onOptionsChange?.([]);
      onMultipleChange?.(false);
      setOpenColorOptionId(null);
    }

    if (nextType === "user") {
      onOptionsChange?.([]);
      setOpenColorOptionId(null);
    }
  };

  const handleLookupSourceChange = (sourceTableId) => {
    if (isLookupLocked) return;

    if (!sourceTableId) {
      onLookupChange?.({});
      setLookupColumns([]);
      return;
    }

    const selectedSource = lookupSources.find(
      (source) => String(getSourceTableId(source)) === String(sourceTableId)
    );

    const resolvedSourceTableId = selectedSource
      ? getSourceTableId(selectedSource)
      : sourceTableId;

    onLookupChange?.({
      sourceTableId: resolvedSourceTableId
        ? Number(resolvedSourceTableId)
        : null,
      displayColumnId: null,

      sourcePortalId: selectedSource?.portal_id || null,
      sourcePageId: selectedSource?.page_id || null,
      sourceSectionId: selectedSource?.section_id || null,
      sourceBlockId: selectedSource?.block_id || null,
      sourceTableTitle:
        selectedSource?.title ||
        selectedSource?.table_title ||
        selectedSource?.label ||
        "",
      sourcePath: selectedSource?.path || "",
      sourceLabel: selectedSource ? getLookupSourceLabel(selectedSource) : "",
    });
  };

  const handleLookupDisplayColumnChange = (displayColumnId) => {
    if (isLookupLocked) return;

    onLookupChange?.({
      ...(lookup || {}),
      displayColumnId: displayColumnId ? Number(displayColumnId) : null,
    });
  };

  const handleShowAvatarChange = (showAvatar) => {
    onLookupChange?.({
      ...(lookup || {}),
      showAvatar: Boolean(showAvatar),
    });
  };

  const handleShowTimeChange = (showTime) => {
    onLookupChange?.({
      ...(lookup || {}),
      showTime: Boolean(showTime),
    });
  };

  const handleShowDateHintChange = (showDateHint) => {
    onLookupChange?.({
      ...(lookup || {}),
      showDateHint: Boolean(showDateHint),
    });
  };

  const selectedLookupSource = lookupSources.find(
    (source) => String(getSourceTableId(source)) === String(lookup?.sourceTableId)
  );

  const selectedLookupLabel =
    lookup?.sourceLabel ||
    (selectedLookupSource ? getLookupSourceLabel(selectedLookupSource) : "") ||
    lookup?.sourcePath ||
    "";

  const compactInputStyle = {
    ...inputStyle,
    width: "100%",
    height: 32,
    fontSize: 14,
  };

  const compactSelectStyle = {
    ...selectStyle,
    width: "100%",
    height: 32,
    fontSize: 14,
  };

  const disabledFieldStyle = {
    opacity: 0.55,
    cursor: "not-allowed",
  };

  const iconButtonStyle = {
    ...buttonStyle,
    width: 24,
    height: 24,
    padding: 0,
    fontSize: 12,
  };

  const colorButtonStyle = (color, isActive = false) => ({
    width: 22,
    height: 22,
    borderRadius: "50%",
    background: color || DEFAULT_COLOR,
    border: isActive ? "2px solid #0f172a" : "1px solid #cbd5e1",
    cursor: isOptionsLocked ? "not-allowed" : "pointer",
    padding: 0,
    display: "block",
    boxShadow: isActive ? "0 0 0 2px #e2e8f0" : "none",
    opacity: isOptionsLocked ? 0.55 : 1,
  });

  const colorPaletteStyle = {
    position: "absolute",
    top: 28,
    left: 0,
    width: 178,
    padding: 8,
    borderRadius: 10,
    background: "#ffffff",
    border: "1px solid #dbe3ef",
    boxShadow: "0 12px 28px rgba(15, 23, 42, 0.18)",
    zIndex: 100000,
    display: "grid",
    gridTemplateColumns: "repeat(7, 18px)",
    gap: 6,
  };

  const paletteColorButtonStyle = (color, isSelected) => ({
    width: 18,
    height: 18,
    borderRadius: "50%",
    background: color,
    border: isSelected ? "2px solid #0f172a" : "1px solid #dbe3ef",
    cursor: "pointer",
    padding: 0,
    boxShadow: isSelected ? "0 0 0 2px #e2e8f0" : "none",
  });

  const alignButtonStyle = (value) => ({
    ...buttonStyle,
    height: 28,
    padding: "0 10px",
    fontSize: 12,
    background: align === value ? "#0f172a" : "#ffffff",
    color: align === value ? "#ffffff" : "#334155",
    border: "1px solid #dbe3ef",
    opacity: isAlignLocked ? 0.55 : 1,
    cursor: isAlignLocked ? "not-allowed" : "pointer",
  });

  const systemHintStyle = {
    padding: "8px 9px",
    borderRadius: 8,
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    color: "#64748b",
    fontSize: 12,
    lineHeight: 1.35,
  };

  const titleInputStyle = {
    ...compactInputStyle,
    border: titleError ? "1px solid #ef4444" : compactInputStyle.border,
    background: titleError ? "#fef2f2" : compactInputStyle.background,
  };

  const content = (
    <div
      data-column-menu="true"
      style={{
        ...createColumnMenuStyle,
        ...menuPositionStyle,
        width: MENU_WIDTH,
        maxWidth: `calc(100vw - ${MENU_PADDING * 2}px)`,
        overflowY: "auto",
        overflowX: "hidden",
        padding: 12,
        borderRadius: 12,
        boxSizing: "border-box",
      }}
      onClick={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
    >
      {isSystemColumn && (
        <div style={{ ...systemHintStyle, marginBottom: 8 }}>
          Системный столбец. Можно изменить название, ширину и выравнивание.
          Удаление и смена типа недоступны.
        </div>
      )}

      {allowTitleEdit && (
        <div style={{ ...menuSelectRowStyle, marginBottom: 8 }}>
          <span style={menuLabelStyle}>Название</span>

          <input
            data-create-column-title={isCreateMode ? "true" : undefined}
            value={title || ""}
            disabled={isTitleLocked}
            onChange={(event) => {
              if (isTitleLocked) return;
              onClearTitleError?.();
              onTitleChange?.(event.target.value);
            }}
            style={{
              ...titleInputStyle,
              ...(isTitleLocked ? disabledFieldStyle : {}),
            }}
          />

          {titleError && (
            <div
              style={{
                marginTop: 4,
                color: "#dc2626",
                fontSize: 12,
                lineHeight: 1.3,
              }}
            >
              {titleError}
            </div>
          )}
        </div>
      )}

      {allowTypeEdit && (
        <div style={{ ...menuSelectRowStyle, marginBottom: 8 }}>
          <span style={menuLabelStyle}>Тип</span>

          <select
            value={type}
            onChange={(event) => handleTypeChange(event.target.value)}
            style={{
              ...compactSelectStyle,
              ...(isTypeLocked ? disabledFieldStyle : {}),
            }}
            disabled={isTypeLocked}
          >
            {COLUMN_TYPES.map((columnType) => (
              <option key={columnType.value} value={columnType.value}>
                {columnType.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {allowWidthEdit && (
        <div style={{ ...menuSelectRowStyle, marginBottom: 10 }}>
          <span style={menuLabelStyle}>Ширина</span>

          <input
            type="number"
            min={60}
            max={1200}
            value={width || 180}
            disabled={isWidthLocked}
            onChange={(event) => {
              if (isWidthLocked) return;
              onWidthChange?.(Number(event.target.value) || 180);
            }}
            style={{
              ...compactInputStyle,
              ...(isWidthLocked ? disabledFieldStyle : {}),
            }}
          />
        </div>
      )}

      {allowAlignEdit && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ ...menuLabelStyle, marginBottom: 6 }}>Выравнивание</div>

          <div style={{ display: "flex", gap: 6 }}>
            {ALIGN_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                disabled={isAlignLocked}
                onClick={() => {
                  if (isAlignLocked) return;
                  onAlignChange?.(option.value);
                }}
                style={alignButtonStyle(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {type === "choice" && (
        <label
          style={{
            ...createColumnCheckboxStyle,
            marginBottom: 10,
          }}
        >
          <input
            type="checkbox"
            checked={Boolean(multiple)}
            disabled={isOptionsLocked}
            onChange={(event) => {
              if (isOptionsLocked) return;
              onMultipleChange?.(event.target.checked);
            }}
          />
          Множественный выбор
        </label>
      )}

      {allowOptionsEdit && type === "choice" && (
        <div style={{ marginTop: 8, marginBottom: 10 }}>
          <div style={{ ...menuLabelStyle, marginBottom: 6 }}>
            Варианты выбора
          </div>

          {normalizedOptions.map((option, index) => {
            const isColorPaletteOpen = openColorOptionId === option.id;

            return (
              <div
                key={option.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "22px 1fr 24px 24px 24px",
                  gap: 5,
                  alignItems: "center",
                  marginBottom: 4,
                  position: "relative",
                }}
              >
                <div style={{ position: "relative", width: 22, height: 22 }}>
                  <button
                    type="button"
                    title="Выбрать цвет"
                    disabled={isOptionsLocked}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();

                      if (isOptionsLocked) return;

                      setOpenColorOptionId(
                        isColorPaletteOpen ? null : option.id
                      );
                    }}
                    style={colorButtonStyle(option.color, isColorPaletteOpen)}
                  />

                  {isColorPaletteOpen && !isOptionsLocked && (
                    <div
                      data-column-menu="true"
                      style={colorPaletteStyle}
                      onClick={(event) => event.stopPropagation()}
                      onMouseDown={(event) => event.stopPropagation()}
                    >
                      {OPTION_COLORS.map((color) => (
                        <button
                          key={color.value}
                          type="button"
                          title={color.label}
                          onClick={() => {
                            updateOption(index, { color: color.value });
                            setOpenColorOptionId(null);
                          }}
                          style={paletteColorButtonStyle(
                            color.value,
                            option.color === color.value
                          )}
                        />
                      ))}
                    </div>
                  )}
                </div>

                <input
                  value={option.label}
                  disabled={isOptionsLocked}
                  onChange={(event) =>
                    updateOption(index, { label: event.target.value })
                  }
                  style={{
                    ...compactInputStyle,
                    height: 28,
                    ...(isOptionsLocked ? disabledFieldStyle : {}),
                  }}
                />

                <button
                  type="button"
                  disabled={isOptionsLocked || index <= 0}
                  onClick={() => moveOptionUp(index)}
                  style={{
                    ...iconButtonStyle,
                    opacity: isOptionsLocked || index <= 0 ? 0.45 : 1,
                  }}
                >
                  ↑
                </button>

                <button
                  type="button"
                  disabled={
                    isOptionsLocked || index >= normalizedOptions.length - 1
                  }
                  onClick={() => moveOptionDown(index)}
                  style={{
                    ...iconButtonStyle,
                    opacity:
                      isOptionsLocked || index >= normalizedOptions.length - 1
                        ? 0.45
                        : 1,
                  }}
                >
                  ↓
                </button>

                <button
                  type="button"
                  disabled={isOptionsLocked}
                  onClick={() => removeOption(index)}
                  style={{
                    ...iconButtonStyle,
                    opacity: isOptionsLocked ? 0.45 : 1,
                  }}
                >
                  ×
                </button>
              </div>
            );
          })}

          <button
            type="button"
            onClick={addOption}
            disabled={isOptionsLocked}
            style={{
              ...buttonStyle,
              ...(isOptionsLocked ? disabledFieldStyle : {}),
            }}
          >
            + Добавить
          </button>
        </div>
      )}

      {allowLookupEdit && type === "lookup" && (
        <div style={{ marginTop: 8, marginBottom: 10 }}>
          <div style={{ ...menuLabelStyle, marginBottom: 6 }}>
            Настройки подстановки
          </div>

          <div style={{ ...menuSelectRowStyle, marginBottom: 8 }}>
            <span style={menuLabelStyle}>Источник</span>

            <select
              value={lookup?.sourceTableId || ""}
              onChange={(event) => handleLookupSourceChange(event.target.value)}
              style={{
                ...compactSelectStyle,
                ...(isLookupLocked ? disabledFieldStyle : {}),
              }}
              disabled={isLoadingSources || isLookupLocked}
            >
              <option value="">
                {isLoadingSources ? "Загрузка..." : "Выбрать таблицу"}
              </option>

              {lookupSources.map((source) => {
                const sourceId = getSourceTableId(source);

                if (!sourceId) return null;

                return (
                  <option key={String(sourceId)} value={String(sourceId)}>
                    {getLookupSourceLabel(source)}
                  </option>
                );
              })}
            </select>
          </div>

          {lookup?.sourceTableId && (
            <div style={{ ...menuSelectRowStyle, marginBottom: 8 }}>
              <span style={menuLabelStyle}>Отображать</span>

              <select
                value={lookup?.displayColumnId || ""}
                onChange={(event) =>
                  handleLookupDisplayColumnChange(event.target.value)
                }
                style={{
                  ...compactSelectStyle,
                  ...(isLookupLocked ? disabledFieldStyle : {}),
                }}
                disabled={isLoadingColumns || isLookupLocked}
              >
                <option value="">
                  {isLoadingColumns ? "Загрузка..." : "Выбрать столбец"}
                </option>

                {lookupColumns.map((column) => (
                  <option key={column.id} value={column.id}>
                    {column.title || `Столбец ${column.id}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {selectedLookupLabel && (
            <div
              style={{
                marginTop: 6,
                padding: "7px 8px",
                borderRadius: 8,
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                fontSize: 12,
                lineHeight: 1.35,
                color: "#475569",
              }}
            >
              {selectedLookupLabel}
            </div>
          )}
        </div>
      )}

      {type === "user" && (
        <>
          <label
            style={{
              ...createColumnCheckboxStyle,
              marginBottom: 8,
            }}
          >
            <input
              type="checkbox"
              checked={lookup?.showAvatar !== false}
              onChange={(event) => handleShowAvatarChange(event.target.checked)}
            />
            Показывать фото
          </label>

          <label
            style={{
              ...createColumnCheckboxStyle,
              marginBottom: 8,
            }}
          >
            <input
              type="checkbox"
              checked={Boolean(multiple)}
              onChange={(event) => {
                onMultipleChange?.(event.target.checked);
              }}
            />
            Несколько пользователей
          </label>
        </>
      )}

      {type === "date" && (
        <>
          <label
            style={{
              ...createColumnCheckboxStyle,
              marginBottom: 8,
            }}
          >
            <input
              type="checkbox"
              checked={lookup?.showTime === true}
              onChange={(event) => handleShowTimeChange(event.target.checked)}
            />
            Показывать время
          </label>

          <label
            style={{
              ...createColumnCheckboxStyle,
              marginBottom: 8,
            }}
          >
            <input
              type="checkbox"
              checked={lookup?.showDateHint !== false}
              onChange={(event) =>
                handleShowDateHintChange(event.target.checked)
              }
            />
            Показывать подсказку
          </label>
        </>
      )}

      {allowRequiredEdit && (
        <label
          style={{
            ...createColumnCheckboxStyle,
            ...(isRequiredLocked ? disabledFieldStyle : {}),
          }}
        >
          <input
            type="checkbox"
            checked={Boolean(required)}
            disabled={isRequiredLocked}
            onChange={(event) => {
              if (isRequiredLocked) return;
              onRequiredChange?.(event.target.checked);
            }}
          />
          Обязательное
        </label>
      )}

      <div style={createColumnActionsStyle}>
        <button type="button" onClick={onSave} style={primaryButtonStyle}>
          Сохранить
        </button>

        <button type="button" onClick={onCancel} style={buttonStyle}>
          Отмена
        </button>

        {!isCreateMode && !isDeleteDisabled && (
          <button
            type="button"
            onClick={() => {
              onDelete?.();
            }}
            style={menuDangerItemStyle}
            title="Удалить столбец"
          >
            Удалить
          </button>
        )}
      </div>
    </div>
  );

  return createPortal(content, document.body);
}