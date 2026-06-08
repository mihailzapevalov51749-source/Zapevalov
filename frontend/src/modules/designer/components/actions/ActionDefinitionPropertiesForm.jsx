import {
  CREATE_RECORD_ACTION_TYPE,
  resolveActionTypeLabel,
} from "./createActionDefinitionFormUtils";



import "./actionDefinitionPropertiesPanel.css";



function togglePlacementKey(currentKeys, placementKey, checked) {

  const normalizedKey = String(placementKey || "").trim();

  const keys = new Set(

    (currentKeys || [])

      .map((key) => String(key || "").trim())

      .filter(Boolean),

  );



  if (checked) {

    keys.add(normalizedKey);

  } else {

    keys.delete(normalizedKey);

  }



  return [...keys];

}



export default function ActionDefinitionPropertiesForm({

  draft,

  actionTypes = [],

  placementCatalog = [],
  objectTypes = [],
  objectTypesLoading = false,
  targetObjectWarning = "",
  autoLinkRelations = [],
  autoLinkRelationsLoading = false,

  placementsLoading = false,

  placementsCatalogError = "",

  readOnly = false,

  saveError = "",

  saveMessage = "",

  formDraft = null,
  objectFields = [],
  formLoading = false,
  onDraftChange,
  onFormDraftChange,

}) {

  if (!draft) {

    return null;

  }



  const actionTypeLabel = resolveActionTypeLabel(actionTypes, draft.action_type_key);

  const placementKeysDraft = Array.isArray(draft.placementKeysDraft)

    ? draft.placementKeysDraft

    : [];



  return (

    <div className="designer-action-definition-properties__form">

      <div className="designer-action-definition-properties__group">

        <label className="designer-label" htmlFor="action-definition-name">

          Название

        </label>

        <input

          id="action-definition-name"

          className="designer-input"

          value={draft.name}

          disabled={readOnly}

          onChange={(event) =>

            onDraftChange?.((prev) => ({ ...prev, name: event.target.value }))

          }

        />

      </div>



      <div className="designer-action-definition-properties__group">

        <span className="designer-label">Ключ</span>

        <p className="designer-action-definition-properties__readonly">

          <code>{draft.key}</code>

        </p>

      </div>



      <div className="designer-action-definition-properties__group">

        <label className="designer-label" htmlFor="action-definition-description">

          Описание

        </label>

        <textarea

          id="action-definition-description"

          className="designer-input"

          rows={3}

          value={draft.description}

          disabled={readOnly}

          onChange={(event) =>

            onDraftChange?.((prev) => ({ ...prev, description: event.target.value }))

          }

        />

      </div>



      <div className="designer-action-definition-properties__group">

        <span className="designer-label">Тип действия</span>

        <p className="designer-action-definition-properties__readonly">

          {actionTypeLabel}

          {draft.action_type_key ? (

            <>

              {" "}

              (<code>{draft.action_type_key}</code>)

            </>

          ) : null}

        </p>

      </div>



      {draft.action_type_key === CREATE_RECORD_ACTION_TYPE ? (
        <div className="designer-action-definition-properties__group">
          <label
            className="designer-label"
            htmlFor="action-definition-target-object-type"
          >
            Целевой объект *
          </label>
          <p className="designer-action-definition-properties__hint">
            Тип объекта, в котором будет создана запись и из которого берутся поля формы.
          </p>
          <select
            id="action-definition-target-object-type"
            className="designer-select"
            value={draft.target_object_type_id || ""}
            disabled={readOnly || objectTypesLoading}
            onChange={(event) =>
              onDraftChange?.((prev) => ({
                ...prev,
                target_object_type_id: event.target.value,
              }))
            }
          >
            <option value="">
              {objectTypesLoading ? "Загрузка типов..." : "Выберите тип объекта"}
            </option>
            {(objectTypes || []).map((objectType) => (
              <option key={objectType.id} value={objectType.id}>
                {objectType.name}
                {objectType.key ? ` (${objectType.key})` : ""}
              </option>
            ))}
          </select>
          {targetObjectWarning ? (
            <p
              className="designer-action-definition-properties__message designer-action-definition-properties__message--warning"
              role="status"
            >
              {targetObjectWarning}
            </p>
          ) : null}
        </div>
      ) : null}

      {draft.action_type_key === CREATE_RECORD_ACTION_TYPE ? (
        <div className="designer-action-definition-properties__group">
          <span className="designer-label">Связь после создания</span>
          <p className="designer-action-definition-properties__hint">
            После создания записи автоматически свяжите её с исходной записью действия.
          </p>

          <label className="designer-action-definition-properties__checkbox-row">
            <input
              type="checkbox"
              checked={draft.auto_link_enabled === true}
              disabled={readOnly}
              onChange={(event) =>
                onDraftChange?.((prev) => ({
                  ...prev,
                  auto_link_enabled: event.target.checked,
                  auto_link_relation_id: event.target.checked
                    ? prev.auto_link_relation_id
                    : "",
                }))
              }
            />
            Создать связь
          </label>

          {draft.auto_link_enabled ? (
            <div className="designer-action-definition-properties__group">
              <label
                className="designer-label"
                htmlFor="action-definition-auto-link-relation"
              >
                Тип связи *
              </label>
              <select
                id="action-definition-auto-link-relation"
                className="designer-select"
                value={draft.auto_link_relation_id || ""}
                disabled={
                  readOnly ||
                  autoLinkRelationsLoading ||
                  !String(draft.target_object_type_id || "").trim()
                }
                onChange={(event) =>
                  onDraftChange?.((prev) => ({
                    ...prev,
                    auto_link_relation_id: event.target.value,
                  }))
                }
              >
                <option value="">
                  {autoLinkRelationsLoading
                    ? "Загрузка связей..."
                    : !String(draft.target_object_type_id || "").trim()
                      ? "Сначала выберите целевой объект"
                      : "Выберите тип связи"}
                </option>
                {(autoLinkRelations || []).map((relation) => (
                  <option key={relation.id} value={relation.id}>
                    {relation.name}
                    {relation.key ? ` (${relation.key})` : ""}
                  </option>
                ))}
              </select>
              {!autoLinkRelationsLoading &&
              String(draft.target_object_type_id || "").trim() &&
              !(autoLinkRelations || []).length ? (
                <p className="designer-action-definition-properties__message">
                  Нет связей между исходным и целевым объектом.
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      <label className="designer-action-definition-properties__checkbox-row">

        <input

          type="checkbox"

          checked={draft.is_active !== false}

          disabled={readOnly}

          onChange={(event) =>

            onDraftChange?.((prev) => ({ ...prev, is_active: event.target.checked }))

          }

        />

        Активно

      </label>



      <div className="designer-action-definition-properties__group designer-action-definition-properties__placements">

        <span className="designer-label">Размещение действия</span>

        <p className="designer-action-definition-properties__hint">

          Выберите, где действие будет доступно пользователю.

        </p>



        {placementsLoading ? (

          <p className="designer-action-definition-properties__message">Загрузка…</p>

        ) : null}



        {!placementsLoading && placementsCatalogError ? (

          <p className="designer-action-definition-properties__error" role="alert">

            {placementsCatalogError}

          </p>

        ) : null}



        {!placementsLoading && !placementsCatalogError ? (

          <div className="designer-action-definition-properties__placement-list">

            {placementCatalog.map((item) => {

              const placementKey = String(item?.key || "").trim();

              const checked = placementKeysDraft.includes(placementKey);



              return (

                <label

                  key={placementKey}

                  className="designer-action-definition-properties__checkbox-row"

                >

                  <input

                    type="checkbox"

                    checked={checked}

                    disabled={readOnly}

                    onChange={(event) =>

                      onDraftChange?.((prev) => ({

                        ...prev,

                        placementKeysDraft: togglePlacementKey(

                          prev.placementKeysDraft,

                          placementKey,

                          event.target.checked,

                        ),

                      }))

                    }

                  />

                  {item?.name || placementKey}

                </label>

              );

            })}

          </div>

        ) : null}

      </div>



      <div className="designer-action-definition-properties__group designer-action-definition-properties__form">

        <span className="designer-label">Форма действия</span>

        <p className="designer-action-definition-properties__hint">

          Настройте поля, которые пользователь заполнит перед выполнением действия.

        </p>



        {formLoading ? (

          <p className="designer-action-definition-properties__message">Загрузка…</p>

        ) : null}



        {!formLoading && formDraft ? (

          <>

            <label className="designer-action-definition-properties__checkbox-row">

              <input

                type="checkbox"

                checked={formDraft.enabled === true}

                disabled={readOnly}

                onChange={(event) =>

                  onFormDraftChange?.((prev) => ({

                    ...prev,

                    enabled: event.target.checked,

                  }))

                }

              />

              Использовать форму действия

            </label>



            {formDraft.enabled ? (

              <div className="designer-action-definition-properties__form-settings">

                <div className="designer-action-definition-properties__group">

                  <label className="designer-label" htmlFor="action-form-title">

                    Заголовок

                  </label>

                  <input

                    id="action-form-title"

                    className="designer-input"

                    value={formDraft.title}

                    disabled={readOnly}

                    onChange={(event) =>

                      onFormDraftChange?.((prev) => ({

                        ...prev,

                        title: event.target.value,

                      }))

                    }

                  />

                </div>



                <div className="designer-action-definition-properties__group">

                  <label className="designer-label" htmlFor="action-form-description">

                    Описание

                  </label>

                  <textarea

                    id="action-form-description"

                    className="designer-input"

                    rows={2}

                    value={formDraft.description}

                    disabled={readOnly}

                    onChange={(event) =>

                      onFormDraftChange?.((prev) => ({

                        ...prev,

                        description: event.target.value,

                      }))

                    }

                  />

                </div>



                <div className="designer-action-definition-properties__group">

                  <label className="designer-label" htmlFor="action-form-submit-label">

                    Текст кнопки подтверждения

                  </label>

                  <input

                    id="action-form-submit-label"

                    className="designer-input"

                    value={formDraft.submit_label}

                    disabled={readOnly}

                    onChange={(event) =>

                      onFormDraftChange?.((prev) => ({

                        ...prev,

                        submit_label: event.target.value,

                      }))

                    }

                  />

                </div>



                <div className="designer-action-definition-properties__group">

                  <label className="designer-label" htmlFor="action-form-cancel-label">

                    Текст кнопки отмены

                  </label>

                  <input

                    id="action-form-cancel-label"

                    className="designer-input"

                    value={formDraft.cancel_label}

                    disabled={readOnly}

                    onChange={(event) =>

                      onFormDraftChange?.((prev) => ({

                        ...prev,

                        cancel_label: event.target.value,

                      }))

                    }

                  />

                </div>



                <div className="designer-action-definition-properties__group">

                  <span className="designer-label">Поля формы</span>

                  <div className="designer-action-definition-properties__placement-list">

                    {(formDraft.fieldsDraft || []).map((field) => (

                      <div

                        key={field.field_definition_id}

                        className="designer-action-definition-properties__form-field-row"

                      >

                        <label className="designer-action-definition-properties__checkbox-row">

                          <input

                            type="checkbox"

                            checked={field.enabled === true}

                            disabled={readOnly}

                            onChange={(event) =>

                              onFormDraftChange?.((prev) => ({

                                ...prev,

                                fieldsDraft: (prev.fieldsDraft || []).map((item) =>

                                  item.field_definition_id === field.field_definition_id

                                    ? { ...item, enabled: event.target.checked }

                                    : item,

                                ),

                              }))

                            }

                          />

                          {field.field_name || field.field_key}

                        </label>



                        <label className="designer-action-definition-properties__checkbox-row">

                          <input

                            type="checkbox"

                            checked={field.required === true}

                            disabled={readOnly || !field.enabled}

                            onChange={(event) =>

                              onFormDraftChange?.((prev) => ({

                                ...prev,

                                fieldsDraft: (prev.fieldsDraft || []).map((item) =>

                                  item.field_definition_id === field.field_definition_id

                                    ? { ...item, required: event.target.checked }

                                    : item,

                                ),

                              }))

                            }

                          />

                          Обязательное

                        </label>

                      </div>

                    ))}

                  </div>



                  {!objectFields.length ? (

                    <p className="designer-action-definition-properties__message">

                      У объекта пока нет полей.

                    </p>

                  ) : null}

                </div>

              </div>

            ) : null}

          </>

        ) : null}

      </div>



      {saveMessage ? (

        <p className="designer-action-definition-properties__message">{saveMessage}</p>

      ) : null}

      {saveError ? (

        <p className="designer-action-definition-properties__error" role="alert">

          {saveError}

        </p>

      ) : null}

    </div>

  );

}


