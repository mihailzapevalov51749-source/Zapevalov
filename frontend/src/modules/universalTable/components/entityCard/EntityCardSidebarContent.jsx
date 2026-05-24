import EntityCardComments from "./EntityCardComments";

import { getEntityCardConfig } from "./services/entityCardConfig";

function normalizeSidebarConfig(table) {
  const { sidebar } = getEntityCardConfig(table);

  if (!sidebar) {
    return {
      enabled: true,
      type: "comments",
      config: {},
    };
  }

  return {
    enabled: sidebar.enabled !== false,
    type: sidebar.type || "comments",
    config: sidebar.config || {},
  };
}

function renderSidebar({
  sidebar,
  row,
  table,
  initialContext,
}) {
  switch (sidebar.type) {
    case "comments":
      return (
        <EntityCardComments
          row={row}
          table={table}
          initialContext={initialContext}
        />
      );

    case "none":
      return null;

    default:
      return (
        <EntityCardComments
          row={row}
          table={table}
          initialContext={initialContext}
        />
      );
  }
}

export default function EntityCardSidebarContent({
  row,
  table,
  initialContext = null,
}) {
  const sidebar = normalizeSidebarConfig(table);

  if (!sidebar.enabled) {
    return null;
  }

  return renderSidebar({
    sidebar,
    row,
    table,
    initialContext,
  });
}