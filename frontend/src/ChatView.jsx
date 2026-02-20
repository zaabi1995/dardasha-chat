import { useState, useRef, useEffect } from 'react';
import { Avatar, formatTime } from './Sidebar';

// ===== MEDIA URL HELPERS =====

// Rewrite localhost:3000 URLs to dardasha.om
function fixMediaUrl(url) {
  if (!url) return null;
  if (typeof url !== 'string') return null;
  return url
    .replace(/http:\/\/localhost:3000/g, 'https://dardasha.om')
    .replace(/http:\/\/127\.0\.0\.1:3000/g, 'https://dardasha.om');
}

// Get file extension from URL or filename
function getFileExt(url, filename) {
  const name = filename || url || '';
  const match = name.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
  return match ? match[1].toLowerCase() : '';
}

// Get document icon color based on file extension
function getDocIconColor(ext) {
  const colors = {
    pdf: '#FF4444',
    doc: '#4285F4', docx: '#4285F4',
    xls: '#34A853', xlsx: '#34A853',
    ppt: '#FF9900', pptx: '#FF9900',
    csv: '#34A853',
    zip: '#8B8B8B', rar: '#8B8B8B', '7z': '#8B8B8B',
    svg: '#FF6B35',
    xml: '#FF6B35',
    txt: '#8696a0',
  };
  return colors[ext] || '#8696a0';
}

// Get document icon label
function getDocLabel(ext) {
  if (!ext) return 'FILE';
  return ext.toUpperCase();
}

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

// ===== PARSE MESSAGE CONTEXT =====
// Supports both Dardasha format {"type":"image","image":{...}} and Baileys format {"imageMessage":{...}}

function parseMsg(msgContext) {
  if (!msgContext) return { type: 'text', text: '', mediaUrl: null, caption: '', filename: '', mimetype: '', thumbnail: null, location: null, contact: null, poll: null, quoted: null, senderName: null };
  
  const ctx = typeof msgContext === 'string' ? (() => { try { return JSON.parse(msgContext); } catch { return null; } })() : msgContext;
  if (!ctx) return { type: 'text', text: String(msgContext), mediaUrl: null, caption: '', filename: '', mimetype: '', thumbnail: null, location: null, contact: null, poll: null, quoted: null, senderName: null };

  const result = {
    type: 'text',
    text: '',
    mediaUrl: null,
    caption: '',
    filename: '',
    mimetype: '',
    thumbnail: null,
    location: null,
    contact: null,
    poll: null,
    quoted: null,
    senderName: null,
  };

  // ---- Dardasha format: {"type":"image","image":{"link":"...","caption":"..."}} ----
  if (ctx.type === 'image' && ctx.image) {
    result.type = 'image';
    result.mediaUrl = fixMediaUrl(ctx.image.link || ctx.image.url);
    result.caption = ctx.image.caption || '';
    result.thumbnail = ctx.image.jpegThumbnail ? `data:image/jpeg;base64,${ctx.image.jpegThumbnail}` : null;
    return result;
  }
  if (ctx.type === 'video' && ctx.video) {
    result.type = 'video';
    result.mediaUrl = fixMediaUrl(ctx.video.link || ctx.video.url);
    result.caption = ctx.video.caption || '';
    return result;
  }
  if (ctx.type === 'audio' && ctx.audio) {
    result.type = 'audio';
    result.mediaUrl = fixMediaUrl(ctx.audio.link || ctx.audio.url);
    result.mimetype = ctx.audio.mimetype || '';
    return result;
  }
  if (ctx.type === 'document' && ctx.document) {
    result.type = 'document';
    result.mediaUrl = fixMediaUrl(ctx.document.link || ctx.document.url);
    result.caption = ctx.document.caption || '';
    result.filename = ctx.document.fileName || ctx.document.filename || '';
    result.mimetype = ctx.document.mimetype || '';
    // Extract filename from URL if not in payload
    if (!result.filename && result.mediaUrl) {
      const urlParts = result.mediaUrl.split('/');
      result.filename = urlParts[urlParts.length - 1].split('?')[0];
    }
    return result;
  }
  if (ctx.type === 'sticker' && ctx.sticker) {
    result.type = 'sticker';
    result.mediaUrl = fixMediaUrl(ctx.sticker.link || ctx.sticker.url);
    return result;
  }
  if (ctx.type === 'location' && ctx.location) {
    result.type = 'location';
    result.location = { lat: ctx.location.latitude || ctx.location.lat, lng: ctx.location.longitude || ctx.location.lng, name: ctx.location.name || '' };
    return result;
  }
  if (ctx.type === 'contact' || ctx.type === 'contacts') {
    result.type = 'contact';
    const c = ctx.contact || ctx.contacts?.[0] || {};
    result.contact = { displayName: c.displayName || c.name || 'Contact', vcard: c.vcard || '' };
    // Parse phone from vcard
    if (result.contact.vcard) {
      const telMatch = result.contact.vcard.match(/TEL[^:]*:([^\n\r]+)/i);
      if (telMatch) result.contact.phone = telMatch[1].trim();
    }
    return result;
  }
  if (ctx.type === 'poll_creation' || ctx.poll) {
    result.type = 'poll';
    const poll = ctx.poll || {};
    result.poll = { name: poll.name || poll.question || 'Poll', options: poll.options || poll.selectableOptions || [] };
    // Normalize options to strings
    result.poll.options = result.poll.options.map(o => typeof o === 'string' ? o : (o.optionName || o.name || o.text || String(o)));
    return result;
  }

  // ---- Dardasha text format ----
  if (ctx.type === 'text' && ctx.text) {
    result.type = 'text';
    result.text = typeof ctx.text === 'string' ? ctx.text : (ctx.text.body || ctx.text.text || '');
    return result;
  }

  // ---- Baileys format: {"imageMessage":{...}} ----
  if (ctx.imageMessage) {
    result.type = 'image';
    result.mediaUrl = fixMediaUrl(ctx.imageMessage.url);
    result.caption = ctx.imageMessage.caption || '';
    result.thumbnail = ctx.imageMessage.jpegThumbnail ? `data:image/jpeg;base64,${ctx.imageMessage.jpegThumbnail}` : null;
    if (ctx.imageMessage.contextInfo?.quotedMessage) {
      result.quoted = { text: safeString(ctx.imageMessage.contextInfo.quotedMessage), participant: ctx.imageMessage.contextInfo.participant };
    }
    return result;
  }
  if (ctx.videoMessage) {
    result.type = 'video';
    result.mediaUrl = fixMediaUrl(ctx.videoMessage.url);
    result.caption = ctx.videoMessage.caption || '';
    return result;
  }
  if (ctx.audioMessage) {
    result.type = 'audio';
    result.mediaUrl = fixMediaUrl(ctx.audioMessage.url);
    result.mimetype = ctx.audioMessage.mimetype || '';
    return result;
  }
  if (ctx.documentMessage) {
    result.type = 'document';
    result.mediaUrl = fixMediaUrl(ctx.documentMessage.url);
    result.filename = ctx.documentMessage.fileName || '';
    result.caption = ctx.documentMessage.caption || '';
    result.mimetype = ctx.documentMessage.mimetype || '';
    return result;
  }
  if (ctx.stickerMessage) {
    result.type = 'sticker';
    result.mediaUrl = fixMediaUrl(ctx.stickerMessage.url);
    return result;
  }
  if (ctx.locationMessage) {
    result.type = 'location';
    result.location = { lat: ctx.locationMessage.degreesLatitude, lng: ctx.locationMessage.degreesLongitude, name: ctx.locationMessage.name || '' };
    return result;
  }
  if (ctx.contactMessage || ctx.contactsArrayMessage) {
    result.type = 'contact';
    const c = ctx.contactMessage || ctx.contactsArrayMessage?.contacts?.[0] || {};
    result.contact = { displayName: c.displayName || 'Contact', vcard: c.vcard || '' };
    if (result.contact.vcard) {
      const telMatch = result.contact.vcard.match(/TEL[^:]*:([^\n\r]+)/i);
      if (telMatch) result.contact.phone = telMatch[1].trim();
    }
    return result;
  }
  if (ctx.pollCreationMessage || ctx.pollCreationMessageV3) {
    result.type = 'poll';
    const poll = ctx.pollCreationMessage || ctx.pollCreationMessageV3 || {};
    result.poll = { name: poll.name || 'Poll', options: (poll.options || []).map(o => o.optionName || String(o)) };
    return result;
  }

  // Extended text (with link preview, quotes, etc.)
  if (ctx.extendedTextMessage) {
    result.type = 'text';
    result.text = ctx.extendedTextMessage.text || '';
    if (ctx.extendedTextMessage.contextInfo?.quotedMessage) {
      result.quoted = { text: safeString(ctx.extendedTextMessage.contextInfo.quotedMessage), participant: ctx.extendedTextMessage.contextInfo.participant };
    }
    return result;
  }

  // Template messages
  if (ctx.templateMessage) {
    result.type = 'text';
    result.text = ctx.templateMessage?.hydratedTemplate?.hydratedContentText || '📋 Template';
    return result;
  }
  if (ctx.buttonsResponseMessage) {
    result.type = 'text';
    result.text = ctx.buttonsResponseMessage.selectedDisplayText || 'Button response';
    return result;
  }
  if (ctx.listResponseMessage) {
    result.type = 'text';
    result.text = ctx.listResponseMessage.title || 'List response';
    return result;
  }

  // Plain text fallback
  if (ctx.text) { result.text = safeString(ctx.text); return result; }
  if (ctx.conversation) { result.text = safeString(ctx.conversation); return result; }

  // Last resort
  const vals = Object.values(ctx);
  for (const v of vals) if (typeof v === 'string' && v.length > 0 && v.length < 500) { result.text = v; return result; }
  result.text = '[Media]';
  return result;
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

// Check if chat is a group (Dardasha group chat_ids have a long numeric middle segment)
function isGroupChat(chatId) {
  if (!chatId) return false;
  const parts = chatId.split('_');
  // Group format: lineNum_groupId_uid or lineNum_groupId@g.us
  if (parts.length >= 2) {
    const mid = parts[1];
    return /^\d{15,}$/.test(mid) || mid.includes('@g.us');
  }
  return false;
}

export default function ChatView({ chat, messages, loading, onSend, onDelete, activeLine }) {
  const [text, setText] = useState('');
  const [contextMenu, setContextMenu] = useState(null);
  const [lightbox, setLightbox] = useState(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const prevLenRef = useRef(0);

  const chatName = chat.displayName || chat.chat_label || chat.sender_name || chat.sender_mobile || 'Unknown';
  const isGroup = isGroupChat(chat.chat_id);

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
          <p className="text-wa-textSec text-xs truncate">
            {isGroup ? 'Group' : chat.sender_mobile || ''}
          </p>
        </div>
        <div className="flex items-center gap-1">
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
                  isGroup={isGroup}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    if (msg.route === 'OUTGOING') setContextMenu({ id: msg.id, x: e.clientX, y: e.clientY });
                  }}
                  onDelete={() => { onDelete(msg.id); setContextMenu(null); }}
                  showMenu={contextMenu?.id === msg.id}
                  onImageClick={(url) => setLightbox(url)}
                />
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Image lightbox */}
      {lightbox && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center" onClick={() => setLightbox(null)}>
          <button className="absolute top-4 right-4 text-white/70 hover:text-white" onClick={() => setLightbox(null)}>
            <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
          </button>
          <img src={lightbox} alt="" className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg" onClick={e => e.stopPropagation()} />
        </div>
      )}

      {/* Message input */}
      <form onSubmit={handleSubmit} className="bg-wa-panel px-4 py-2.5 flex items-end gap-2 flex-shrink-0">
        <button type="button" className="p-2 rounded-full hover:bg-wa-hover text-wa-textSec flex-shrink-0 mb-0.5">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
            <path d="M9.153 11.603c.795 0 1.439-.879 1.439-1.962s-.644-1.962-1.439-1.962-1.439.879-1.439 1.962.644 1.962 1.439 1.962zm5.694 0c.795 0 1.439-.879 1.439-1.962s-.644-1.962-1.439-1.962-1.439.879-1.439 1.962.644 1.962 1.439 1.962zM11.984 2C6.486 2 2.029 6.486 2.029 12s4.457 10 9.955 10 9.984-4.486 9.984-10S17.482 2 11.984 2zM12 20c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8zm.358-3.168c-1.806 0-3.461-1.006-4.273-2.596a.506.506 0 0 1 .904-.455c.637 1.248 1.927 2.03 3.369 2.03s2.732-.782 3.369-2.03a.506.506 0 1 1 .904.455c-.812 1.59-2.467 2.596-4.273 2.596z"/>
          </svg>
        </button>

        <button type="button" className="p-2 rounded-full hover:bg-wa-hover text-wa-textSec flex-shrink-0 mb-0.5">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
            <path d="M1.816 15.556v.002c0 1.502.584 2.912 1.646 3.972s2.472 1.647 3.974 1.647a5.58 5.58 0 0 0 3.972-1.645l9.547-9.548c.769-.768 1.147-1.767 1.058-2.817-.079-.968-.548-1.927-1.319-2.698-1.594-1.592-4.068-1.711-5.517-.262l-7.916 7.915c-.881.881-.792 2.25.214 3.261.501.501 1.122.779 1.745.779.548 0 1.06-.218 1.44-.6l6.37-6.37a.554.554 0 0 0-.783-.784l-6.369 6.37c-.363.362-.988.34-1.699-.373-.71-.713-.727-1.337-.366-1.698l7.916-7.916c.969-.968 2.794-.867 3.932.271.58.578.905 1.271.955 1.948.052.694-.217 1.377-.757 1.917l-9.547 9.548a4.48 4.48 0 0 1-3.189 1.319 4.486 4.486 0 0 1-3.19-1.318c-1.756-1.756-1.756-4.624 0-6.38l9.232-9.231a.554.554 0 0 0-.783-.784l-9.232 9.232c-2.189 2.189-2.189 5.758 0 7.949z"/>
          </svg>
        </button>

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

// ===== SENDER NAME COLORS FOR GROUP CHATS =====
const senderColors = [
  '#fe5f55', '#53bdeb', '#f5ab35', '#7ec8e3', '#ff9ff3',
  '#54a0ff', '#5f27cd', '#01a3a4', '#f368e0', '#ff6348',
  '#2ed573', '#ffa502', '#70a1ff', '#ff4757', '#1dd1a1'
];

function getSenderColor(name) {
  if (!name) return senderColors[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return senderColors[Math.abs(hash) % senderColors.length];
}

function MessageBubble({ msg, isGroup, onContextMenu, onDelete, showMenu, onImageClick }) {
  const isOut = msg.route === 'OUTGOING';
  const parsed = parseMsg(msg.msgContext);
  const time = formatMsgTime(msg.createdAt, msg.timestamp);
  const senderName = (!isOut && isGroup) ? (msg.senderName || '') : '';

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

        {/* Group sender name */}
        {senderName && (
          <div className="text-[12.5px] font-medium mb-0.5 truncate" style={{ color: getSenderColor(senderName) }}>
            {senderName}
          </div>
        )}

        {/* Quoted message */}
        {parsed.quoted && (
          <div className="bg-black/20 rounded px-2 py-1 mb-1 border-l-4 border-wa-green">
            <p className="text-[11px] text-wa-textSec truncate">{parsed.quoted.text}</p>
          </div>
        )}

        {/* ==== MEDIA RENDERERS ==== */}
        <MediaContent parsed={parsed} onImageClick={onImageClick} />

        {/* Message text / caption */}
        <div className="flex items-end gap-2">
          <span className="text-[14.2px] text-wa-text whitespace-pre-wrap break-words leading-[19px] min-w-0" style={{ wordBreak: 'break-word' }}>
            {parsed.type === 'text' ? renderLinks(parsed.text) : 
             (parsed.caption ? renderLinks(parsed.caption) : 
              (parsed.type === 'image' || parsed.type === 'video' || parsed.type === 'audio' || parsed.type === 'document' || parsed.type === 'sticker' || parsed.type === 'location' || parsed.type === 'contact' || parsed.type === 'poll') ? null :
              renderLinks(parsed.text)
             )
            }
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


function MediaContent({ parsed, onImageClick }) {
  // ---- IMAGE ----
  if (parsed.type === 'image') {
    const src = parsed.mediaUrl || parsed.thumbnail;
    if (!src) return <div className="mb-1 text-wa-textSec text-sm">📷 Photo</div>;
    return (
      <div className="mb-1 rounded overflow-hidden cursor-pointer" onClick={() => onImageClick(parsed.mediaUrl || src)}>
        <img src={src} alt="" className="max-w-full max-h-72 object-contain rounded" loading="lazy"
          onError={(e) => { if (parsed.thumbnail && e.target.src !== parsed.thumbnail) e.target.src = parsed.thumbnail; }} />
      </div>
    );
  }

  // ---- VIDEO ----
  if (parsed.type === 'video') {
    if (!parsed.mediaUrl) return <div className="mb-1 text-wa-textSec text-sm">🎬 Video</div>;
    return (
      <div className="mb-1 rounded overflow-hidden">
        <video
          src={parsed.mediaUrl}
          controls
          preload="metadata"
          className="max-w-full max-h-72 rounded"
          style={{ background: '#000' }}
        />
      </div>
    );
  }

  // ---- AUDIO / PTT ----
  if (parsed.type === 'audio') {
    if (!parsed.mediaUrl) return <div className="mb-1 text-wa-textSec text-sm">🎤 Voice message</div>;
    return (
      <div className="mb-1 flex items-center gap-2 min-w-[240px]">
        <div className="w-10 h-10 rounded-full bg-wa-green flex items-center justify-center flex-shrink-0">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="white">
            <path d="M11.999 14.942c2.001 0 3.531-1.53 3.531-3.531V4.35c0-2.001-1.53-3.531-3.531-3.531S8.469 2.35 8.469 4.35v7.061c0 2.001 1.53 3.531 3.53 3.531z"/>
          </svg>
        </div>
        <audio src={parsed.mediaUrl} controls preload="metadata" className="flex-1 h-10" style={{ maxWidth: '280px' }} />
      </div>
    );
  }

  // ---- DOCUMENT ----
  if (parsed.type === 'document') {
    const filename = parsed.filename || 'Document';
    const ext = getFileExt(parsed.mediaUrl, filename);
    const iconColor = getDocIconColor(ext);
    const label = getDocLabel(ext);

    return (
      <a
        href={parsed.mediaUrl || '#'}
        target="_blank"
        rel="noopener noreferrer"
        className="mb-1 flex items-center gap-3 bg-black/20 rounded-lg p-3 hover:bg-black/30 transition-colors no-underline min-w-[200px]"
        onClick={(e) => { if (!parsed.mediaUrl) e.preventDefault(); }}
      >
        {/* File icon */}
        <div className="w-10 h-12 rounded flex flex-col items-center justify-center flex-shrink-0 relative" style={{ backgroundColor: iconColor + '22', border: `1px solid ${iconColor}44` }}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill={iconColor}>
            <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zM6 20V4h7v5h5v11H6z"/>
          </svg>
          <span className="text-[8px] font-bold mt-0.5" style={{ color: iconColor }}>{label}</span>
        </div>
        {/* File info */}
        <div className="flex-1 min-w-0">
          <p className="text-wa-text text-[13px] truncate">{filename}</p>
          <p className="text-wa-textSec text-[11px] mt-0.5">{label} file</p>
        </div>
        {/* Download icon */}
        <svg viewBox="0 0 24 24" width="20" height="20" fill="#8696a0" className="flex-shrink-0">
          <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
        </svg>
      </a>
    );
  }

  // ---- STICKER ----
  if (parsed.type === 'sticker') {
    if (!parsed.mediaUrl) return <div className="mb-1 text-2xl">🏷️</div>;
    return (
      <div className="mb-1">
        <img src={parsed.mediaUrl} alt="Sticker" className="w-32 h-32 object-contain" loading="lazy"
          onError={(e) => { e.target.style.display = 'none'; e.target.insertAdjacentHTML('afterend', '<span style="font-size:48px">🏷️</span>'); }} />
      </div>
    );
  }

  // ---- LOCATION ----
  if (parsed.type === 'location' && parsed.location) {
    const { lat, lng, name } = parsed.location;
    const mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
    const staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=15&size=300x200&markers=color:red%7C${lat},${lng}&key=`;
    return (
      <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="mb-1 block no-underline">
        <div className="bg-black/20 rounded-lg overflow-hidden min-w-[200px]">
          {/* Map placeholder with pin icon */}
          <div className="h-32 bg-gradient-to-br from-green-900/40 to-blue-900/40 flex items-center justify-center relative">
            <svg viewBox="0 0 24 24" width="48" height="48" fill="#00a884" className="opacity-60">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
            <div className="absolute bottom-2 left-2 right-2 bg-black/50 rounded px-2 py-1">
              <p className="text-white text-xs truncate">{name || `${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)}`}</p>
            </div>
          </div>
          <div className="p-2 flex items-center gap-2">
            <span className="text-wa-green text-xs">📍 Open in Google Maps</span>
          </div>
        </div>
      </a>
    );
  }

  // ---- CONTACT / VCARD ----
  if (parsed.type === 'contact' && parsed.contact) {
    const { displayName, phone } = parsed.contact;
    return (
      <div className="mb-1 bg-black/20 rounded-lg p-3 min-w-[200px]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-wa-green/30 flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="#00a884">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-wa-text text-[13px] font-medium truncate">👤 {displayName}</p>
            {phone && <p className="text-wa-textSec text-[12px] mt-0.5">{phone}</p>}
          </div>
        </div>
      </div>
    );
  }

  // ---- POLL ----
  if (parsed.type === 'poll' && parsed.poll) {
    return (
      <div className="mb-1 bg-black/20 rounded-lg p-3 min-w-[220px]">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">📊</span>
          <p className="text-wa-text text-[14px] font-medium">{parsed.poll.name}</p>
        </div>
        <div className="space-y-1.5">
          {parsed.poll.options.map((opt, i) => (
            <div key={i} className="bg-black/20 rounded px-3 py-1.5 text-wa-text text-[13px] border border-white/10">
              {opt}
            </div>
          ))}
        </div>
        <p className="text-wa-textSec text-[11px] mt-2">Tap to vote in WhatsApp</p>
      </div>
    );
  }

  return null;
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
