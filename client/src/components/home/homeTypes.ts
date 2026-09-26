import { FiInbox, FiSend, FiShield, FiStar, FiTrash2 } from "react-icons/fi";

export type Conversation = {
  _id: string;
  participants: string[];
  isGroup: boolean;
  groupName: string;
  lastMessageAt: string;
  lastMessagePreview: string;
  lastMessageFrom: string;
};

export type Folder = "inbox" | "starred" | "sent" | "spam" | "trash";

export const folders: { id: Folder; label: string; icon: typeof FiInbox }[] = [
  { id: "inbox", label: "Inbox", icon: FiInbox },
  { id: "starred", label: "Starred", icon: FiStar },
  { id: "sent", label: "Sent", icon: FiSend },
  { id: "spam", label: "Spam", icon: FiShield },
  { id: "trash", label: "Trash", icon: FiTrash2 },
];