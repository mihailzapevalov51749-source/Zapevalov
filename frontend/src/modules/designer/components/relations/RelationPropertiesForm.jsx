import RelationHierarchyLabelsEditor from "./RelationHierarchyLabelsEditor";
import { suggestRussianHierarchyInflection } from "../../../../shared/relation/hierarchyLabels.js";

import "./relationPropertiesPanel.css";

export default function RelationPropertiesForm({
  draft,
  objectTypeLabel = "",
  onDraftChange,
}) {
  if (!draft) {
    return null;
  }

  return (
    <div className="designer-relation-form">
      <div className="designer-relation-form__identity">
        <input
          className="designer-relation-form__name"
          value={draft.name}
          aria-label="Название связи"
          onChange={(event) =>
            onDraftChange?.({ ...draft, name: event.target.value })
          }
        />
        <code className="designer-relation-form__key">{draft.key}</code>
      </div>

      <div className="designer-relation-form__flags">
        <label className="designer-relation-form__flag">
          <input
            type="checkbox"
            checked={draft.is_active}
            onChange={(event) =>
              onDraftChange?.({ ...draft, is_active: event.target.checked })
            }
          />
          Активная связь
        </label>
        <label className="designer-relation-form__flag">
          <input
            type="checkbox"
            checked={draft.is_hierarchy}
            onChange={(event) => {
              const checked = event.target.checked;

              onDraftChange?.((current) => {
                if (!current) {
                  return current;
                }

                const next = {
                  ...current,
                  is_hierarchy: checked,
                };

                if (
                  checked &&
                  !current.hierarchy_labels?.child &&
                  current.name
                ) {
                  next.hierarchy_labels = suggestRussianHierarchyInflection(
                    current.name,
                    objectTypeLabel,
                  );
                }

                return next;
              });
            }}
          />
          Иерархическая связь
        </label>
      </div>

      <div className="designer-relation-form__group">
        <label className="designer-label">Тип связи</label>
        <select
          className="designer-select"
          value={draft.relation_type}
          onChange={(event) =>
            onDraftChange?.({ ...draft, relation_type: event.target.value })
          }
        >
          <option value="one_to_one">one_to_one</option>
          <option value="one_to_many">one_to_many</option>
          <option value="many_to_many">many_to_many</option>
        </select>
      </div>

      <RelationHierarchyLabelsEditor
        isHierarchy={draft.is_hierarchy}
        hierarchyLabels={draft.hierarchy_labels}
        onHierarchyLabelsChange={(hierarchyLabels) =>
          onDraftChange?.((current) =>
            current
              ? {
                  ...current,
                  hierarchy_labels: hierarchyLabels,
                }
              : current,
          )
        }
      />

      <div className="designer-relation-form__group">
        <label className="designer-label">Описание</label>
        <textarea
          className="designer-textarea"
          rows={2}
          value={draft.description}
          onChange={(event) =>
            onDraftChange?.({ ...draft, description: event.target.value })
          }
        />
      </div>
    </div>
  );
}
