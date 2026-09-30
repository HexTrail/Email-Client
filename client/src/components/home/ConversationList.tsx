// Renders the inbox conversation summaries and selection controls.
// Renders the inbox conversation summaries and selection controls.
import { FiArchive, FiCheck, FiRefreshCw, FiTrash2, FiRotateCcw } from "react-icons/fi";
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
  selectedIds: string[];
  onToggleSelected: (id: string) => void;
  onBulkAction: (action: "archive" | "read" | "unread" | "trash" | "restore") => void;
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
  selectedIds,
  onToggleSelected,
  onBulkAction,
}: ConversationListProps) {
  const filteredConversations = conversations.filter((conversation) => {
    const otherParticipants = conversation.participants
      .filter((participant) => participant !== currentUserPhone)
      .map(formatAddress)
      .join(" ");
    const title = conversation.isGroup ? conversation.groupName : otherParticipants;
    return `${title} ${conversation.lastMessagePreview}`.toLowerCase().includes(search.toLowerCase());
  });
  const folderLabel = folders.find((folder) => folder.id === activeFolder)?.label ?? "Conversations";

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

      <>
        <div className="list-meta"><span>{conversations.length} {activeFolder === "conversations" ? "conversations" : "threads"}</span><span>Most recent</span></div>
        {selectedIds.length > 0 && (
          <div className="bulk-actions" aria-label="Actions for selected conversations">
            <span>{selectedIds.length} selected</span>
            {activeFolder === "spam" || activeFolder === "trash" || activeFolder === "archive" ? (
              <button type="button" title="Restore selected" aria-label="Restore selected" onClick={() => onBulkAction("restore")}><FiRotateCcw /></button>
            ) : activeFolder !== "drafts" && <button type="button" title="Archive selected" aria-label="Archive selected" onClick={() => onBulkAction("archive")}><FiArchive /></button>}
            {activeFolder !== "sent" && activeFolder !== "drafts" && (
              <>
                <button type="button" title="Mark selected read" aria-label="Mark selected read" onClick={() => onBulkAction("read")}><FiCheck /></button>
                <button type="button" title="Mark selected unread" aria-label="Mark selected unread" onClick={() => onBulkAction("unread")}><span className="unread-action-dot" /></button>
              </>
            )}
            <button type="button" title="Move selected to trash" aria-label="Move selected to trash" onClick={() => onBulkAction("trash")}><FiTrash2 /></button>
          </div>
        )}
        <div className="conversation-list">
          {loading ? (
            <div className="list-message">Loading messages...</div>
          ) : loadError ? (
            <div className="list-message error-message">
              <span>{loadError}</span>
              <button onClick={onRetry}>Try again</button>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="list-message">
              {search ? "No conversations match your search." : `Nothing in ${folderLabel.toLowerCase()} yet.`}
            </div>
          ) : filteredConversations.map((conversation, index) => {
              const participantNames = conversation.participants
                .filter((participant) => participant !== currentUserPhone)
                .map(formatAddress);
              const title = conversation.isDraft
                ? participantNames.length ? `Draft to ${participantNames.join(", ")}` : "Untitled draft"
                : conversation.isGroup
                ? conversation.groupName || "Group conversation"
                : participantNames[0] ?? "Unknown sender";

              return (
                <div className={`conversation-row-wrap${conversation.unread ? " is-unread" : ""}`} key={conversation._id}>
                  <input
                    className="conversation-select"
                    type="checkbox"
                    checked={selectedIds.includes(conversation._id)}
                    onChange={() => onToggleSelected(conversation._id)}
                    aria-label={`Select ${title}`}
                  />
                  <button
                    className={`conversation-row${selectedId === conversation._id ? " is-selected" : ""}`}
                    onClick={() => onSelect(conversation._id)}
                  >
                    <span className={`conversation-avatar avatar-tone-${index % 5}`}>{initials(title)}</span>
                    <span className="conversation-copy">
                      <span className="conversation-line"><strong>{title}</strong><time>{formatTime(conversation.lastMessageAt)}</time></span>
                      <span className="conversation-preview">{conversation.lastMessagePreview || (conversation.isDraft ? "Draft" : "No message preview")}</span>
                    </span>
                    {conversation.unread && <span className="unread-indicator" aria-label="Unread" />}
                  </button>
                </div>
              );
          })}
        </div>
      </>
    </section>
  );
}