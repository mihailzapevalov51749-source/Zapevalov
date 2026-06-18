import { Navigate, Route, Routes, useParams } from "react-router-dom";

import LoginPage from "../../pages/login/LoginPage";
import CompanyKeyEntryPage from "../../pages/companyEntry/CompanyKeyEntryPage";
import SessionBridgeEntryPage from "../../pages/sessionBridge/SessionBridgeEntryPage";

function CompanyKeyRoute({ user, onLogin }) {
  const { companyKey } = useParams();
  return (
    <CompanyKeyEntryPage user={user} companyKey={companyKey} onLogin={onLogin} />
  );
}

export default function UnauthenticatedApp({ onLogin }) {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage onLogin={onLogin} />} />
      <Route
        path="/auth/session-bridge-entry"
        element={<SessionBridgeEntryPage />}
      />
      <Route
        path="/:companyKey"
        element={<CompanyKeyRoute user={null} onLogin={onLogin} />}
      />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export function AuthenticatedCompanyKeyRoute({ user, onLogin }) {
  const { companyKey } = useParams();
  return (
    <CompanyKeyEntryPage user={user} companyKey={companyKey} onLogin={onLogin} />
  );
}
