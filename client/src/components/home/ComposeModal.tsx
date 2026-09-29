// Collects message details and submits outgoing email.
// Collects message details and submits outgoing email.
import { useEffect, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import { FiBold, FiItalic, FiLink, FiList, FiPaperclip, FiSend, FiUnderline, FiX } from "react-icons/fi";

const MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024;
const COUNTRY_CODE_REMINDER = "Add the country code, for example +14155550123@phonemail.test.";
type ActiveFormats = {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  insertUnorderedList: boolean;
  insertOrderedList: boolean;
  link: boolean;
};

function getActiveFormats(editor: HTMLDivElement | null): ActiveFormats {
  const selection = window.getSelection();
  const hasEditorSelection = !!editor && !!selection?.anchorNode && editor.contains(selection.anchorNode);
  const selectedElement = selection?.anchorNode instanceof Element
    ? selection.anchorNode
    : selection?.anchorNode?.parentElement;

  return {
    bold: hasEditorSelection && document.queryCommandState("bold"),
    italic: hasEditorSelection && document.queryCommandState("italic"),
    underline: hasEditorSelection && document.queryCommandState("underline"),
    insertUnorderedList: hasEditorSelection && document.queryCommandState("insertUnorderedList"),
    insertOrderedList: hasEditorSelection && document.queryCommandState("insertOrderedList"),
    link: hasEditorSelection && !!selectedElement?.closest("a"),
  };
}

function isMissingCountryCode(recipient: string) {
  const localPart = recipient.includes("@") ? recipient.slice(0, recipient.lastIndexOf("@")) : recipient;
  const digits = localPart.replace(/[\s().-]/g, "");
  return /^\d{7,15}$/.test(digits);
}

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
    reader.onerror = () => reject(new Error(`Could not read ${file.name}`));
    reader.readAsDataURL(file);
  });
}

type ComposeModalProps = {
  open: boolean;
  onClose: () => void;
  onSent: () => void;
};

export default function ComposeModal({ open, onClose, onSent }: ComposeModalProps) {
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [text, setText] = useState("");
  const [html, setHtml] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [activeFormats, setActiveFormats] = useState<ActiveFormats>({
    bold: false,
    italic: false,
    underline: false,
    insertUnorderedList: false,
    insertOrderedList: false,
    link: false,
  });
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recipientMissingCountryCode = to
    .split(",")
    .map((recipient) => recipient.trim())
    .find(isMissingCountryCode);

  useEffect(() => {
    if (!open) return;

    const updateActiveFormats = () => setActiveFormats(getActiveFormats(editorRef.current));
    document.addEventListener("selectionchange", updateActiveFormats);
    return () => document.removeEventListener("selectionchange", updateActiveFormats);
  }, [open]);

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
    if (recipients.some(isMissingCountryCode)) {
      setError(COUNTRY_CODE_REMINDER);
      return;
    }
    if (!subject.trim()) {
      setError("Add a subject.");
      return;
    }
    const messageHtml = editorRef.current?.innerHTML || html;
    const messageText = editorRef.current?.innerText.trim() || text.trim();
    if (!messageText && !messageHtml.replace(/<[^>]*>/g, "").trim()) {
      setError("Write a message before sending.");
      return;
    }

    setSending(true);
    try {
      const encodedAttachments = await Promise.all(attachments.map(async (file) => ({
        filename: file.name,
        contentType: file.type || "application/octet-stream",
        content: await readFileAsBase64(file),
      })));
      await axios.post(
        "/api/send-email",
        { to: recipients, subject: subject.trim(), text: messageText, html: messageHtml, attachments: encodedAttachments },
        { withCredentials: true },
      );
      setTo("");
      setSubject("");
      setText("");
      setHtml("");
      setAttachments([]);
      if (editorRef.current) editorRef.current.innerHTML = "";
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

  function applyFormat(command: string, value?: string) {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    if (editorRef.current) {
      setHtml(editorRef.current.innerHTML);
      setText(editorRef.current.innerText);
    }
    setActiveFormats(getActiveFormats(editorRef.current));
  }

  function addAttachments(files: FileList | null) {
    if (!files?.length) return;
    const additions = Array.from(files);
    const totalBytes = [...attachments, ...additions].reduce((total, file) => total + file.size, 0);
    if (totalBytes > MAX_ATTACHMENT_BYTES) {
      setError("Attachments must total 8 MB or less.");
      return;
    }
    setError("");
    setAttachments((current) => [...current, ...additions]);
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
              onChange={(event) => {
                setTo(event.target.value);
                setError("");
              }}
              placeholder="phone@phonemail.test"
              aria-describedby="compose-recipient-help"
              aria-invalid={recipientMissingCountryCode ? true : undefined}
              autoComplete="email"
              autoFocus
              disabled={sending}
            />
            <small id="compose-recipient-help">Separate multiple recipients with commas.</small>
            {recipientMissingCountryCode && (
              <small className="compose-recipient-warning" role="status" aria-live="polite">
                Include the country code, e.g. +14155550123@phonemail.test.
              </small>
            )}
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
          <div className="compose-field compose-message-field">
            <span>Message</span>
            <div className="compose-editor-wrap">
              <div className="compose-toolbar" role="toolbar" aria-label="Message formatting">
                <button type="button" className={activeFormats.bold ? "is-active" : undefined} title="Bold" aria-label="Bold" aria-pressed={activeFormats.bold} onMouseDown={(event) => event.preventDefault()} onClick={() => applyFormat("bold")} disabled={sending}><FiBold /></button>
                <button type="button" className={activeFormats.italic ? "is-active" : undefined} title="Italic" aria-label="Italic" aria-pressed={activeFormats.italic} onMouseDown={(event) => event.preventDefault()} onClick={() => applyFormat("italic")} disabled={sending}><FiItalic /></button>
                <button type="button" className={activeFormats.underline ? "is-active" : undefined} title="Underline" aria-label="Underline" aria-pressed={activeFormats.underline} onMouseDown={(event) => event.preventDefault()} onClick={() => applyFormat("underline")} disabled={sending}><FiUnderline /></button>
                <span className="compose-toolbar-divider" />
                <button type="button" className={activeFormats.insertUnorderedList ? "is-active" : undefined} title="Bulleted list" aria-label="Bulleted list" aria-pressed={activeFormats.insertUnorderedList} onMouseDown={(event) => event.preventDefault()} onClick={() => applyFormat("insertUnorderedList")} disabled={sending}><FiList /></button>
                <button type="button" className={activeFormats.insertOrderedList ? "is-active" : undefined} title="Numbered list" aria-label="Numbered list" aria-pressed={activeFormats.insertOrderedList} onMouseDown={(event) => event.preventDefault()} onClick={() => applyFormat("insertOrderedList")} disabled={sending}><span className="numbered-list-icon">1.</span></button>
                <button type="button" className={activeFormats.link ? "is-active" : undefined} title="Insert link" aria-label="Insert link" aria-pressed={activeFormats.link} onMouseDown={(event) => event.preventDefault()} onClick={() => {
                  const url = window.prompt("Enter a link");
                  if (url) applyFormat("createLink", url);
                }} disabled={sending}><FiLink /></button>
              </div>
              <div
                ref={editorRef}
                className="compose-editor"
                contentEditable={!sending}
                role="textbox"
                aria-label="Message body"
                aria-multiline="true"
                data-placeholder="Write your message..."
                onInput={(event) => {
                  setHtml(event.currentTarget.innerHTML);
                  setText(event.currentTarget.innerText);
                }}
              />
            </div>
          </div>
          <div className="compose-attachments">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              hidden
              onChange={(event) => {
                addAttachments(event.currentTarget.files);
                event.currentTarget.value = "";
              }}
            />
            <button type="button" className="compose-attach" onClick={() => fileInputRef.current?.click()} disabled={sending}>
              <FiPaperclip aria-hidden="true" /> Attach files
            </button>
            {attachments.map((file, index) => (
              <div className="compose-attachment" key={`${file.name}-${file.lastModified}-${index}`}>
                <span title={file.name}>{file.name} <small>{formatFileSize(file.size)}</small></span>
                <button type="button" title={`Remove ${file.name}`} aria-label={`Remove ${file.name}`} onClick={() => setAttachments((current) => current.filter((_, itemIndex) => itemIndex !== index))} disabled={sending}><FiX /></button>
              </div>
            ))}
            <small className="compose-attachment-limit">8 MB total</small>
          </div>
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