import ObjectProjectionPanel from "./ObjectProjectionPanel";

import PlanLayoutSettingsSection from "./PlanLayoutSettingsSection.jsx";

import PlanViewSettingsPanel, {
  resolveStudioViewTypeLabel,
  STUDIO_VIEW_TYPES,
} from "./PlanViewSettingsPanel";

import { normalizePlanLayoutSettings } from "../../../objectViews/plan/planLayoutSettings.js";

import {
  mergeObjectTabSettingsIntoViewSettings,
  readObjectTabSettings,
} from "../../../objectViews/services/objectTabSettings";

import "./viewPropertiesPanel.css";

export default function ViewPropertiesPanel({
  draft,
  isSelectedSystemDefault = false,
  fieldOptions = [],
  saving = false,
  onDraftChange,
  onClose,
  onSave,
  onDelete,
  onOpenRuntimePreview,
  titleFieldKey = null,
  onToggleVisibleField,
  onToggleInfoField,
  onReorderField,
  relationOptions = [],
  planSettings = null,
  onPlanSettingsChange,
  objectTypeKey = "",
}) {
  if (!draft) {
    return null;
  }

  const resolvedTitleFieldKey =
    titleFieldKey ?? draft.projection?.title_field ?? null;

  const isPlanView = draft.view_type === "plan";
  const isTableView = draft.view_type === "table";

  const handleProjectionChange = (nextProjection) => {
    onDraftChange?.({
      ...draft,
      projection: nextProjection,
    });
  };

  return (
    <aside className="designer-properties-panel designer-view-properties-panel">
      <div className="designer-properties-panel__header">
        <h4 className="designer-view-properties-panel__title">Свойства вкладки</h4>
        <button
          type="button"
          className="designer-view-properties-panel__close"
          onClick={onClose}
          aria-label="Закрыть"
          title="Закрыть"
        >
          ×
        </button>
      </div>

      <div className="designer-properties-panel__body">
        <div className="designer-view-form">
          <div className="designer-view-form__row-2">
            <div className="designer-view-form__group">
              <label className="designer-label" htmlFor="view-prop-name">
                Название
              </label>
              <input
                id="view-prop-name"
                className="designer-input"
                value={draft.name}
                onChange={(event) =>
                  onDraftChange?.({ ...draft, name: event.target.value })
                }
              />
            </div>

            <div className="designer-view-form__group">
              <label className="designer-label" htmlFor="view-prop-type">
                Тип
              </label>
              <select
                id="view-prop-type"
                className="designer-select"
                value={draft.view_type}
                onChange={(event) =>
                  onDraftChange?.({ ...draft, view_type: event.target.value })
                }
              >
                {STUDIO_VIEW_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {resolveStudioViewTypeLabel(type)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="designer-view-form__group">
            <label className="designer-label" htmlFor="view-prop-key">
              Key
            </label>
            <input
              id="view-prop-key"
              className="designer-input designer-view-form__key"
              value={draft.key}
              disabled
            />
            {isSelectedSystemDefault ? (
              <p className="designer-view-form__hint">
                System/default key заблокирован для изменения
              </p>
            ) : null}
          </div>

          <label className="designer-view-form__checkbox">
            <input
              type="checkbox"
              checked={draft.is_active}
              onChange={(event) =>
                onDraftChange?.({ ...draft, is_active: event.target.checked })
              }
            />
            Активное представление
          </label>

          <label className="designer-view-form__checkbox">
            <input
              type="checkbox"
              checked={Boolean(draft.tabSettings?.menuInTab)}
              onChange={(event) => {
                const nextTabSettings = {
                  ...(draft.tabSettings || readObjectTabSettings(draft.settings_json)),
                  menuInTab: event.target.checked,
                };

                onDraftChange?.({
                  ...draft,
                  tabSettings: nextTabSettings,
                  settings_json: mergeObjectTabSettingsIntoViewSettings(
                    draft.settings_json,
                    nextTabSettings,
                  ),
                });
              }}
            />
            Меню во вкладке
          </label>
          <p className="designer-view-form__hint">
            Показывать меню действий в названии вкладки вместо заголовка объекта.
          </p>

          <div className="designer-view-form__group">
            <label className="designer-label" htmlFor="view-prop-description">
              Описание
            </label>
            <textarea
              id="view-prop-description"
              className="designer-textarea designer-view-form__textarea"
              value={draft.description}
              onChange={(event) =>
                onDraftChange?.({ ...draft, description: event.target.value })
              }
            />
          </div>

          <section className="designer-view-form__section" aria-label="Настройки представления">
            <h5 className="designer-view-form__section-title">Настройки представления</h5>

            <ObjectProjectionPanel
              projection={draft.projection}
              fieldOptions={fieldOptions}
              titleFieldKey={resolvedTitleFieldKey}
              onProjectionChange={handleProjectionChange}
              onToggleVisibleField={onToggleVisibleField}
              onToggleInfoField={onToggleInfoField}
              onReorderField={onReorderField}
              showInfoColumn={isPlanView}
              showDefaultSort={isTableView}
              showRuntimePreview={isTableView}
              onOpenRuntimePreview={onOpenRuntimePreview}
              hint={
                isPlanView
                  ? "Глаз — поле используется в Плане. Чекбокс «Инфо» — показ во вкладке Инфо."
                  : "Предпросмотр обновится после публикации каталога."
              }
            />

            {isPlanView ? (
              <>
                <hr className="designer-view-form__section-divider" />

                <h6 className="designer-view-form__subsection-title">Настройки Плана</h6>
                <p className="designer-view-form__hint">
                  Иерархия определяет связь, по которой строится дерево.
                </p>

                <PlanViewSettingsPanel
                  planSettings={planSettings}
                  relationOptions={relationOptions}
                  objectTypeKey={objectTypeKey}
                  onChange={onPlanSettingsChange}
                />

                <hr className="designer-view-form__section-divider" />

                <h6 className="designer-view-form__subsection-title">Вкладки</h6>
                <p className="designer-view-form__hint">
                  Видимость, порядок и названия вкладок рабочей области Плана.
                </p>

                <PlanLayoutSettingsSection
                  planLayout={normalizePlanLayoutSettings(planSettings?.planLayout)}
                  onChange={(nextLayout) =>
                    onPlanSettingsChange?.({
                      ...(planSettings || {}),
                      planLayout: nextLayout,
                    })
                  }
                />
              </>
            ) : null}
          </section>
        </div>
      </div>

      <div className="designer-properties-panel__footer">
        <div className="designer-view-properties-panel__footer-actions">
          <button
            type="button"
            className="designer-btn designer-btn--danger"
            onClick={onDelete}
            disabled={isSelectedSystemDefault}
          >
            Удалить
          </button>
          <button
            type="button"
            className="designer-btn designer-btn--primary"
            onClick={onSave}
            disabled={saving}
          >
            {saving ? "Сохранение..." : "Сохранить"}
          </button>
        </div>
      </div>
    </aside>
  );
}
