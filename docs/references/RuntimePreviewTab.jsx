import { useParams, useSearchParams } from "react-router-dom";

import { ObjectViewHost } from "../../../objectViews";

export default function RuntimePreviewTab({ tenantId, objectTypeKey }) {
  const { objectTypeId } = useParams();
  const [searchParams] = useSearchParams();
  const explicitViewKey = searchParams.get("viewKey");
  const viewKey = explicitViewKey || null;

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 12,
          gap: 12,
        }}
      >
        <div>
          <h3 style={{ margin: 0 }}>Runtime Preview</h3>
          <p style={{ margin: "6px 0 0", color: "#64748b", fontSize: 13 }}>
            Источник:{" "}
            <code>
              GET /runtime/query/tenants/{tenantId}/{objectTypeKey}
            </code>
          </p>
          <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 12 }}>
            View:{" "}
            {viewKey ? <code>{viewKey}</code> : "default system table view"}
          </p>
          <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 12 }}>
            Definitions: draft (designer). Entities: runtime published catalog.
          </p>
        </div>
      </div>

      <ObjectViewHost
        tenantId={tenantId}
        objectTypeId={objectTypeId}
        objectTypeKey={objectTypeKey}
        viewKey={viewKey}
        pageSize={20}
        mode="studio-preview"
        minHeight={280}
        showToolbar
      />
    </div>
  );
}
