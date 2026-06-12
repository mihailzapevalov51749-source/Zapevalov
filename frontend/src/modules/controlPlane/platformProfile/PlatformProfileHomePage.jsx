import { useNavigate } from "react-router-dom";

import { cardStyle, cardTitleStyle } from "../../admin/system/systemSettingsUi.jsx";
import { buildControlPlanePlatformProfilePath } from "../config/controlPlanePaths.js";
import { usePlatformSettings } from "./PlatformSettingsProvider.jsx";
import { PLATFORM_PROFILE_HOME_SECTIONS } from "./platformProfileWorkspaceConfig.js";

import "./platformProfileHomePage.css";

export default function PlatformProfileHomePage() {
  const navigate = useNavigate();
  const { platformName } = usePlatformSettings();

  return (
    <div className="platform-profile-home">
      <p className="platform-profile-home__intro">
        {`Управление данными и параметрами платформы ${platformName || "ЯсноПро"}. Выберите раздел для настройки.`}
      </p>

      <div className="platform-profile-home__grid">
        {PLATFORM_PROFILE_HOME_SECTIONS.map((section) => (
          <button
            key={section.id}
            type="button"
            className="platform-profile-home__card"
            style={cardStyle}
            onClick={() => navigate(buildControlPlanePlatformProfilePath(section.tabSlug))}
          >
            <span style={cardTitleStyle}>{section.title}</span>
            <ul className="platform-profile-home__items">
              {section.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </button>
        ))}
      </div>
    </div>
  );
}
