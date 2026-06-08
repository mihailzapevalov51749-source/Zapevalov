import ObjectSettingsButton from "./ObjectSettingsButton";

export default function ObjectSettingsPanelFooter({
  onDelete = null,
  onSave = null,
  deleteDisabled = false,
  saveDisabled = false,
  saving = false,
  deleteLabel = "Удалить",
  saveLabel = "Сохранить",
  showDelete = true,
  showSave = true,
}) {
  return (
    <>
      {showDelete ? (
        <ObjectSettingsButton
          variant="danger"
          onClick={onDelete || undefined}
          disabled={deleteDisabled || saving || !onDelete}
        >
          {deleteLabel}
        </ObjectSettingsButton>
      ) : null}
      {showSave ? (
        <ObjectSettingsButton
          variant="primary"
          onClick={onSave || undefined}
          disabled={saveDisabled || saving || !onSave}
        >
          {saving ? "Сохранение..." : saveLabel}
        </ObjectSettingsButton>
      ) : null}
    </>
  );
}
