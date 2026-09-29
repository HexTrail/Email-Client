// Builds local mailbox addresses from phone numbers and the configured domain.
// Builds local mailbox addresses from phone numbers and the configured domain.
const DEFAULT_DOMAIN = 'phonemail.test';

export function getMailboxAddress(phone, domain = process.env.DOMAIN || DEFAULT_DOMAIN) {
  return `${phone}@${domain.trim().toLowerCase()}`;
}