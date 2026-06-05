import { useEffect, useMemo, useState } from "react";

import {
  DEFAULT_HIERARCHY_LABELS,
  suggestRussianHierarchyInflection,
} from "../../../../shared/relation/hierarchyLabels.js";

import "./relationPropertiesPanel.css";

const INFLECTION_KEYS = ["children_genitive", "children_instrumental"];

const PARENT_FIELD = {
  key: "parent",
  label: "Родитель",
  badge: "вручную",
  badgeVariant: "manual",
};

const CHILD_TERM_FIELDS = [
  { key: "child", label: "Потомок", badge: "вручную", badgeVariant: "manual" },
  { key: "children", label: "Потомки", badge: "авто", badgeVariant: "auto" },
];

const INFLECTION_FIELDS = [
  { key: "children_genitive", label: "Род. мн.", badge: "авто", badgeVariant: "auto" },
  { key: "children_instrumental", label: "Твор. мн.", badge: "авто", badgeVariant: "auto" },
];

const AUTO_FILL_HINT =
  "Поля с меткой «авто» заполнены автоматически. Их можно исправить вручную.";

function emptyLabels() {
  return { ...DEFAULT_HIERARCHY_LABELS };
}

function HierarchyFieldLabel({ field, htmlFor }) {
  return (
    <label className="designer-relation-hierarchy__label" htmlFor={htmlFor}>
      <span className="designer-relation-hierarchy__label-text">{field.label}</span>
      <span
        className={`designer-relation-hierarchy__badge designer-relation-hierarchy__badge--${field.badgeVariant}`}
      >
        {field.badge}
      </span>
    </label>
  );
}

function HierarchyField({ field, value, onChange }) {
  const inputId = `relation-hierarchy-${field.key}`;

  return (
    <div className="designer-relation-hierarchy__field">
      <HierarchyFieldLabel field={field} htmlFor={inputId} />
      <input
        id={inputId}
        className="designer-input"
        value={value}
        onChange={(event) => onChange(field.key, event.target.value)}
      />
    </div>
  );
}

export default function RelationHierarchyLabelsEditor({
  isHierarchy = false,
  hierarchyLabels,
  onHierarchyLabelsChange,
}) {
  const labels = useMemo(
    () => ({
      ...emptyLabels(),
      ...(hierarchyLabels && typeof hierarchyLabels === "object" ? hierarchyLabels : {}),
    }),
    [hierarchyLabels],
  );

  const [manualFields, setManualFields] = useState(() => new Set());

  useEffect(() => {
    setManualFields(new Set());
  }, [isHierarchy]);

  if (!isHierarchy) {
    return null;
  }

  const applyChildInflection = (childValue, parentValue) => {
    const suggested = suggestRussianHierarchyInflection(childValue, parentValue);
    const next = { ...labels, child: childValue };

    for (const key of ["children", ...INFLECTION_KEYS]) {
      if (!manualFields.has(key)) {
        next[key] = suggested[key];
      }
    }

    if (!manualFields.has("parent") && parentValue) {
      next.parent = suggested.parent;
    }

    onHierarchyLabelsChange?.(next);
  };

  const handleLabelChange = (key, value) => {
    if (key === "children" || INFLECTION_KEYS.includes(key)) {
      setManualFields((current) => new Set(current).add(key));
    }

    onHierarchyLabelsChange?.({
      ...labels,
      [key]: value,
    });
  };

  const handleFieldChange = (key, value) => {
    if (key === "child") {
      applyChildInflection(value, labels.parent);
      return;
    }

    if (key === "parent") {
      onHierarchyLabelsChange?.({
        ...labels,
        parent: value,
      });
      return;
    }

    handleLabelChange(key, value);
  };

  return (
    <div className="designer-relation-hierarchy">
      <p className="designer-relation-hierarchy__hint" title={AUTO_FILL_HINT}>
        <span className="designer-relation-hierarchy__hint-icon" aria-hidden="true">
          ⓘ
        </span>
        {AUTO_FILL_HINT}
      </p>

      <h4 className="designer-relation-hierarchy__section-title">Терминология</h4>

      <div className="designer-relation-hierarchy__parent">
        <HierarchyField
          field={PARENT_FIELD}
          value={labels.parent || ""}
          onChange={handleFieldChange}
        />
      </div>

      <div className="designer-relation-hierarchy__child-terms">
        {CHILD_TERM_FIELDS.map((field) => (
          <HierarchyField
            key={field.key}
            field={field}
            value={labels[field.key] || ""}
            onChange={handleFieldChange}
          />
        ))}
      </div>

      <h4 className="designer-relation-hierarchy__section-title">Склонения</h4>
      <div className="designer-relation-hierarchy__inflections">
        {INFLECTION_FIELDS.map((field) => (
          <HierarchyField
            key={field.key}
            field={field}
            value={labels[field.key] || ""}
            onChange={handleFieldChange}
          />
        ))}
      </div>
    </div>
  );
}
