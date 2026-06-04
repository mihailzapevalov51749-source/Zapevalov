import { useMemo } from "react";

import {
  applyColumnWidths,
  contractToDisplayProjection,
} from "../../services/columnPresentationUtils";
import { resolveTableDisplayContext } from "../../services/tableColumnOrder";
import { findCatalogObjectType } from "../services/adapters/ObjectTypeTableAdapter";
import {
  buildObjectTypeTableModelFromCatalog,
} from "../services/tableModelAdapter";

/**
 * Builds table columns/rows from query state + effective view contract.
 */
export default function useObjectTableColumns({
  query,
  contract,
  objectTypeKey,
  viewKey,
  publishedTableViewKey = "default_table",
  isAllMode = false,
}) {
  const displayProjection = useMemo(() => {
    const runtimeProjection =
      query.projectionValid && query.projection ? query.projection : null;
    const objectType = findCatalogObjectType(query.catalog, objectTypeKey);
    const displayOptions = {
      objectType,
      publishedViewKey: isAllMode
        ? String(publishedTableViewKey || "default_table").trim()
        : String(viewKey || publishedTableViewKey || "default_table").trim(),
    };

    if (contract) {
      return contractToDisplayProjection(
        contract,
        runtimeProjection,
        displayOptions,
      );
    }

    return runtimeProjection;
  }, [
    query.projection,
    query.projectionValid,
    contract,
    query.catalog,
    objectTypeKey,
    viewKey,
    publishedTableViewKey,
    isAllMode,
  ]);

  const tableModel = useMemo(() => {
    if (!objectTypeKey) {
      return null;
    }

    const objectType = findCatalogObjectType(query.catalog, objectTypeKey);
    const displayContext = resolveTableDisplayContext(contract, displayProjection, {
      objectType,
      publishedViewKey: isAllMode
        ? String(publishedTableViewKey || "default_table").trim()
        : String(viewKey || publishedTableViewKey || "default_table").trim(),
    });

    return buildObjectTypeTableModelFromCatalog({
      catalog: query.catalog,
      objectTypeKey,
      projection: displayProjection,
      listResult: query.listResult,
      viewKey,
      sort: query.tableSort,
      columnOptions: {
        titleFieldKey: displayContext.titleFieldKey,
        isAllMode: displayContext.isAllMode,
      },
    });
  }, [
    query.catalog,
    query.listResult,
    displayProjection,
    query.tableSort,
    objectTypeKey,
    viewKey,
    publishedTableViewKey,
    isAllMode,
    contract,
  ]);

  const columns = useMemo(() => {
    const baseColumns = tableModel?.columns ?? [];
    const widths = contract?.presentation?.table?.columnWidths || {};

    return applyColumnWidths(baseColumns, widths);
  }, [tableModel?.columns, contract?.presentation?.table?.columnWidths]);

  return {
    columns,
    rows: tableModel?.rows ?? [],
    pagination: tableModel?.pagination ?? {
      limit: query.pageSize,
      offset: query.offset ?? 0,
      total: 0,
      hasMore: false,
    },
    sort: tableModel?.sort ?? query.tableSort,
    tableModel,
    catalogVersion: tableModel?.catalogVersion ?? null,
    schemaVersion: tableModel?.schemaVersion ?? null,
    projectionValid: query.projectionValid,
  };
}
