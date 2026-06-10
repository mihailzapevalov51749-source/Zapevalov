import { useCallback, useEffect, useMemo, useState } from "react";

import {
  buildAdministrationPath,
  resolveStudioTenantIdFromPath,
} from "../config/adminPaths";
import AdminTenantDeleteModal from "./AdminTenantDeleteModal";
import { adminTenantsStyles as styles } from "./adminTenantsStyles";
import { createPortal, deletePortal, listPortals } from "./portalsApi";

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("ru-RU");
}

function CreateTenantModal({ isOpen, onClose, onCreated }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setName("");
      setDescription("");
      setError("");
      setIsSaving(false);
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmedName = name.trim();

    if (!trimmedName) {
      setError("Укажите название тенанта");
      return;
    }

    try {
      setIsSaving(true);
      setError("");
      const created = await createPortal({
        name: trimmedName,
        description: description.trim() || null,
      });
      onCreated(created);
    } catch (requestError) {
      const detail =
        requestError?.response?.data?.detail ||
        requestError?.message ||
        "Не удалось создать тенант";
      setError(typeof detail === "string" ? detail : "Не удалось создать тенант");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1200,
        padding: 16,
      }}
      onClick={onClose}
    >
      <form
        style={{ ...styles.card, width: "min(480px, 100%)" }}
        onClick={(event) => event.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <div style={styles.kicker}>Управление платформой</div>
        <h2 style={{ ...styles.title, fontSize: 20 }}>Создать tenant</h2>

        <div style={styles.field}>
          <label style={styles.label} htmlFor="tenant-name">
            Название
          </label>
          <input
            id="tenant-name"
            style={styles.input}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="ООО Ромашка"
            autoFocus
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label} htmlFor="tenant-description">
            Описание
          </label>
          <textarea
            id="tenant-description"
            style={styles.textarea}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Комментарий для администратора платформы"
          />
        </div>

        {error ? <div style={styles.error}>{error}</div> : null}

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button type="button" style={styles.secondaryButton} onClick={onClose}>
            Отмена
          </button>
          <button type="submit" style={styles.primaryButton} disabled={isSaving}>
            {isSaving ? "Сохранение..." : "Создать"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function AdminTenantsPage() {
  const studioTenantId = useMemo(
    () => resolveStudioTenantIdFromPath(window.location.pathname),
    [],
  );
  const [portals, setPortals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const loadPortals = useCallback(async () => {
    try {
      setIsLoading(true);
      setError("");
      const data = await listPortals();
      setPortals(Array.isArray(data) ? data : []);
    } catch (requestError) {
      const detail =
        requestError?.response?.data?.detail ||
        requestError?.message ||
        "Не удалось загрузить список тенантов";
      setError(typeof detail === "string" ? detail : "Не удалось загрузить список тенантов");
      setPortals([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPortals();
  }, [loadPortals]);

  const navigateTo = (path) => {
    window.history.pushState({}, "", path);
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  const handleCreated = (portal) => {
    setIsCreateOpen(false);
    loadPortals();
    navigateTo(
      buildAdministrationPath(studioTenantId, `tenants/${portal.id}`),
    );
  };

  const openTenantRuntime = (portalId) => {
    window.open(`/portal/${portalId}/page/1`, "_blank", "noopener,noreferrer");
  };

  const openTenantCard = (portalId) => {
    navigateTo(buildAdministrationPath(studioTenantId, `tenants/${portalId}`));
  };

  const openDeleteModal = (portal) => {
    setDeleteTarget(portal);
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
      await loadPortals();
    } catch (requestError) {
      const detail =
        requestError?.response?.data?.detail ||
        requestError?.message ||
        "Не удалось удалить tenant";
      setDeleteError(typeof detail === "string" ? detail : "Не удалось удалить tenant");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <div style={styles.kicker}>Управление платформой</div>
          <h1 style={styles.title}>Тенанты</h1>
          <p style={styles.subtitle}>
            Ручное создание и проверка технических порталов (таблица portals).
            При создании структура автоматически клонируется из portal 1.
          </p>
        </div>
        <button
          type="button"
          style={styles.primaryButton}
          onClick={() => setIsCreateOpen(true)}
        >
          Создать
        </button>
      </div>

      <section style={styles.card}>
        {error ? <div style={styles.error}>{error}</div> : null}

        {isLoading ? (
          <div style={{ color: "#64748b" }}>Загрузка...</div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>ID</th>
                <th style={styles.th}>Название</th>
                <th style={styles.th}>Описание</th>
                <th style={styles.th}>Активен</th>
                <th style={styles.th}>Дата создания</th>
                <th style={styles.th}>Действия</th>
              </tr>
            </thead>
            <tbody>
              {portals.length === 0 ? (
                <tr>
                  <td style={styles.td} colSpan={6}>
                    Тенанты не найдены. Нажмите «Создать», чтобы добавить первый portal.
                  </td>
                </tr>
              ) : (
                portals.map((portal) => (
                  <tr key={portal.id}>
                    <td style={styles.td}>{portal.id}</td>
                    <td style={styles.td}>{portal.name}</td>
                    <td style={styles.td}>{portal.description || "—"}</td>
                    <td style={styles.td}>
                      <span
                        style={
                          portal.is_active ? styles.badgeActive : styles.badgeInactive
                        }
                      >
                        {portal.is_active ? "Да" : "Нет"}
                      </span>
                    </td>
                    <td style={styles.td}>{formatDate(portal.created_at)}</td>
                    <td style={styles.td}>
                      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                        <button
                          type="button"
                          style={styles.linkButton}
                          onClick={() => openTenantCard(portal.id)}
                        >
                          Карточка
                        </button>
                        <button
                          type="button"
                          style={styles.linkButton}
                          onClick={() => openTenantRuntime(portal.id)}
                        >
                          Открыть tenant
                        </button>
                        <button
                          type="button"
                          style={styles.dangerLinkButton}
                          onClick={() => openDeleteModal(portal)}
                        >
                          Удалить
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </section>

      <CreateTenantModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={handleCreated}
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
