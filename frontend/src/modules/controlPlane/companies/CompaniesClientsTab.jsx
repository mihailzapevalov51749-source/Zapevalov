import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import AdminTenantDeleteModal from "../../admin/tenants/AdminTenantDeleteModal";
import { deletePortal } from "../../admin/tenants/portalsApi";
import {
  getCustomerCompanyCatalogItem,
  listCustomerCompanyCatalog,
} from "../api/customerCompaniesApi";
import { buildControlPlaneCompaniesPath } from "../config/controlPlanePaths";
import ChangeCompanyAdministratorModal from "./ChangeCompanyAdministratorModal";
import CloneCompanyModal from "./CloneCompanyModal";
import CompaniesClientsToolbar from "./CompaniesClientsToolbar";
import CompaniesList from "./CompaniesList";
import CompanyDetailCard from "./CompanyDetailCard";
import CreateCompanyModal from "./CreateCompanyModal";
import { openCompanyFromCatalog } from "../../../portal/utils/openCompanyFromCatalog";
import { filterCompaniesBySearch } from "./companiesSearch.js";
import { companiesWorkspaceStyles as styles } from "./companiesWorkspaceStyles.js";

export default function CompaniesClientsTab() {
  const navigate = useNavigate();
  const { portalId: portalIdParam } = useParams();
  const selectedCompanyId = portalIdParam ? Number(portalIdParam) : null;

  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [isListLoading, setIsListLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [listError, setListError] = useState("");
  const [detailError, setDetailError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isChangeAdminOpen, setIsChangeAdminOpen] = useState(false);
  const [isCloneOpen, setIsCloneOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isOpeningOffice, setIsOpeningOffice] = useState(false);

  const loadCompanies = useCallback(async () => {
    try {
      setIsListLoading(true);
      setListError("");
      const data = await listCustomerCompanyCatalog();
      const items = Array.isArray(data) ? data : [];
      setCompanies(
        [...items].sort((left, right) => Number(left.id) - Number(right.id)),
      );
    } catch (requestError) {
      const detail =
        requestError?.response?.data?.detail ||
        requestError?.message ||
        "Не удалось загрузить список компаний";
      setListError(typeof detail === "string" ? detail : "Не удалось загрузить список компаний");
      setCompanies([]);
    } finally {
      setIsListLoading(false);
    }
  }, []);

  const loadSelectedCompany = useCallback(async (companyId) => {
    if (!companyId) {
      setSelectedCompany(null);
      setDetailError("");
      return;
    }

    try {
      setIsDetailLoading(true);
      setDetailError("");
      const data = await getCustomerCompanyCatalogItem(companyId);
      setSelectedCompany(data);
    } catch (requestError) {
      const detail =
        requestError?.response?.data?.detail ||
        requestError?.message ||
        "Не удалось загрузить карточку компании";
      setDetailError(typeof detail === "string" ? detail : "Не удалось загрузить карточку компании");
      setSelectedCompany(null);
    } finally {
      setIsDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  useEffect(() => {
    loadSelectedCompany(selectedCompanyId);
  }, [loadSelectedCompany, selectedCompanyId]);

  const filteredCompanies = useMemo(
    () => filterCompaniesBySearch(companies, searchQuery),
    [companies, searchQuery],
  );

  const handleSelectCompany = (company) => {
    if (!company?.id) {
      return;
    }
    navigate(buildControlPlaneCompaniesPath(`clients/${company.id}`));
  };

  const handleCloseSelection = () => {
    navigate(buildControlPlaneCompaniesPath("clients"));
  };

  const handleCreated = async (created) => {
    setIsCreateOpen(false);
    await loadCompanies();
    if (created?.id) {
      navigate(buildControlPlaneCompaniesPath(`clients/${created.id}`));
    }
  };

  const handleAdministratorChanged = async () => {
    setIsChangeAdminOpen(false);
    await loadCompanies();
    if (selectedCompanyId) {
      await loadSelectedCompany(selectedCompanyId);
    }
  };

  const handleCloned = async () => {
    setIsCloneOpen(false);
    await loadCompanies();
    if (selectedCompanyId) {
      await loadSelectedCompany(selectedCompanyId);
    }
  };

  const openDeleteModal = () => {
    if (!selectedCompany) {
      return;
    }
    setDeleteTarget(selectedCompany);
    setDeleteConfirmName("");
    setDeleteError("");
    setIsDeleting(false);
  };

  const closeDeleteModal = () => {
    if (isDeleting) {
      return;
    }
    setDeleteTarget(null);
    setDeleteConfirmName("");
    setDeleteError("");
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) {
      return;
    }

    try {
      setIsDeleting(true);
      setDeleteError("");
      await deletePortal(deleteTarget.id);
      setDeleteTarget(null);
      setDeleteConfirmName("");
      await loadCompanies();
      handleCloseSelection();
    } catch (requestError) {
      const detail =
        requestError?.response?.data?.detail ||
        requestError?.message ||
        "Не удалось удалить компанию";
      setDeleteError(typeof detail === "string" ? detail : "Не удалось удалить компанию");
    } finally {
      setIsDeleting(false);
    }
  };

  const openOffice = async () => {
    if (!selectedCompany || isOpeningOffice) {
      return;
    }

    setIsOpeningOffice(true);
    try {
      await openCompanyFromCatalog(selectedCompany);
    } finally {
      setIsOpeningOffice(false);
    }
  };

  return (
    <div style={styles.tabContent}>
      <CompaniesClientsToolbar
        onCreate={() => setIsCreateOpen(true)}
        onRefresh={loadCompanies}
      />

      {listError ? <div style={styles.error}>{listError}</div> : null}

      <section style={styles.workspace}>
        <CompaniesList
          companies={filteredCompanies}
          loading={isListLoading}
          searchQuery={searchQuery}
          onSearch={setSearchQuery}
          selectedCompanyId={selectedCompanyId}
          onSelect={handleSelectCompany}
        />

        <CompanyDetailCard
          company={selectedCompany}
          loading={isDetailLoading}
          error={detailError}
          isOpeningOffice={isOpeningOffice}
          onOpenOffice={openOffice}
          onClone={() => setIsCloneOpen(true)}
          onChangeAdministrator={() => setIsChangeAdminOpen(true)}
          onDelete={openDeleteModal}
          onClose={selectedCompanyId ? handleCloseSelection : undefined}
        />
      </section>

      <CreateCompanyModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={handleCreated}
      />

      <ChangeCompanyAdministratorModal
        isOpen={isChangeAdminOpen}
        company={selectedCompany}
        onClose={() => setIsChangeAdminOpen(false)}
        onChanged={handleAdministratorChanged}
      />

      <CloneCompanyModal
        isOpen={isCloneOpen}
        company={selectedCompany}
        sourceOptions={companies}
        onClose={() => setIsCloneOpen(false)}
        onCloned={handleCloned}
      />

      <AdminTenantDeleteModal
        open={Boolean(deleteTarget)}
        portal={deleteTarget}
        confirmName={deleteConfirmName}
        onConfirmNameChange={setDeleteConfirmName}
        isSubmitting={isDeleting}
        error={deleteError}
        onClose={closeDeleteModal}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
