import {
  CardTitle,
  Field,
  cardStyle,
  fieldsColumnStyle,
  settingsTabGridStyle,
} from "../admin/system/systemSettingsUi.jsx";
import ProfileSettingsTabPage from "./ProfileSettingsTabPage.jsx";
import { useProfile } from "./ProfileContext.jsx";

export default function ProfileLicenseTab() {
  const { license } = useProfile();
  const info = license || {};

  return (
    <ProfileSettingsTabPage>
      <div style={settingsTabGridStyle}>
        <section style={cardStyle}>
          <CardTitle title="Лицензия" />
          <div style={fieldsColumnStyle}>
            <Field label="Тип лицензии" value={info.type || "—"} />
            <Field label="Статус" value={info.status || "—"} />
            <Field label="Дата окончания" value={info.expiresAt || "—"} />
            <Field label="Лимит пользователей" value={info.limits?.users || "—"} />
            <Field label="Лимит хранилища" value={info.limits?.storage || "—"} />
            <Field label="Использование пользователей" value={info.usage?.users || "—"} />
            <Field label="Использование хранилища" value={info.usage?.storage || "—"} />
          </div>
        </section>
      </div>
    </ProfileSettingsTabPage>
  );
}
