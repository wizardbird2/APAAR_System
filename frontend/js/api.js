const API = (window.API_BASE || '').replace(/\/$/, '');
let DATA_SOURCE = 'Offline synthetic seed';
const Session = { get() { try { return JSON.parse(sessionStorage.getItem('ss')); } catch (e) { return null; } }, set(v) { sessionStorage.setItem('ss', JSON.stringify(v)); }, clear() { sessionStorage.removeItem('ss'); } };
async function api(path, opt = {}) {
  const s = Session.get();
  const r = await fetch(API + path, { ...opt, headers: { 'Content-Type': 'application/json', ...(s && s.token !== 'offline' ? { Authorization: 'Bearer ' + s.token } : {}) } });
  if (!r.ok) throw new Error(r.status); return r.json();
}
async function loadStudents() { try { return await api('/api/students'); } catch (e) { return null; } }
function pushAudit(a, b, c) { const s = Session.get(); if (s && s.token !== 'offline') api('/api/audit', { method: 'POST', body: JSON.stringify({ actor: a, action: b, detail: c }) }).catch(() => {}); }
