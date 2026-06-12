import CompaniesClientsTab from "../companies/CompaniesClientsTab";
import CompaniesWorkspaceTabs from "../companies/CompaniesWorkspaceTabs";

import "../companies/companiesWorkspacePage.css";

export default function CompaniesWorkspacePage() {
  return (
    <div className="companies-workspace">
      <CompaniesWorkspaceTabs />
      <div className="companies-workspace__canvas" data-page-canvas>
        <CompaniesClientsTab />
      </div>
    </div>
  );
}
