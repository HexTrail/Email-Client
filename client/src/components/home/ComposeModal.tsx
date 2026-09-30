// Collects message details and submits outgoing email.
// Collects message details and submits outgoing email.
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import { FiBold, FiItalic, FiLink, FiList, FiPaperclip, FiSend, FiUnderline, FiX } from "react-icons/fi";
import type { CompositionSeed, DraftAttachment } from "./homeTypes.ts";

const MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024;
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

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character] || character);
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
  seed: CompositionSeed | null;
  onClose: () => void;
  onDiscard: () => void;
  onSent: () => void;
};

export default function ComposeModal({ open, seed, onClose, onDiscard, onSent }: ComposeModalProps) {
  const [to, setTo] = useState(seed?.to.join(", ") || "");
  const [cc, setCc] = useState(seed?.cc.join(", ") || "");
  const [bcc, setBcc] = useState(seed?.bcc.join(", ") || "");
  const [subject, setSubject] = useState(seed?.subject || "");
  const [text, setText] = useState(seed?.text || "");
  const [html, setHtml] = useState(seed?.html || "");
  const [attachments, setAttachments] = useState<DraftAttachment[]>(seed?.attachments || []);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [draftStatus, setDraftStatus] = useState(seed?.draftId ? "Draft loaded" : "");
  const [hasSavedDraft, setHasSavedDraft] = useState(Boolean(seed?.draftId));
  const [replyToId] = useState(seed?.replyToId);
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
  const draftIdRef = useRef<string | undefined>(seed?.draftId);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    if (!open) return;

    const updateActiveFormats = () => setActiveFormats(getActiveFormats(editorRef.current));
    document.addEventListener("selectionchange", updateActiveFormats);
    return () => document.removeEventListener("selectionchange", updateActiveFormats);
  }, [open]);

  const initialEditorHtml = seed?.html || escapeHtml(seed?.text || "").replace(/\n/g, "<br>");
  useEffect(() => {
    if (open && editorRef.current) editorRef.current.innerHTML = initialEditorHtml;
  }, [initialEditorHtml, open]);

  const saveDraft = useCallback(async () => {
    const hasContent = Boolean(to.trim() || cc.trim() || bcc.trim() || subject.trim() || text.trim() || html.trim() || attachments.length || draftIdRef.current);
    if (!hasContent) return;
    const parseAddresses = (value: string) => value.split(",").map((address) => address.trim()).filter(Boolean);
    saveQueueRef.current = saveQueueRef.current.catch(() => undefined).then(async () => {
      setDraftStatus("Saving draft...");
      try {
        const response = await axios.post("/api/drafts", {
          draftId: draftIdRef.current,
          to: parseAddresses(to),
          cc: parseAddresses(cc),
          bcc: parseAddresses(bcc),
          replyToId,
          subject,
          text,
          html,
          attachments,
        }, { withCredentials: true });
        draftIdRef.current = response.data.draftId;
        setHasSavedDraft(true);
        setDraftStatus("Draft saved");
      } catch {
        setDraftStatus("Draft not saved");
      }
    });
    await saveQueueRef.current;
  }, [attachments, bcc, cc, html, replyToId, subject, text, to]);

  useEffect(() => {
    if (!open) return;

    function saveOnPageExit() {
      const hasContent = Boolean(to.trim() || cc.trim() || bcc.trim() || subject.trim() || text.trim() || html.trim() || attachments.length || draftIdRef.current);
      if (sending || !hasContent) return;

      const body = JSON.stringify({
        draftId: draftIdRef.current,
        to: to.split(",").map((address) => address.trim()).filter(Boolean),
        cc: cc.split(",").map((address) => address.trim()).filter(Boolean),
        bcc: bcc.split(",").map((address) => address.trim()).filter(Boolean),
        replyToId,
        subject,
        text,
        html,
        attachments,
      });
      navigator.sendBeacon("/api/drafts", new Blob([body], { type: "application/json" }));
    }

    window.addEventListener("pagehide", saveOnPageExit);
    return () => window.removeEventListener("pagehide", saveOnPageExit);
  }, [attachments, bcc, cc, html, open, replyToId, sending, subject, text, to]);

  if (!open) return null;

  async function closeAndSave() {
    if (sending) return;
    const hasContent = Boolean(to.trim() || cc.trim() || bcc.trim() || subject.trim() || text.trim() || html.trim() || attachments.length || draftIdRef.current);
    if (hasContent && window.confirm("Save this email as a draft before closing? Choose Cancel to close without saving.")) {
      await saveDraft();
    }
    onClose();
  }

  async function discardDraft() {
    if (sending) return;
    await saveQueueRef.current.catch(() => undefined);
    if (draftIdRef.current) {
      try {
        await axios.delete(`/api/drafts/${draftIdRef.current}`, { withCredentials: true });
      } catch {
        setError("We couldn't discard this draft.");
        return;
      }
    }
    draftIdRef.current = undefined;
    setHasSavedDraft(false);
    onDiscard();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const parseAddresses = (value: string) => value.split(",").map((address) => address.trim()).filter(Boolean);
    const recipients = parseAddresses(to);
    const copiedRecipients = parseAddresses(cc);
    const blindRecipients = parseAddresses(bcc);
    const hasRecipients = recipients.length + copiedRecipients.length + blindRecipients.length > 0;

    if (!hasRecipients) {
      setError("Add at least one recipient.");
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
      await axios.post(
        "/api/send-email",
        {
          to: recipients,
          cc: copiedRecipients,
          bcc: blindRecipients,
          subject: subject.trim(),
          text: messageText,
          html: messageHtml,
          attachments,
          draftId: draftIdRef.current,
          replyToId,
        },
        { withCredentials: true },
      );
      setTo("");
      setCc("");
      setBcc("");
      setSubject("");
      setText("");
      setHtml("");
      setAttachments([]);
      draftIdRef.current = undefined;
      setHasSavedDraft(false);
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

  async function addAttachments(files: FileList | null) {
    if (!files?.length) return;
    const additions = await Promise.all(Array.from(files).map(async (file) => ({
      filename: file.name,
      contentType: file.type || "application/octet-stream",
      size: file.size,
      content: await readFileAsBase64(file),
    })));
    const totalBytes = [...attachments, ...additions].reduce((total, attachment) => total + attachment.size, 0);
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
      if (event.target === event.currentTarget && !sending) void closeAndSave();
    }}>
      <section className="compose-modal" role="dialog" aria-modal="true" aria-labelledby="compose-title">
        <div className="compose-modal-header">
          <div>
            <p className="eyebrow">NEW CONVERSATION</p>
            <h2 id="compose-title">Compose message</h2>
          </div>
          <button className="icon-button" onClick={() => void closeAndSave()} disabled={sending} aria-label="Save draft and close" title="Save draft and close">
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
              placeholder="9876543210@phonemail.test"
              aria-describedby="compose-recipient-help"
              autoComplete="email"
              autoFocus
              disabled={sending}
            />
            <small id="compose-recipient-help">Separate multiple recipients with commas.</small>
          </label>
          <label className="compose-field compose-recipient-field">
            <span>Cc</span>
            <input value={cc} onChange={(event) => setCc(event.target.value)} placeholder="Optional copied recipients" autoComplete="email" disabled={sending} />
          </label>
          <label className="compose-field compose-recipient-field">
            <span>Bcc</span>
            <input value={bcc} onChange={(event) => setBcc(event.target.value)} placeholder="Optional hidden recipients" autoComplete="email" disabled={sending} />
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
                void addAttachments(event.currentTarget.files);
                event.currentTarget.value = "";
              }}
            />
            <button type="button" className="compose-attach" onClick={() => fileInputRef.current?.click()} disabled={sending}>
              <FiPaperclip aria-hidden="true" /> Attach files
            </button>
            {attachments.map((attachment, index) => (
              <div className="compose-attachment" key={`${attachment.filename}-${index}`}>
                <span title={attachment.filename}>{attachment.filename} <small>{formatFileSize(attachment.size)}</small></span>
                <button type="button" title={`Remove ${attachment.filename}`} aria-label={`Remove ${attachment.filename}`} onClick={() => setAttachments((current) => current.filter((_, itemIndex) => itemIndex !== index))} disabled={sending}><FiX /></button>
              </div>
            ))}
            <small className="compose-attachment-limit">8 MB total</small>
          </div>
          {error && <p className="compose-error" role="alert">{error}</p>}
          <div className="compose-actions">
            {hasSavedDraft && <button type="button" className="compose-discard" onClick={() => void discardDraft()} disabled={sending}>Discard draft</button>}
            <span className="draft-status" role="status">{draftStatus}</span>
            <button type="button" className="compose-cancel" onClick={() => void closeAndSave()} disabled={sending}>Save & close</button>
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