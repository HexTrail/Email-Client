import { FiMessageCircle, FiShield, FiTrash2 } from "react-icons/fi";

export type Conversation = {
  _id: string;
  participants: string[];
  isGroup: boolean;
  groupName: string;
  lastMessageAt: string;
  lastMessagePreview: string;
  lastMessageFrom: string;
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
  subject: string;
  text: string;
  html: string;
  date: string;
  attachments: MessageAttachment[];
};

export type Folder = "conversations" | "spam" | "trash";

export const folders: { id: Folder; label: string; icon: typeof FiMessageCircle }[] = [
  { id: "conversations", label: "Conversations", icon: FiMessageCircle },
  { id: "spam", label: "Spam", icon: FiShield },
  { id: "trash", label: "Trash", icon: FiTrash2 },
];