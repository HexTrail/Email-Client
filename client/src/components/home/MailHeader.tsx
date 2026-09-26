import { useState } from "react";
import { FiMoreHorizontal, FiSearch } from "react-icons/fi";
import PhonemailLogo from "../PhonemailLogo.tsx";
import { initials } from "./homeUtils.ts";

type MailHeaderProps = {
  username?: string;
  phone?: string;
  loading: boolean;
  loadError: string;
  search: string;
  onSearchChange: (value: string) => void;
  onSignOut: () => void;
};

export default function MailHeader({
  username,
  phone,
  loading,
  loadError,
  search,
  onSearchChange,
  onSignOut,
}: MailHeaderProps) {
  const [profileOpen, setProfileOpen] = useState(false);
  const displayName = username || "Your account";

  return (
    <header className="topbar">
      <PhonemailLogo className="mobile-brand" />
      <div className="search-box">
        <FiSearch aria-hidden="true" />
        <input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search conversations"
          aria-label="Search conversations"
        />
        <kbd>/</kbd>
      </div>
      <div className="topbar-actions">
        <span className={`connection-status${loadError ? " has-error" : ""}`}>
          <i /> {loading ? "Connecting" : loadError ? "Connection issue" : "Connected"}
        </span>
        <div className="profile-wrap">
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