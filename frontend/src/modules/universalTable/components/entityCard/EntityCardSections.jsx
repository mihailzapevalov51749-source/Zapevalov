import EntityCardParent from "./EntityCardParent";
import EntityCardMain from "./EntityCardMain";
import EntityCardDynamicFields from "./EntityCardDynamicFields";
import EntityCardTabs from "./EntityCardTabs";
import EntityCardAttachments from "./EntityCardAttachments";
import EntityCardFieldGroup from "./EntityCardFieldGroup";

import { getEntityCardConfig } from "./services/entityCardConfig";

const DEFAULT_FALLBACK_SECTIONS = [
  {
    id: "parent",
    type: "parentRow",
    order: 0,
    enabled: true,
    visible: true,
  },

  {
    id: "main",
    type: "mainFields",
    order: 1,
    enabled: true,
    visible: true,
  },

  {
    id: "fields",
    type: "fieldsGrid",
    order: 2,
    enabled: true,
    visible: true,
  },

  {
    id: "attachments",
    type: "attachments",
    order: 3,
    enabled: true,
    visible: true,
  },

  {
    id: "tabs",
    type: "tabs",
    order: 4,
    enabled: true,
    visible: true,
  },
];

function normalizeFieldIds(value) {
  if (!Array.isArray(value)) return [];

  return value
    .filter(
      (id) =>
        id !== null &&
        id !== undefined &&
        id !== ""
    )
    .map((id) => String(id));
}

function normalizeSectionId(id) {
  if (id === "customFields") {
    return "fields";
  }

  return id;
}

function normalizeSectionType(section) {
  const id = normalizeSectionId(section?.id);
  const type = section?.type;

  if (id === "parent") return "parentRow";
  if (id === "main") return "mainFields";
  if (id === "fields") return "fieldsGrid";
  if (id === "tabs") return "tabs";
  if (id === "attachments") return "attachments";

  return type || "fieldsGrid";
}

function isSectionEnabled(section) {
  return (
    section?.enabled !== false &&
    section?.visible !== false
  );
}

function normalizeSection(section, index) {
  const sectionConfig = section?.config || {};

  const id = normalizeSectionId(
    section?.id || `section_${index}`
  );

  const fieldIds = normalizeFieldIds(
    section?.fieldIds ||
      sectionConfig.fieldIds ||
      sectionConfig.fields ||
      []
  );

  const enabled = isSectionEnabled(section);

  return {
    ...(section || {}),
    id,

    type: normalizeSectionType({
      ...(section || {}),
      id,
    }),

    title:
      section?.title ||
      sectionConfig.title ||
      "",

    visible: enabled,
    enabled,

    order:
      typeof section?.order === "number"
        ? section.order
        : index,

    fieldIds,

    columnsCount:
      section?.columnsCount ||
      section?.columns ||
      sectionConfig.columnsCount ||
      sectionConfig.columns ||
      null,

    config: {
      ...sectionConfig,
      fieldIds,
    },
  };
}

function mergeDuplicateSections(sections) {
  const byId = new Map();

  sections.forEach((section, index) => {
    const originalId = String(
      section?.id || ""
    );

    const normalized = normalizeSection(
      section,
      index
    );

    if (!normalized.id) return;
    if (normalized.id === "comments") return;

    const existing = byId.get(normalized.id);

    if (!existing) {
      byId.set(normalized.id, normalized);
      return;
    }

    if (originalId === "customFields") {
      return;
    }

    byId.set(normalized.id, {
      ...existing,
      ...normalized,

      order:
        typeof normalized.order === "number"
          ? normalized.order
          : existing.order,

      fieldIds: normalized.fieldIds.length
        ? normalized.fieldIds
        : existing.fieldIds,

      config: {
        ...(existing.config || {}),
        ...(normalized.config || {}),

        fieldIds:
          normalized.fieldIds.length
            ? normalized.fieldIds
            : existing.fieldIds,
      },
    });
  });

  return Array.from(byId.values());
}

function sortSections(sections) {
  return [...sections].sort((a, b) => {
    const aOrder =
      typeof a?.order === "number"
        ? a.order
        : 0;

    const bOrder =
      typeof b?.order === "number"
        ? b.order
        : 0;

    return aOrder - bOrder;
  });
}

function getActiveSections(sections) {
  return sortSections(
    mergeDuplicateSections(sections).filter(
      (section) =>
        section.enabled !== false &&
        section.visible !== false
    )
  );
}

function normalizeSectionsConfig(table) {
  const rowCardSettings =
    table?.settings?.rowCard || {};

  const config = getEntityCardConfig(table);

  const sourceSections = Array.isArray(
    rowCardSettings.sections
  )
    ? rowCardSettings.sections
    : [];

  const activeSavedSections =
    getActiveSections(sourceSections);

  if (activeSavedSections.length) {
    return activeSavedSections;
  }

  const configSections = Array.isArray(
    config?.sections
  )
    ? config.sections
    : [];

  const activeConfigSections =
    getActiveSections(configSections);

  if (activeConfigSections.length) {
    return activeConfigSections;
  }

  return getActiveSections(
    DEFAULT_FALLBACK_SECTIONS
  );
}

function renderSection({
  section,
  row,
  rows,
  table,
  columns,
  initialContext,
  onOpenRelatedRow,
  onUploadAttachment,
  onDeleteAttachment,
  onUpdateRowField,
}) {
  if (
    !section ||
    section.enabled === false ||
    section.visible === false
  ) {
    return null;
  }

  const commonSectionProps = {
    section,
    sectionConfig: section.config,
    fieldIds: section.fieldIds,
    columnsCount: section.columnsCount,
    onUpdateRowField,
  };

  switch (section.type) {
    case "parentRow":
      return (
        <EntityCardParent
          row={row}
          rows={rows}
          table={table}
          columns={columns}
          onOpenParent={onOpenRelatedRow}
          onOpenRelatedRow={
            onOpenRelatedRow
          }
          {...commonSectionProps}
        />
      );

    case "mainFields":
      return (
        <EntityCardMain
          row={row}
          table={table}
          columns={columns}
          {...commonSectionProps}
        />
      );

    case "fieldsGrid":
      return (
        <EntityCardDynamicFields
          row={row}
          table={table}
          columns={columns}
          {...commonSectionProps}
        />
      );

    case "fieldGroup":
      return (
        <EntityCardFieldGroup
          row={row}
          table={table}
          columns={columns}
          config={section.config}
          {...commonSectionProps}
        />
      );

    case "tabs":
      return (
        <EntityCardTabs
          row={row}
          rows={rows}
          table={table}
          columns={columns}
          initialContext={initialContext}
          onOpenRelatedRow={
            onOpenRelatedRow
          }
          {...commonSectionProps}
        />
      );

    case "attachments":
      return (
               <EntityCardAttachments
  row={row}
  columns={columns}
  initialContext={initialContext}
  onUpload={onUploadAttachment}
  onDeleteAttachment={
    onDeleteAttachment
  }
  {...commonSectionProps}
/>


      );

    default:
      return null;
  }
}

export default function EntityCardSections({
  row,
  rows = [],
  table,
  columns = [],
  initialContext = null,
  onOpenRelatedRow,
  onUploadAttachment,
  onDeleteAttachment,
  onUpdateRowField,
}) {
  const sections =
    normalizeSectionsConfig(table);

  if (!sections.length) return null;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 18,
        minHeight: 0,
        paddingBottom: 12,
      }}
    >
      {sections.map((section) => {
        const renderedSection =
          renderSection({
            section,
            row,
            rows,
            table,
            columns,
            initialContext,
            onOpenRelatedRow,
            onUploadAttachment,
            onDeleteAttachment,
            onUpdateRowField,
          });

        if (!renderedSection) {
          return null;
        }

        return (
          <div key={section.id}>
            {renderedSection}
          </div>
        );
      })}
    </div>
  );
}