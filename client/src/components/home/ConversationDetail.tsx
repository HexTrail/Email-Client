import { useState } from "react";
import { FiArrowLeft, FiMoreHorizontal } from "react-icons/fi";
import type { Conversation } from "./homeTypes.ts";
import { formatAddress, formatTime, initials } from "./homeUtils.ts";

type ConversationDetailProps = {
  conversation?: Conversation;
  currentUserPhone?: string;
  onBack: () => void;
};

export default function ConversationDetail({
  conversation,
  currentUserPhone,
  onBack,
}: ConversationDetailProps) {
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [copyMessage, setCopyMessage] = useState("");
  const participants = conversation?.participants
    .filter((participant) => participant !== currentUserPhone)
    .map(formatAddress) ?? [];
  const title = conversation?.isGroup
    ? conversation.groupName
    : participants[0] ?? "Conversation";
  const sender = conversation?.lastMessageFrom
    ? conversation.lastMessageFrom.startsWith(`${currentUserPhone}@`)
      ? "You"
      : formatAddress(conversation.lastMessageFrom)
    : title;

  async function copyAddresses() {
    try {
      await navigator.clipboard.writeText(participants.join(", "));
      setCopyMessage("Address copied");
    } catch {
      setCopyMessage("Could not copy address");
    }
    setOptionsOpen(false);
  }

  return (
    <section className="conversation-detail" aria-label="Selected conversation">
      {conversation ? (
        <>
          <div className="detail-header">
            <div className="detail-person">
              <button className="icon-button detail-back" onClick={onBack} aria-label="Back to conversations"><FiArrowLeft /></button>
              <span className="conversation-avatar detail-avatar">{initials(title)}</span>
              <div><h2>{title}</h2><p>{participants.join(", ") || "Conversation"}</p></div>
            </div>
            <div className="detail-options-wrap">
              <button
                className="icon-button detail-more"
                type="button"
                aria-label="More conversation options"
                aria-expanded={optionsOpen}
                aria-controls="conversation-options"
                title="More options"
                onClick={() => {
                  setOptionsOpen(!optionsOpen);
                  setCopyMessage("");
                }}
              >
                <FiMoreHorizontal />
              </button>
              {optionsOpen && (
                <div className="detail-options" id="conversation-options">
                  {participants.length > 0 && (
                    <button type="button" onClick={() => void copyAddresses()}>
                      Copy address{participants.length > 1 ? "es" : ""}
                    </button>
                  )}
                  <button type="button" onClick={() => {
                    setOptionsOpen(false);
                    onBack();
                  }}>
                    Close conversation
                  </button>
                </div>
              )}
              {copyMessage && <span className="detail-action-status" role="status">{copyMessage}</span>}
            </div>
          </div>
          <div className="thread-body">
            <div className="thread-date"><span />LATEST MESSAGE<span /></div>
            <article className="message-card">
              <div className="message-header">
                <span className="message-avatar">{initials(sender)}</span>
                <div className="message-sender">
                  <strong>{sender}</strong>
                  <span>{sender === "You" ? `to ${participants.join(", ") || "the conversation"}` : "to you"}</span>
                </div>
                <time>{formatTime(conversation.lastMessageAt)}</time>
              </div>
              <p className="message-text">{conversation.lastMessagePreview || "This conversation does not have a message preview yet."}</p>
              <span className="message-footnote">Conversation preview</span>
            </article>
            <div className="thread-reply-hint">Full message history will appear here as it becomes available.</div>
          </div>
        </>
      ) : (
        <div className="detail-empty">
          <div className="empty-art" aria-hidden="true"><span /><span /><span /></div>
          <p className="eyebrow">A LITTLE ROOM TO BREATHE</p>
          <h2>Select a conversation</h2>
          <p>Your conversations stay together here, so every reply is easy to follow.</p>
        </div>
      )}
    </section>
  );
}