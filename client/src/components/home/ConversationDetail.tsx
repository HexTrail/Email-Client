import { useEffect, useState } from "react";
import axios from "axios";
import { FiArrowLeft, FiDownload, FiMoreHorizontal, FiPaperclip } from "react-icons/fi";
import type { Conversation, EmailMessage } from "./homeTypes.ts";
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
  const [messageResult, setMessageResult] = useState<{
    conversationId: string;
    messages: EmailMessage[];
    error: boolean;
  }>({ conversationId: "", messages: [], error: false });
  const conversationId = conversation?._id;

  useEffect(() => {
    if (!conversationId) {
      return;
    }

    let active = true;
    axios.get(`/api/conversations/${conversationId}/messages`, { withCredentials: true })
      .then((response) => {
        if (active) {
          setMessageResult({
            conversationId,
            messages: Array.isArray(response.data.messages) ? response.data.messages : [],
            error: false,
          });
        }
      })
      .catch(() => {
        if (active) setMessageResult({ conversationId, messages: [], error: true });
      });

    return () => { active = false; };
  }, [conversationId]);

  const resultMatchesConversation = messageResult.conversationId === conversationId;
  const visibleMessages = resultMatchesConversation ? messageResult.messages : [];
  const messagesLoading = Boolean(conversationId) && !resultMatchesConversation;
  const messagesError = resultMatchesConversation && messageResult.error
    ? "We couldn't load the messages in this conversation."
    : "";

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
            {messagesLoading && <p className="thread-status">Loading messages...</p>}
            {messagesError && <p className="thread-status" role="alert">{messagesError}</p>}
            {!messagesLoading && !messagesError && visibleMessages.length === 0 && (
              <article className="message-card">
                <div className="message-header">
                  <span className="message-avatar">{initials(sender)}</span>
                  <div className="message-sender"><strong>{sender}</strong><span>Conversation</span></div>
                  <time>{formatTime(conversation.lastMessageAt)}</time>
                </div>
                <p className="message-text">{conversation.lastMessagePreview || "This conversation does not have a message preview yet."}</p>
                <span className="message-footnote">Message content unavailable</span>
              </article>
            )}
            {visibleMessages.map((message) => {
              const isOwnMessage = message.from.startsWith(`${currentUserPhone}@`);
              const messageSender = isOwnMessage ? "You" : formatAddress(message.from);
              return (
                <article className={`message-card ${isOwnMessage ? "message-card-sent" : "message-card-received"}`} key={message._id}>
                  <div className="message-header">
                    <span className="message-avatar">{initials(messageSender)}</span>
                    <div className="message-sender">
                      <strong>{messageSender}</strong>
                      <span>{isOwnMessage ? `to ${message.to.map(formatAddress).join(", ")}` : "to you"}</span>
                    </div>
                    <time>{formatTime(message.date)}</time>
                  </div>
                  {message.subject && message.subject !== "(no subject)" && <h3 className="message-subject">{message.subject}</h3>}
                  {message.html ? (
                    <div className="message-text message-rich-text" dangerouslySetInnerHTML={{ __html: message.html }} />
                  ) : (
                    <p className="message-text">{message.text}</p>
                  )}
                  {message.attachments.length > 0 && (
                    <div className="message-attachments" aria-label="Attachments">
                      {message.attachments.map((attachment) => {
                        const canPreview = attachment.contentType.startsWith("image/")
                          || attachment.contentType === "application/pdf"
                          || attachment.contentType.startsWith("text/");
                        return (
                          <div className="message-attachment" key={attachment.downloadUrl}>
                            <FiPaperclip aria-hidden="true" />
                            <span title={attachment.filename}>{attachment.filename}</span>
                            <small>{formatFileSize(attachment.size)}</small>
                            {canPreview && <a href={attachment.viewUrl} target="_blank" rel="noreferrer">View</a>}
                            <a href={attachment.downloadUrl} aria-label={`Download ${attachment.filename}`} title="Download"><FiDownload /></a>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </article>
              );
            })}
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

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}