import { useState, useRef, useEffect } from 'react';
import { Avatar, formatTime } from './Sidebar';


// Safe string coercion — prevents e.split crash when message content is an object
function safeString(val) {
  if (val === null || val === undefined) return "";
  if (typeof val === "string") return val;
  if (typeof val === "object") {
    if (val.body) return String(val.body);
    if (val.text) return typeof val.text === "string" ? val.text : (val.text?.body || "");
    if (val.caption) return String(val.caption);
    if (val.conversation) return String(val.conversation);
    return "";
  }
  return String(val);
}

function getMsgText(msgContext) {
  if (!msgContext) return '';
  const ctx = typeof msgContext === 'string' ? (() => { try { return JSON.parse(msgContext); } catch { return null; } })() : msgContext;
  if (!ctx) return String(msgContext);
  if (ctx.text) return safeString(ctx.text);
  if (ctx.conversation) return safeString(ctx.conversation);
  if (ctx.extendedTextMessage?.text) return safeString(ctx.extendedTextMessage.text);
  if (ctx.imageMessage) return '📷 Photo';
  if (ctx.audioMessage) return '🎤 Voice message';
  if (ctx.videoMessage) return '🎬 Video';
  if (ctx.documentMessage) return `📄 ${ctx.documentMessage.fileName || 'Document'}`;
  if (ctx.stickerMessage) return '🏷️ Sticker';
  if (ctx.contactMessage) return `👤 ${ctx.contactMessage.displayName || 'Contact'}`;
  if (ctx.locationMessage) return '📍 Location';
  if (ctx.templateMessage) return ctx.templateMessage?.hydratedTemplate?.hydratedContentText || '📋 Template';
  if (ctx.buttonsResponseMessage) return ctx.buttonsResponseMessage.selectedDisplayText || 'Button response';
  if (ctx.listResponseMessage) return ctx.listResponseMessage.title || 'List response';
  // Fallback
  const vals = Object.values(ctx);
  for (const v of vals) if (typeof v === 'string' && v.length > 0 && v.length < 500) return v;
  return '[Media]';
}

function getMsgType(msgContext) {
  if (!msgContext) return 'text';
  const ctx = typeof msgContext === 'string' ? (() => { try { return JSON.parse(msgContext); } catch { return null; } })() : msgContext;
  if (!ctx) return 'text';
  if (ctx.imageMessage) return 'image';
  if (ctx.audioMessage) return 'audio';
  if (ctx.videoMessage) return 'video';
  if (ctx.documentMessage) return 'document';
  if (ctx.stickerMessage) return 'sticker';
  return 'text';
}

function getImageUrl(msgContext) {
  if (!msgContext) return null;
  const ctx = typeof msgContext === 'string' ? (() => { try { return JSON.parse(msgContext); } catch { return null; } })() : msgContext;
  if (ctx?.imageMessage?.url) return ctx.imageMessage.url;
  if (ctx?.imageMessage?.jpegThumbnail) return `data:image/jpeg;base64,${ctx.imageMessage.jpegThumbnail}`;
  return null;
}

function StatusIcon({ status, route }) {
  if (route !== 'OUTGOING') return null;
  const color = status === 'read' ? '#53bdeb' : '#8696a0';
  if (status === 'read' || status === 'delivered') {
    return (
      <svg viewBox="0 0 16 11" width="16" height="11" fill={color} className="inline ml-1 flex-shrink-0">
        <path d="M11.071.653a.457.457 0 0 0-.304-.102.493.493 0 0 0-.381.178l-6.19 7.636-2.011-2.095a.46.46 0 0 0-.327-.15.458.458 0 0 0-.326.78l2.337 2.434a.462.462 0 0 0 .653.021L11.071 1.34a.458.458 0 0 0 0-.687zM8.895 7.41l.707-.737 2.986-3.105a.458.458 0 0 0-.687-.607l-2.91 3.027-2.092-2.178a.46.46 0 0 0-.653.021.458.458 0 0 0 .021.653l2.628 2.926z"/>
      </svg>
    );
  }
  if (status === 'sent') {
    return (
      <svg viewBox="0 0 12 11" width="12" height="11" fill={color} className="inline ml-1 flex-shrink-0">
        <path d="M11.155.651a.457.457 0 0 0-.687 0L4.14 7.29 1.53 5.137a.457.457 0 1 0-.653.607l2.934 2.434a.462.462 0 0 0 .653-.021L11.155 1.34a.458.458 0 0 0 0-.687z"/>
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 16 15" width="14" height="14" fill="#8696a0" className="inline ml-1 flex-shrink-0">
      <path d="M9.75 7.713H8.244V5.359a.5.5 0 0 0-.5-.5.5.5 0 0 0-.5.5v2.947a.5.5 0 0 0 .5.5h2.006a.5.5 0 0 0 .5-.5.5.5 0 0 0-.5-.5zm-2.143-5.2a5.714 5.714 0 0 0-5.714 5.714 5.714 5.714 0 0 0 5.714 5.714 5.714 5.714 0 0 0 5.715-5.714A5.714 5.714 0 0 0 7.607 2.513zm0 10.286a4.571 4.571 0 1 1 0-9.143 4.571 4.571 0 0 1 0 9.143z"/>
    </svg>
  );
}

function formatMsgTime(dateStr, timestamp) {
  const d = dateStr ? new Date(dateStr) : timestamp ? new Date(timestamp * 1000) : null;
  if (!d || isNaN(d)) return '';
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function formatDateHeader(dateStr, timestamp) {
  const d = dateStr ? new Date(dateStr) : timestamp ? new Date(timestamp * 1000) : null;
  if (!d || isNaN(d)) return '';
  const now = new Date();
  const diff = now - d;
  if (diff < 86400000 && d.getDate() === now.getDate()) return 'TODAY';
  if (diff < 172800000) return 'YESTERDAY';
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase();
}

function isNewDay(msg, prevMsg) {
  const d1 = msg.createdAt ? new Date(msg.createdAt) : msg.timestamp ? new Date(msg.timestamp * 1000) : null;
  const d2 = prevMsg?.createdAt ? new Date(prevMsg.createdAt) : prevMsg?.timestamp ? new Date(prevMsg.timestamp * 1000) : null;
  if (!d1) return false;
  if (!d2) return true;
  return d1.toDateString() !== d2.toDateString();
}

export default function ChatView({ chat, messages, loading, onSend, onDelete, activeLine }) {
  const [text, setText] = useState('');
  const [contextMenu, setContextMenu] = useState(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const prevLenRef = useRef(0);

  const chatName = chat.displayName || chat.chat_label || chat.sender_name || chat.sender_mobile || 'Unknown';

  // Auto-scroll on new messages
  useEffect(() => {
    if (messages.length > prevLenRef.current || prevLenRef.current === 0) {
      bottomRef.current?.scrollIntoView({ behavior: messages.length - prevLenRef.current > 5 ? 'auto' : 'smooth' });
    }
    prevLenRef.current = messages.length;
  }, [messages.length]);

  // Focus input when chat changes
  useEffect(() => {
    inputRef.current?.focus();
    prevLenRef.current = 0;
  }, [chat.chat_id]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSend(text);
    setText('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-screen min-w-0">
      {/* Chat header */}
      <div className="bg-wa-panel px-4 py-2.5 flex items-center gap-3 flex-shrink-0 border-b border-wa-border">
        <Avatar name={chatName} />
        <div className="flex-1 min-w-0">
          <h3 className="text-wa-text text-[16px] font-medium truncate">{chatName}</h3>
          <p className="text-wa-textSec text-xs truncate">{chat.sender_mobile || ''}</p>
        </div>
        <div className="flex items-center gap-1">
          {/* Search in chat (placeholder) */}
          <button className="p-2 rounded-full hover:bg-wa-hover text-wa-textSec">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M15.009 13.805h-.636l-.22-.219a5.184 5.184 0 0 0 1.256-3.386 5.207 5.207 0 1 0-5.207 5.208 5.183 5.183 0 0 0 3.385-1.255l.221.22v.635l4.004 3.999 1.194-1.195-3.997-4.007zm-4.808 0a3.605 3.605 0 1 1 0-7.21 3.605 3.605 0 0 1 0 7.21z"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar chat-bg px-4 sm:px-16 py-4" onClick={() => setContextMenu(null)}>
        {loading && messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-10 h-10 border-2 border-wa-green border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-1">
            {messages.map((msg, i) => (
              <div key={msg.id || i}>
                {isNewDay(msg, messages[i - 1]) && (
                  <div className="flex justify-center my-3">
                    <span className="bg-wa-panel text-wa-textSec text-[11px] px-3 py-1 rounded-lg uppercase tracking-wide shadow">
                      {formatDateHeader(msg.createdAt, msg.timestamp)}
                    </span>
                  </div>
                )}
                <MessageBubble
                  msg={msg}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    if (msg.route === 'OUTGOING') setContextMenu({ id: msg.id, x: e.clientX, y: e.clientY });
                  }}
                  onDelete={() => { onDelete(msg.id); setContextMenu(null); }}
                  showMenu={contextMenu?.id === msg.id}
                />
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Message input */}
      <form onSubmit={handleSubmit} className="bg-wa-panel px-4 py-2.5 flex items-end gap-2 flex-shrink-0">
        {/* Emoji button (decorative) */}
        <button type="button" className="p-2 rounded-full hover:bg-wa-hover text-wa-textSec flex-shrink-0 mb-0.5">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
            <path d="M9.153 11.603c.795 0 1.439-.879 1.439-1.962s-.644-1.962-1.439-1.962-1.439.879-1.439 1.962.644 1.962 1.439 1.962zm5.694 0c.795 0 1.439-.879 1.439-1.962s-.644-1.962-1.439-1.962-1.439.879-1.439 1.962.644 1.962 1.439 1.962zM11.984 2C6.486 2 2.029 6.486 2.029 12s4.457 10 9.955 10 9.984-4.486 9.984-10S17.482 2 11.984 2zM12 20c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8zm.358-3.168c-1.806 0-3.461-1.006-4.273-2.596a.506.506 0 0 1 .904-.455c.637 1.248 1.927 2.03 3.369 2.03s2.732-.782 3.369-2.03a.506.506 0 1 1 .904.455c-.812 1.59-2.467 2.596-4.273 2.596z"/>
          </svg>
        </button>

        {/* Attachment button (decorative) */}
        <button type="button" className="p-2 rounded-full hover:bg-wa-hover text-wa-textSec flex-shrink-0 mb-0.5">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
            <path d="M1.816 15.556v.002c0 1.502.584 2.912 1.646 3.972s2.472 1.647 3.974 1.647a5.58 5.58 0 0 0 3.972-1.645l9.547-9.548c.769-.768 1.147-1.767 1.058-2.817-.079-.968-.548-1.927-1.319-2.698-1.594-1.592-4.068-1.711-5.517-.262l-7.916 7.915c-.881.881-.792 2.25.214 3.261.501.501 1.122.779 1.745.779.548 0 1.06-.218 1.44-.6l6.37-6.37a.554.554 0 0 0-.783-.784l-6.369 6.37c-.363.362-.988.34-1.699-.373-.71-.713-.727-1.337-.366-1.698l7.916-7.916c.969-.968 2.794-.867 3.932.271.58.578.905 1.271.955 1.948.052.694-.217 1.377-.757 1.917l-9.547 9.548a4.48 4.48 0 0 1-3.189 1.319 4.486 4.486 0 0 1-3.19-1.318c-1.756-1.756-1.756-4.624 0-6.38l9.232-9.231a.554.554 0 0 0-.783-.784l-9.232 9.232c-2.189 2.189-2.189 5.758 0 7.949z"/>
          </svg>
        </button>

        {/* Text input */}
        <div className="flex-1 bg-wa-input rounded-lg px-4 py-2">
          <textarea
            ref={inputRef}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message"
            rows="1"
            className="w-full bg-transparent text-wa-text text-sm outline-none resize-none placeholder:text-wa-textSec max-h-32"
            style={{ minHeight: '24px' }}
          />
        </div>

        {/* Send / Mic button */}
        {text.trim() ? (
          <button type="submit" className="p-2 rounded-full hover:bg-wa-hover text-wa-textSec flex-shrink-0 mb-0.5">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M1.101 21.757 23.8 12.028 1.101 2.3l.011 7.912 13.623 1.816-13.623 1.817-.011 7.912z"/>
            </svg>
          </button>
        ) : (
          <button type="button" className="p-2 rounded-full hover:bg-wa-hover text-wa-textSec flex-shrink-0 mb-0.5">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M11.999 14.942c2.001 0 3.531-1.53 3.531-3.531V4.35c0-2.001-1.53-3.531-3.531-3.531S8.469 2.35 8.469 4.35v7.061c0 2.001 1.53 3.531 3.53 3.531zm6.238-3.53c0 3.531-2.942 6.002-6.237 6.002s-6.237-2.471-6.237-6.002H3.761c0 4.001 3.178 7.297 7.061 7.885v3.884h2.354v-3.884c3.884-.588 7.061-3.884 7.061-7.885h-2z"/>
            </svg>
          </button>
        )}
      </form>
    </div>
  );
}

function MessageBubble({ msg, onContextMenu, onDelete, showMenu }) {
  const isOut = msg.route === 'OUTGOING';
  const msgText = getMsgText(msg.msgContext);
  const msgType = getMsgType(msg.msgContext);
  const imgUrl = getImageUrl(msg.msgContext);
  const time = formatMsgTime(msg.createdAt, msg.timestamp);

  return (
    <div className={`flex ${isOut ? 'justify-end' : 'justify-start'} msg-enter`} onContextMenu={onContextMenu}>
      <div className={`relative group max-w-[65%] rounded-lg px-2 py-1.5 ${
        isOut ? 'bg-wa-bubble rounded-tr-none' : 'bg-wa-bubbleIn rounded-tl-none'
      }`}>
        {/* Tail SVG */}
        {isOut ? (
          <span className="absolute -right-2 top-0 text-wa-bubble">
            <svg width="8" height="13" viewBox="0 0 8 13" fill="currentColor"><path d="M5.188 0H0v11.193l6.467-8.625C7.526 1.156 6.958 0 5.188 0z"/></svg>
          </span>
        ) : (
          <span className="absolute -left-2 top-0 text-wa-bubbleIn">
            <svg width="8" height="13" viewBox="0 0 8 13" fill="currentColor" style={{transform:'scaleX(-1)'}}><path d="M5.188 0H0v11.193l6.467-8.625C7.526 1.156 6.958 0 5.188 0z"/></svg>
          </span>
        )}

        {/* Image preview */}
        {msgType === 'image' && imgUrl && (
          <div className="mb-1 rounded overflow-hidden">
            <img src={imgUrl} alt="" className="max-w-full max-h-64 object-contain rounded" loading="lazy" />
          </div>
        )}

        {/* Message text */}
        <div className="flex items-end gap-2">
          <span className="text-[14.2px] text-wa-text whitespace-pre-wrap break-words leading-[19px]" style={{ wordBreak: 'break-word' }}>
            {renderLinks(msgText)}
          </span>
          <span className="flex items-center gap-0.5 flex-shrink-0 self-end ml-1 -mb-0.5">
            <span className="text-[11px] text-white/60">{time}</span>
            <StatusIcon status={msg.status} route={msg.route} />
          </span>
        </div>

        {/* Context menu for own messages */}
        {showMenu && isOut && (
          <div className="absolute right-0 top-full mt-1 z-50 bg-wa-panel rounded-lg shadow-xl border border-wa-border py-1 min-w-[140px]">
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-wa-hover"
            >
              Delete message
            </button>
          </div>
        )}

        {/* Hover dropdown arrow */}
        <button
          onClick={onContextMenu}
          className={`absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded ${isOut ? 'text-white/40 hover:text-white/70' : 'text-wa-textSec hover:text-wa-text'}`}
        >
          <svg viewBox="0 0 18 18" width="16" height="16" fill="currentColor"><path d="M3.3 4.6L9 10.3l5.7-5.7 1.6 1.6L9 13.4 1.7 6.2z"/></svg>
        </button>
      </div>
    </div>
  );
}

function renderLinks(text) {
  if (!text) return text;
  if (typeof text !== 'string') text = String(text);
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  if (parts.length === 1) return text;
  return parts.map((part, i) =>
    part.match(urlRegex)
      ? <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-wa-blue hover:underline">{part}</a>
      : <span key={i}>{part}</span>
  );
}
