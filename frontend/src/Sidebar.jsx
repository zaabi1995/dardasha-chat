import { useState } from 'react';
import * as api from './api';

function formatTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now - d;
  const oneDay = 86400000;

  if (diff < oneDay && d.getDate() === now.getDate()) {
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  }
  if (diff < oneDay * 2) return 'Yesterday';
  if (diff < oneDay * 7) return d.toLocaleDateString('en-US', { weekday: 'short' });
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getPreview(lastMsg) {
  if (!lastMsg) return '';
  try {
    const msg = typeof lastMsg === 'string' ? JSON.parse(lastMsg) : lastMsg;
    if (msg?.text) return msg.text;
    if (msg?.imageMessage) return '📷 Photo';
    if (msg?.audioMessage) return '🎤 Voice';
    if (msg?.videoMessage) return '🎬 Video';
    if (msg?.documentMessage) return '📄 Document';
    if (msg?.stickerMessage) return '🏷️ Sticker';
    if (msg?.contactMessage) return '👤 Contact';
    if (msg?.locationMessage) return '📍 Location';
    // Fallback: try first string value
    const vals = Object.values(msg);
    for (const v of vals) if (typeof v === 'string' && v.length > 0 && v.length < 200) return v;
    return '';
  } catch {
    return String(lastMsg).substring(0, 80);
  }
}

function Avatar({ name, size = 'w-12 h-12' }) {
  const initial = (name || '?')[0].toUpperCase();
  const colors = ['#6b7280','#ef4444','#f59e0b','#10b981','#3b82f6','#8b5cf6','#ec4899','#06b6d4'];
  const color = colors[initial.charCodeAt(0) % colors.length];
  return (
    <div className={`${size} rounded-full flex items-center justify-center text-white font-medium flex-shrink-0`} style={{ backgroundColor: color }}>
      {initial}
    </div>
  );
}

function NewChatModal({ onClose, onSubmit }) {
  const [number, setNumber] = useState('');
  const [name, setName] = useState('');

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-wa-panel rounded-lg p-6 w-80" onClick={e => e.stopPropagation()}>
        <h3 className="text-wa-text font-medium mb-4">New Chat</h3>
        <input
          type="tel"
          placeholder="Phone number (e.g. 96812345678)"
          value={number}
          onChange={e => setNumber(e.target.value)}
          className="w-full mb-3 px-3 py-2 rounded bg-wa-input text-wa-text text-sm border-none outline-none placeholder:text-wa-textSec"
          autoFocus
        />
        <input
          type="text"
          placeholder="Contact name (optional)"
          value={name}
          onChange={e => setName(e.target.value)}
          className="w-full mb-4 px-3 py-2 rounded bg-wa-input text-wa-text text-sm border-none outline-none placeholder:text-wa-textSec"
        />
        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-wa-textSec hover:text-wa-text">Cancel</button>
          <button
            onClick={() => { if (number.trim()) { onSubmit(number.trim(), name.trim()); onClose(); } }}
            className="px-4 py-2 text-sm bg-wa-green text-white rounded hover:bg-wa-greenDark"
          >Start Chat</button>
        </div>
      </div>
    </div>
  );
}

export default function Sidebar({ lines, activeLine, setActiveLine, chats, activeChat, onSelectChat, search, setSearch, loading, onNewChat }) {
  const [showNewChat, setShowNewChat] = useState(false);

  return (
    <aside className="w-full md:w-[420px] lg:w-[440px] flex flex-col bg-wa-dark border-r border-wa-border h-screen flex-shrink-0">
      {/* Header */}
      <div className="bg-wa-panel px-4 py-2.5 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <Avatar name={activeLine?.name || 'B'} size="w-10 h-10" />
          <div>
            <h2 className="text-wa-text text-sm font-medium">{activeLine?.name || 'BHD Chat'}</h2>
            <p className="text-wa-textSec text-xs">{activeLine?.number || ''}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {/* New chat button */}
          <button
            onClick={() => setShowNewChat(true)}
            className="p-2 rounded-full hover:bg-wa-hover text-wa-textSec"
            title="New chat"
          >
            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
              <path d="M19.005 3.175H4.674C3.642 3.175 3 3.789 3 4.821V21.02l3.544-3.514h12.461c1.033 0 2.064-1.06 2.064-2.093V4.821c-.001-1.032-1.032-1.646-2.064-1.646zm-4.989 9.869H7.041V11.1h6.975v1.944zm3-4H7.041V7.1h9.975v1.944z"/>
            </svg>
          </button>
          {/* Line selector (if multiple lines) */}
          {lines.length > 1 && (
            <select
              value={activeLine?.uid || ''}
              onChange={e => setActiveLine(lines.find(l => l.uid === e.target.value))}
              className="ml-2 bg-wa-input text-wa-text text-xs px-2 py-1 rounded border-none outline-none"
            >
              {lines.map(l => (
                <option key={l.uid} value={l.uid}>{l.name}</option>
              ))}
            </select>
          )}
          {/* Logout */}
          <button
            onClick={api.logout}
            className="p-2 rounded-full hover:bg-wa-hover text-wa-textSec"
            title="Logout"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M16 13v-2H7V8l-5 4 5 4v-3z"/>
              <path d="M20 3h-9c-1.103 0-2 .897-2 2v4h2V5h9v14h-9v-4H9v4c0 1.103.897 2 2 2h9c1.103 0 2-.897 2-2V5c0-1.103-.897-2-2-2z"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-2 bg-wa-dark flex-shrink-0">
        <div className="flex items-center bg-wa-input rounded-lg px-3 py-1.5">
          <svg viewBox="0 0 24 24" width="18" height="18" className="text-wa-textSec mr-3 flex-shrink-0" fill="currentColor">
            <path d="M15.009 13.805h-.636l-.22-.219a5.184 5.184 0 0 0 1.256-3.386 5.207 5.207 0 1 0-5.207 5.208 5.183 5.183 0 0 0 3.385-1.255l.221.22v.635l4.004 3.999 1.194-1.195-3.997-4.007zm-4.808 0a3.605 3.605 0 1 1 0-7.21 3.605 3.605 0 0 1 0 7.21z"/>
          </svg>
          <input
            type="text"
            placeholder="Search or start new chat"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-transparent text-sm text-wa-text w-full outline-none placeholder:text-wa-textSec"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-wa-textSec ml-2">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {loading && chats.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-8 h-8 border-2 border-wa-green border-t-transparent rounded-full animate-spin" />
          </div>
        ) : chats.length === 0 ? (
          <div className="text-center py-12 text-wa-textSec text-sm">
            <p>No chats yet</p>
            <button onClick={() => setShowNewChat(true)} className="mt-2 text-wa-green hover:underline">Start a conversation</button>
          </div>
        ) : (
          chats.map(chat => (
            <ChatItem
              key={chat.chat_id}
              chat={chat}
              active={activeChat?.chat_id === chat.chat_id}
              onClick={() => onSelectChat(chat)}
            />
          ))
        )}
      </div>

      {showNewChat && <NewChatModal onClose={() => setShowNewChat(false)} onSubmit={onNewChat} />}
    </aside>
  );
}

function ChatItem({ chat, active, onClick }) {
  const name = chat.displayName || chat.chat_label || chat.sender_name || chat.sender_mobile || 'Unknown';
  const time = formatTime(chat.updatedAt);
  const preview = getPreview(chat.last_message);
  const unread = chat.unread_count || 0;

  return (
    <div
      onClick={onClick}
      className={`flex items-center px-3 py-3 cursor-pointer border-b border-wa-dark transition-colors ${
        active ? 'bg-wa-hover' : 'hover:bg-wa-panel'
      }`}
    >
      <Avatar name={name} />
      <div className="ml-3 flex-1 min-w-0">
        <div className="flex justify-between items-baseline">
          <h3 className="text-wa-text text-[15px] truncate">{name}</h3>
          <span className={`text-xs flex-shrink-0 ml-2 ${unread > 0 ? 'text-wa-teal' : 'text-wa-textSec'}`}>
            {time}
          </span>
        </div>
        <div className="flex justify-between items-center mt-0.5">
          <p className="text-wa-textSec text-sm truncate">{preview}</p>
          {unread > 0 && (
            <span className="ml-2 bg-wa-teal text-white text-xs rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 font-medium">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export { Avatar, formatTime };
