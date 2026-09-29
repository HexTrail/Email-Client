// Provides display-formatting helpers for inbox data.
// Provides display-formatting helpers for inbox data.
export function formatAddress(address: string) {
  const phone = address.split("@")[0];
  return phone.length === 10 ? `+1 ${phone.slice(0, 3)} ${phone.slice(3, 6)} ${phone.slice(6)}` : `+${phone}`;
}

export function initials(label: string) {
  return label
    .split(/[\s@+_-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function formatTime(date: string) {
  if (!date) return "";
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return "";
  const today = new Date();
  if (value.toDateString() === today.toDateString()) {
    return value.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  return value.toLocaleDateString([], { month: "short", day: "numeric" });
}