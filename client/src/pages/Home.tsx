// Loads inbox data and coordinates the authenticated conversation view.
// Loads inbox data and coordinates the authenticated conversation view.
import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../Context/AuthContext.tsx";
import ConversationDetail from "../components/home/ConversationDetail.tsx";
import ConversationList from "../components/home/ConversationList.tsx";
import ComposeModal from "../components/home/ComposeModal.tsx";
import MailHeader from "../components/home/MailHeader.tsx";
import MailSidebar from "../components/home/MailSidebar.tsx";
import { emptySearchFilters, type CompositionSeed, type Conversation, type DraftMessage, type Folder, type SearchFilters } from "../components/home/homeTypes.ts";
import "./Home.css";

function getSearchParams(search: string, filters: SearchFilters, folder?: Folder) {
  return {
    folder,
    q: search.trim() || undefined,
    from: filters.from.trim() || undefined,
    to: filters.to.trim() || undefined,
    after: filters.after || undefined,
    before: filters.before || undefined,
    unread: filters.unread ? "true" : undefined,
    hasAttachment: filters.hasAttachment ? "true" : undefined,
  };
}

async function fetchConversations(folder: Folder, search: string, filters: SearchFilters): Promise<Conversation[]> {
  const response = await axios.get("/api/conversations", {
    params: getSearchParams(search, filters, folder),
    withCredentials: true,
  });
  return Array.isArray(response.data.conversations) ? response.data.conversations : [];
}

async function fetchDrafts(search = "", filters = emptySearchFilters): Promise<{ drafts: DraftMessage[]; total: number }> {
  const response = await axios.get("/api/drafts", { params: getSearchParams(search, filters), withCredentials: true });
  return {
    drafts: Array.isArray(response.data.drafts) ? response.data.drafts : [],
    total: Number(response.data.total) || 0,
  };
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
  const [draftCount, setDraftCount] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeFolder, setActiveFolder] = useState<Folder>("conversations");
  const [search, setSearch] = useState("");
  const [searchFilters, setSearchFilters] = useState<SearchFilters>(emptySearchFilters);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileFoldersOpen, setMobileFoldersOpen] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeVersion, setComposeVersion] = useState(0);
  const [composeSeed, setComposeSeed] = useState<CompositionSeed | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const requestSequence = useRef(0);

  const loadConversations = useCallback(async (folder: Folder, query: string, filters: SearchFilters) => {
    const requestId = ++requestSequence.current;
    setLoading(true);
    setLoadError("");
    try {
      let results: Conversation[];
      if (folder === "drafts") {
        const fetchedDrafts = await fetchDrafts(query, filters);
        setDraftCount(fetchedDrafts.total);
        setDrafts(fetchedDrafts.drafts);
        results = fetchedDrafts.drafts.map(draftAsConversation);
      } else {
        const [fetchedDrafts, fetchedConversations] = await Promise.all([
          fetchDrafts(),
          fetchConversations(folder, query, filters),
        ]);
        setDraftCount(fetchedDrafts.total);
        setDrafts(fetchedDrafts.drafts);
        results = fetchedConversations;
        if (folder === "conversations") setInboxCount(results.length);
      }
      if (requestId !== requestSequence.current) return;
      setConversations(results);
      setSelectedIds([]);
      setSelectedId((current) => current && results.some((item) => item._id === current) ? current : null);
    } catch {
      if (requestId === requestSequence.current) setLoadError("We couldn't load your conversations.");
    } finally {
      if (requestId === requestSequence.current) setLoading(false);
    }
  }, []);

  const refreshConversationList = useCallback(() => {
    void loadConversations(activeFolder, search, searchFilters);
  }, [activeFolder, loadConversations, search, searchFilters]);

  useEffect(() => {
    const timer = setTimeout(() => void loadConversations(activeFolder, search, searchFilters), 250);
    return () => clearTimeout(timer);
  }, [activeFolder, loadConversations, search, searchFilters]);

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
      await loadConversations(activeFolder, search, searchFilters);
    } catch {
      setLoadError("We couldn't update the selected messages.");
    }
  }

  async function selectConversation(id: string) {
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
    const selectedConversation = conversations.find((conversation) => conversation._id === id);
    if (selectedConversation?.unread && selectedConversation.messageIds?.length) {
      setConversations((current) => current.map((conversation) => conversation._id === id
        ? { ...conversation, unread: false }
        : conversation));
      try {
        await axios.patch("/api/messages/bulk", {
          messageIds: selectedConversation.messageIds,
          action: "read",
        }, { withCredentials: true });
        await loadConversations(activeFolder, search, searchFilters);
      } catch {
        setConversations((current) => current.map((conversation) => conversation._id === id
          ? { ...conversation, unread: true }
          : conversation));
      }
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
        draftCount={draftCount}
        mobileOpen={mobileFoldersOpen}
        onFolderSelect={(folder) => {
          setActiveFolder(folder);
          setSelectedId(null);
          setSelectedIds([]);
          setMobileFoldersOpen(false);
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
          searchFilters={searchFilters}
          onSearchFiltersChange={setSearchFilters}
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
            searchActive={Boolean(search.trim() || Object.values(searchFilters).some(Boolean))}
            selectedIds={selectedIds}
            onToggleSelected={(id) => setSelectedIds((current) => current.includes(id)
              ? current.filter((selectedId) => selectedId !== id)
              : [...current, id])}
            onBulkAction={(action) => void applyBulkAction(action)}
            onSelect={selectConversation}
            onRefresh={() => void loadConversations(activeFolder, search, searchFilters)}
            onRetry={() => void loadConversations(activeFolder, search, searchFilters)}
          />
          <ConversationDetail
            conversation={selectedConversation}
            currentUserPhone={user?.phone}
            activeFolder={activeFolder}
            onBack={() => setSelectedId(null)}
            onMessageMoved={() => {
              setSelectedId(null);
              void loadConversations(activeFolder, search, searchFilters);
            }}
            onMessageUpdated={refreshConversationList}
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
          void loadConversations(activeFolder, search, searchFilters);
        }}
        onDiscard={() => {
          setComposeOpen(false);
          void loadConversations(activeFolder, search, searchFilters);
        }}
        onSent={() => {
          setComposeOpen(false);
          setComposeSeed(null);
          void loadConversations(activeFolder, search, searchFilters);
        }}
      />
    </main>
  );
}

export default Home;