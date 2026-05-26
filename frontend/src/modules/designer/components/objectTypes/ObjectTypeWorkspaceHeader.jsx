import { ChevronRight, Folder, MoreHorizontal } from "lucide-react";
import { Link } from "react-router-dom";

import { useDesignerShell } from "../../context/DesignerShellContext";

export default function ObjectTypeWorkspaceHeader({
  objectType,
  catalogVersion,
  publishing,
  onPublish,
}) {
  const { tenantId } = useDesignerShell();

  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          color: "#64748b",
          fontSize: 13,
          marginBottom: 10,
        }}
      >
        <Link
          to={`/designer/tenant/${tenantId}/object-types`}
          style={{ color: "#64748b", textDecoration: "none" }}
        >
          Объекты
        </Link>
        <ChevronRight size={14} />
        <span>{objectType?.name || "..."}</span>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 16,
          alignItems: "flex-start",
        }}
      >
        <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: objectType?.color || "#dbeafe",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#1d4ed8",
            }}
          >
            <Folder size={24} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h1 style={{ margin: 0, fontSize: 28 }}>{objectType?.name}</h1>
              <span className="designer-badge">Object Type</span>
            </div>
            <p style={{ margin: "8px 0 0", color: "#64748b", maxWidth: 720 }}>
              {objectType?.description || "Без описания"}
            </p>
            <div style={{ marginTop: 8, fontSize: 12, color: "#94a3b8" }}>
              key: <code>{objectType?.key}</code>
              {catalogVersion != null ? (
                <span style={{ marginLeft: 12 }}>
                  published catalog v{catalogVersion}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            className="designer-btn designer-btn--primary"
            onClick={onPublish}
            disabled={publishing}
          >
            {publishing ? "Публикация..." : "Опубликовать"}
          </button>
          <button type="button" className="designer-btn" title="Скоро">
            <MoreHorizontal size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
