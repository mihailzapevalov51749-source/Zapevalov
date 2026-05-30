import ObjectTypeIcon from "../../../../shared/icons/ObjectTypeIcon";
import ObjectTypeWorkspaceActionsMenu from "./ObjectTypeWorkspaceActionsMenu";

const SAVE_VARIANT_CLASS = {
  primary: "designer-workspace-btn--save-primary",
  outline: "designer-workspace-btn--save-outline",
  neutral: "designer-workspace-btn--save-neutral",
};

const PUBLISH_VARIANT_CLASS = {
  primary: "designer-workspace-btn--publish-primary",
  success: "designer-workspace-btn--publish-success",
  warning: "designer-workspace-btn--publish-warning",
  muted: "designer-workspace-btn--publish-muted",
};

export default function ObjectTypeWorkspaceHeader({
  objectType,
  lifecycle,
  saving,
  publishing,
  saveAvailable,
  saveDisabled,
  deleting,
  onSave,
  onPublish,
  onDeleteObject,
}) {
  const saveVariant = lifecycle?.saveVariant ?? "neutral";
  const publishVariant = lifecycle?.publishVariant ?? "muted";
  const publishLabel = lifecycle?.publishLabel ?? "Опубликовать";
  const publishDisabled = lifecycle?.publishDisabled ?? true;

  return (
    <div style={{ marginBottom: 8 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "flex-start",
        }}
      >
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
          <ObjectTypeIcon
            iconType={objectType?.icon_type}
            iconFileUrl={objectType?.icon_file_url}
            color={objectType?.color}
            size={40}
            className="object-type-icon--header"
            emptyClassName="is-empty"
          />
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: 18,
                lineHeight: "22px",
                fontWeight: 700,
                color: "#0f172a",
              }}
            >
              {objectType?.name}
            </h1>
            <p
              style={{
                margin: "4px 0 0",
                fontSize: 12,
                lineHeight: "16px",
                color: "#64748b",
                maxWidth: 720,
              }}
            >
              {objectType?.description || "Без описания"}
            </p>
          </div>
        </div>

        <div className="designer-workspace-actions">
          <button
            type="button"
            className={`designer-workspace-btn designer-workspace-btn--save ${SAVE_VARIANT_CLASS[saveVariant] || ""}`}
            onClick={onSave}
            disabled={saving || !saveAvailable || saveDisabled}
            data-lifecycle-state={lifecycle?.state}
          >
            {saving ? "Сохранение..." : "Сохранить"}
          </button>
          <button
            type="button"
            className={`designer-workspace-btn designer-workspace-btn--publish ${PUBLISH_VARIANT_CLASS[publishVariant] || ""}`}
            onClick={onPublish}
            disabled={publishing || publishDisabled}
            data-lifecycle-state={lifecycle?.state}
          >
            {publishing ? "Публикация..." : publishLabel}
          </button>
          <ObjectTypeWorkspaceActionsMenu
            isSystemObject={Boolean(objectType?.is_system)}
            deleting={deleting}
            onDelete={onDeleteObject}
          />
        </div>
      </div>
    </div>
  );
}
