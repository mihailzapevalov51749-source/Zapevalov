import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { buildControlPlaneClientsPath } from "../../controlPlane/config/controlPlanePaths";
import ClientsSectionNav from "../clients/ClientsSectionNav";
import AdminTenantDeleteModal from "./AdminTenantDeleteModal";
import { adminTenantsStyles as styles } from "./adminTenantsStyles";
import { deletePortal, getPortal } from "./portalsApi";

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("ru-RU");
}

export default function AdminTenantDetailPage({ portalId }) {
  const navigate = useNavigate();
  const [portal, setPortal] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const loadPortal = useCallback(async () => {
    try {
      setIsLoading(true);
      setError("");
      const data = await getPortal(portalId);
      setPortal(data);
    } catch (requestError) {
      const detail =
        requestError?.response?.data?.detail ||
        requestError?.message ||
        "Не удалось загрузить карточку компании";
      setError(typeof detail === "string" ? detail : "Не удалось загрузить карточку компании");
      setPortal(null);
    } finally {
      setIsLoading(false);
    }
  }, [portalId]);

  useEffect(() => {
    loadPortal();
  }, [loadPortal]);

  const openTenantRuntime = () => {
    window.open(`/portal/${portalId}/page/1`, "_blank", "noopener,noreferrer");
  };

  const openDeleteModal = () => {
    setIsDeleteOpen(true);
    setDeleteConfirmName("");
    setDeleteError("");
    setIsDeleting(false);
  };

  const closeDeleteModal = () => {
    if (isDeleting) {
      return;
    }
    setIsDeleteOpen(false);
    setDeleteConfirmName("");
    setDeleteError("");
  };

  const handleDeleteConfirm = async () => {
    try {
      setIsDeleting(true);
      setDeleteError("");
      await deletePortal(portalId);
      navigate(buildControlPlaneClientsPath("companies"));
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

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <div style={styles.kicker}>Control Plane</div>
          <h1 style={styles.title}>Карточка компании</h1>
          <p style={styles.subtitle}>Только чтение. Редактирование не реализовано.</p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            type="button"
            style={styles.secondaryButton}
            onClick={() => navigate(buildControlPlaneClientsPath("companies"))}
          >
            К списку
          </button>
          <button type="button" style={styles.primaryButton} onClick={openTenantRuntime}>
            Открыть Office
          </button>
          <button type="button" style={styles.dangerButton} onClick={openDeleteModal}>
            Удалить компанию
          </button>
        </div>
      </div>

      <ClientsSectionNav />

      <section style={styles.card}>
        {isLoading ? <div style={{ color: "#64748b" }}>Загрузка...</div> : null}
        {error ? <div style={styles.error}>{error}</div> : null}

        {portal ? (
          <div style={styles.detailGrid}>
            <div style={styles.detailLabel}>ID</div>
            <div style={styles.detailValue}>{portal.id}</div>

            <div style={styles.detailLabel}>Название</div>
            <div style={styles.detailValue}>{portal.name}</div>

            <div style={styles.detailLabel}>Описание</div>
            <div style={styles.detailValue}>{portal.description || "—"}</div>

            <div style={styles.detailLabel}>Дата создания</div>
            <div style={styles.detailValue}>{formatDate(portal.created_at)}</div>

            <div style={styles.detailLabel}>Активность</div>
            <div style={styles.detailValue}>
              <span
                style={portal.is_active ? styles.badgeActive : styles.badgeInactive}
              >
                {portal.is_active ? "Активен" : "Неактивен"}
              </span>
            </div>
          </div>
        ) : null}
      </section>

      <AdminTenantDeleteModal
        open={isDeleteOpen}
        portal={portal}
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
