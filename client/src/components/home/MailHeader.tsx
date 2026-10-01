// Renders the inbox header with search and account controls.
// Renders the inbox header with search and account controls.
import { useEffect, useRef, useState } from "react";
import { FiMenu, FiMoreHorizontal, FiSearch, FiSliders, FiX } from "react-icons/fi";
import PhonemailLogo from "../PhonemailLogo.tsx";
import type { SearchFilters } from "./homeTypes.ts";
import { initials } from "./homeUtils.ts";

type MailHeaderProps = {
  username?: string;
  phone?: string;
  loading: boolean;
  loadError: string;
  search: string;
  onSearchChange: (value: string) => void;
  searchFilters: SearchFilters;
  onSearchFiltersChange: (filters: SearchFilters) => void;
  onSignOut: () => void;
  mobileFoldersOpen: boolean;
  onToggleMobileFolders: () => void;
};

export default function MailHeader({
  username,
  phone,
  loading,
  loadError,
  search,
  onSearchChange,
  searchFilters,
  onSearchFiltersChange,
  onSignOut,
  mobileFoldersOpen,
  onToggleMobileFolders,
}: MailHeaderProps) {
  const [profileOpen, setProfileOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const searchAreaRef = useRef<HTMLDivElement>(null);
  const profileWrapRef = useRef<HTMLDivElement>(null);
  const displayName = username || "Your account";
  const activeFilterCount = Number(Boolean(searchFilters.from || searchFilters.to || searchFilters.after || searchFilters.before))
    + Number(searchFilters.unread) + Number(searchFilters.hasAttachment);

  function updateFilter<K extends keyof SearchFilters>(key: K, value: SearchFilters[K]) {
    onSearchFiltersChange({ ...searchFilters, [key]: value });
  }

  useEffect(() => {
    function closeOutsidePanels(event: Event) {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (!searchAreaRef.current?.contains(target)) setFiltersOpen(false);
      if (!profileWrapRef.current?.contains(target)) setProfileOpen(false);
    }

    document.addEventListener("pointerdown", closeOutsidePanels);
    document.addEventListener("focusin", closeOutsidePanels);
    return () => {
      document.removeEventListener("pointerdown", closeOutsidePanels);
      document.removeEventListener("focusin", closeOutsidePanels);
    };
  }, []);

  return (
    <header className="topbar">
      <div className="mobile-header-brand">
        <PhonemailLogo className="mobile-brand" />
        <button
          className="mobile-folder-toggle"
          onClick={onToggleMobileFolders}
          aria-label={mobileFoldersOpen ? "Close folders" : "Open folders"}
          title={mobileFoldersOpen ? "Close folders" : "Open folders"}
        >
          {mobileFoldersOpen ? <FiX /> : <FiMenu />}
        </button>
      </div>
      <div className="search-area" ref={searchAreaRef}>
        <div className="search-box">
          <FiSearch aria-hidden="true" />
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search all messages"
            aria-label="Search all messages"
          />
          <kbd>/</kbd>
          <button className={`search-filter-toggle${activeFilterCount ? " has-filters" : ""}`} type="button" title="Search filters" aria-label="Search filters" aria-expanded={filtersOpen} onClick={() => setFiltersOpen(!filtersOpen)}>
            <FiSliders />
            {activeFilterCount > 0 && <span>{activeFilterCount}</span>}
          </button>
        </div>
        {filtersOpen && (
          <section className="search-filter-panel" aria-label="Search filters">
            <label><span>From</span><input value={searchFilters.from} onChange={(event) => updateFilter("from", event.target.value)} placeholder="Sender address" /></label>
            <label><span>To</span><input value={searchFilters.to} onChange={(event) => updateFilter("to", event.target.value)} placeholder="Recipient address" /></label>
            <div className="search-date-fields">
              <label><span>After</span><input type="date" value={searchFilters.after} onChange={(event) => updateFilter("after", event.target.value)} /></label>
              <label><span>Before</span><input type="date" value={searchFilters.before} onChange={(event) => updateFilter("before", event.target.value)} /></label>
            </div>
            <label className="search-filter-check"><input type="checkbox" checked={searchFilters.unread} onChange={(event) => updateFilter("unread", event.target.checked)} /><span>Unread only</span></label>
            <label className="search-filter-check"><input type="checkbox" checked={searchFilters.hasAttachment} onChange={(event) => updateFilter("hasAttachment", event.target.checked)} /><span>Has attachment</span></label>
            <div className="search-filter-actions">
              <button type="button" onClick={() => onSearchFiltersChange({ from: "", to: "", after: "", before: "", unread: false, hasAttachment: false })}>Clear filters</button>
              <button type="button" onClick={() => setFiltersOpen(false)}>Done</button>
            </div>
          </section>
        )}
      </div>
      <div className="topbar-actions">
        <span className={`connection-status${loadError ? " has-error" : ""}`}>
          <i /> {loading ? "Connecting" : loadError ? "Connection issue" : "Connected"}
        </span>
        <div className="profile-wrap" ref={profileWrapRef}>
          <button
            className="profile-button"
            onClick={() => setProfileOpen(!profileOpen)}
            aria-label="Open profile menu"
            aria-expanded={profileOpen}
          >
            <span className="profile-avatar">{initials(displayName)}</span>
            <span className="profile-name">{displayName}</span>
            <FiMoreHorizontal aria-hidden="true" />
          </button>
          {profileOpen && (
            <div className="profile-menu">
              <div className="profile-menu-user">
                <strong>{displayName}</strong>
                <span>{phone ? `${phone}@phonemail.test` : "Signed in"}</span>
              </div>
              <button onClick={onSignOut}>Sign out</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}