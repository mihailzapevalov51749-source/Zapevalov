import { useEffect, useMemo } from "react";

import {
  registerObjectTableExportProvider,
  unregisterObjectTableExportProvider,
} from "../../../shared/objectPlatform/services/export/objectTableExportBridge";
import { resolveImportableFields } from "../../../shared/objectPlatform/services/import/resolveImportableFields";
import {
  registerObjectTableImportProvider,
  unregisterObjectTableImportProvider,
} from "../../../shared/objectPlatform/services/import/objectTableImportBridge";
import { resolveRelationTableColumns } from "../services/resolveRelationTableColumns";
import { TABLE_BASE_STATE_NAME } from "../table/preferences/tableBaseState";
import useObjectTableColumns from "../table/hooks/useObjectTableColumns";

/**
 * Registers Object Context Menu actions (Import/Export Excel) for any object view.
 * Table, Plan, Card and future adapters share the same runtime bridge providers.
 */
export default function useObjectRuntimeContextActions({
  tenantId,
  objectTypeKey,
  objectName = "Объект",
  query,
  resolvedContract = null,
  effectiveContract = null,
  viewKey = null,
  publishedTableViewKey = "default_table",
  isTableBaseStateActive = false,
  previewMode = false,
  enabled = true,
  sessionActiveQuickFilterId = null,
}) {
  const contractForColumns = effectiveContract || resolvedContract;

  const tableData = useObjectTableColumns({
    query,
    contract: contractForColumns,
    objectTypeKey,
    viewKey,
    publishedTableViewKey,
    isAllMode: isTableBaseStateActive,
  });

  const relationTableColumns = useMemo(
    () =>
      resolveRelationTableColumns(tableData.columns, query?.catalog, objectTypeKey),
    [tableData.columns, query?.catalog, objectTypeKey],
  );

  const exportRuntimeViewKey = isTableBaseStateActive
    ? String(publishedTableViewKey || "default_table").trim()
    : String(viewKey || publishedTableViewKey || "default_table").trim();

  const exportViewName = isTableBaseStateActive
    ? TABLE_BASE_STATE_NAME
    : String(resolvedContract?.name || effectiveContract?.name || objectName || "").trim() ||
      "Представление";

  useEffect(() => {
    if (!enabled || previewMode) {
      return undefined;
    }

    const provider = {
      canExport: () =>
        Boolean(tenantId) &&
        Boolean(objectTypeKey) &&
        tableData.columns.length > 0,
      buildSnapshot: async (menuContext = {}) => ({
        tenantId,
        objectTypeKey,
        viewKey: exportRuntimeViewKey,
        objectName:
          String(menuContext?.objectName || objectName || "").trim() || "Объект",
        viewName: exportViewName,
        contract: contractForColumns,
        session: {
          activeQuickFilterId: sessionActiveQuickFilterId ?? null,
        },
        columns: tableData.columns,
        relationColumns: relationTableColumns,
        catalog: query?.catalog ?? null,
      }),
    };

    registerObjectTableExportProvider(provider);

    return () => {
      unregisterObjectTableExportProvider(provider);
    };
  }, [
    enabled,
    previewMode,
    tenantId,
    objectTypeKey,
    objectName,
    exportRuntimeViewKey,
    exportViewName,
    contractForColumns,
    sessionActiveQuickFilterId,
    query?.catalog,
    tableData.columns,
    relationTableColumns,
  ]);

  useEffect(() => {
    if (!enabled || previewMode) {
      return undefined;
    }

    const provider = {
      canImport: () =>
        Boolean(tenantId) && Boolean(objectTypeKey) && Boolean(query?.catalog),
      buildImportSnapshot: async (menuContext = {}) => ({
        tenantId,
        objectTypeKey,
        objectName:
          String(menuContext?.objectName || objectName || "").trim() || "Объект",
        importableFields: resolveImportableFields(query?.catalog, objectTypeKey),
        onImported: () => query?.reload?.(),
      }),
    };

    registerObjectTableImportProvider(provider);

    return () => {
      unregisterObjectTableImportProvider(provider);
    };
  }, [
    enabled,
    previewMode,
    tenantId,
    objectTypeKey,
    objectName,
    query?.catalog,
    query?.reload,
  ]);
}
