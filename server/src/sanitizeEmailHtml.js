import sanitizeHtml from 'sanitize-html';

const emailHtmlOptions = {
  allowedTags: [
    'a', 'b', 'blockquote', 'br', 'em', 'h1', 'h2', 'h3', 'i', 'li',
    'ol', 'p', 'strong', 'u', 'ul',
  ],
  allowedAttributes: { a: ['href', 'target', 'rel'] },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
};

export default function sanitizeEmailHtml(html = '') {
  return sanitizeHtml(html, emailHtmlOptions);
}

export function emailHtmlToText(html = '') {
  return sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} });
}