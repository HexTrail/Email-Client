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
import type { Conversation, Folder } from "../components/home/homeTypes.ts";
import "./Home.css";

async function fetchConversations(): Promise<Conversation[]> {
  const response = await axios.get("/api/conversations", { withCredentials: true });
  return Array.isArray(response.data.conversations) ? response.data.conversations : [];
}

function Home() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeFolder, setActiveFolder] = useState<Folder>("conversations");
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileFoldersOpen, setMobileFoldersOpen] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  async function loadConversations() {
    setLoading(true);
    setLoadError("");
    try {
      const results = await fetchConversations();
      setConversations(results);
      setSelectedId((current) => current && results.some((item) => item._id === current) ? current : null);
    } catch {
      setLoadError("We couldn't load your conversations.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    fetchConversations()
      .then((results) => {
        if (active) setConversations(results);
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

  return (
    <main className="mail-app">
      <MailSidebar
        activeFolder={activeFolder}
        collapsed={collapsed}
        conversationCount={conversations.length}
        mobileOpen={mobileFoldersOpen}
        onFolderSelect={(folder) => {
          setActiveFolder(folder);
          setMobileFoldersOpen(false);
        }}
        onToggleCollapse={() => setCollapsed(!collapsed)}
        onToggleMobile={() => setMobileFoldersOpen(!mobileFoldersOpen)}
        onCompose={() => setComposeOpen(true)}
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
            onSelect={setSelectedId}
            onRefresh={() => void loadConversations()}
            onRetry={() => void loadConversations()}
          />
          <ConversationDetail
            conversation={activeFolder === "conversations" ? selectedConversation : undefined}
            currentUserPhone={user?.phone}
            onBack={() => setSelectedId(null)}
          />
        </div>
      </section>
      <ComposeModal
        open={composeOpen}
        onClose={() => setComposeOpen(false)}
        onSent={() => {
          setComposeOpen(false);
          void loadConversations();
        }}
      />
    </main>
  );
}

export default Home;