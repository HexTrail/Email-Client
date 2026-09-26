import { FiArchive, FiRefreshCw } from "react-icons/fi";
import type { Conversation, Folder } from "./homeTypes.ts";
import { folders } from "./homeTypes.ts";
import { formatAddress, formatTime, initials } from "./homeUtils.ts";

type ConversationListProps = {
  conversations: Conversation[];
  currentUserPhone?: string;
  activeFolder: Folder;
  selectedId: string | null;
  loading: boolean;
  loadError: string;
  search: string;
  onSelect: (id: string) => void;
  onRefresh: () => void;
  onRetry: () => void;
};

export default function ConversationList({
  conversations,
  currentUserPhone,
  activeFolder,
  selectedId,
  loading,
  loadError,
  search,
  onSelect,
  onRefresh,
  onRetry,
}: ConversationListProps) {
  const filteredConversations = conversations.filter((conversation) => {
    const otherParticipants = conversation.participants
      .filter((participant) => participant !== currentUserPhone)
      .map(formatAddress)
      .join(" ");
    const title = conversation.isGroup ? conversation.groupName : otherParticipants;
    return `${title} ${conversation.lastMessagePreview}`.toLowerCase().includes(search.toLowerCase());
  });
  const folderLabel = folders.find((folder) => folder.id === activeFolder)?.label ?? "Inbox";

  return (
    <section className="conversation-pane" aria-label="Conversation list">
      <div className="pane-heading">
        <div>
          <p className="eyebrow">YOUR MAIL</p>
          <h1>{folderLabel}</h1>
        </div>
        <button className="icon-button refresh-button" onClick={onRefresh} title="Refresh conversations" aria-label="Refresh conversations">
          <FiRefreshCw />
        </button>
      </div>

      {activeFolder === "inbox" ? (
        <>
          <div className="list-meta"><span>{conversations.length} conversations</span><span>Most recent</span></div>
          <div className="conversation-list">
            {loading ? (
              <div className="list-message">Loading your conversations...</div>
            ) : loadError ? (
              <div className="list-message error-message">
                <span>{loadError}</span>
                <button onClick={onRetry}>Try again</button>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="list-message">
                {search ? "No conversations match your search." : "Nothing here yet. New conversations will show up here."}
              </div>
            ) : filteredConversations.map((conversation, index) => {
              const participantNames = conversation.participants
                .filter((participant) => participant !== currentUserPhone)
                .map(formatAddress);
              const title = conversation.isGroup
                ? conversation.groupName || "Group conversation"
                : participantNames[0] ?? "Unknown sender";

              return (
                <button
                  className={`conversation-row${selectedId === conversation._id ? " is-selected" : ""}`}
                  key={conversation._id}
                  onClick={() => onSelect(conversation._id)}
                >
                  <span className={`conversation-avatar avatar-tone-${index % 5}`}>{initials(title)}</span>
                  <span className="conversation-copy">
                    <span className="conversation-line"><strong>{title}</strong><time>{formatTime(conversation.lastMessageAt)}</time></span>
                    <span className="conversation-preview">{conversation.lastMessagePreview || "No message preview"}</span>
                  </span>
                  <span className="row-indicator" />
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <div className="folder-empty">
          <span className="folder-empty-icon"><FiArchive /></span>
          <strong>{activeFolder[0].toUpperCase() + activeFolder.slice(1)} is ready</strong>
          <p>This folder will show messages once folder filtering is connected to your account.</p>
        </div>
      )}
    </section>
  );
}