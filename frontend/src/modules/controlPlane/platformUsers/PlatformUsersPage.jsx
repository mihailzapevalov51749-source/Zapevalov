import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";

import { getMe } from "../../../api/authApi";
import { usePlatformConfirm } from "../../../shared/platformModal";
import PlatformOwnerCard from "./PlatformOwnerCard.jsx";
import PlatformUserDeleteModal from "./PlatformUserDeleteModal.jsx";
import PlatformUserDetailCard from "./PlatformUserDetailCard.jsx";
import PlatformUsersInfoBanner from "./PlatformUsersInfoBanner.jsx";
import PlatformUsersTablePanel from "./PlatformUsersTablePanel.jsx";
import { mergePlatformUserWithSessionProfile } from "./platformUserUtils.js";
import usePlatformUsersPage from "./usePlatformUsersPage.js";

import "./platformUsersPage.css";

export default function PlatformUsersPage() {
  const platformConfirm = usePlatformConfirm();
  const location = useLocation();
  const [sessionUser, setSessionUser] = useState(null);
  const initialUserId = useMemo(() => {
    const params = new URLSearchParams(location.search || "");
    const raw = params.get("userId");
    return raw != null && raw !== "" ? raw : null;
  }, [location.search]);

  const {
    filteredUsers,
    platformOwner,
    selectedUserId,
    form,
    searchQuery,
    roleFilter,
    statusFilter,
    loading,
    saving,
    deleting,
    error,
    deleteModalOpen,
    setSearchQuery,
    setRoleFilter,
    setStatusFilter,
    setDeleteModalOpen,
    handleCreateUser,
    handleSelectUser,
    handleChange,
    handleSave,
    handleConfirmDelete,
    isDraftOpen,
  } = usePlatformUsersPage({ initialUserId });

  useEffect(() => {
    let cancelled = false;

    async function loadSessionUser() {
      try {
        const data = await getMe();
        if (!cancelled) {
          setSessionUser(data);
        }
      } catch {
        if (!cancelled) {
          setSessionUser(null);
        }
      }
    }

    loadSessionUser();

    function handleProfileUpdated() {
      loadSessionUser();
    }

    window.addEventListener("user:profile-updated", handleProfileUpdated);

    return () => {
      cancelled = true;
      window.removeEventListener("user:profile-updated", handleProfileUpdated);
    };
  }, []);

  const displayOwner = useMemo(
    () => mergePlatformUserWithSessionProfile(platformOwner, sessionUser),
    [platformOwner, sessionUser],
  );

  const displayUsers = useMemo(
    () =>
      filteredUsers.map((user) =>
        mergePlatformUserWithSessionProfile(user, sessionUser),
      ),
    [filteredUsers, sessionUser],
  );

  const displayForm = useMemo(
    () => mergePlatformUserWithSessionProfile(form, sessionUser),
    [form, sessionUser],
  );

  const showDetailCard = Boolean(isDraftOpen || selectedUserId != null);

  const handleResetPassword = () => {
    handleChange("showPasswordFields", true);
  };

  const handleBlock = () => {
    handleChange("is_active", false);
  };

  const handleTransferOwnership = async () => {
    const confirmed = await platformConfirm({
      title: "Передать владение платформой?",
      message:
        "Передать владение платформой выбранному пользователю? Текущий владелец потеряет роль Platform Owner.",
      confirmLabel: "Передать",
      variant: "warning",
    });

    if (!confirmed) {
      return;
    }

    handleChange("platformRoleKey", "platform_owner");
  };

  return (
    <main className="platform-users-page">
      <PlatformOwnerCard owner={displayOwner} />

      <PlatformUsersInfoBanner />

      {error ? <div className="platform-users-page__error">{error}</div> : null}

      <div className="platform-users-page__workspace">
        <PlatformUsersTablePanel
          users={displayUsers}
          loading={loading}
          searchQuery={searchQuery}
          roleFilter={roleFilter}
          statusFilter={statusFilter}
          selectedUserId={selectedUserId}
          onSearchQueryChange={setSearchQuery}
          onRoleFilterChange={setRoleFilter}
          onStatusFilterChange={setStatusFilter}
          onCreate={handleCreateUser}
          onSelectUser={handleSelectUser}
        />

        {showDetailCard ? (
          <PlatformUserDetailCard
            form={displayForm}
            saving={saving}
            deleting={deleting}
            onChange={handleChange}
            onSave={handleSave}
            onResetPassword={handleResetPassword}
            onBlock={handleBlock}
            onDeleteAccess={() => setDeleteModalOpen(true)}
            onTransferOwnership={handleTransferOwnership}
          />
        ) : (
          <section className="platform-user-detail platform-user-detail--empty">
            <p>Выберите пользователя в списке</p>
          </section>
        )}
      </div>

      <PlatformUserDeleteModal
        open={deleteModalOpen}
        userName={form?.full_name || form?.email}
        isSubmitting={deleting}
        onClose={() => !deleting && setDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
      />
    </main>
  );
}
