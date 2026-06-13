import { useCallback } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

import "../../../shared/quickCreate/platformQuickCreateModal.css";
import { canAccessDesigner } from "../constants/designerRoles";
import {
  canNavigateBackInBrowserHistory,
  resolveDesignerAccessDeniedHomePath,
} from "../utils/resolveDesignerAccessDeniedNavigation.js";

const ACCESS_DENIED_WRAPPER_STYLE = {
  padding: 48,
  textAlign: "center",
};

const ACCESS_DENIED_DESCRIPTION_STYLE = {
  color: "#64748b",
  maxWidth: 520,
  margin: "0 auto",
};

const ACCESS_DENIED_ACTIONS_STYLE = {
  marginTop: 24,
  display: "flex",
  justifyContent: "center",
};

export default function DesignerAccessGate({ user }) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleReturn = useCallback(async () => {
    if (canNavigateBackInBrowserHistory()) {
      navigate(-1);
      return;
    }

    const homePath = await resolveDesignerAccessDeniedHomePath(
      location.pathname,
      user,
    );

    if (homePath) {
      navigate(homePath);
    }
  }, [location.pathname, navigate, user]);

  if (!canAccessDesigner(user)) {
    return (
      <div style={ACCESS_DENIED_WRAPPER_STYLE}>
        <h2 style={{ marginTop: 0 }}>Нет доступа к Designer</h2>
        <p style={ACCESS_DENIED_DESCRIPTION_STYLE}>
          Требуется роль суперадминистратора или администратора компании.
        </p>
        <div style={ACCESS_DENIED_ACTIONS_STYLE}>
          <button
            type="button"
            className="platform-quick-create-modal__btn platform-quick-create-modal__btn--primary"
            onClick={() => {
              void handleReturn();
            }}
          >
            Вернуться
          </button>
        </div>
      </div>
    );
  }

  return <Outlet context={{ user }} />;
}
