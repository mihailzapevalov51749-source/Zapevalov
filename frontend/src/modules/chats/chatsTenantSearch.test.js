import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const chatsDir = __dirname;

function readSource(relativePath) {
  return readFileSync(join(chatsDir, relativePath), "utf8");
}

test("chatsApi uses tenant-scoped user search endpoint", () => {
  const source = readSource("api/chatsApi.js");

  assert.match(source, /searchChatUsers/);
  assert.match(source, /\/chats\/users\/search/);
  assert.match(source, /tenant_id: normalizedTenantId/);
  assert.doesNotMatch(source, /request\("\/users\/"/);
});

test("ChatCreateModal searches users by tenantId", () => {
  const source = readSource("components/ChatCreateModal.jsx");

  assert.match(source, /tenantId/);
  assert.match(source, /searchUsers\(tenantId, search\)/);
});

test("ChatCreateModal uses PlatformModal and PlatformUserAvatar", () => {
  const source = readSource("components/ChatCreateModal.jsx");

  assert.match(source, /PlatformModal/);
  assert.match(source, /PlatformUserAvatar/);
  assert.match(source, /platform-modal-footer/);
  assert.match(source, /mergeDisplayUsers/);
  assert.doesNotMatch(source, /chatModalOverlay/);
  assert.doesNotMatch(source, /chatModalUserAvatar/);
  assert.doesNotMatch(source, /slice\(0, 1\)/);
});

test("ChatCreateModal uses compact user list layout", () => {
  const css = readFileSync(
    join(chatsDir, "components/chatCreateModal.css"),
    "utf8",
  );

  assert.match(css, /padding:\s*4px 8px/);
  assert.match(css, /gap:\s*6px/);
  assert.match(css, /max-height:\s*320px/);

  const source = readSource("components/ChatCreateModal.jsx");
  assert.match(source, /PlatformUserAvatar user=\{user\} size=\{32\}/);
});

test("ChatSettingsModal uses Platform Modal", () => {
  const source = readSource("components/ChatSettingsModal.jsx");

  assert.match(source, /PlatformModal/);
  assert.match(source, /CHAT_SETTINGS_MODAL_KEY/);
  assert.match(source, /platform-modal-footer/);
  assert.match(source, /handleSave/);
  assert.match(source, /deleteChat/);
  assert.doesNotMatch(source, /chatModalStyles\.popover/);
  assert.doesNotMatch(source, /anchorRect/);
});

test("ChatParticipantsModal uses Platform Modal", () => {
  const source = readSource("components/ChatParticipantsModal.jsx");

  assert.match(source, /PlatformModal/);
  assert.match(source, /CHAT_PARTICIPANTS_MODAL_KEY/);
  assert.match(source, /PlatformUserAvatar/);
  assert.match(source, /platform-modal-footer/);
  assert.doesNotMatch(source, /pointerEvents:\s*"none"/);
});

test("chat settings avatar fallback displays Add photo placeholder", () => {
  const source = readSource("components/ChatAvatarEditor.jsx");

  assert.match(source, /avatarPlaceholder/);
  assert.match(source, /Добавь/);
  assert.match(source, /фото/);
  assert.doesNotMatch(source, /avatarLetter/);
  assert.doesNotMatch(source, /charAt\(0\)/);
});

test("group chat title save still works", () => {
  const source = readSource("components/ChatSettingsModal.jsx");

  assert.match(source, /onSave\?\.\(/);
  assert.match(source, /title:\s*title\.trim\(\)/);
  assert.match(source, /CHAT_SETTINGS_FORM_ID/);
});

test("chat delete action still works", () => {
  const source = readSource("components/ChatSettingsModal.jsx");

  assert.match(source, /handleDeleteChat/);
  assert.match(source, /deleteChat\(chat\.id\)/);
  assert.match(source, /isDeleteConfirmOpen/);
});

test("ChatParticipantsModal searches users by tenantId", () => {
  const source = readSource("components/ChatParticipantsModal.jsx");

  assert.match(source, /tenantId/);
  assert.match(source, /searchUsers\(tenantId, query\)/);
  assert.match(source, /getUsers\(tenantId\)/);
  assert.match(source, /Пользователи компании/);
});

test("ChatSidebar opens direct chat with tenantId", () => {
  const source = readSource("components/ChatSidebar.jsx");

  assert.match(source, /tenantId/);
  assert.match(source, /searchUsers\(tenantId, query\)/);
  assert.match(source, /onOpenDirectChat/);
  assert.match(source, /setSearchValue\(""\)/);
});

test("CorporateChatPage opens direct chat and upserts chat state", () => {
  const source = readSource("pages/CorporateChatPage.jsx");

  assert.match(source, /getOrCreateDirectChat/);
  assert.match(source, /handleOpenDirectChat/);
  assert.match(source, /upsertChatInList/);
  assert.match(source, /onOpenDirectChat=\{handleOpenDirectChat\}/);
  assert.match(source, /tenant_id: tenantId/);
  assert.match(source, /currentUser=\{currentUser\}/);
  assert.match(source, /getMe\(/);
  assert.match(source, /useChatUnread/);
  assert.match(source, /markChatAsRead/);
});

test("Chat unread provider polls chats list", () => {
  const source = readFileSync(
    join(chatsDir, "context/ChatUnreadProvider.jsx"),
    "utf8",
  );

  assert.match(source, /getChats/);
  assert.match(source, /CHAT_UNREAD_POLL_INTERVAL_MS/);
  assert.match(source, /updateChatReadState/);
  assert.match(source, /totalUnreadCount/);
  assert.match(source, /mergeIncomingChatList/);
  assert.match(source, /background:\s*true/);
  assert.match(source, /if \(!background\)/);
});

test("MenuItem shows chat unread badge from shared state", () => {
  const source = readFileSync(
    join(chatsDir, "../navigation/components/MenuItem.jsx"),
    "utf8",
  );

  assert.match(source, /useChatUnread/);
  assert.match(source, /isRuntimeChatNavigationItem/);
  assert.match(source, /totalUnreadCount/);
});

test("ChatSidebar resolves direct chat display title", () => {
  const source = readSource("components/ChatSidebar.jsx");

  assert.match(source, /resolveChatDisplayTitle/);
  assert.match(source, /currentUser/);
});

test("ChatSidebar parses and keeps unread badge component", () => {
  const source = readSource("components/ChatSidebar.jsx");

  assert.doesNotMatch(source, /function getLastMessageTime\(chat\) \{\n  user,/);
  assert.match(source, /function ChatListItem\(/);
  assert.match(source, /function getLastMessageTime\(chat\)/);
  assert.match(source, /function renderUserItem\(/);
  assert.match(source, /ChatUnreadBadge count=\{unreadCount\}/);
  assert.match(source, /key=\{chat\.id\}/);
  assert.match(source, /showInitialChatLoading/);
  assert.doesNotMatch(source, /key=\{`\$\{chat\.id\}-\$\{unreadCount\}`\}/);
});

test("ChatComposer places send button inside input row", () => {
  const source = readSource("components/ChatComposer.jsx");

  assert.match(source, /styles\.inputRow[\s\S]*styles\.sendButton/s);
  assert.match(source, /styles\.messageInputShell/);
  assert.match(source, /styles\.toolbarRow/);
  assert.match(source, /styles\.yasiiSafeArea/);
  assert.doesNotMatch(source, /styles\.composerBody/);
  assert.doesNotMatch(source, /styles\.toolbarLeft/);
  assert.doesNotMatch(source, /justifyContent:\s*"space-between"/);
});

test("ChatComposer keeps send button adjacent to input form", () => {
  const source = readSource("components/ChatComposer.jsx");

  assert.match(source, /styles\.sendButton/);
  assert.match(source, /styles\.inputRow/);
  assert.doesNotMatch(source, /position:\s*["']fixed["']/);
});

test("CorporateChatPage refreshes active chat messages on polling activity", () => {
  const source = readSource("pages/CorporateChatPage.jsx");

  assert.match(source, /hasActiveChatMessageActivityChanged/);
  assert.match(source, /loadMessages\(activeChatId, \{ background: true \}\)/);
  assert.match(source, /mergeChatMessages/);
  assert.match(source, /shouldRefreshActiveChatMessages/);
  assert.match(source, /shouldStickToBottomRef/);
});

test("CorporateChatPage uses background chat refresh after actions", () => {
  const source = readSource("pages/CorporateChatPage.jsx");

  assert.match(source, /refreshChats\(\{ background: true \}\)/);
  assert.doesNotMatch(source, /await refreshChats\(\);/);
});

test("ChatHeader resolves direct chat display title", () => {
  const source = readSource("components/ChatHeader.jsx");

  assert.match(source, /resolveChatDisplayTitle/);
  assert.match(source, /resolveChatDisplayAvatar/);
});

test("creator sees chat settings gear", () => {
  const source = readSource("components/ChatHeader.jsx");

  assert.match(source, /showSettingsButton/);
  assert.match(source, /isChatCreator\(activeChat, currentUser\)/);
  assert.match(source, /settingsIcon/);
  assert.match(source, /title="Настройки"/);
});

test("non-creator does not see chat settings gear", () => {
  const source = readSource("components/ChatHeader.jsx");

  assert.match(source, /showSettingsButton \?/);
  assert.doesNotMatch(source, /isChatCreator && \(/);
});

test("click settings gear opens ChatSettingsModal", () => {
  const headerSource = readSource("components/ChatHeader.jsx");
  const pageSource = readSource("pages/CorporateChatPage.jsx");

  assert.match(headerSource, /onOpenSettings\?\.\(\)/);
  assert.match(pageSource, /setIsSettingsOpen\(true\)/);
  assert.match(pageSource, /ChatSettingsModal/);
});

test("ChatListItemOut includes created_by_id in backend schema", () => {
  const source = readFileSync(
    join(chatsDir, "../../../../backend/app/modules/chats/schemas.py"),
    "utf8",
  );

  assert.match(source, /class ChatListItemOut[\s\S]*created_by_id: int/);
});

test("chat list endpoint returns created_by_id", () => {
  const source = readFileSync(
    join(chatsDir, "../../../../backend/app/modules/chats/router.py"),
    "utf8",
  );

  assert.match(source, /created_by_id=chat\.created_by_id/);
});

test("mergeIncomingChatList preserves created_by_id", () => {
  const source = readFileSync(
    join(chatsDir, "utils/chatUnreadUtils.js"),
    "utf8",
  );

  assert.match(source, /created_by_id:/);
});
