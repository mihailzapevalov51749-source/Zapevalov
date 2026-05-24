import UniversalTableLayout from "../tableView/UniversalTableLayout";

import UniversalTreeView from "./UniversalTreeView";
import UniversalCompositeView from "./UniversalCompositeView";

function UnsupportedUniversalView({ view }) {
  return (
    <div style={styles.unsupported}>
      Представление «{view?.type || "unknown"}» пока не реализовано.
    </div>
  );
}

function getFieldId(field) {
  return String(
    field?.id ||
      field?.field_id ||
      field?.fieldId ||
      field?.key ||
      field?.name ||
      ""
  );
}

function getSelectedFieldIds(view) {
  const settings = view?.settings || {};
  const selectedFieldIds = settings.fields;

  if (!Array.isArray(selectedFieldIds)) {
    return [];
  }

  return selectedFieldIds.map((id) => String(id));
}

function filterItemsByFieldIds(items = [], selectedFieldIds = []) {
  if (!selectedFieldIds.length) {
    return items;
  }

  const selectedSet = new Set(selectedFieldIds);

  return items.filter((item) => selectedSet.has(getFieldId(item)));
}

function normalizeCompositeView(view) {
  const settings = view?.settings || {};

  return {
    ...view,
    settings: {
      ...settings,
      fields: Array.isArray(settings.fields) ? settings.fields : [],
      blocks: Array.isArray(settings.blocks) ? settings.blocks : [],
    },
  };
}

export default function UniversalViewRenderer({
  view,
  table,
  block,
  rows,
  columns,
  fields,
  controller,
  onBlockUpdated,
  onViewUpdate,
  onViewSettingsSave,
  onRowOpen,
  onRowCreate,
  onRowUpdate,
  onRowDelete,
}) {
  if (!view?.type) {
    return <UnsupportedUniversalView view={view} />;
  }

  const selectedFieldIds = getSelectedFieldIds(view);

  const viewFields = filterItemsByFieldIds(fields, selectedFieldIds);
  const viewColumns = filterItemsByFieldIds(columns, selectedFieldIds);

  switch (view.type) {
    case "table":
      return (
        <UniversalTableLayout
          view={view}
          table={table}
          block={block}
          rows={rows}
          columns={viewColumns}
          fields={viewFields}
          controller={controller}
          topBarProps={{
            ...(controller.topBarProps || {}),
            block,
            onBlockUpdated,
          }}
          tableViewBarProps={controller.tableViewBarProps}
          mainContentProps={{
            ...(controller.mainContentProps || {}),
            block,
            onBlockUpdated,
          }}
          onViewUpdate={onViewUpdate}
          onViewSettingsSave={onViewSettingsSave || onViewUpdate}
          onRowOpen={onRowOpen}
          onRowCreate={onRowCreate}
          onRowUpdate={onRowUpdate}
          onRowDelete={onRowDelete}
        />
      );

    case "tree":
      return (
        <UniversalTreeView
          view={view}
          settings={view.settings || {}}
          table={table}
          block={block}
          rows={rows}
          columns={viewColumns}
          fields={viewFields}
          controller={controller}
          onBlockUpdated={onBlockUpdated}
          onViewSettingsSave={onViewSettingsSave || onViewUpdate}
          onRowOpen={onRowOpen}
          onRowCreate={onRowCreate}
          onRowUpdate={onRowUpdate}
          onRowDelete={onRowDelete}
        />
      );

    case "composite":
      return (
        <UniversalCompositeView
          view={normalizeCompositeView(view)}
          table={table}
          block={block}
          rows={rows}
          columns={columns}
          fields={fields}
          controller={controller}
          onBlockUpdated={onBlockUpdated}
          onViewUpdate={onViewUpdate}
          onViewSettingsSave={onViewSettingsSave || onViewUpdate}
          onRowOpen={onRowOpen}
          onRowCreate={onRowCreate}
          onRowUpdate={onRowUpdate}
          onRowDelete={onRowDelete}
        />
      );

    default:
      return <UnsupportedUniversalView view={view} />;
  }
}

const styles = {
  unsupported: {
    margin: 16,
    padding: 16,

    border: "1px dashed #CBD5E1",
    borderRadius: 10,

    background: "#F8FAFC",

    fontSize: 13,
    color: "#64748B",
  },
};