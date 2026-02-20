import React, { useState, useEffect, useRef, useCallback } from 'react';

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

/* ========== STYLES ========== */
const CSS = `
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background:#f0f2f5; overflow:hidden; }
:root { --primary:#009bc1; --primary-dark:#007a9a; --amber:#ffbb00; --bg:#f0f2f5; --white:#fff; --gray100:#f5f5f5; --gray200:#e8e8e8; --gray300:#ccc; --gray600:#666; --gray800:#333; --green:#25D366; }

.login-page { display:flex; align-items:center; justify-content:center; height:100vh; background:linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%); }
.login-box { background:var(--white); padding:40px; border-radius:16px; box-shadow:0 20px 60px rgba(0,0,0,0.15); width:340px; text-align:center; }
.login-box h1 { color:var(--primary); font-size:28px; margin-bottom:8px; }
.login-box p { color:var(--gray600); margin-bottom:24px; font-size:14px; }
.login-box input { width:100%; padding:12px 16px; border:2px solid var(--gray200); border-radius:8px; font-size:16px; outline:none; transition:border 0.2s; }
.login-box input:focus { border-color:var(--primary); }
.login-box button { width:100%; padding:12px; background:var(--primary); color:white; border:none; border-radius:8px; font-size:16px; font-weight:600; cursor:pointer; margin-top:12px; transition:background 0.2s; }
.login-box button:hover { background:var(--primary-dark); }
.login-box .error { color:#e53935; font-size:13px; margin-top:8px; }

.app { display:flex; height:100vh; width:100vw; }
.sidebar { width:360px; min-width:360px; background:var(--white); border-right:1px solid var(--gray200); display:flex; flex-direction:column; height:100vh; }
.sidebar-header { padding:12px 16px; background:var(--primary); color:white; display:flex; align-items:center; justify-content:space-between; min-height:56px; }
.sidebar-header h2 { font-size:18px; font-weight:600; }
.sidebar-header button { background:rgba(255,255,255,0.2); border:none; color:white; padding:6px 12px; border-radius:6px; cursor:pointer; font-size:13px; }
.line-tabs { display:flex; border-bottom:1px solid var(--gray200); }
.line-tab { flex:1; padding:10px; text-align:center; cursor:pointer; font-size:14px; font-weight:500; color:var(--gray600); border-bottom:2px solid transparent; transition:all 0.2s; }
.line-tab.active { color:var(--primary); border-bottom-color:var(--primary); }
.search-bar { padding:8px 12px; border-bottom:1px solid var(--gray200); }
.search-bar input { width:100%; padding:8px 12px; border:1px solid var(--gray200); border-radius:20px; font-size:14px; outline:none; background:var(--gray100); }
.chat-list { flex:1; overflow-y:auto; }
.chat-item { display:flex; align-items:center; padding:12px 16px; cursor:pointer; border-bottom:1px solid var(--gray100); transition:background 0.15s; }
.chat-item:hover { background:var(--gray100); }
.chat-item.active { background:#e3f2fd; }
.chat-avatar { width:48px; height:48px; border-radius:50%; background:var(--primary); color:white; display:flex; align-items:center; justify-content:center; font-size:18px; font-weight:600; margin-right:12px; flex-shrink:0; }
.chat-avatar.group { background:var(--green); }
.chat-info { flex:1; min-width:0; }
.chat-name { font-size:15px; font-weight:500; color:var(--gray800); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.chat-preview { font-size:13px; color:var(--gray600); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-top:2px; }
.chat-meta { text-align:right; flex-shrink:0; margin-left:8px; }
.chat-time { font-size:11px; color:var(--gray600); }
.unread-badge { background:var(--amber); color:#333; font-size:11px; font-weight:700; padding:2px 7px; border-radius:12px; margin-top:4px; display:inline-block; }

.chat-area { flex:1; display:flex; flex-direction:column; background:#e5ddd5; }
.chat-area-empty { flex:1; display:flex; align-items:center; justify-content:center; background:var(--bg); }
.chat-area-empty p { color:var(--gray600); font-size:16px; }
.chat-header { padding:12px 20px; background:var(--white); border-bottom:1px solid var(--gray200); display:flex; align-items:center; min-height:56px; }
.chat-header .back-btn { display:none; background:none; border:none; font-size:22px; cursor:pointer; margin-right:8px; color:var(--primary); }
.chat-header-name { font-size:16px; font-weight:600; color:var(--gray800); cursor:pointer; }
.chat-header-name:hover { text-decoration:underline; }
.chat-header-sub { font-size:12px; color:var(--gray600); }

.messages { flex:1; overflow-y:auto; padding:16px 60px; display:flex; flex-direction:column; }
.msg { max-width:65%; padding:8px 12px; border-radius:8px; margin-bottom:4px; position:relative; word-wrap:break-word; font-size:14px; line-height:1.4; }
.msg.out { align-self:flex-end; background:#dcf8c6; border-bottom-right-radius:2px; }
.msg.in { align-self:flex-start; background:var(--white); border-bottom-left-radius:2px; }
.msg .msg-text { white-space:pre-wrap; }
.msg .msg-time { font-size:10px; color:var(--gray600); text-align:right; margin-top:2px; }
.msg .msg-delete { display:none; position:absolute; top:4px; right:4px; background:rgba(0,0,0,0.1); border:none; border-radius:50%; width:20px; height:20px; cursor:pointer; font-size:12px; line-height:20px; text-align:center; }
.msg:hover .msg-delete { display:block; }
.msg.optimistic { opacity:0.6; }

.date-divider { text-align:center; margin:12px 0; }
.date-divider span { background:rgba(0,0,0,0.06); padding:4px 12px; border-radius:8px; font-size:12px; color:var(--gray600); }

.send-bar { display:flex; align-items:center; padding:10px 16px; background:var(--white); border-top:1px solid var(--gray200); gap:8px; }
.send-bar input { flex:1; padding:10px 16px; border:1px solid var(--gray200); border-radius:24px; font-size:15px; outline:none; background:var(--gray100); }
.send-bar button { width:44px; height:44px; border-radius:50%; background:var(--primary); color:white; border:none; cursor:pointer; font-size:20px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.send-bar button:hover { background:var(--primary-dark); }

.new-chat-btn { margin:8px 12px; padding:10px; background:var(--primary); color:white; border:none; border-radius:8px; cursor:pointer; font-size:14px; font-weight:500; }
.new-chat-btn:hover { background:var(--primary-dark); }

.modal-overlay { position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.4); display:flex; align-items:center; justify-content:center; z-index:100; }
.modal { background:white; padding:24px; border-radius:12px; width:340px; box-shadow:0 10px 40px rgba(0,0,0,0.2); }
.modal h3 { margin-bottom:16px; color:var(--gray800); }
.modal input { width:100%; padding:10px 12px; border:1px solid var(--gray200); border-radius:8px; font-size:14px; outline:none; margin-bottom:10px; }
.modal input:focus { border-color:var(--primary); }
.modal-actions { display:flex; gap:8px; justify-content:flex-end; margin-top:12px; }
.modal-actions button { padding:8px 20px; border-radius:6px; border:none; cursor:pointer; font-size:14px; }
.modal-actions .cancel { background:var(--gray200); color:var(--gray800); }
.modal-actions .confirm { background:var(--primary); color:white; }

@media (max-width: 768px) {
  .sidebar { width:100%; min-width:100%; position:absolute; z-index:10; }
  .sidebar.hidden { display:none; }
  .chat-area { position:absolute; width:100%; z-index:5; }
  .chat-area.hidden { display:none; }
  .chat-header .back-btn { display:block; }
  .messages { padding:12px 12px; }
  .msg { max-width:85%; }
}
`;

/* ========== LOGIN ========== */
function LoginPage({ onLogin }) {
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErr('');
    try {
      const data = await api('/login', { method: 'POST', body: JSON.stringify({ password: pw }) });
      localStorage.setItem('bhd_token', data.token);
      onLogin();
    } catch (e) {
      setErr('Wrong password');
    }
    setLoading(false);
  };

  return (
    <div className="login-page">
      <form className="login-box" onSubmit={submit}>
        <h1>💬 BHD Chat</h1>
        <p>WhatsApp Dashboard</p>
        <input type="password" placeholder="Enter password" value={pw} onChange={e => setPw(e.target.value)} autoFocus />
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

  const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  if (isToday) return time;
  if (isYesterday) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatMsgTime(ts) {
  if (!ts) return '';
  const d = new Date(typeof ts === 'number' ? (ts < 1e12 ? ts * 1000 : ts) : ts);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function formatDate(ts) {
  if (!ts) return '';
  const d = new Date(typeof ts === 'number' ? (ts < 1e12 ? ts * 1000 : ts) : ts);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return 'Today';
  const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function getPreview(lastMsg) {
  if (!lastMsg) return '';
  const text = lastMsg.text || lastMsg.caption || '';
  if (text.length > 50) return text.slice(0, 50) + '...';
  return text || (lastMsg.type === 'image' ? '📷 Image' : lastMsg.type === 'document' ? '📄 Document' : '');
}

function isGroup(chatId) {
  const parts = chatId.split('_');
  const contactId = parts.slice(1).join('_');
  return /^\d{15,}$/.test(contactId);
}

function getMsgText(msg) {
  if (!msg.msgContext) return '';
  const ctx = msg.msgContext;
  if (typeof ctx === 'string') return ctx;
  return ctx.text || ctx.caption || ctx.body || (ctx.type === 'image' ? '📷 Image' : ctx.type === 'document' ? '📄 Document' : ctx.type === 'audio' ? '🎵 Audio' : ctx.type === 'video' ? '🎥 Video' : ctx.type === 'sticker' ? '🏷️ Sticker' : JSON.stringify(ctx).slice(0, 100));
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
  const [showNewChat, setShowNewChat] = useState(false);
  const [showRename, setShowRename] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [newChatNumber, setNewChatNumber] = useState('');
  const [newChatName, setNewChatName] = useState('');
  const [optimisticMsgs, setOptimisticMsgs] = useState([]);
  const messagesEndRef = useRef(null);
  const msgIntervalRef = useRef(null);
  const chatIntervalRef = useRef(null);

  // Load lines
  useEffect(() => {
    api('/lines').then(data => {
      setLines(data);
      if (data.length > 0) setActiveLine(data[0]);
    }).catch(() => {});
  }, []);

  // Load chats when line changes
  const loadChats = useCallback(() => {
    if (!activeLine) return;
    const searchParam = search ? `?search=${encodeURIComponent(search)}` : '';
    api(`/chats/${activeLine.uid}${searchParam}`).then(data => {
      setChats(data);
    }).catch(() => {});
  }, [activeLine, search]);

  useEffect(() => {
    loadChats();
    if (chatIntervalRef.current) clearInterval(chatIntervalRef.current);
    chatIntervalRef.current = setInterval(loadChats, 5000);
    return () => clearInterval(chatIntervalRef.current);
  }, [loadChats]);

  // Load messages when chat changes
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
    if (activeChat) {
      msgIntervalRef.current = setInterval(loadMessages, 5000);
    }
    return () => clearInterval(msgIntervalRef.current);
  }, [loadMessages]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, optimisticMsgs]);

  // Select chat
  const selectChat = (chat) => {
    setActiveChat(chat);
    setOptimisticMsgs([]);
    setMobileShowChat(true);
    // Mark read
    if (chat.unread_count > 0) {
      api(`/mark-read/${encodeURIComponent(chat.chat_id)}`, { method: 'POST' }).catch(() => {});
      setChats(prev => prev.map(c => c.chat_id === chat.chat_id ? { ...c, unread_count: 0 } : c));
    }
  };

  // Send message
  const sendMessage = async (e) => {
    e.preventDefault();
    if (!msgText.trim() || !activeChat || !activeLine) return;
    const text = msgText.trim();
    setMsgText('');

    // Optimistic
    const optMsg = {
      id: 'opt_' + Date.now(),
      chat_id: activeChat.chat_id,
      route: 'OUTGOING',
      msgContext: { text },
      timestamp: Math.floor(Date.now() / 1000),
      _optimistic: true,
      _ts: Date.now()
    };
    setOptimisticMsgs(prev => [...prev, optMsg]);

    try {
      await api('/send', {
        method: 'POST',
        body: JSON.stringify({ lineUid: activeLine.uid, chatId: activeChat.chat_id, text })
      });
      setTimeout(loadMessages, 500);
      setTimeout(loadChats, 500);
    } catch (e) {
      console.error('Send failed:', e);
    }
  };

  // Delete message
  const deleteMessage = async (msgId) => {
    if (!confirm('Delete this message?')) return;
    try {
      await api(`/messages/${msgId}`, { method: 'DELETE' });
      setMessages(prev => prev.filter(m => m.id !== msgId));
    } catch (e) {
      console.error('Delete failed:', e);
    }
  };

  // Rename chat
  const submitRename = async () => {
    if (!activeChat) return;
    try {
      await api('/chats/rename', {
        method: 'POST',
        body: JSON.stringify({ chatId: activeChat.chat_id, label: renameValue })
      });
      setActiveChat(prev => ({ ...prev, chat_label: renameValue, displayName: renameValue || prev.sender_name || prev.sender_mobile }));
      loadChats();
    } catch (e) {
      console.error('Rename failed:', e);
    }
    setShowRename(false);
  };

  // New chat
  const submitNewChat = async () => {
    if (!activeLine || !newChatNumber.trim()) return;
    try {
      const data = await api('/start-chat', {
        method: 'POST',
        body: JSON.stringify({ lineUid: activeLine.uid, contactNumber: newChatNumber, contactName: newChatName })
      });
      loadChats();
      setShowNewChat(false);
      setNewChatNumber('');
      setNewChatName('');
    } catch (e) {
      console.error('New chat failed:', e);
    }
  };

  // Logout
  const logout = () => { localStorage.removeItem('bhd_token'); window.location.reload(); };

  // Render messages with date dividers
  const renderMessages = () => {
    const allMsgs = [...messages, ...optimisticMsgs];
    const elements = [];
    let lastDate = '';

    for (const msg of allMsgs) {
      const ts = msg.timestamp;
      const d = new Date(typeof ts === 'number' ? (ts < 1e12 ? ts * 1000 : ts) : ts);
      const dateStr = formatDate(ts);

      if (dateStr !== lastDate) {
        elements.push(<div key={'date_' + dateStr} className="date-divider"><span>{dateStr}</span></div>);
        lastDate = dateStr;
      }

      const isOut = msg.route === 'OUTGOING';
      const text = getMsgText(msg);
      const isOpt = msg._optimistic;

      elements.push(
        <div key={msg.id} className={`msg ${isOut ? 'out' : 'in'} ${isOpt ? 'optimistic' : ''}`}>
          {!isOpt && isOut && (
            <button className="msg-delete" onClick={() => deleteMessage(msg.id)} title="Delete">×</button>
          )}
          <div className="msg-text">{text}</div>
          <div className="msg-time">{formatMsgTime(ts)}{isOpt ? ' ⏳' : ''}</div>
        </div>
      );
    }

    return elements;
  };

  const activeChatDisplay = activeChat?.displayName || activeChat?.chat_label || activeChat?.sender_name || activeChat?.sender_mobile || '';

  return (
    <div className="app">
      {/* Sidebar */}
      <div className={`sidebar ${mobileShowChat ? 'hidden' : ''}`}>
        <div className="sidebar-header">
          <h2>💬 BHD Chat</h2>
          <button onClick={logout}>Logout</button>
        </div>
        <div className="line-tabs">
          {lines.map(line => (
            <div
              key={line.uid}
              className={`line-tab ${activeLine?.uid === line.uid ? 'active' : ''}`}
              onClick={() => { setActiveLine(line); setActiveChat(null); setMobileShowChat(false); }}
            >
              {line.name}
            </div>
          ))}
        </div>
        <div className="search-bar">
          <input
            placeholder="Search chats..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <button className="new-chat-btn" onClick={() => setShowNewChat(true)}>+ New Chat</button>
        <div className="chat-list">
          {chats.map(chat => (
            <div
              key={chat.chat_id}
              className={`chat-item ${activeChat?.chat_id === chat.chat_id ? 'active' : ''}`}
              onClick={() => selectChat(chat)}
            >
              <div className={`chat-avatar ${isGroup(chat.chat_id) ? 'group' : ''}`}>
                {isGroup(chat.chat_id) ? '👥' : getInitials(chat.displayName)}
              </div>
              <div className="chat-info">
                <div className="chat-name">{chat.displayName}</div>
                <div className="chat-preview">{getPreview(chat.last_message)}</div>
              </div>
              <div className="chat-meta">
                <div className="chat-time">{formatTime(chat.updatedAt)}</div>
                {chat.unread_count > 0 && <div className="unread-badge">{chat.unread_count}</div>}
              </div>
            </div>
          ))}
          {chats.length === 0 && <div style={{ padding: 20, textAlign: 'center', color: '#999' }}>No chats found</div>}
        </div>
      </div>

      {/* Chat Area */}
      {activeChat ? (
        <div className={`chat-area ${!mobileShowChat ? 'hidden' : ''}`} style={window.innerWidth > 768 ? { display: 'flex' } : {}}>
          <div className="chat-header">
            <button className="back-btn" onClick={() => setMobileShowChat(false)}>←</button>
            <div>
              <div className="chat-header-name" onClick={() => { setRenameValue(activeChat.chat_label || ''); setShowRename(true); }}>
                {activeChatDisplay}
              </div>
              <div className="chat-header-sub">{activeChat.sender_mobile || ''}</div>
            </div>
          </div>
          <div className="messages">
            {renderMessages()}
            <div ref={messagesEndRef} />
          </div>
          <form className="send-bar" onSubmit={sendMessage}>
            <input
              placeholder="Type a message..."
              value={msgText}
              onChange={e => setMsgText(e.target.value)}
              autoFocus
            />
            <button type="submit">➤</button>
          </form>
        </div>
      ) : (
        <div className="chat-area-empty" style={window.innerWidth <= 768 && mobileShowChat ? {} : window.innerWidth <= 768 ? { display: 'none' } : {}}>
          <p>Select a chat to start messaging</p>
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
            <input placeholder="Enter label" value={renameValue} onChange={e => setRenameValue(e.target.value)} autoFocus />
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
