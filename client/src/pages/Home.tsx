// Loads inbox data and coordinates the authenticated conversation view.
// Loads inbox data and coordinates the authenticated conversation view.
import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../Context/AuthContext.tsx";
import ConversationDetail from "../components/home/ConversationDetail.tsx";
import ConversationList from "../components/home/ConversationList.tsx";
import ComposeModal from "../components/home/ComposeModal.tsx";
import MailHeader from "../components/home/MailHeader.tsx";
import MailSidebar from "../components/home/MailSidebar.tsx";
import type { CompositionSeed, Conversation, DraftMessage, Folder } from "../components/home/homeTypes.ts";
import "./Home.css";

async function fetchConversations(folder: Folder): Promise<Conversation[]> {
  const response = await axios.get("/api/conversations", {
    params: { folder },
    withCredentials: true,
  });
  return Array.isArray(response.data.conversations) ? response.data.conversations : [];
}

async function fetchDrafts(): Promise<DraftMessage[]> {
  const response = await axios.get("/api/drafts", { withCredentials: true });
  return Array.isArray(response.data.drafts) ? response.data.drafts : [];
}

function draftAsConversation(draft: DraftMessage): Conversation {
  const participants = draft.to.map((address) => address.slice(0, address.lastIndexOf("@")));
  const preview = draft.subject || draft.text || "";
  return {
    _id: draft._id,
    participants,
    isGroup: participants.length > 1,
    groupName: "",
    lastMessageAt: draft.date,
    lastMessagePreview: preview,
    lastMessageFrom: "",
    isDraft: true,
  };
}

function Home() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [inboxCount, setInboxCount] = useState(0);
  const [drafts, setDrafts] = useState<DraftMessage[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeFolder, setActiveFolder] = useState<Folder>("conversations");
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileFoldersOpen, setMobileFoldersOpen] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeVersion, setComposeVersion] = useState(0);
  const [composeSeed, setComposeSeed] = useState<CompositionSeed | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  async function loadConversations(folder: Folder = activeFolder) {
    setLoading(true);
    setLoadError("");
    try {
      let results: Conversation[];
      if (folder === "drafts") {
        const fetchedDrafts = await fetchDrafts();
        setDrafts(fetchedDrafts);
        results = fetchedDrafts.map(draftAsConversation);
      } else {
        const [fetchedDrafts, fetchedConversations] = await Promise.all([fetchDrafts(), fetchConversations(folder)]);
        setDrafts(fetchedDrafts);
        results = fetchedConversations;
        if (folder === "conversations") setInboxCount(results.length);
      }
      setConversations(results);
      setSelectedIds([]);
      setSelectedId((current) => current && results.some((item) => item._id === current) ? current : null);
    } catch {
      setLoadError("We couldn't load your conversations.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    Promise.all([fetchConversations("conversations"), fetchDrafts()])
      .then(([results, fetchedDrafts]) => {
        if (active) {
          setConversations(results);
          setInboxCount(results.length);
          setDrafts(fetchedDrafts);
        }
      })
      .catch(() => {
        if (active) setLoadError("We couldn't load your conversations.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function handleSignOut() {
    await signOut();
    navigate("/");
  }

  const selectedConversation = conversations.find((conversation) => conversation._id === selectedId);

  async function applyBulkAction(action: "archive" | "read" | "unread" | "trash" | "restore") {
    const messageIds = conversations
      .filter((conversation) => selectedIds.includes(conversation._id))
      .flatMap((conversation) => conversation.messageIds?.length
        ? conversation.messageIds
        : conversation.lastMessageId ? [conversation.lastMessageId] : [conversation._id]);
    if (!messageIds.length) return;
    try {
      await axios.patch("/api/messages/bulk", { messageIds, action }, { withCredentials: true });
      setSelectedIds([]);
      await loadConversations();
    } catch {
      setLoadError("We couldn't update the selected messages.");
    }
  }

  function selectConversation(id: string) {
    if (activeFolder === "drafts") {
      const draft = drafts.find((item) => item._id === id);
      if (!draft) return;
      setComposeSeed({
        draftId: draft._id,
        to: draft.to,
        cc: draft.cc,
        bcc: draft.bcc,
        subject: draft.subject,
        text: draft.text,
        html: draft.html,
        attachments: draft.attachments,
        replyToId: draft.replyToId,
      });
      setComposeVersion((version) => version + 1);
      setComposeOpen(true);
      return;
    }
    setSelectedId(id);
  }

  function openComposer(seed: CompositionSeed | null = null) {
    setComposeSeed(seed);
    setComposeVersion((version) => version + 1);
    setComposeOpen(true);
  }

  return (
    <main className="mail-app">
      <MailSidebar
        activeFolder={activeFolder}
        collapsed={collapsed}
        conversationCount={inboxCount}
        draftCount={drafts.length}
        mobileOpen={mobileFoldersOpen}
        onFolderSelect={(folder) => {
          setActiveFolder(folder);
          setSelectedId(null);
          setSelectedIds([]);
          setMobileFoldersOpen(false);
          void loadConversations(folder);
        }}
        onToggleCollapse={() => setCollapsed(!collapsed)}
        onToggleMobile={() => setMobileFoldersOpen(!mobileFoldersOpen)}
        onCompose={() => {
          openComposer();
        }}
      />
      <section className="mail-main">
        <MailHeader
          username={user?.username}
          phone={user?.phone}
          loading={loading}
          loadError={loadError}
          search={search}
          onSearchChange={setSearch}
          onSignOut={() => void handleSignOut()}
          mobileFoldersOpen={mobileFoldersOpen}
          onToggleMobileFolders={() => setMobileFoldersOpen(!mobileFoldersOpen)}
        />
        <div className="mail-content">
          <ConversationList
            conversations={conversations}
            currentUserPhone={user?.phone}
            activeFolder={activeFolder}
            selectedId={selectedId}
            loading={loading}
            loadError={loadError}
            search={search}
            selectedIds={selectedIds}
            onToggleSelected={(id) => setSelectedIds((current) => current.includes(id)
              ? current.filter((selectedId) => selectedId !== id)
              : [...current, id])}
            onBulkAction={(action) => void applyBulkAction(action)}
            onSelect={selectConversation}
            onRefresh={() => void loadConversations()}
            onRetry={() => void loadConversations()}
          />
          <ConversationDetail
            conversation={selectedConversation}
            currentUserPhone={user?.phone}
            activeFolder={activeFolder}
            onBack={() => setSelectedId(null)}
            onMessageMoved={() => {
              setSelectedId(null);
              void loadConversations();
            }}
            onMessageUpdated={() => void loadConversations()}
            onReply={(seed) => {
              openComposer(seed);
            }}
            onForward={(seed) => {
              openComposer(seed);
            }}
          />
        </div>
      </section>
      <ComposeModal
        key={composeVersion}
        open={composeOpen}
        seed={composeSeed}
        onClose={() => {
          setComposeOpen(false);
          void loadConversations();
        }}
        onDiscard={() => {
          setComposeOpen(false);
          void loadConversations();
        }}
        onSent={() => {
          setComposeOpen(false);
          setComposeSeed(null);
          void loadConversations();
        }}
      />
    </main>
  );
}

export default Home;