import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

const API = '/api';

function api(path, opts = {}) {
  const token = localStorage.getItem('bhd_token');
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return fetch(`${API}${path}`, { ...opts, headers }).then(async r => {
    if (r.status === 401) { localStorage.removeItem('bhd_token'); window.location.reload(); }
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || 'Request failed');
    return data;
  });
}

/* ========== STYLES — Dark WhatsApp Theme ========== */
const CSS = `
* { margin:0; padding:0; box-sizing:border-box; -webkit-tap-highlight-color:transparent; }
html, body { height:100%; overflow:hidden; }
body { font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,Ubuntu,sans-serif; background:#0b141a; color:#e9edef; }
#root { height:100%; height:100dvh; display:flex; flex-direction:column; }
:root {
  --bg-deep:#0b141a; --bg-panel:#111b21; --bg-sidebar:#111b21; --bg-header:#1f2c34;
  --bg-chat:#0b141a; --bg-input:#1f2c34; --bg-search:#202c33; --bg-hover:#202c33;
  --bubble-out:#005c4b; --bubble-in:#1f2c34; --bubble-out-darker:#025144;
  --primary:#00a884; --primary-dark:#008f72; --amber:#ffd600; --blue-tick:#53bdeb;
  --text:#e9edef; --text-secondary:#8696a0; --text-muted:#667781;
  --border:#2a3942; --green:#25D366; --red:#ea4335;
  --safe-bottom:env(safe-area-inset-bottom, 0px);
}

/* ===== Login ===== */
.login-page { display:flex; align-items:center; justify-content:center; height:100vh; height:100dvh; background:var(--bg-deep); }
.login-box { background:var(--bg-panel); padding:40px; border-radius:12px; width:340px; text-align:center; box-shadow:0 2px 14px rgba(0,0,0,0.4); }
.login-box h1 { color:var(--primary); font-size:26px; margin-bottom:6px; }
.login-box p { color:var(--text-secondary); font-size:13px; margin-bottom:24px; }
.login-box input { width:100%; padding:12px 16px; background:var(--bg-search); border:1px solid var(--border); border-radius:8px; color:var(--text); font-size:15px; outline:none; }
.login-box input:focus { border-color:var(--primary); }
.login-box button { width:100%; padding:12px; background:var(--primary); color:#111; font-weight:600; border:none; border-radius:8px; font-size:15px; cursor:pointer; margin-top:12px; }
.login-box button:hover { background:var(--primary-dark); }
.login-box .error { color:var(--red); font-size:13px; margin-top:8px; }

/* ===== App Layout ===== */
.app { display:flex; height:100vh; height:100dvh; width:100vw; overflow:hidden; }
.sidebar { width:380px; min-width:380px; background:var(--bg-sidebar); border-right:1px solid var(--border); display:flex; flex-direction:column; }
.sidebar-header { padding:10px 16px; background:var(--bg-header); display:flex; align-items:center; justify-content:space-between; min-height:56px; }
.sidebar-header h2 { font-size:18px; color:var(--text); font-weight:600; display:flex; align-items:center; gap:8px; }
.sidebar-header button { background:rgba(255,255,255,0.08); border:none; color:var(--text-secondary); padding:6px 14px; border-radius:6px; cursor:pointer; font-size:13px; }
.sidebar-header button:hover { background:rgba(255,255,255,0.15); color:var(--text); }

/* Line tabs */
.line-tabs { display:flex; background:var(--bg-header); border-bottom:1px solid var(--border); }
.line-tab { flex:1; padding:12px 8px; text-align:center; cursor:pointer; font-size:13px; font-weight:500; color:var(--text-secondary); border-bottom:3px solid transparent; transition:all 0.2s; }
.line-tab.active { color:var(--primary); border-bottom-color:var(--primary); }
.line-tab:hover:not(.active) { color:var(--text); }

/* Search */
.search-bar { padding:8px 12px; background:var(--bg-sidebar); }
.search-bar input { width:100%; padding:7px 12px 7px 32px; background:var(--bg-search); border:none; border-radius:8px; color:var(--text); font-size:14px; outline:none; background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='%238696a0' viewBox='0 0 16 16'%3E%3Cpath d='M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85zm-5.598.856a5.5 5.5 0 1 1 0-11 5.5 5.5 0 0 1 0 11z'/%3E%3C/svg%3E"); background-repeat:no-repeat; background-position:10px center; }
.search-bar input::placeholder { color:var(--text-muted); }

/* New chat */
.new-chat-btn { margin:4px 12px 6px; padding:10px; background:var(--primary); color:#111; border:none; border-radius:8px; cursor:pointer; font-size:14px; font-weight:600; }
.new-chat-btn:hover { background:var(--primary-dark); }

/* Chat list */
.chat-list { flex:1; overflow-y:auto; overflow-x:hidden; }
.chat-list::-webkit-scrollbar { width:6px; }
.chat-list::-webkit-scrollbar-thumb { background:var(--border); border-radius:3px; }
.chat-item { display:flex; align-items:center; padding:10px 16px; cursor:pointer; border-bottom:1px solid rgba(134,150,160,0.08); transition:background 0.15s; }
.chat-item:hover { background:var(--bg-hover); }
.chat-item.active { background:var(--bg-hover); }
.chat-avatar { width:48px; height:48px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:18px; font-weight:600; margin-right:12px; flex-shrink:0; overflow:hidden; }
.chat-avatar.initials { background:#00a884; color:#111; }
.chat-avatar.group { background:#25D366; color:#fff; }
.chat-avatar img { width:100%; height:100%; object-fit:cover; }
.chat-info { flex:1; min-width:0; }
.chat-name { font-size:15px; font-weight:400; color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.chat-preview { font-size:13px; color:var(--text-secondary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-top:2px; display:flex; align-items:center; gap:4px; }
.chat-preview .tick { color:var(--blue-tick); font-size:14px; flex-shrink:0; }
.chat-meta { text-align:right; flex-shrink:0; margin-left:8px; }
.chat-time { font-size:11px; color:var(--text-muted); }
.chat-time.unread { color:var(--primary); }
.unread-badge { background:var(--primary); color:#111; font-size:11px; font-weight:700; padding:1px 7px; border-radius:12px; margin-top:4px; display:inline-block; min-width:20px; text-align:center; }

/* ===== Chat Area ===== */
.chat-area { flex:1; display:flex; flex-direction:column; background:var(--bg-chat); position:relative; }
.chat-area-empty { flex:1; display:flex; align-items:center; justify-content:center; flex-direction:column; gap:16px; background:var(--bg-panel); border-bottom:6px solid var(--primary); }
.chat-area-empty svg { width:360px; opacity:0.1; }
.chat-area-empty p { color:var(--text-secondary); font-size:15px; }

/* Chat header */
.chat-header { padding:10px 16px; background:var(--bg-header); border-bottom:1px solid var(--border); display:flex; align-items:center; gap:12px; min-height:56px; z-index:2; }
.chat-header .back-btn { display:none; background:none; border:none; font-size:24px; cursor:pointer; color:var(--text-secondary); padding:4px; }
.chat-header-avatar { width:40px; height:40px; border-radius:50%; overflow:hidden; flex-shrink:0; display:flex; align-items:center; justify-content:center; }
.chat-header-avatar.initials { background:var(--primary); color:#111; font-size:16px; font-weight:600; }
.chat-header-avatar img { width:100%; height:100%; object-fit:cover; }
.chat-header-info { flex:1; min-width:0; }
.chat-header-name { font-size:16px; font-weight:500; color:var(--text); cursor:pointer; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.chat-header-name:hover { text-decoration:underline; }
.chat-header-sub { font-size:12px; color:var(--text-secondary); }

/* WA doodle background */
.chat-bg {
  position:absolute; inset:0; opacity:0.04; pointer-events:none; z-index:0;
  background-image:url("data:image/svg+xml,%3Csvg width='200' height='200' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cpattern id='p' width='40' height='40' patternUnits='userSpaceOnUse'%3E%3Ctext x='5' y='15' font-size='10' fill='%23fff'%3E💬%3C/text%3E%3Ctext x='22' y='32' font-size='8' fill='%23fff'%3E📱%3C/text%3E%3C/pattern%3E%3C/defs%3E%3Crect width='200' height='200' fill='url(%23p)'/%3E%3C/svg%3E");
}

/* Messages */
.messages-container { flex:1; overflow-y:auto; position:relative; z-index:1; }
.messages-container::-webkit-scrollbar { width:6px; }
.messages-container::-webkit-scrollbar-thumb { background:var(--border); border-radius:3px; }
.messages { padding:8px 60px 8px; display:flex; flex-direction:column; min-height:100%; justify-content:flex-end; }
.msg-wrapper { display:flex; flex-direction:column; margin-bottom:2px; }
.msg-wrapper.out { align-items:flex-end; }
.msg-wrapper.in { align-items:flex-start; }
.msg { max-width:65%; padding:6px 8px 2px; border-radius:8px; position:relative; word-wrap:break-word; font-size:14.2px; line-height:1.35; box-shadow:0 1px 0.5px rgba(0,0,0,0.13); }
.msg.out { background:var(--bubble-out); border-top-right-radius:0; }
.msg.in { background:var(--bubble-in); border-top-left-radius:0; }
.msg.tail.out { border-top-right-radius:8px; position:relative; }
.msg.tail.out::after { content:''; position:absolute; top:0; right:-8px; width:8px; height:13px; background:var(--bubble-out); clip-path:polygon(0 0, 0 100%, 100% 0); }
.msg.tail.in { border-top-left-radius:8px; position:relative; }
.msg.tail.in::before { content:''; position:absolute; top:0; left:-8px; width:8px; height:13px; background:var(--bubble-in); clip-path:polygon(100% 0, 100% 100%, 0 0); }
.msg .sender-name { font-size:12.5px; color:var(--primary); font-weight:500; margin-bottom:2px; }
.msg .msg-text { white-space:pre-wrap; color:var(--text); }
.msg .msg-text a { color:#53bdeb; text-decoration:none; }
.msg .msg-text a:hover { text-decoration:underline; }
.msg-footer { display:flex; align-items:center; justify-content:flex-end; gap:4px; margin-top:1px; padding-left:8px; float:right; margin-left:12px; }
.msg-footer .msg-time { font-size:11px; color:rgba(255,255,255,0.55); }
.msg.in .msg-footer .msg-time { color:var(--text-muted); }
.msg-footer .ticks { font-size:14px; margin-left:2px; color:var(--blue-tick); }
.msg-footer .ticks.sent { color:rgba(255,255,255,0.4); }
.msg .msg-delete { display:none; position:absolute; top:4px; right:4px; background:rgba(0,0,0,0.3); border:none; border-radius:50%; width:22px; height:22px; cursor:pointer; font-size:12px; line-height:22px; text-align:center; color:var(--text); z-index:2; }
.msg:hover .msg-delete { display:block; }
.msg.optimistic { opacity:0.6; }

/* Media in messages */
.msg-media { margin:-2px -4px 4px; border-radius:6px; overflow:hidden; max-width:330px; }
.msg-media img { width:100%; display:block; cursor:pointer; }
.msg-media video { width:100%; display:block; max-height:300px; }
.msg-media audio { width:100%; min-width:240px; }
.msg-doc { display:flex; align-items:center; gap:10px; background:rgba(0,0,0,0.15); padding:10px 12px; border-radius:8px; margin:-2px -4px 4px; cursor:pointer; min-width:240px; }
.msg-doc .doc-icon { width:36px; height:42px; background:#ea4335; border-radius:4px; display:flex; align-items:center; justify-content:center; color:#fff; font-size:11px; font-weight:700; flex-shrink:0; }
.msg-doc .doc-info { flex:1; min-width:0; }
.msg-doc .doc-name { font-size:13px; color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.msg-doc .doc-meta { font-size:11px; color:var(--text-muted); margin-top:2px; }
.msg-sticker { max-width:180px; }
.msg-sticker img { width:100%; }

/* Date divider */
.date-divider { text-align:center; margin:12px 0 8px; }
.date-divider span { background:var(--bg-header); padding:5px 12px; border-radius:8px; font-size:12.5px; color:var(--text-secondary); box-shadow:0 1px 0.5px rgba(0,0,0,0.13); }

/* Send bar */
.send-bar { display:flex; align-items:flex-end; padding:6px 10px; padding-bottom:calc(6px + var(--safe-bottom)); background:var(--bg-header); gap:8px; z-index:2; }
.send-bar input { flex:1; padding:9px 12px; background:var(--bg-search); border:1px solid var(--border); border-radius:8px; color:var(--text); font-size:15px; outline:none; min-height:42px; }
.send-bar input::placeholder { color:var(--text-muted); }
.send-bar input:focus { border-color:var(--primary); }
.send-bar button { width:42px; height:42px; border-radius:50%; background:var(--primary); color:#111; border:none; cursor:pointer; font-size:20px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.send-bar button:hover { background:var(--primary-dark); }

/* Modals */
.modal-overlay { position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); display:flex; align-items:center; justify-content:center; z-index:100; }
.modal { background:var(--bg-panel); padding:24px; border-radius:12px; width:340px; box-shadow:0 4px 30px rgba(0,0,0,0.4); }
.modal h3 { margin-bottom:16px; color:var(--text); font-size:18px; }
.modal input { width:100%; padding:10px 12px; background:var(--bg-search); border:1px solid var(--border); border-radius:8px; color:var(--text); font-size:14px; outline:none; margin-bottom:10px; }
.modal input:focus { border-color:var(--primary); }
.modal input::placeholder { color:var(--text-muted); }
.modal-actions { display:flex; gap:8px; justify-content:flex-end; margin-top:16px; }
.modal-actions button { padding:8px 20px; border-radius:6px; border:none; cursor:pointer; font-size:14px; font-weight:500; }
.modal-actions .cancel { background:var(--bg-search); color:var(--text-secondary); }
.modal-actions .cancel:hover { color:var(--text); }
.modal-actions .confirm { background:var(--primary); color:#111; }

/* Image lightbox */
.lightbox { position:fixed; inset:0; background:rgba(0,0,0,0.9); z-index:200; display:flex; align-items:center; justify-content:center; cursor:zoom-out; }
.lightbox img { max-width:90vw; max-height:90vh; object-fit:contain; }
.lightbox-close { position:fixed; top:16px; right:16px; background:none; border:none; color:#fff; font-size:32px; cursor:pointer; z-index:201; }

/* Context menu */
.context-menu { position:fixed; background:var(--bg-panel); border:1px solid var(--border); border-radius:8px; box-shadow:0 4px 20px rgba(0,0,0,0.4); z-index:150; min-width:160px; overflow:hidden; }
.context-menu-item { padding:10px 16px; cursor:pointer; font-size:14px; color:var(--text); display:flex; align-items:center; gap:10px; }
.context-menu-item:hover { background:var(--bg-hover); }
.context-menu-item.danger { color:var(--red); }

/* Connection indicator */
.ws-status { position:absolute; top:58px; left:0; right:0; z-index:3; text-align:center; padding:4px; font-size:12px; transition:opacity 0.3s; }
.ws-status.connected { background:#005c4b; color:var(--primary); opacity:0; pointer-events:none; }
.ws-status.connecting { background:#3b2e00; color:var(--amber); opacity:1; }
.ws-status.disconnected { background:#3b1c1c; color:var(--red); opacity:1; }

/* Responsive mobile */
@media (max-width:768px) {
  .sidebar { width:100%; min-width:100%; position:absolute; z-index:10; height:100vh; height:100dvh; }
  .sidebar.hidden { display:none; }
  .chat-area { position:absolute; width:100%; height:100vh; height:100dvh; z-index:5; }
  .chat-area.hidden { display:none; }
  .chat-header .back-btn { display:flex; align-items:center; }
  .messages { padding:8px 12px 8px; }
  .msg { max-width:85%; }
  .msg-media { max-width:260px; }
}

/* Typing indicator */
@keyframes typing { 0%,60%,100% { opacity:.3; } 30% { opacity:1; } }
.typing-dots span { display:inline-block; width:6px; height:6px; border-radius:50%; background:var(--text-muted); margin:0 1px; }
.typing-dots span:nth-child(1) { animation:typing 1.4s infinite; }
.typing-dots span:nth-child(2) { animation:typing 1.4s infinite 0.2s; }
.typing-dots span:nth-child(3) { animation:typing 1.4s infinite 0.4s; }

/* Scrollbar for sidebar */
.chat-list::-webkit-scrollbar { width:6px; }
.chat-list::-webkit-scrollbar-track { background:transparent; }
.chat-list::-webkit-scrollbar-thumb { background:var(--border); border-radius:3px; }
`;

/* ========== LOGIN ========== */
function LoginPage({ onLogin }) {
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true); setErr('');
    try {
      const data = await api('/login', { method:'POST', body:JSON.stringify({ password:pw }) });
      localStorage.setItem('bhd_token', data.token);
      onLogin();
    } catch { setErr('Wrong password'); }
    setLoading(false);
  };

  return (
    <div className="login-page">
      <form className="login-box" onSubmit={submit}>
        <h1>💬 BHD Chat</h1>
        <p>WhatsApp Dashboard</p>
        <input type="password" placeholder="Enter password" value={pw} onChange={e=>setPw(e.target.value)} autoFocus />
        <button type="submit" disabled={loading}>{loading ? 'Logging in...' : 'Login'}</button>
        {err && <div className="error">{err}</div>}
      </form>
    </div>
  );
}

/* ========== HELPERS ========== */
function formatTime(ts) {
  if (!ts) return '';
  const d = new Date(typeof ts === 'number' ? (ts < 1e12 ? ts * 1000 : ts) : ts);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();
  const time = d.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit', hour12:true });
  if (isToday) return time;
  if (isYesterday) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month:'short', day:'numeric' });
}

function formatMsgTime(ts) {
  if (!ts) return '';
  const d = new Date(typeof ts === 'number' ? (ts < 1e12 ? ts * 1000 : ts) : ts);
  return d.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit', hour12:true });
}

function formatDate(ts) {
  if (!ts) return '';
  const d = new Date(typeof ts === 'number' ? (ts < 1e12 ? ts * 1000 : ts) : ts);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return 'Today';
  const y = new Date(now); y.setDate(y.getDate()-1);
  if (d.toDateString() === y.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric', year:'numeric' });
}

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').filter(Boolean).map(w=>w[0]).join('').toUpperCase().slice(0,2);
}

function isGroupChat(chatId) {
  if (!chatId) return false;
  const parts = chatId.split('_');
  const contactPart = parts.slice(1).join('_');
  return /^\d{15,}$/.test(contactPart);
}

// Linkify URLs in text
function linkify(text) {
  if (!text) return null;
  const urlRegex = /(https?:\/\/[^\s<]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, i) => {
    if (urlRegex.test(part)) {
      return <a key={i} href={part} target="_blank" rel="noopener noreferrer">{part}</a>;
    }
    return part;
  });
}

// Bold *text* formatting (WhatsApp-style)
function formatWhatsApp(text) {
  if (!text) return null;
  // Handle bold *text*
  const parts = text.split(/(\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return <strong key={i}>{part.slice(1,-1)}</strong>;
    }
    return linkify(part);
  });
}

// Extract display info from msgContext
function parseMsgContext(msg) {
  const ctx = msg.msgContext;
  if (!ctx) return { type:'text', text:'', mediaUrl:null, caption:null, filename:null };
  if (typeof ctx === 'string') return { type:'text', text:ctx, mediaUrl:null, caption:null, filename:null };

  // Dardasha nested format: {"type":"text","text":{"body":"hello"}}
  if (ctx.type === 'text' && ctx.text && typeof ctx.text === 'object') {
    return { type:'text', text:ctx.text.body || '', mediaUrl:null, caption:null, filename:null };
  }
  if (ctx.type === 'image' && ctx.image) {
    const url = ctx.image.url || ctx.image.link || null;
    return { type:'image', text:ctx.image.caption || '', mediaUrl:url, caption:ctx.image.caption, filename:null };
  }
  if (ctx.type === 'video' && ctx.video) {
    const url = ctx.video.url || ctx.video.link || null;
    return { type:'video', text:ctx.video.caption || '', mediaUrl:url, caption:ctx.video.caption, filename:null };
  }
  if (ctx.type === 'document' && ctx.document) {
    const url = ctx.document.url || ctx.document.link || null;
    const fname = ctx.document.filename || ctx.document.caption || 'Document';
    return { type:'document', text:ctx.document.caption || fname, mediaUrl:url, caption:ctx.document.caption, filename:fname };
  }
  if (ctx.type === 'audio' || ctx.type === 'ptt') {
    const audio = ctx.audio || ctx.ptt || ctx;
    const url = audio.url || audio.link || null;
    return { type:'audio', text:'🎵 Voice message', mediaUrl:url, caption:null, filename:null };
  }
  if (ctx.type === 'sticker' && ctx.sticker) {
    const url = ctx.sticker.url || ctx.sticker.link || null;
    return { type:'sticker', text:'', mediaUrl:url, caption:null, filename:null };
  }
  if (ctx.type === 'location' || ctx.type === 'liveLocation') {
    const loc = ctx.location || ctx.liveLocation || ctx;
    return { type:'location', text:`📍 ${loc.name || 'Location'} (${loc.degreesLatitude || ''}, ${loc.degreesLongitude || ''})`, mediaUrl:null, caption:null, filename:null };
  }
  if (ctx.type === 'contacts_array' || ctx.type === 'contact') {
    return { type:'contact', text:'👤 Contact card', mediaUrl:null, caption:null, filename:null };
  }

  // Flat format: {"text":"hello"} or {"body":"hello"}
  const text = (typeof ctx.text === 'string' ? ctx.text : '') ||
               (typeof ctx.body === 'string' ? ctx.body : '') ||
               (typeof ctx.caption === 'string' ? ctx.caption : '') ||
               (typeof ctx.message === 'string' ? ctx.message : '');

  if (ctx.mediaUrl || ctx.url || ctx.link) {
    const url = ctx.mediaUrl || ctx.url || ctx.link;
    if (ctx.mimetype && ctx.mimetype.startsWith('image')) return { type:'image', text, mediaUrl:url, caption:text, filename:null };
    if (ctx.mimetype && ctx.mimetype.startsWith('video')) return { type:'video', text, mediaUrl:url, caption:text, filename:null };
    if (ctx.mimetype && ctx.mimetype.startsWith('audio')) return { type:'audio', text, mediaUrl:url, caption:null, filename:null };
    return { type:'document', text:text||'Document', mediaUrl:url, caption:text, filename:ctx.filename || 'Document' };
  }

  return { type:'text', text: text || JSON.stringify(ctx).slice(0,100), mediaUrl:null, caption:null, filename:null };
}

function getPreviewText(lastMsg) {
  if (!lastMsg) return '';

  // Handle msgContext wrapper from Dardasha: {"type":"text","msgContext":{"type":"text","text":{"body":"..."}}}
  const ctx = lastMsg.msgContext || lastMsg;

  // Nested text: {"type":"text","text":{"body":"hello"}}
  if (ctx.type === 'text' && ctx.text && typeof ctx.text === 'object') {
    const body = ctx.text.body || '';
    return body.length > 60 ? body.slice(0,60)+'...' : body;
  }
  // Type-based media previews
  const mediaType = ctx.type || lastMsg.type;
  if (mediaType === 'image') return '📷 Photo';
  if (mediaType === 'video') return '🎥 Video';
  if (mediaType === 'document') return '📄 Document';
  if (mediaType === 'audio' || mediaType === 'ptt') return '🎵 Voice message';
  if (mediaType === 'sticker') return '🏷️ Sticker';
  if (mediaType === 'location' || mediaType === 'liveLocation') return '📍 Location';
  if (mediaType === 'contacts_array' || mediaType === 'contact') return '👤 Contact';

  // Flat format
  let text = '';
  if (typeof ctx.text === 'string') text = ctx.text;
  else if (typeof ctx.body === 'string') text = ctx.body;
  else if (typeof lastMsg.text === 'string') text = lastMsg.text;
  else if (typeof lastMsg.body === 'string') text = lastMsg.body;
  else if (typeof lastMsg.caption === 'string') text = lastMsg.caption;
  if (text && text.length > 60) return text.slice(0,60)+'...';
  return text || '';
}

function getDocExtension(filename) {
  if (!filename) return 'FILE';
  const ext = filename.split('.').pop().toUpperCase();
  if (ext.length > 4) return 'FILE';
  return ext;
}

function getDocColor(ext) {
  const colors = { PDF:'#ea4335', DOC:'#4285f4', DOCX:'#4285f4', XLS:'#34a853', XLSX:'#34a853', PPT:'#fbbc04', PPTX:'#fbbc04', ZIP:'#8e24aa', RAR:'#8e24aa' };
  return colors[ext] || '#667781';
}

/* ========== MESSAGE BUBBLE ========== */
function MessageBubble({ msg, isOut, showTail, isGroup, onDelete, onImageClick, onContextMenu }) {
  const parsed = useMemo(() => parseMsgContext(msg), [msg]);
  const isOpt = msg._optimistic;

  const renderMedia = () => {
    switch (parsed.type) {
      case 'image':
        return parsed.mediaUrl ? (
          <div className="msg-media">
            <img
              src={parsed.mediaUrl}
              alt=""
              loading="lazy"
              onClick={() => onImageClick(parsed.mediaUrl)}
              onError={(e) => { e.target.style.display='none'; }}
            />
          </div>
        ) : null;

      case 'video':
        return parsed.mediaUrl ? (
          <div className="msg-media">
            <video controls preload="metadata">
              <source src={parsed.mediaUrl} />
            </video>
          </div>
        ) : null;

      case 'audio':
        return parsed.mediaUrl ? (
          <div className="msg-media">
            <audio controls preload="metadata" src={parsed.mediaUrl} />
          </div>
        ) : null;

      case 'document': {
        const ext = getDocExtension(parsed.filename);
        const color = getDocColor(ext);
        return (
          <div className="msg-doc" onClick={() => parsed.mediaUrl && window.open(parsed.mediaUrl, '_blank')}>
            <div className="doc-icon" style={{ background:color }}>{ext}</div>
            <div className="doc-info">
              <div className="doc-name">{parsed.filename || 'Document'}</div>
              <div className="doc-meta">{ext} · Tap to open</div>
            </div>
          </div>
        );
      }

      case 'sticker':
        return parsed.mediaUrl ? (
          <div className="msg-sticker">
            <img src={parsed.mediaUrl} alt="sticker" loading="lazy" onError={e=>{ e.target.style.display='none'; }} />
          </div>
        ) : null;

      default:
        return null;
    }
  };

  const textContent = parsed.type === 'image' || parsed.type === 'video' ? parsed.caption : parsed.text;
  const status = msg.status;
  const tickIcon = status === 'read' ? '✓✓' : status === 'delivered' ? '✓✓' : status === 'sent' ? '✓' : '✓';
  const tickClass = status === 'read' ? '' : 'sent';

  return (
    <div
      className={`msg-wrapper ${isOut ? 'out' : 'in'}`}
      onContextMenu={(e) => onContextMenu && onContextMenu(e, msg)}
    >
      <div className={`msg ${isOut ? 'out' : 'in'} ${showTail ? 'tail' : ''} ${isOpt ? 'optimistic' : ''}`}>
        {!isOpt && isOut && (
          <button className="msg-delete" onClick={() => onDelete(msg.id)} title="Delete">×</button>
        )}
        {isGroup && !isOut && msg.senderName && (
          <div className="sender-name">{msg.senderName}</div>
        )}
        {renderMedia()}
        {textContent && (
          <div className="msg-text">{formatWhatsApp(textContent)}</div>
        )}
        <span className="msg-footer">
          <span className="msg-time">{formatMsgTime(msg.timestamp || msg.createdAt)}</span>
          {isOut && !isOpt && <span className={`ticks ${tickClass}`}>{tickIcon}</span>}
          {isOpt && <span className="ticks sent">⏳</span>}
        </span>
      </div>
    </div>
  );
}

/* ========== MAIN APP ========== */
function ChatApp() {
  const [lines, setLines] = useState([]);
  const [activeLine, setActiveLine] = useState(null);
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [msgText, setMsgText] = useState('');
  const [search, setSearch] = useState('');
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [showNewChat, setShowNewChat] = useState(false);
  const [showRename, setShowRename] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [newChatNumber, setNewChatNumber] = useState('');
  const [newChatName, setNewChatName] = useState('');
  const [optimisticMsgs, setOptimisticMsgs] = useState([]);
  const [lightboxUrl, setLightboxUrl] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [wsStatus, setWsStatus] = useState('disconnected');

  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const msgIntervalRef = useRef(null);
  const chatIntervalRef = useRef(null);
  const wsRef = useRef(null);
  const activeChatRef = useRef(null);

  // Keep ref in sync
  useEffect(() => { activeChatRef.current = activeChat; }, [activeChat]);

  // Responsive resize listener
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  // Close context menu on click outside
  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [contextMenu]);

  // WebSocket connection for real-time updates
  useEffect(() => {
    let ws;
    let reconnectTimer;
    const connect = () => {
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      try {
        ws = new WebSocket(`${proto}//${window.location.host}/ws`);
        wsRef.current = ws;
        ws.onopen = () => setWsStatus('connected');
        ws.onmessage = (e) => {
          try {
            const data = JSON.parse(e.data);
            if (data.type === 'new_message' || data.type === 'chat_update') {
              // Refresh messages if we're in the right chat
              if (activeChatRef.current && data.chatId === activeChatRef.current.chat_id) {
                loadMessages();
              }
              loadChats();
            }
          } catch {}
        };
        ws.onclose = () => {
          setWsStatus('disconnected');
          reconnectTimer = setTimeout(connect, 5000);
        };
        ws.onerror = () => {
          setWsStatus('disconnected');
          ws.close();
        };
      } catch {
        setWsStatus('disconnected');
        reconnectTimer = setTimeout(connect, 5000);
      }
    };
    connect();
    return () => {
      clearTimeout(reconnectTimer);
      if (ws) ws.close();
    };
  }, []);

  // Load lines
  useEffect(() => {
    api('/lines').then(data => {
      setLines(data);
      if (data.length > 0) setActiveLine(data[0]);
    }).catch(() => {});
  }, []);

  // Load chats
  const loadChats = useCallback(() => {
    if (!activeLine) return;
    const sp = search ? `?search=${encodeURIComponent(search)}` : '';
    api(`/chats/${activeLine.uid}${sp}`).then(data => setChats(data)).catch(() => {});
  }, [activeLine, search]);

  useEffect(() => {
    loadChats();
    if (chatIntervalRef.current) clearInterval(chatIntervalRef.current);
    chatIntervalRef.current = setInterval(loadChats, 8000);
    return () => clearInterval(chatIntervalRef.current);
  }, [loadChats]);

  // Load messages
  const loadMessages = useCallback(() => {
    if (!activeChat) return;
    api(`/messages/${encodeURIComponent(activeChat.chat_id)}`).then(data => {
      setMessages(data);
      setOptimisticMsgs(prev => prev.filter(m => Date.now() - m._ts < 3000));
    }).catch(() => {});
  }, [activeChat]);

  useEffect(() => {
    loadMessages();
    if (msgIntervalRef.current) clearInterval(msgIntervalRef.current);
    if (activeChat) msgIntervalRef.current = setInterval(loadMessages, 8000);
    return () => clearInterval(msgIntervalRef.current);
  }, [loadMessages]);

  // Scroll to bottom on new messages
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    // Only auto-scroll if near bottom
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 200;
    if (isNearBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior:'smooth' });
    }
  }, [messages, optimisticMsgs]);

  // Initial scroll on chat open
  useEffect(() => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView(), 50);
  }, [activeChat]);

  const selectChat = (chat) => {
    setActiveChat(chat);
    setOptimisticMsgs([]);
    setMobileShowChat(true);
    if (chat.unread_count > 0) {
      api(`/mark-read/${encodeURIComponent(chat.chat_id)}`, { method:'POST' }).catch(() => {});
      setChats(prev => prev.map(c => c.chat_id === chat.chat_id ? {...c, unread_count:0} : c));
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!msgText.trim() || !activeChat || !activeLine) return;
    const text = msgText.trim();
    setMsgText('');

    const optMsg = {
      id:'opt_'+Date.now(), chat_id:activeChat.chat_id, route:'OUTGOING',
      msgContext:{ type:'text', text:{ body:text } },
      timestamp:Math.floor(Date.now()/1000), _optimistic:true, _ts:Date.now()
    };
    setOptimisticMsgs(prev => [...prev, optMsg]);

    try {
      await api('/send', { method:'POST', body:JSON.stringify({ lineUid:activeLine.uid, chatId:activeChat.chat_id, text }) });
      setTimeout(loadMessages, 500);
      setTimeout(loadChats, 500);
    } catch (e) { console.error('Send failed:', e); }
  };

  const deleteMessage = async (msgId) => {
    if (!confirm('Delete this message?')) return;
    try {
      await api(`/messages/${msgId}`, { method:'DELETE' });
      setMessages(prev => prev.filter(m => m.id !== msgId));
    } catch (e) { console.error('Delete failed:', e); }
  };

  const copyMessage = (msg) => {
    const parsed = parseMsgContext(msg);
    navigator.clipboard?.writeText(parsed.text || '').catch(() => {});
    setContextMenu(null);
  };

  const handleContextMenu = (e, msg) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, msg });
  };

  const submitRename = async () => {
    if (!activeChat) return;
    try {
      await api('/chats/rename', { method:'POST', body:JSON.stringify({ chatId:activeChat.chat_id, label:renameValue }) });
      setActiveChat(prev => ({...prev, chat_label:renameValue, displayName:renameValue || prev.sender_name || prev.sender_mobile}));
      loadChats();
    } catch (e) { console.error('Rename failed:', e); }
    setShowRename(false);
  };

  const submitNewChat = async () => {
    if (!activeLine || !newChatNumber.trim()) return;
    try {
      await api('/start-chat', { method:'POST', body:JSON.stringify({ lineUid:activeLine.uid, contactNumber:newChatNumber, contactName:newChatName }) });
      loadChats();
      setShowNewChat(false);
      setNewChatNumber(''); setNewChatName('');
    } catch (e) { console.error('New chat failed:', e); }
  };

  const logout = () => { localStorage.removeItem('bhd_token'); window.location.reload(); };

  // Render messages with date dividers and tails
  const renderMessages = () => {
    const allMsgs = [...messages, ...optimisticMsgs];
    const elements = [];
    let lastDate = '';
    let lastSender = null;

    for (let i = 0; i < allMsgs.length; i++) {
      const msg = allMsgs[i];
      const ts = msg.timestamp || msg.createdAt;
      const dateStr = formatDate(ts);
      const isOut = msg.route === 'OUTGOING';
      const nextMsg = allMsgs[i+1];
      const nextIsOut = nextMsg ? nextMsg.route === 'OUTGOING' : null;
      const showTail = !lastSender || lastSender !== (isOut ? 'out' : 'in') || dateStr !== lastDate;

      if (dateStr !== lastDate) {
        elements.push(<div key={'date_'+dateStr+i} className="date-divider"><span>{dateStr}</span></div>);
        lastDate = dateStr;
      }

      elements.push(
        <MessageBubble
          key={msg.id}
          msg={msg}
          isOut={isOut}
          showTail={showTail}
          isGroup={isGroupChat(activeChat?.chat_id)}
          onDelete={deleteMessage}
          onImageClick={(url) => setLightboxUrl(url)}
          onContextMenu={handleContextMenu}
        />
      );

      lastSender = isOut ? 'out' : 'in';
    }
    return elements;
  };

  const activeChatDisplay = activeChat?.displayName || activeChat?.chat_label || activeChat?.sender_name || activeChat?.sender_mobile || '';
  const activeChatProfile = activeChat?.profile;
  const activeChatProfilePic = activeChatProfile?.imgUrl || activeChatProfile?.profilePicUrl || activeChatProfile?.profileImage || null;

  return (
    <div className="app">
      {/* Sidebar */}
      <div className={`sidebar ${isMobile && mobileShowChat ? 'hidden' : ''}`}>
        <div className="sidebar-header">
          <h2>💬 BHD Chat</h2>
          <button onClick={logout}>Logout</button>
        </div>
        <div className="line-tabs">
          {lines.map(line => (
            <div key={line.uid} className={`line-tab ${activeLine?.uid === line.uid ? 'active' : ''}`}
              onClick={() => { setActiveLine(line); setActiveChat(null); setMobileShowChat(false); }}>
              {line.name}
            </div>
          ))}
        </div>
        <div className="search-bar">
          <input placeholder="Search or start new chat" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button className="new-chat-btn" onClick={() => setShowNewChat(true)}>+ New Chat</button>
        <div className="chat-list">
          {chats.map(chat => {
            const profile = chat.profile;
            const profilePic = profile?.imgUrl || profile?.profilePicUrl || profile?.profileImage || null;
            const isGrp = isGroupChat(chat.chat_id);
            const lastMsg = chat.last_message;
            const lastMsgRoute = lastMsg?.route || lastMsg?.msgContext?.route || null;
            const hasUnread = chat.unread_count > 0;

            return (
              <div key={chat.chat_id}
                className={`chat-item ${activeChat?.chat_id === chat.chat_id ? 'active' : ''}`}
                onClick={() => selectChat(chat)}>
                <div className={`chat-avatar ${profilePic ? '' : isGrp ? 'group' : 'initials'}`}>
                  {profilePic ? <img src={profilePic} alt="" onError={e=>{e.target.style.display='none'; e.target.parentElement.classList.add('initials'); e.target.parentElement.textContent=getInitials(chat.displayName);}} />
                    : isGrp ? '👥' : getInitials(chat.displayName)}
                </div>
                <div className="chat-info">
                  <div className="chat-name">{chat.displayName}</div>
                  <div className="chat-preview">
                    {lastMsgRoute === 'OUTGOING' && <span className="tick">✓✓</span>}
                    {getPreviewText(lastMsg)}
                  </div>
                </div>
                <div className="chat-meta">
                  <div className={`chat-time ${hasUnread ? 'unread' : ''}`}>{formatTime(chat.updatedAt)}</div>
                  {hasUnread && <div className="unread-badge">{chat.unread_count}</div>}
                </div>
              </div>
            );
          })}
          {chats.length === 0 && <div style={{ padding:24, textAlign:'center', color:'var(--text-muted)' }}>No chats found</div>}
        </div>
      </div>

      {/* Chat Area */}
      {activeChat ? (
        <div className={`chat-area ${isMobile && !mobileShowChat ? 'hidden' : ''}`}>
          <div className="chat-bg" />
          <div className="chat-header">
            <button className="back-btn" onClick={() => setMobileShowChat(false)}>←</button>
            <div className={`chat-header-avatar ${activeChatProfilePic ? '' : 'initials'}`}>
              {activeChatProfilePic
                ? <img src={activeChatProfilePic} alt="" onError={e=>{e.target.style.display='none';}} />
                : getInitials(activeChatDisplay)}
            </div>
            <div className="chat-header-info">
              <div className="chat-header-name" onClick={() => { setRenameValue(activeChat.chat_label||''); setShowRename(true); }}>
                {activeChatDisplay}
              </div>
              <div className="chat-header-sub">{activeChat.sender_mobile || ''}</div>
            </div>
          </div>

          <div className="messages-container" ref={messagesContainerRef}>
            <div className="messages">
              {renderMessages()}
              <div ref={messagesEndRef} />
            </div>
          </div>

          <form className="send-bar" onSubmit={sendMessage}>
            <input placeholder="Type a message" value={msgText} onChange={e => setMsgText(e.target.value)} autoFocus />
            <button type="submit">
              <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M1.101 21.757 23.8 12.028 1.101 2.3l.011 7.912 13.623 1.816-13.623 1.817-.011 7.912z"/></svg>
            </button>
          </form>
        </div>
      ) : (
        <div className={`chat-area-empty ${isMobile && mobileShowChat ? '' : isMobile ? 'hidden' : ''}`} style={!isMobile ? {display:'flex'} : {}}>
          <p style={{fontSize:'48px', opacity:0.3}}>💬</p>
          <p>BHD Chat for WhatsApp</p>
          <p style={{fontSize:'13px', color:'var(--text-muted)'}}>Select a chat to start messaging</p>
        </div>
      )}

      {/* Lightbox */}
      {lightboxUrl && (
        <div className="lightbox" onClick={() => setLightboxUrl(null)}>
          <button className="lightbox-close" onClick={() => setLightboxUrl(null)}>×</button>
          <img src={lightboxUrl} alt="" />
        </div>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <div className="context-menu" style={{ top:contextMenu.y, left:contextMenu.x }}>
          <div className="context-menu-item" onClick={() => copyMessage(contextMenu.msg)}>📋 Copy</div>
          {contextMenu.msg.route === 'OUTGOING' && !contextMenu.msg._optimistic && (
            <div className="context-menu-item danger" onClick={() => { deleteMessage(contextMenu.msg.id); setContextMenu(null); }}>🗑️ Delete</div>
          )}
        </div>
      )}

      {/* New Chat Modal */}
      {showNewChat && (
        <div className="modal-overlay" onClick={() => setShowNewChat(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>New Chat</h3>
            <input placeholder="Phone number (e.g. 96871234567)" value={newChatNumber} onChange={e => setNewChatNumber(e.target.value)} autoFocus />
            <input placeholder="Contact name (optional)" value={newChatName} onChange={e => setNewChatName(e.target.value)} />
            <div className="modal-actions">
              <button className="cancel" onClick={() => setShowNewChat(false)}>Cancel</button>
              <button className="confirm" onClick={submitNewChat}>Start Chat</button>
            </div>
          </div>
        </div>
      )}

      {/* Rename Modal */}
      {showRename && (
        <div className="modal-overlay" onClick={() => setShowRename(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Rename Chat</h3>
            <input placeholder="Enter label" value={renameValue} onChange={e => setRenameValue(e.target.value)} autoFocus
              onKeyDown={e => { if (e.key === 'Enter') submitRename(); }} />
            <div className="modal-actions">
              <button className="cancel" onClick={() => setShowRename(false)}>Cancel</button>
              <button className="confirm" onClick={submitRename}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ========== ROOT ========== */
export default function App() {
  const [loggedIn, setLoggedIn] = useState(!!localStorage.getItem('bhd_token'));
  return (
    <>
      <style>{CSS}</style>
      {loggedIn ? <ChatApp /> : <LoginPage onLogin={() => setLoggedIn(true)} />}
    </>
  );
}
