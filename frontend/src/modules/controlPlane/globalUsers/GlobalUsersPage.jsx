import GlobalUserDetailCard from "./GlobalUserDetailCard.jsx";
import GlobalUsersTablePanel from "./GlobalUsersTablePanel.jsx";
import useGlobalUsersPage from "./useGlobalUsersPage.js";

import "../platformUsers/platformUsersPage.css";
import "./globalUsersPage.css";

export default function GlobalUsersPage() {
  const {
    users,
    selectedUserId,
    selectedUser,
    searchQuery,
    loading,
    detailLoading,
    actionLoading,
    error,
    actionMessage,
    setSearchQuery,
    handleSelectUser,
    handleBlock,
    handleUnblock,
    handleResetPassword,
  } = useGlobalUsersPage();

  return (
    <main className="platform-users-page global-users-page">
      {error ? <div className="platform-users-page__error">{error}</div> : null}

      <div className="platform-users-page__workspace">
        <GlobalUsersTablePanel
          users={users}
          loading={loading}
          searchQuery={searchQuery}
          selectedUserId={selectedUserId}
          onSearchQueryChange={setSearchQuery}
          onSelectUser={handleSelectUser}
        />

        <GlobalUserDetailCard
          user={selectedUser}
          loading={detailLoading}
          actionLoading={actionLoading}
          actionMessage={actionMessage}
          onBlock={handleBlock}
          onUnblock={handleUnblock}
          onResetPassword={handleResetPassword}
        />
      </div>
    </main>
  );
}
