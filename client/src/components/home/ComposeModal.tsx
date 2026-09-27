import { useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import { FiSend, FiX } from "react-icons/fi";

type ComposeModalProps = {
  open: boolean;
  onClose: () => void;
  onSent: () => void;
};

export default function ComposeModal({ open, onClose, onSent }: ComposeModalProps) {
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const recipients = to
      .split(",")
      .map((address) => address.trim())
      .filter(Boolean);

    if (!recipients.length) {
      setError("Add at least one recipient.");
      return;
    }
    if (!subject.trim()) {
      setError("Add a subject.");
      return;
    }
    if (!text.trim()) {
      setError("Write a message before sending.");
      return;
    }

    setSending(true);
    try {
      await axios.post(
        "/api/send-email",
        { to: recipients, subject: subject.trim(), text: text.trim() },
        { withCredentials: true },
      );
      setTo("");
      setSubject("");
      setText("");
      onSent();
    } catch (requestError) {
      if (axios.isAxiosError(requestError) && requestError.response?.data?.message) {
        setError(requestError.response.data.message);
      } else {
        setError("We couldn't send this message. Please try again.");
      }
    } finally {
      setSending(false);
    }
  }

  return createPortal(
    (
    <div className="compose-overlay" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !sending) onClose();
    }}>
      <section className="compose-modal" role="dialog" aria-modal="true" aria-labelledby="compose-title">
        <div className="compose-modal-header">
          <div>
            <p className="eyebrow">NEW CONVERSATION</p>
            <h2 id="compose-title">Compose message</h2>
          </div>
          <button className="icon-button" onClick={onClose} disabled={sending} aria-label="Close compose window" title="Close">
            <FiX />
          </button>
        </div>
        <form onSubmit={(event) => void handleSubmit(event)}>
          <label className="compose-field">
            <span>To</span>
            <input
              value={to}
              onChange={(event) => setTo(event.target.value)}
              placeholder="phone@phonemail.test"
              autoComplete="email"
              autoFocus
              disabled={sending}
            />
            <small>Separate multiple recipients with commas.</small>
          </label>
          <label className="compose-field">
            <span>Subject</span>
            <input
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              placeholder="What's this about?"
              disabled={sending}
            />
          </label>
          <label className="compose-field compose-message-field">
            <span>Message</span>
            <textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="Write your message..."
              rows={7}
              disabled={sending}
            />
          </label>
          {error && <p className="compose-error" role="alert">{error}</p>}
          <div className="compose-actions">
            <button type="button" className="compose-cancel" onClick={onClose} disabled={sending}>Cancel</button>
            <button type="submit" className="compose-send" disabled={sending}>
              <FiSend aria-hidden="true" />
              {sending ? "Sending..." : "Send message"}
            </button>
          </div>
        </form>
      </section>
    </div>
    ),
    document.body,
  );
}