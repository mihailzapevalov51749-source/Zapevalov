import { useMemo } from "react";



import { isPlanHierarchyRelationCandidate } from "../../../../shared/relation/hierarchyRelationProfile.js";

import { isOneToOneRelationType } from "../../../objectViews/plan/planHierarchyRelation.js";



const VIEW_TYPE_LABELS = {

  table: "Таблица",

  form: "Форма",

  quick_form: "Быстрая форма",

  card: "Карточка",

  list: "Список",

  plan: "План",

  board: "Канбан",

  tree: "Дерево",

  calendar: "Календарь",

};



export const STUDIO_VIEW_TYPES = ["table", "plan", "quick_form", "form", "card", "list"];



export function resolveStudioViewTypeLabel(viewType) {

  const key = String(viewType || "table").trim().toLowerCase();

  return VIEW_TYPE_LABELS[key] || key;

}



function buildHierarchyRelationOptions(relationOptions = [], objectTypeKey = "") {

  const currentTypeKey = String(objectTypeKey || "").trim();

  const hierarchyCandidates = (relationOptions || []).filter((relation) =>

    isPlanHierarchyRelationCandidate(relation, currentTypeKey),

  );



  if (hierarchyCandidates.length) {

    return hierarchyCandidates;

  }



  return relationOptions || [];

}



export default function PlanViewSettingsPanel({

  planSettings,

  relationOptions = [],

  objectTypeKey = "",

  onChange,

}) {

  const settings = planSettings || {};



  const hierarchyRelationOptions = useMemo(

    () => buildHierarchyRelationOptions(relationOptions, objectTypeKey),

    [relationOptions, objectTypeKey],

  );



  const selectedHierarchyRelation = useMemo(() => {

    const selectedKey = String(settings.hierarchyRelationKey || "").trim();



    if (!selectedKey) {

      return null;

    }



    return (

      relationOptions.find((relation) => String(relation?.key || "").trim() === selectedKey) ||

      null

    );

  }, [relationOptions, settings.hierarchyRelationKey]);



  const update = (patch) => {

    onChange?.({

      ...settings,

      ...patch,

    });

  };



  return (

    <div className="designer-view-form__section-body designer-plan-view-settings">

      <div className="designer-view-form__group">

        <label className="designer-label" htmlFor="plan-hierarchy-relation">

          Иерархия

        </label>

        <select

          id="plan-hierarchy-relation"

          className="designer-select"

          value={settings.hierarchyRelationKey || ""}

          onChange={(event) =>

            update({ hierarchyRelationKey: event.target.value || null })

          }

        >

          <option value="">Выберите self-relation или иерархическую связь</option>

          {hierarchyRelationOptions.map((relation) => (

            <option key={relation.key} value={relation.key}>

              {relation.name || relation.key}

            </option>

          ))}

        </select>

        <p className="designer-view-form__hint">

          Для дерева с несколькими дочерними элементами у одного родителя предпочтительна связь

          «один ко многим» (one_to_many).

        </p>

        {selectedHierarchyRelation && isOneToOneRelationType(selectedHierarchyRelation) ? (

          <p className="designer-view-form__hint designer-view-form__hint--warning">

            Связь «{selectedHierarchyRelation.name || selectedHierarchyRelation.key}» имеет тип

            one_to_one: у родителя может быть только один дочерний элемент. Для полноценной

            иерархии создайте self-relation one_to_many.

          </p>

        ) : null}

      </div>
    </div>
  );
}


