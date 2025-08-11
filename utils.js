// utils.js — Utility functions
export function stripHtml(s) { 
  return (s ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(); 
}

export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}