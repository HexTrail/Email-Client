const DEFAULT_DOMAIN = 'phonemail.test';

export function getMailboxAddress(phone, domain = process.env.DOMAIN || DEFAULT_DOMAIN) {
  return `${phone}@${domain.trim().toLowerCase()}`;
}