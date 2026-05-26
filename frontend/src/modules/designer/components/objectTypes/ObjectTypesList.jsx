import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search } from "lucide-react";

import { useDesignerShell } from "../../context/DesignerShellContext";

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

export default function ObjectTypesList({
  items,
  loading,
  error,
  onCreate,
  creating,
}) {
  const navigate = useNavigate();
  const { tenantId } = useDesignerShell();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return items;
    }

    return items.filter(
      (item) =>
        item.name?.toLowerCase().includes(query) ||
        item.key?.toLowerCase().includes(query),
    );
  }, [items, search]);

  if (loading) {
    return <div className="designer-loading">Загрузка Object Types...</div>;
  }

  if (error) {
    return <div className="designer-error">{error}</div>;
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
          gap: 12,
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 28 }}>Объекты</h1>
          <p style={{ margin: "6px 0 0", color: "var(--designer-text-muted)" }}>
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

      <div className="designer-card" style={{ marginBottom: 16 }}>
        <div style={{ position: "relative" }}>
          <Search
            size={16}
            style={{
              position: "absolute",
              left: 12,
              top: "50%",
              transform: "translateY(-50%)",
              color: "#94a3b8",
            }}
          />
          <input
            className="designer-input"
            style={{ paddingLeft: 36 }}
            placeholder="Поиск по названию или key..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </div>

      <div className="designer-table-wrap">
        <table className="designer-table">
          <thead>
            <tr>
              <th>Название</th>
              <th>Key</th>
              <th>Статус</th>
              <th>Обновлён</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => (
              <tr
                key={item.id}
                onClick={() =>
                  navigate(
                    `/designer/tenant/${tenantId}/object-types/${item.id}/general`,
                  )
                }
              >
                <td>
                  <div style={{ fontWeight: 700 }}>{item.name}</div>
                  {item.description ? (
                    <div style={{ color: "#64748b", fontSize: 12, marginTop: 2 }}>
                      {item.description}
                    </div>
                  ) : null}
                </td>
                <td>
                  <code>{item.key}</code>
                </td>
                <td>
                  <span className="designer-badge">{item.status}</span>
                </td>
                <td>{formatDate(item.updated_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 ? (
          <div className="designer-empty">Object Types не найдены</div>
        ) : null}
      </div>
    </div>
  );
}
