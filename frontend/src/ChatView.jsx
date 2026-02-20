import { useState, useRef, useEffect } from 'react';
import { Avatar, formatTime } from './Sidebar';

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

function getFileExt(fileName, url) {
  const name = fileName || url || '';
  const match = name.match(/\.(\w+)(?:\?.*)?$/);
  return match ? match[1].toUpperCase() : 'FILE';
}

function getDocColor(ext) {
  const e = (ext || '').toUpperCase();
  if (e === 'PDF') return '#E53E3E';
  if (['DOC', 'DOCX'].includes(e)) return '#3182CE';
  if (['XLS', 'XLSX', 'CSV'].includes(e)) return '#38A169';
  if (['PPT', 'PPTX'].includes(e)) return '#DD6B20';
  if (['ZIP', 'RAR', '7Z'].includes(e)) return '#805AD5';
  return '#718096';
}

function getSenderColor(name) {
  const colors = ['#25D366','#34B7F1','#FF6B6B','#FFD93D','#6BCB77','#4D96FF','#FF922B','#CC5DE8','#20C997','#FF8787'];
  let hash = 0;
  for (let i = 0; i < (name||'').length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function getMsgDisplayText(msg) {
  if (msg.textContent) return msg.textContent;
  if (msg.caption) return msg.caption;
  const ctx = msg.msgContext;
  if (!ctx) return '';
  if (typeof ctx === 'string') return ctx;
  if (ctx.text?.body) return ctx.text.body;
  if (typeof ctx.text === 'string') return ctx.text;
  if (ctx.conversation) return ctx.conversation;
  if (ctx.extendedTextMessage?.text) return ctx.extendedTextMessage.text;
  return '';
}

function TimeStamp({ time, status, route }) {
  return (
    <span className="flex items-center gap-0.5 flex-shrink-0 ml-1">
      <span className="text-[11px] text-white/60">{time}</span>
      <StatusIcon status={status} route={route} />
    </span>
  );
}

export default function ChatView({ chat, messages, loading, onSend, onDelete, activeLine }) {
  const [text, setText] = useState('');
  const [contextMenu, setContextMenu] = useState(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const prevLenRef = useRef(0);

  const chatName = chat.displayName || chat.chat_label || chat.sender_name || chat.sender_mobile || 'Unknown';
  const isGroup = chat.isGroup || false;

  useEffect(() => {
    if (messages.length > prevLenRef.current || prevLenRef.current === 0) {
      bottomRef.current?.scrollIntoView({ behavior: messages.length - prevLenRef.current > 5 ? 'auto' : 'smooth' });
    }
    prevLenRef.current = messages.length;
  }, [messages.length]);

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
      <div className="bg-wa-panel px-4 py-2.5 flex items-center gap-3 flex-shrink-0 border-b border-wa-border">
        <Avatar name={chatName} />
        <div className="flex-1 min-w-0">
          <h3 className="text-wa-text text-[16px] font-medium truncate">{chatName}</h3>
          <p className="text-wa-textSec text-xs truncate">{chat.sender_mobile || ''}</p>
        </div>
      </div>

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
                />
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="bg-wa-panel px-4 py-2.5 flex items-end gap-2 flex-shrink-0">
        <button type="button" className="p-2 rounded-full hover:bg-wa-hover text-wa-textSec flex-shrink-0 mb-0.5">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
            <path d="M9.153 11.603c.795 0 1.439-.879 1.439-1.962s-.644-1.962-1.439-1.962-1.439.879-1.439 1.962.644 1.962 1.439 1.962zm5.694 0c.795 0 1.439-.879 1.439-1.962s-.644-1.962-1.439-1.962-1.439.879-1.439 1.962.644 1.962 1.439 1.962zM11.984 2C6.486 2 2.029 6.486 2.029 12s4.457 10 9.955 10 9.984-4.486 9.984-10S17.482 2 11.984 2zM12 20c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8zm.358-3.168c-1.806 0-3.461-1.006-4.273-2.596a.506.506 0 0 1 .904-.455c.637 1.248 1.927 2.03 3.369 2.03s2.732-.782 3.369-2.03a.506.506 0 1 1 .904.455c-.812 1.59-2.467 2.596-4.273 2.596z"/>
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

function MessageBubble({ msg, isGroup, onContextMenu, onDelete, showMenu }) {
  const isOut = msg.route === 'OUTGOING';
  const time = formatMsgTime(msg.createdAt, msg.timestamp);
  const pType = msg.parsedType || msg.type || 'text';
  const displayText = getMsgDisplayText(msg);

  // Determine what content to render
  const hasMedia = ['image','video','audio','document','sticker','location','contact','interactive','poll'].includes(pType);

  return (
    <div className={`flex ${isOut ? 'justify-end' : 'justify-start'} msg-enter relative ${msg.reaction ? 'mb-4' : ''}`} onContextMenu={onContextMenu}>
      <div className={`relative group max-w-[65%] rounded-lg px-2 py-1.5 ${
        isOut ? 'bg-wa-bubble rounded-tr-none' : 'bg-wa-bubbleIn rounded-tl-none'
      }`}>
        {/* Tail */}
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
        {isGroup && !isOut && msg.senderName && (
          <div className="text-xs font-medium mb-0.5 truncate" style={{color: getSenderColor(msg.senderName)}}>
            {msg.senderName}
          </div>
        )}

        {/* Reply/quoted message */}
        {msg.quotedMsg && (
          <div className="mb-1 rounded px-2 py-1.5 text-xs" style={{borderLeft:'3px solid #00a884', background:'rgba(0,0,0,0.1)'}}>
            <span className="text-wa-textSec" style={{display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',overflow:'hidden'}}>{msg.quotedMsg.text || '[Media]'}</span>
          </div>
        )}

        {/* IMAGE */}
        {pType === 'image' && msg.mediaUrl && (
          <div className="mb-1 rounded overflow-hidden">
            <img src={msg.mediaUrl} alt="" style={{maxWidth:280,borderRadius:8,cursor:'pointer'}} onClick={() => window.open(msg.mediaUrl)} loading="lazy" />
          </div>
        )}

        {/* VIDEO */}
        {pType === 'video' && msg.mediaUrl && (
          <div className="mb-1 rounded overflow-hidden">
            <video src={msg.mediaUrl} controls style={{maxWidth:280,borderRadius:8}} preload="metadata" />
          </div>
        )}

        {/* AUDIO */}
        {pType === 'audio' && msg.mediaUrl && (
          <div className="mb-1">
            <audio src={msg.mediaUrl} controls style={{width:220}} preload="metadata" />
          </div>
        )}

        {/* DOCUMENT */}
        {pType === 'document' && msg.mediaUrl && (() => {
          const ext = getFileExt(msg.fileName, msg.mediaUrl);
          const color = getDocColor(ext);
          const fName = msg.fileName || 'Document';
          return (
            <a href={msg.mediaUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 mb-1 p-2 rounded-lg hover:opacity-80 transition-opacity no-underline"
              style={{minWidth:200,background:'rgba(0,0,0,0.1)'}}>
              <div className="flex-shrink-0 w-10 h-10 rounded flex items-center justify-center text-white font-bold text-xs" style={{backgroundColor:color}}>
                {ext}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-wa-text text-sm truncate">{fName}</div>
                <div className="text-wa-textSec text-xs">{ext} · Tap to open</div>
              </div>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="#8696a0" className="flex-shrink-0">
                <path d="M12 16l-6-6h4V4h4v6h4l-6 6zm-6 2h12v2H6v-2z"/>
              </svg>
            </a>
          );
        })()}

        {/* STICKER */}
        {pType === 'sticker' && msg.mediaUrl && (
          <div className="mb-1">
            <img src={msg.mediaUrl} alt="Sticker" style={{width:120,height:120,objectFit:'contain'}} loading="lazy" />
          </div>
        )}

        {/* LOCATION */}
        {pType === 'location' && msg.locationData && (() => {
          const { latitude, longitude, name, address } = msg.locationData;
          const mapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
          return (
            <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="block mb-1 no-underline">
              <div className="rounded-lg overflow-hidden" style={{width:260,background:'rgba(0,0,0,0.1)'}}>
                <div className="flex items-center justify-center h-28 relative" style={{background:'linear-gradient(135deg, rgba(0,168,132,0.3), rgba(52,183,241,0.3))'}}>
                  <span className="text-5xl">📍</span>
                  <div className="absolute bottom-1 right-1 text-white text-[10px] px-1.5 py-0.5 rounded" style={{background:'rgba(0,0,0,0.5)'}}>
                    {latitude?.toFixed(4)}, {longitude?.toFixed(4)}
                  </div>
                </div>
                <div className="p-2">
                  <div className="text-wa-text text-sm font-medium">{name || 'Location'}</div>
                  {address && <div className="text-wa-textSec text-xs">{address}</div>}
                  <div className="text-xs mt-0.5" style={{color:'#00a884'}}>Open in Google Maps →</div>
                </div>
              </div>
            </a>
          );
        })()}

        {/* CONTACT */}
        {pType === 'contact' && msg.contactData && (() => {
          const { name, phone } = msg.contactData;
          return (
            <div className="mb-1 p-2 rounded-lg" style={{minWidth:200,background:'rgba(0,0,0,0.1)'}}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl" style={{background:'rgba(255,255,255,0.1)'}}>👤</div>
                <div className="flex-1 min-w-0">
                  <div className="text-wa-text text-sm font-medium truncate">{name || 'Contact'}</div>
                  {phone && <div className="text-wa-textSec text-xs">{phone}</div>}
                </div>
              </div>
            </div>
          );
        })()}

        {/* INTERACTIVE / BUTTONS */}
        {pType === 'interactive' && msg.interactiveData && (
          <div className="mb-1">
            {msg.interactiveData.body && (
              <div className="text-[14.2px] text-wa-text whitespace-pre-wrap break-words mb-2">{renderLinks(msg.interactiveData.body)}</div>
            )}
            {msg.interactiveData.buttons?.length > 0 && (
              <div className="space-y-1">
                {msg.interactiveData.buttons.map((btn, i) => (
                  <div key={i} className="text-center text-sm py-1.5 border rounded-lg" style={{color:'#00a884',borderColor:'rgba(0,168,132,0.3)',background:'rgba(0,0,0,0.05)'}}>
                    {btn}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* POLL */}
        {pType === 'poll' && msg.pollData && (
          <div className="mb-1">
            <div className="text-wa-text text-sm font-medium mb-2">📊 {msg.pollData.question}</div>
            <div className="space-y-1">
              {msg.pollData.options?.map((opt, i) => (
                <div key={i} className="text-wa-text text-sm py-1.5 px-3 border rounded-lg" style={{borderColor:'rgba(0,168,132,0.3)',background:'rgba(0,0,0,0.05)'}}>
                  {opt}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TEXT + TIMESTAMP */}
        {displayText ? (
          <div className="flex items-end gap-2">
            <span className="text-[14.2px] text-wa-text whitespace-pre-wrap break-words leading-[19px]" style={{wordBreak:'break-word'}}>
              {renderLinks(displayText)}
            </span>
            <TimeStamp time={time} status={msg.status} route={msg.route} />
          </div>
        ) : (
          <div className="flex justify-end items-center gap-0.5 mt-0.5">
            <TimeStamp time={time} status={msg.status} route={msg.route} />
          </div>
        )}

        {/* Reaction emoji */}
        {msg.reaction && (
          <div className="absolute -bottom-3 left-2 rounded-full px-1.5 py-0.5 shadow text-base z-10" style={{background:'var(--wa-panel, #202c33)',border:'1px solid var(--wa-border, #2a3942)'}}>
            {msg.reaction}
          </div>
        )}

        {/* Context menu */}
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

        {/* Hover menu arrow */}
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
