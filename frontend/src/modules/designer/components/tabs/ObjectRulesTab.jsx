import { useMemo } from "react";

import {
  ObjectSettingsButton,
  ObjectSettingsEmptyState,
  ObjectSettingsHeader,
  ObjectSettingsPage,
  ObjectSettingsPanel,
  ObjectSettingsPanelFooter,
  ObjectSettingsSplitLayout,
  buildObjectSettingsLayoutStorageKey,
} from "../../../../shared/objectSettings";

export default function ObjectRulesTab({
  tenantId = "",
  objectTypeKey = "",
}) {
  const rules = [];

  const layoutStorageKey = useMemo(
    () =>
      buildObjectSettingsLayoutStorageKey({
        tenantId,
        objectTypeKey,
        tabKey: "rules",
      }),
    [objectTypeKey, tenantId],
  );

  return (
    <ObjectSettingsPage>
      <ObjectSettingsHeader
        title="Правила объекта"
        count={rules.length}
        centered
        primaryAction={
          <ObjectSettingsButton variant="primary" disabled title="Раздел в разработке">
            + Создать правило
          </ObjectSettingsButton>
        }
      />

      <ObjectSettingsSplitLayout
        storageKey={layoutStorageKey}
        left={
          <ObjectSettingsPanel
            title="Список правил"
            tone="muted"
            titleId="designer-object-rules-list-title"
          >
            <ObjectSettingsEmptyState
              compact
              inPanel
              title="Нет правил"
              description="Rule Engine находится в разработке."
            />
          </ObjectSettingsPanel>
        }
        right={
          <ObjectSettingsPanel
            title="Свойства правила"
            titleId="designer-object-rules-properties-title"
            footer={<ObjectSettingsPanelFooter deleteDisabled saveDisabled />}
          >
            <ObjectSettingsEmptyState
              compact
              inPanel
              title="Создайте первый элемент"
              description="Правила объекта появятся в будущих версиях Studio."
            />
          </ObjectSettingsPanel>
        }
      />
    </ObjectSettingsPage>
  );
}
