import ChatComposer from "./ChatComposer";
import ChatHeader from "./ChatHeader";
import ChatMessageItem from "./ChatMessageItem";

import { chatLayoutStyles } from "../styles/corporateChatStyles";

export default function ChatWindow({
  messagesRef,

  activeChat,
  currentUser,

  rootMessages = [],
  repliesByParentId = {},

  highlightedMessageId,

  error,
  isLoadingMessages,

  onSubmit,
  onReply,
  onReaction,
  onEditMessage,
  onDeleteMessage,
  onOpenSettings,
  onOpenParticipants,
  onOpenFile,
}) {
  return (
    <main style={chatLayoutStyles.workspace}>
      <ChatHeader
        activeChat={activeChat}
        currentUser={currentUser}
        onOpenSettings={onOpenSettings}
        onOpenParticipants={onOpenParticipants}
      />

      <div style={chatLayoutStyles.workspaceBody}>
        <div
          ref={messagesRef}
          style={chatLayoutStyles.messagesContainer}
        >
          {!!error && (
            <div style={chatLayoutStyles.empty}>
              {error}
            </div>
          )}

          {!error && isLoadingMessages && (
            <div style={chatLayoutStyles.empty}>
              Загрузка сообщений...
            </div>
          )}

          {!error &&
            !isLoadingMessages &&
            !rootMessages.length && (
              <div style={chatLayoutStyles.empty}>
                Пока нет сообщений
              </div>
            )}

          {!error &&
            !isLoadingMessages &&
            rootMessages.map((message) => (
              <ChatMessageItem
                key={message.id}
                message={message}
                replies={
                  repliesByParentId[String(message.id)] || []
                }
                highlightedMessageId={
                  highlightedMessageId
                }
                onReply={onReply}
                onReaction={onReaction}
                onEdit={onEditMessage}
                onDelete={onDeleteMessage}
                onOpenFile={onOpenFile}
              />
            ))}
        </div>

        <div style={chatLayoutStyles.composerContainer}>
          <ChatComposer
            placeholder="Написать сообщение..."
            submitErrorLabel="Ошибка отправки сообщения"
            onSubmit={onSubmit}
          />
        </div>
      </div>
    </main>
  );
}