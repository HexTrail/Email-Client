// Defines shared types and folder options for inbox components.
// Defines shared types and folder options for inbox components.
import { FiArchive, FiFileText, FiMessageCircle, FiSend, FiShield, FiTrash2 } from "react-icons/fi";

export type Conversation = {
  _id: string;
  participants: string[];
  isGroup: boolean;
  groupName: string;
  lastMessageAt: string;
  lastMessagePreview: string;
  lastMessageFrom: string;
  lastMessageId?: string;
  messageIds?: string[];
  unread?: boolean;
  isDraft?: boolean;
};

export type MessageAttachment = {
  filename: string;
  contentType: string;
  size: number;
  viewUrl: string;
  downloadUrl: string;
};

export type EmailMessage = {
  _id: string;
  from: string;
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  text: string;
  html: string;
  date: string;
  folder: MessageFolder;
  read: boolean;
  messageId: string;
  inReplyTo: string;
  replyToId?: string;
  references: string[];
  attachments: MessageAttachment[];
};

export type DraftAttachment = {
  filename: string;
  contentType: string;
  size: number;
  content: string;
};

export type DraftMessage = {
  _id: string;
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  text: string;
  html: string;
  date: string;
  replyToId?: string;
  attachments: DraftAttachment[];
};

export type CompositionSeed = Pick<DraftMessage, "to" | "cc" | "bcc" | "subject" | "text" | "html" | "attachments" | "replyToId"> & {
  draftId?: string;
};

export type Folder = "conversations" | "sent" | "drafts" | "archive" | "spam" | "trash";
export type MessageFolder = "inbox" | "archive" | "spam" | "trash" | "sent" | "drafts";

export const folders: { id: Folder; label: string; icon: typeof FiMessageCircle }[] = [
  { id: "conversations", label: "Conversations", icon: FiMessageCircle },
  { id: "sent", label: "Sent", icon: FiSend },
  { id: "drafts", label: "Drafts", icon: FiFileText },
  { id: "archive", label: "Archive", icon: FiArchive },
  { id: "spam", label: "Spam", icon: FiShield },
  { id: "trash", label: "Trash", icon: FiTrash2 },
];