import {
  ObjectSettingsEmptyState,
  ObjectSettingsHeader,
  ObjectSettingsPage,
} from "../../../../shared/objectSettings";

export default function ObjectEngineTabPlaceholder({ title }) {
  return (
    <ObjectSettingsPage>
      <ObjectSettingsHeader title={title} centered />
      <ObjectSettingsEmptyState
        compact
        title="Раздел находится в разработке."
      />
    </ObjectSettingsPage>
  );
}
