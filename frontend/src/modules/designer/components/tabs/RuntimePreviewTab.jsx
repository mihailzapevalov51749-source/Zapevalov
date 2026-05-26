import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { getApiErrorMessage } from "../../api/platformApiClient";
import { runtimeReadGateway } from "../../../runtimeReadGateway";

function formatCellValue(value) {
  if (value == null) {
    return "";
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

export default function RuntimePreviewTab({ tenantId, objectTypeKey }) {
  const [searchParams] = useSearchParams();
  const viewKey = searchParams.get("viewKey");

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [offset, setOffset] = useState(0);
  const limit = 20;

  const [projectionMeta, setProjectionMeta] = useState(null);
  const [projectionValid, setProjectionValid] = useState(false);

  const resolveProjectionSort = useCallback(() => {
    const defaultSort = projectionMeta?.default_sort || {};
    const order =
      defaultSort.order === "asc" || defaultSort.order === "desc"
        ? defaultSort.order
        : "desc";

    const field =
      typeof defaultSort.field === "string" ? defaultSort.field : null;

    if (!field) {
      return { sort: "created_at", order };
    }

    return { sort: field, order };
  }, [projectionMeta]);

  const fetchProjection = useCallback(async () => {
    setProjectionMeta(null);
    setProjectionValid(false);

    if (!objectTypeKey) {
      return;
    }

    try {
      const response = await runtimeReadGateway.getProjection({
        tenantId,
        objectTypeKey,
        viewKey,
        legacyFallback: true,
      });

      const projection = response?.projection;
      const visibleFields = projection?.visible_fields;
      const fieldOrder = projection?.field_order;

      const valid =
        Array.isArray(visibleFields) &&
        Array.isArray(fieldOrder) &&
        (projection?.default_sort?.order === "asc" ||
          projection?.default_sort?.order === "desc");

      if (!valid) {
        return;
      }

      setProjectionMeta({
        ...projection,
        // normalize: field_order has priority
        visible_fields: visibleFields,
        field_order: fieldOrder,
      });
      setProjectionValid(true);
    } catch (err) {
      // Fail silently: preview will fallback to raw mode.
      setProjectionMeta(null);
      setProjectionValid(false);
    }
  }, [tenantId, objectTypeKey, viewKey]);

  const loadPreview = useCallback(async () => {
    if (!objectTypeKey) {
      setError("Object type key не определён");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const sortParams = projectionValid
        ? resolveProjectionSort()
        : { sort: "created_at", order: "desc" };

      const gatewayResponse = await runtimeReadGateway.getObjectList({
        tenantId,
        objectTypeKey,
        viewKey,
        limit,
        offset,
        sort: sortParams.sort,
        order: sortParams.order,
        legacyFallback: true,
      });

      setData(gatewayResponse);
    } catch (err) {
      // If projection caused the query to fail, fallback to raw mode.
      if (projectionValid) {
        try {
          const gatewayResponse = await runtimeReadGateway.getObjectList({
            tenantId,
            objectTypeKey,
            viewKey,
            limit,
            offset,
            sort: "created_at",
            order: "desc",
            legacyFallback: true,
          });
          setData(gatewayResponse);
          setProjectionValid(false);
          setError("");
          return;
        } catch (fallbackErr) {
          // Continue to error below.
        }
      }

      setError(
        getApiErrorMessage(
          err,
          "Не удалось загрузить Runtime Preview. Проверьте publish catalog.",
        ),
      );
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [
    tenantId,
    objectTypeKey,
    offset,
    limit,
    projectionValid,
    resolveProjectionSort,
  ]);

  useEffect(() => {
    fetchProjection();
  }, [fetchProjection]);

  useEffect(() => {
    loadPreview();
  }, [loadPreview]);

  const rawValueColumns = useMemo(() => {
    const firstItem = data?.items?.[0];
    if (!firstItem?.values) return [];
    return Object.keys(firstItem.values);
  }, [data]);

  const projectionColumns = useMemo(() => {
    if (!projectionValid || !projectionMeta) return [];
    const columns =
      Array.isArray(projectionMeta.field_order) &&
      projectionMeta.field_order.length
        ? projectionMeta.field_order
        : projectionMeta.visible_fields || [];

    // Ensure uniqueness and keep order.
    const seen = new Set();
    return (columns || []).filter((c) => {
      if (seen.has(c)) return false;
      seen.add(c);
      return true;
    });
  }, [projectionMeta, projectionValid]);

  const resolvedColumns = projectionValid ? projectionColumns : rawValueColumns;

  const titleField = projectionMeta?.title_field || null;

  const pagination = data?.pagination;

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <div>
          <h3 style={{ margin: 0 }}>Runtime Preview</h3>
          <p style={{ margin: "6px 0 0", color: "#64748b", fontSize: 13 }}>
            Источник: <code>GET /runtime/query/tenants/{tenantId}/{objectTypeKey}</code>
          </p>
          {data ? (
            <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 12 }}>
              catalog v{data.catalog_version} · schema v{data.schema_version}
            </p>
          ) : null}
        </div>
        <button type="button" className="designer-btn" onClick={loadPreview}>
          Обновить
        </button>
      </div>

      {loading ? <div className="designer-loading">Загрузка preview...</div> : null}
      {!loading && error ? <div className="designer-error">{error}</div> : null}

      {!loading && !error ? (
        <>
          <div className="designer-table-wrap">
            <table className="designer-table">
              <thead>
                <tr>
                  <th>id</th>
                  <th>status</th>
                  {resolvedColumns.map((column) => (
                    <th key={column}>{column === titleField ? "Название" : column}</th>
                  ))}
                  <th>created_at</th>
                </tr>
              </thead>
              <tbody>
                {(data?.items || []).map((item) => (
                  <tr key={item.id}>
                    <td>
                      <code style={{ fontSize: 11 }}>{item.id}</code>
                    </td>
                    <td>{item.status}</td>
                    {resolvedColumns.map((column) => (
                      <td key={`${item.id}-${column}`}>
                        <span
                          style={{
                            fontWeight:
                              titleField && column === titleField ? 700 : 400,
                          }}
                        >
                          {formatCellValue(item.values?.[column])}
                        </span>
                      </td>
                    ))}
                    <td>{new Date(item.created_at).toLocaleString("ru-RU")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(data?.items || []).length === 0 ? (
              <div className="designer-empty">Нет опубликованных runtime entities</div>
            ) : null}
          </div>

          {pagination ? (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: 12,
              }}
            >
              <span style={{ color: "#64748b", fontSize: 13 }}>
                total: {pagination.total} · limit: {pagination.limit} · offset:{" "}
                {pagination.offset}
              </span>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  className="designer-btn"
                  disabled={offset <= 0}
                  onClick={() => setOffset(Math.max(0, offset - limit))}
                >
                  Назад
                </button>
                <button
                  type="button"
                  className="designer-btn"
                  disabled={!pagination.has_more}
                  onClick={() => setOffset(offset + limit)}
                >
                  Вперёд
                </button>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
