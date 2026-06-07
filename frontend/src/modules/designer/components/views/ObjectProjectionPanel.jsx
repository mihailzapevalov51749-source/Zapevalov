import ViewPropertiesFieldsList from "./ViewPropertiesFieldsList";

/**
 * Universal Projection editor for all object view types in Studio.
 */
export default function ObjectProjectionPanel({
  projection,
  fieldOptions = [],
  titleFieldKey = null,
  onProjectionChange,
  onToggleVisibleField,
  onToggleInfoField,
  onReorderField,
  showInfoColumn = false,
  showDefaultSort = true,
  showRuntimePreview = false,
  onOpenRuntimePreview,
  hint = "Предпросмотр обновится после публикации каталога.",
}) {
  const safeProjection =
    projection && typeof projection === "object"
      ? projection
      : {
          visible_fields: [],
          field_order: [],
          title_field: null,
          default_sort: { field: null, order: "desc" },
        };

  const resolvedTitleFieldKey =
    titleFieldKey ?? safeProjection.title_field ?? null;

  const updateProjection = (patch) => {
    onProjectionChange?.({
      ...safeProjection,
      ...patch,
    });
  };

  return (
    <div className="designer-view-form__section-body designer-object-projection-panel">
      <div className="designer-view-form__section-toolbar">
        <span className="designer-view-form__subsection-title">Projection</span>
        {showRuntimePreview ? (
          <button
            type="button"
            className="designer-btn"
            onClick={onOpenRuntimePreview}
          >
            Открыть предпросмотр
          </button>
        ) : null}
      </div>

      <ViewPropertiesFieldsList
        fieldOptions={fieldOptions}
        visibleFields={safeProjection.visible_fields || []}
        infoFieldKeys={safeProjection.info_field_keys || []}
        fieldOrder={safeProjection.field_order || []}
        titleFieldKey={resolvedTitleFieldKey}
        showInfoColumn={showInfoColumn}
        onToggleVisibleField={onToggleVisibleField}
        onToggleInfoField={onToggleInfoField}
        onReorderField={onReorderField}
      />

      <div className="designer-view-form__group">
        <label className="designer-label" htmlFor="view-prop-title-field">
          Title field
        </label>
        <select
          id="view-prop-title-field"
          className="designer-select"
          value={safeProjection.title_field || ""}
          onChange={(event) => {
            const value = event.target.value;
            updateProjection({ title_field: value ? value : null });
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

      {showDefaultSort ? (
        <div className="designer-view-form__group">
          <label className="designer-label">Default sort</label>
          <div className="designer-view-form__sort-row">
            <select
              className="designer-select"
              value={safeProjection.default_sort?.field || ""}
              onChange={(event) => {
                const value = event.target.value;
                updateProjection({
                  default_sort: {
                    ...safeProjection.default_sort,
                    field: value ? value : null,
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
              value={safeProjection.default_sort?.order || "desc"}
              onChange={(event) => {
                updateProjection({
                  default_sort: {
                    ...safeProjection.default_sort,
                    order: event.target.value,
                  },
                });
              }}
            >
              <option value="asc">asc</option>
              <option value="desc">desc</option>
            </select>
          </div>
        </div>
      ) : null}

      {hint ? <p className="designer-view-form__hint">{hint}</p> : null}
    </div>
  );
}
