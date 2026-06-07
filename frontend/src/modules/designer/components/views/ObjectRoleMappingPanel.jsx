import {

  buildRoleMappingPayload,

  normalizeRoleLabels,

  normalizeRoleMapping,

} from "../../../objectViews/services/objectViewRoleMapping.js";

import { generatePlanRoleMappingFromLegacy } from "../../utils/generatePlanRoleMappingFromLegacy.js";

import { shouldShowPlanRoleMappingMigrationAssistant } from "../../utils/shouldShowPlanRoleMappingMigrationAssistant.js";



import "./objectRoleMappingPanel.css";



/**

 * Universal Role Mapping editor — roles pick field keys from Projection only.

 *

 * @param {Object} props

 * @param {import("../../../objectViews/services/objectViewRoleMapping.js").ObjectViewRoleMapping} [props.roleMapping]

 * @param {Array<{ roleKey: string, label: string, hint?: string }>} [props.roleDefinitions]

 * @param {string[]} [props.projectionFieldKeys]

 * @param {Array<{ key: string, name?: string }>} [props.fieldOptions]

 * @param {(next: import("../../../objectViews/services/objectViewRoleMapping.js").ObjectViewRoleMapping) => void} [props.onRoleMappingChange]

 * @param {Record<string, unknown> | null} [props.legacyPlanSettings]

 * @param {boolean} [props.showLegacyMigrationAssistant]

 * @param {boolean} [props.usePlanTableLayout]

 */

export default function ObjectRoleMappingPanel({

  roleMapping = {},

  roleDefinitions = [],

  projectionFieldKeys = [],

  fieldOptions = [],

  onRoleMappingChange,

  legacyPlanSettings = null,

  showLegacyMigrationAssistant = false,

  usePlanTableLayout = false,

}) {

  const normalizedMapping = normalizeRoleMapping(roleMapping);

  const roleLabels = normalizeRoleLabels(roleMapping);

  const fieldByKey = new Map(

    (fieldOptions || []).map((field) => [String(field.key), field]),

  );



  const emitChange = (nextFieldMappings, nextLabels = roleLabels) => {

    onRoleMappingChange?.(buildRoleMappingPayload(nextFieldMappings, nextLabels));

  };



  const updateRole = (roleKey, fieldKey) => {

    const next = { ...normalizedMapping };

    const normalizedFieldKey = String(fieldKey || "").trim();



    if (normalizedFieldKey) {

      next[roleKey] = normalizedFieldKey;

    } else {

      delete next[roleKey];

    }



    emitChange(next);

  };



  const updateRoleLabel = (roleKey, label) => {

    const nextLabels = { ...roleLabels };

    const normalizedLabel = String(label || "").trim();



    if (normalizedLabel) {

      nextLabels[roleKey] = normalizedLabel;

    } else {

      delete nextLabels[roleKey];

    }



    emitChange(normalizedMapping, nextLabels);

  };



  if (!roleDefinitions.length) {

    return null;

  }



  const handleGenerateFromLegacy = () => {

    const nextRoleMapping = generatePlanRoleMappingFromLegacy(

      legacyPlanSettings,

      projectionFieldKeys,

      normalizedMapping,

    );

    onRoleMappingChange?.(buildRoleMappingPayload(nextRoleMapping, roleLabels));

  };



  const showMigrationAssistant =

    showLegacyMigrationAssistant &&

    shouldShowPlanRoleMappingMigrationAssistant(roleMapping, legacyPlanSettings);



  return (

    <div className="designer-object-role-mapping-panel">

      <h6 className="designer-view-form__subsection-title">Role Mapping</h6>

      <p className="designer-view-form__hint">

        Назначьте роли представления полям из Projection. Отображаемые названия ролей

        используются в интерфейсе Плана.

      </p>



      {showMigrationAssistant ? (

        <div className="designer-view-form__group">

          <button

            type="button"

            className="designer-btn"

            disabled={!projectionFieldKeys.length}

            onClick={handleGenerateFromLegacy}

          >

            Заполнить Role Mapping из сохранённых настроек

          </button>

          <p className="designer-view-form__hint">

            Подставит роли из ранее сохранённых полей плана, если Role Mapping ещё пуст.

          </p>

        </div>

      ) : null}



      {!projectionFieldKeys.length ? (

        <p className="designer-view-form__hint designer-view-form__hint--warning">

          Добавьте поля в Projection, чтобы настроить Role Mapping.

        </p>

      ) : null}



      {usePlanTableLayout ? (

        <div className="designer-role-mapping-table-wrap">

          <table className="designer-role-mapping-table">

            <thead>

              <tr>

                <th scope="col">Роль</th>

                <th scope="col">Название роли</th>

                <th scope="col">Поле</th>

              </tr>

            </thead>

            <tbody>

              {roleDefinitions.map((definition) => {

                const selectId = `role-mapping-${definition.roleKey}`;

                const labelId = `role-label-${definition.roleKey}`;



                return (

                  <tr key={definition.roleKey}>

                    <td>

                      <code className="designer-role-mapping-table__role-key">

                        {definition.roleKey}

                      </code>

                    </td>

                    <td>

                      <input

                        id={labelId}

                        className="designer-input designer-role-mapping-table__label-input"

                        value={roleLabels[definition.roleKey] || definition.label}

                        placeholder={definition.label}

                        onChange={(event) =>

                          updateRoleLabel(definition.roleKey, event.target.value)

                        }

                      />

                    </td>

                    <td>

                      <select

                        id={selectId}

                        className="designer-select"

                        value={normalizedMapping[definition.roleKey] || ""}

                        disabled={!projectionFieldKeys.length}

                        onChange={(event) =>

                          updateRole(definition.roleKey, event.target.value || null)

                        }

                      >

                        <option value="">Не выбрано</option>

                        {projectionFieldKeys.map((fieldKey) => {

                          const field = fieldByKey.get(fieldKey);

                          const label = String(field?.name || fieldKey).trim();



                          return (

                            <option key={`${definition.roleKey}-${fieldKey}`} value={fieldKey}>

                              {label}

                            </option>

                          );

                        })}

                      </select>

                    </td>

                  </tr>

                );

              })}

            </tbody>

          </table>

        </div>

      ) : (

        roleDefinitions.map((definition) => {

          const selectId = `role-mapping-${definition.roleKey}`;



          return (

            <div key={definition.roleKey} className="designer-view-form__group">

              <label className="designer-label" htmlFor={selectId}>

                {definition.label}

              </label>

              <select

                id={selectId}

                className="designer-select"

                value={normalizedMapping[definition.roleKey] || ""}

                disabled={!projectionFieldKeys.length}

                onChange={(event) =>

                  updateRole(definition.roleKey, event.target.value || null)

                }

              >

                <option value="">Не выбрано</option>

                {projectionFieldKeys.map((fieldKey) => {

                  const field = fieldByKey.get(fieldKey);

                  const label = String(field?.name || fieldKey).trim();



                  return (

                    <option key={`${definition.roleKey}-${fieldKey}`} value={fieldKey}>

                      {label}

                    </option>

                  );

                })}

              </select>

              {definition.hint ? (

                <p className="designer-view-form__hint">{definition.hint}</p>

              ) : null}

            </div>

          );

        })

      )}

    </div>

  );

}


