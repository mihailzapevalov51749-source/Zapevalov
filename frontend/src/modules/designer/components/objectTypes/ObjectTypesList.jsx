import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";

import { useDesignerShell } from "../../context/DesignerShellContext";
import {
  computeObjectTypeListFilterCounts,
  formatDependencyCount,
  getObjectTypePublicationBadgeClass,
  getObjectTypePublicationLabel,
  matchesObjectTypeListFilter,
  OBJECT_TYPE_LIST_FILTERS,
  resolveObjectTypeListPublicationStatus,
} from "../../utils/objectTypeListPublication";
import { publishObjectsSectionRouteOwner } from "../../../../shared/shell/designer/designerRouteOwnership";

const FILTER_OPTIONS = [
  { id: OBJECT_TYPE_LIST_FILTERS.ALL, label: "Все" },
  { id: OBJECT_TYPE_LIST_FILTERS.PUBLISHED, label: "Опубликованные" },
  { id: OBJECT_TYPE_LIST_FILTERS.UNPUBLISHED, label: "Не опубликованные" },
  { id: OBJECT_TYPE_LIST_FILTERS.CHANGED, label: "Есть изменения" },
  { id: OBJECT_TYPE_LIST_FILTERS.ARCHIVED, label: "Архив" },
];

function formatDate(value) {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function readDependencyCounts(item) {
  return item?.dependency_counts || item?.dependencyCounts || {};
}

export default function ObjectTypesList({
  items,
  loading,
  error,
  onCreate,
  creating,
}) {
  const navigate = useNavigate();
  const { tenantId } = useDesignerShell();
  const [activeFilter, setActiveFilter] = useState(OBJECT_TYPE_LIST_FILTERS.ALL);

  const enrichedItems = useMemo(
    () =>
      items.map((item) => ({
        ...item,
        publicationStatus: resolveObjectTypeListPublicationStatus(item),
      })),
    [items],
  );

  const filterCounts = useMemo(
    () => computeObjectTypeListFilterCounts(enrichedItems),
    [enrichedItems],
  );

  const filtered = useMemo(
    () =>
      enrichedItems.filter((item) =>
        matchesObjectTypeListFilter(item, activeFilter),
      ),
    [activeFilter, enrichedItems],
  );

  const navigateToObject = (item) => {
    publishObjectsSectionRouteOwner(tenantId);
    navigate(`/designer/tenant/${tenantId}/object-types/${item.id}/general`);
  };

  if (loading) {
    return <div className="designer-loading">Загрузка Object Types...</div>;
  }

  if (error) {
    return <div className="designer-error">{error}</div>;
  }

  return (
    <div>
      <div className="designer-page-header">
        <div>
          <h1 className="designer-page-title">Объекты</h1>
          <p className="designer-page-subtitle">
            Управление Object Types платформы
          </p>
        </div>
        <button
          type="button"
          className="designer-btn designer-btn--primary"
          onClick={onCreate}
          disabled={creating}
        >
          <Plus size={16} style={{ marginRight: 6, verticalAlign: -2 }} />
          Создать объект
        </button>
      </div>

      <div className="designer-filter-chips">
        {FILTER_OPTIONS.map((option) => {
          const isActive = activeFilter === option.id;
          const count = filterCounts[option.id] ?? 0;

          return (
            <button
              key={option.id}
              type="button"
              className={`designer-btn${isActive ? " designer-btn--primary" : ""}`}
              style={
                isActive
                  ? undefined
                  : {
                      background: "#fff",
                      color: "#334155",
                      border: "1px solid var(--designer-border)",
                    }
              }
              onClick={() => setActiveFilter(option.id)}
            >
              {option.label} {count}
            </button>
          );
        })}
      </div>

      <div className="designer-table-wrap">
        <table className="designer-table designer-table--object-types">
          <thead>
            <tr>
              <th className="designer-table-col-index">№</th>
              <th>Название</th>
              <th>Key</th>
              <th style={{ width: 72 }}>Поля</th>
              <th style={{ width: 80 }}>Связи</th>
              <th style={{ width: 110 }}>Представления</th>
              <th style={{ width: 140 }}>Публикация</th>
              <th style={{ width: 150 }}>Обновлён</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item, rowIndex) => {
              const counts = readDependencyCounts(item);

              return (
                <tr
                  key={item.id}
                  onClick={() => navigateToObject(item)}
                >
                  <td className="designer-table-col-index">{rowIndex + 1}</td>
                  <td>
                    <div style={{ fontWeight: 700 }}>{item.name}</div>
                    {item.description ? (
                      <div
                        style={{ color: "#64748b", fontSize: 12, marginTop: 2 }}
                      >
                        {item.description}
                      </div>
                    ) : null}
                  </td>
                  <td>
                    <code>{item.key}</code>
                  </td>
                  <td>{formatDependencyCount(counts.fields)}</td>
                  <td>{formatDependencyCount(counts.relations)}</td>
                  <td>{formatDependencyCount(counts.views)}</td>
                  <td>
                    <span className={getObjectTypePublicationBadgeClass(item)}>
                      {getObjectTypePublicationLabel(item)}
                    </span>
                  </td>
                  <td>{formatDate(item.updated_at)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 ? (
          <div className="designer-empty">Object Types не найдены</div>
        ) : null}
      </div>
    </div>
  );
}
