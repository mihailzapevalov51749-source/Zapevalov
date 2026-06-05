import { useCallback, useEffect, useMemo, useState } from "react";

import { PlatformModal } from "../../../../shared/platformModal";
import PlatformFieldVisibilityEyeIcon from "../../../../shared/fieldVisibility/PlatformFieldVisibilityEyeIcon";
import {
  isRuntimeSystemFieldKey,
  isTableRowNumberPresentationFieldKey,
} from "../../../../shared/runtime/systemEntityFields";
import { resolveTableFieldLabels } from "../../services/columnPresentationUtils";
import { anchorRectToModalDefaultBounds } from "../viewSettings/resolveSettingsPanelPosition";
import {
  OBJECT_TABLE_TITLE_FIELD_VISIBILITY_DEFAULT_BOUNDS,
  OBJECT_TABLE_TITLE_FIELD_VISIBILITY_PANEL_KEY,
} from "../viewSettings/objectTableViewSettingsModalKeys";

import "./objectTableFieldsVisibilityPanel.css";

function isPresentationSystemFieldKey(fieldKey, titleFieldKey) {
  const normalized = String(fieldKey || "").trim();

  if (!normalized) {
    return false;
  }

  if (normalized === titleFieldKey) {
    return false;
  }

  return (
    isTableRowNumberPresentationFieldKey(normalized) ||
    isRuntimeSystemFieldKey(normalized)
  );
}

function FieldRow({
  label,
  fieldKey,
  isHidden,
  isLocked,
  onToggle,
}) {
  return (
    <button
      type="button"
      className={`ot-fields-visibility-panel__field-row${isHidden ? " is-hidden" : ""}`}
      disabled={isLocked}
      onClick={() => {
        if (isLocked) {
          return;
        }

        onToggle?.(fieldKey);
      }}
      title={isLocked ? "Заголовок нельзя скрыть" : isHidden ? "Показать" : "Скрыть"}
    >
      <span className="ot-fields-visibility-panel__field-label">
        {label}
        {isLocked ? (
          <span className="ot-fields-visibility-panel__field-lock" aria-hidden="true">
            🔒
          </span>
        ) : null}
      </span>

      <PlatformFieldVisibilityEyeIcon
        visible={!isHidden}
        size={15}
        draggable={false}
        style={isLocked ? { opacity: 0.4 } : undefined}
      />
    </button>
  );
}

function SectionTitle({ children }) {
  return <div className="ot-fields-visibility-panel__section-title">{children}</div>;
}

/**
 * Quick column visibility panel (PlatformModal shell + same state as view settings → Fields).
 */
export default function ObjectTableFieldsVisibilityPanel({
  open = false,
  anchorRect = null,
  anchorRef = null,
  onClose,
  canCustomizeLayout = false,
  effectiveContract,
  catalog,
  objectTypeKey,
  sessionApi,
}) {
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (open) {
      setSearch("");
    }
  }, [open]);

  const fieldLabels = useMemo(
    () => resolveTableFieldLabels(catalog, objectTypeKey, effectiveContract),
    [catalog, objectTypeKey, effectiveContract],
  );

  const columnOrder = sessionApi?.panelColumnOrder || [];
  const hiddenFieldKeys = sessionApi?.hiddenFieldKeys || [];
  const titleFieldKey = String(
    effectiveContract?.projection?.titleFieldKey || "",
  ).trim();

  const hiddenSet = useMemo(
    () => new Set(hiddenFieldKeys.map(String)),
    [hiddenFieldKeys],
  );

  const defaultBounds = useMemo(() => {
    if (!open) {
      return OBJECT_TABLE_TITLE_FIELD_VISIBILITY_DEFAULT_BOUNDS;
    }

    return anchorRectToModalDefaultBounds(anchorRect, {
      width: OBJECT_TABLE_TITLE_FIELD_VISIBILITY_DEFAULT_BOUNDS.width,
      height: OBJECT_TABLE_TITLE_FIELD_VISIBILITY_DEFAULT_BOUNDS.height,
      fallback: OBJECT_TABLE_TITLE_FIELD_VISIBILITY_DEFAULT_BOUNDS,
    });
  }, [open, anchorRect]);

  const normalizedSearch = search.trim().toLowerCase();

  const { userFieldKeys, systemFieldKeys } = useMemo(() => {
    const user = [];
    const system = [];

    for (const fieldKey of columnOrder) {
      const normalized = String(fieldKey || "").trim();

      if (!normalized) {
        continue;
      }

      const label = (fieldLabels.get(normalized) || normalized).toLowerCase();

      if (normalizedSearch && !label.includes(normalizedSearch)) {
        continue;
      }

      if (isPresentationSystemFieldKey(normalized, titleFieldKey)) {
        system.push(normalized);
      } else {
        user.push(normalized);
      }
    }

    return { userFieldKeys: user, systemFieldKeys: system };
  }, [columnOrder, fieldLabels, normalizedSearch, titleFieldKey]);

  const handleToggle = (fieldKey) => {
    const result = sessionApi?.toggleFieldVisibility?.(fieldKey);

    if (result?.ok === false && result.reason === "last_visible_field") {
      window.alert(
        "Нельзя скрыть все поля. Должно остаться хотя бы одно видимое.",
      );
    }
  };

  const handleClose = useCallback(() => {
    setSearch("");
    onClose?.();
  }, [onClose]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const resolvePanelElement = () =>
      document.querySelector(
        `[data-platform-modal-panel][data-platform-modal-key="${OBJECT_TABLE_TITLE_FIELD_VISIBILITY_PANEL_KEY}"]`,
      );

    const handleOutsidePointerDown = (event) => {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      const panelElement = resolvePanelElement();

      if (panelElement?.contains(target)) {
        return;
      }

      if (anchorRef?.current?.contains(target)) {
        return;
      }

      handleClose();
    };

    document.addEventListener("mousedown", handleOutsidePointerDown);

    return () => {
      document.removeEventListener("mousedown", handleOutsidePointerDown);
    };
  }, [open, anchorRef, handleClose]);

  return (
    <PlatformModal
      modalKey={OBJECT_TABLE_TITLE_FIELD_VISIBILITY_PANEL_KEY}
      open={open}
      onClose={handleClose}
      title="Поля таблицы"
      subtitle="Управление видимостью столбцов"
      canCustomizeLayout={canCustomizeLayout}
      defaultBounds={defaultBounds}
      transparentBackdrop
      ariaLabel="Управление видимостью столбцов"
      contentStyle={{
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        padding: 0,
        overflow: "hidden",
      }}
    >
      <div
        className="ot-fields-visibility-panel"
        data-object-table-fields-visibility-panel="true"
      >
        <div className="ot-fields-visibility-panel__search-wrap">
          <input
            type="text"
            value={search}
            placeholder="Найти поле..."
            onChange={(event) => setSearch(event.target.value)}
            className="ot-fields-visibility-panel__search"
          />
        </div>

        <div className="ot-fields-visibility-panel__body">
          <SectionTitle>Пользовательские поля</SectionTitle>

          {userFieldKeys.length > 0 ? (
            userFieldKeys.map((fieldKey) => (
              <FieldRow
                key={fieldKey}
                fieldKey={fieldKey}
                label={fieldLabels.get(fieldKey) || fieldKey}
                isHidden={hiddenSet.has(fieldKey)}
                isLocked={fieldKey === titleFieldKey}
                onToggle={handleToggle}
              />
            ))
          ) : (
            <div className="ot-fields-visibility-panel__empty">Поля не найдены</div>
          )}

          <div className="ot-fields-visibility-panel__divider" />

          <SectionTitle>Системные поля</SectionTitle>

          {systemFieldKeys.length > 0 ? (
            systemFieldKeys.map((fieldKey) => (
              <FieldRow
                key={fieldKey}
                fieldKey={fieldKey}
                label={fieldLabels.get(fieldKey) || fieldKey}
                isHidden={hiddenSet.has(fieldKey)}
                isLocked={false}
                onToggle={handleToggle}
              />
            ))
          ) : (
            <div className="ot-fields-visibility-panel__empty">
              Системные поля не найдены
            </div>
          )}
        </div>
      </div>
    </PlatformModal>
  );
}
