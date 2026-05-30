import { useMemo } from "react";

import {
  applyColumnWidths,
  contractToDisplayProjection,
} from "../../services/columnPresentationUtils";
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
}) {
  const displayProjection = useMemo(() => {
    const runtimeProjection =
      query.projectionValid && query.projection ? query.projection : null;

    if (contract) {
      return contractToDisplayProjection(contract, runtimeProjection);
    }

    return runtimeProjection;
  }, [query.projection, query.projectionValid, contract]);

  const tableModel = useMemo(() => {
    if (!objectTypeKey) {
      return null;
    }

    return buildObjectTypeTableModelFromCatalog({
      catalog: query.catalog,
      objectTypeKey,
      projection: displayProjection,
      listResult: query.listResult,
      viewKey,
      sort: query.tableSort,
    });
  }, [
    query.catalog,
    query.listResult,
    displayProjection,
    query.tableSort,
    objectTypeKey,
    viewKey,
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
