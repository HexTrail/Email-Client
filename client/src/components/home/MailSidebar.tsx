import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import PhonemailLogo from "../PhonemailLogo.tsx";
import { folders, type Folder } from "./homeTypes.ts";

type MailSidebarProps = {
  activeFolder: Folder;
  collapsed: boolean;
  conversationCount: number;
  mobileOpen: boolean;
  onFolderSelect: (folder: Folder) => void;
  onToggleCollapse: () => void;
  onToggleMobile: () => void;
};

export default function MailSidebar({
  activeFolder,
  collapsed,
  conversationCount,
  mobileOpen,
  onFolderSelect,
  onToggleCollapse,
  onToggleMobile,
}: MailSidebarProps) {
  return (
    <>
      <aside className={`mail-sidebar${collapsed ? " is-collapsed" : ""}${mobileOpen ? " is-mobile-open" : ""}`}>
        <div className="sidebar-brand">
          <PhonemailLogo showName={!collapsed} />
          <button
            className="icon-button sidebar-collapse"
            onClick={onToggleCollapse}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <FiChevronRight /> : <FiChevronLeft />}
          </button>
        </div>

        <button className={`compose-button${collapsed ? " compose-icon-only" : ""}`} title="New message">
          <span className="compose-plus">+</span>
          {!collapsed && <span>New message</span>}
        </button>

        <nav className="folder-nav" aria-label="Conversation views">
          {!collapsed && <p className="nav-caption">YOUR SPACE</p>}
          {folders.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`folder-link${activeFolder === id ? " is-active" : ""}`}
              onClick={() => onFolderSelect(id)}
              title={collapsed ? label : undefined}
              aria-current={activeFolder === id ? "page" : undefined}
            >
              <Icon aria-hidden="true" />
              {!collapsed && <span>{label}</span>}
              {!collapsed && id === "conversations" && conversationCount > 0 && (
                <span className="folder-count">{conversationCount}</span>
              )}
            </button>
          ))}
        </nav>

        {!collapsed && (
          <div className="sidebar-bottom">
            <div className="storage-note">
              <span className="storage-dot" />
              <div><strong>You're all caught up</strong><small>Your conversations are in good shape.</small></div>
            </div>
            <span className="sidebar-version">PHONEMAIL · PERSONAL</span>
          </div>
        )}
      </aside>

      {mobileOpen && (
        <button className="mobile-nav-backdrop" onClick={onToggleMobile} aria-label="Close folders" />
      )}
      <button className="mobile-compose-button" title="New message" aria-label="New message">
        <span className="compose-plus">+</span>
      </button>
    </>
  );
}