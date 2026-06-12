import PlatformRoleCreateModal from "./PlatformRoleCreateModal.jsx";
import PlatformRoleDetailCard from "./PlatformRoleDetailCard.jsx";
import PlatformRolesTablePanel from "./PlatformRolesTablePanel.jsx";
import usePlatformRolesPage from "./usePlatformRolesPage.js";

import "./platformRolesPage.css";

export default function PlatformRolesPage() {
  const {
    roles,
    allRoles,
    selectedRoleKey,
    form,
    searchQuery,
    loading,
    saving,
    error,
    createModalOpen,
    setSearchQuery,
    setCreateModalOpen,
    handleRefresh,
    handleSelectRole,
    handleChange,
    toggleContour,
    toggleCpSection,
    toggleSectionPermission,
    toggleAdminCapability,
    handleSave,
    handleCreateRole,
  } = usePlatformRolesPage();

  return (
    <main className="platform-roles-page">
      {error ? <div className="platform-roles-page__error">{error}</div> : null}

      <div className="platform-roles-page__workspace">
        <PlatformRolesTablePanel
          roles={roles}
          loading={loading}
          searchQuery={searchQuery}
          selectedRoleKey={selectedRoleKey}
          onSearchQueryChange={setSearchQuery}
          onRefresh={handleRefresh}
          onCreate={() => setCreateModalOpen(true)}
          onSelectRole={handleSelectRole}
        />

        <PlatformRoleDetailCard
          form={form}
          saving={saving}
          onChange={handleChange}
          onToggleContour={toggleContour}
          onToggleCpSection={toggleCpSection}
          onToggleSectionPermission={toggleSectionPermission}
          onToggleAdminCapability={toggleAdminCapability}
          onSave={handleSave}
        />
      </div>

      <PlatformRoleCreateModal
        open={createModalOpen}
        saving={saving}
        reservedRoleKeys={allRoles.map((role) => role.key)}
        onClose={() => setCreateModalOpen(false)}
        onSubmit={handleCreateRole}
      />
    </main>
  );
}
