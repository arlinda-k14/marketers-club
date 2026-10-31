// Shared display helpers for marketer listings (directory cards and profile pages).
// Listing text can be written by members, so always escape it before putting it in HTML.
export const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const RATE_UNITS = { hourly: 'hour', monthly: 'month', project: 'project', hr: 'hour' };

export function rateLabel(p) {
  if (p.rateMin == null || p.rateMax == null || (!p.rateMin && !p.rateMax)) return 'Rate on request';
  return `$${p.rateMin}–$${p.rateMax} / ${RATE_UNITS[p.rateType] || 'hour'}`;
}

export function yearsLabel(p) {
  return p.yearsExperience == null || p.yearsExperience === '' ? '' : `${p.yearsExperience} yrs`;
}

// Only http(s) links are rendered as links.
export function safeUrl(u) {
  try {
    const url = new URL(u);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : '';
  } catch (e) {
    return '';
  }
}
