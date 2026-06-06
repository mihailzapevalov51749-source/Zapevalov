import ViewPropertiesFieldsList from "./ViewPropertiesFieldsList";

import "./viewPropertiesPanel.css";

const VIEW_TYPES = ["table", "form", "card", "list"];

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
  onReorderField,
}) {
  if (!draft) {
    return null;
  }

  const resolvedTitleFieldKey =
    titleFieldKey ?? draft.projection?.title_field ?? null;

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
                {VIEW_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
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

            <div className="designer-view-form__section-body">
              <div className="designer-view-form__section-toolbar">
                <span className="designer-view-form__subsection-title">Projection</span>
                <button
                  type="button"
                  className="designer-btn"
                  onClick={onOpenRuntimePreview}
                >
                  Открыть предпросмотр
                </button>
              </div>

              <ViewPropertiesFieldsList
                fieldOptions={fieldOptions}
                visibleFields={draft.projection.visible_fields || []}
                fieldOrder={draft.projection.field_order || []}
                titleFieldKey={resolvedTitleFieldKey}
                onToggleVisibleField={onToggleVisibleField}
                onReorderField={onReorderField}
              />

              <div className="designer-view-form__group">
                <label className="designer-label" htmlFor="view-prop-title-field">
                  Title field
                </label>
                <select
                  id="view-prop-title-field"
                  className="designer-select"
                  value={draft.projection.title_field || ""}
                  onChange={(event) => {
                    const value = event.target.value;

                    onDraftChange?.({
                      ...draft,
                      projection: {
                        ...draft.projection,
                        title_field: value ? value : null,
                      },
                    });
                  }}
                >
                  <option value="">null</option>
                  {fieldOptions.map((field) => (
                    <option key={field.key} value={field.key}>
                      {field.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="designer-view-form__group">
                <label className="designer-label">Default sort</label>
                <div className="designer-view-form__sort-row">
                  <select
                    className="designer-select"
                    value={draft.projection.default_sort.field || ""}
                    onChange={(event) => {
                      const value = event.target.value;

                      onDraftChange?.({
                        ...draft,
                        projection: {
                          ...draft.projection,
                          default_sort: {
                            ...draft.projection.default_sort,
                            field: value ? value : null,
                          },
                        },
                      });
                    }}
                  >
                    <option value="">created_at</option>
                    {fieldOptions.map((field) => (
                      <option key={field.key} value={field.key}>
                        {field.name}
                      </option>
                    ))}
                  </select>

                  <select
                    className="designer-select"
                    value={draft.projection.default_sort.order || "desc"}
                    onChange={(event) => {
                      onDraftChange?.({
                        ...draft,
                        projection: {
                          ...draft.projection,
                          default_sort: {
                            ...draft.projection.default_sort,
                            order: event.target.value,
                          },
                        },
                      });
                    }}
                  >
                    <option value="asc">asc</option>
                    <option value="desc">desc</option>
                  </select>
                </div>
              </div>

              <p className="designer-view-form__hint">
                Предпросмотр обновится после публикации каталога.
              </p>
            </div>
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
