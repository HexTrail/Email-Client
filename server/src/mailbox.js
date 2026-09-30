// Builds local mailbox addresses from phone numbers and the configured domain.
// Builds local mailbox addresses from phone numbers and the configured domain.
const DEFAULT_DOMAIN = 'phonemail.test';

export function getMailboxLocalPart(phone) {
  return String(phone).replace(/^\+91(?=\d{10}$)/, '');
}

export function getMailboxAddress(phone, domain = process.env.DOMAIN || DEFAULT_DOMAIN) {
  return `${getMailboxLocalPart(phone)}@${domain.trim().toLowerCase()}`;
}