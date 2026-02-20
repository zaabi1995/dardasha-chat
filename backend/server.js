const express = require('express');
const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
const axios = require('axios');
const { execSync } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3456;
const JWT_SECRET = 'bhd_chat_secret_2026';
const LOGIN_PASSWORD = 'H@ider92';

app.use(cors());
app.use(express.json());

// MySQL pool
const pool = mysql.createPool({
  host: '127.0.0.1',
  port: 3306,
  user: 'wacrm',
  password: 'XdbDAdX3crnDyF6m',
  database: 'wacrm',
  waitForConnections: true,
  connectionLimit: 10,
  charset: 'utf8mb4'
});

// ===== Odoo Contact Name Enrichment =====
const normalizePhone = (phone) => {
  if (!phone) return null;
  let p = phone.replace(/[\s\-\(\)\+]/g, '');
  if (p.startsWith('00968')) p = p.slice(2);
  if (p.startsWith('968') && p.length === 11) return p;
  if (p.length === 8 && /^[2-9]/.test(p)) return '968' + p;
  return p;
};

let odooContactsCache = {};
let odooContactsCacheTime = 0;
const ODOO_CACHE_TTL = 5 * 60 * 1000;

const refreshOdooContacts = () => {
  try {
    const result = execSync('python3 /opt/bhd-chat/backend/odoo_contacts.py', { timeout: 15000 }).toString().trim();
    odooContactsCache = JSON.parse(result);
    odooContactsCacheTime = Date.now();
    console.log(`[Odoo] Loaded ${Object.keys(odooContactsCache).length} contacts`);
  } catch (e) {
    console.error('[Odoo] Failed to refresh contacts:', e.message);
  }
};

const getOdooContactName = (senderMobile) => {
  if (Date.now() - odooContactsCacheTime > ODOO_CACHE_TTL) {
    refreshOdooContacts();
  }
  if (!senderMobile) return null;
  const normalized = normalizePhone(senderMobile);
  return normalized ? (odooContactsCache[normalized] || null) : null;
};

refreshOdooContacts();

// ===== URL rewriting =====
function fixMediaUrl(url) {
  if (!url) return url;
  return url.replace(/http:\/\/localhost:3000/g, 'https://dardasha.om');
}

// ===== Shared message parser =====
function parseMessageRow(row) {
  let msgContext = null;
  try {
    msgContext = typeof row.msgContext === 'string' ? JSON.parse(row.msgContext) : row.msgContext;
  } catch(e) {
    msgContext = row.msgContext;
  }

  // Parse context (quoted/reply message)
  let quotedMsg = null;
  if (row.context) {
    try {
      const ctx = typeof row.context === 'string' ? JSON.parse(row.context) : row.context;
      if (ctx) {
        if (ctx.conversation) {
          quotedMsg = { text: ctx.conversation };
        } else if (ctx.extendedTextMessage?.text) {
          quotedMsg = { text: ctx.extendedTextMessage.text };
        } else if (ctx.imageMessage) {
          quotedMsg = { text: '📷 Photo' };
        } else if (ctx.videoMessage) {
          quotedMsg = { text: '🎬 Video' };
        } else if (ctx.audioMessage) {
          quotedMsg = { text: '🎤 Voice message' };
        } else if (ctx.documentMessage) {
          quotedMsg = { text: '📄 ' + (ctx.documentMessage.fileName || 'Document') };
        } else {
          // try to get any text
          const vals = Object.values(ctx);
          for (const v of vals) {
            if (typeof v === 'string' && v.length > 0 && v.length < 500) {
              quotedMsg = { text: v };
              break;
            }
          }
        }
      }
    } catch(e) {}
  }

  // Determine parsed type and extract media info
  let parsedType = row.type || 'text';
  let mediaUrl = null;
  let caption = null;
  let fileName = null;
  let locationData = null;
  let contactData = null;
  let interactiveData = null;
  let pollData = null;

  if (msgContext && typeof msgContext === 'object') {
    const dbType = msgContext.type || parsedType;

    // Image
    if (dbType === 'image' || msgContext.imageMessage || msgContext.image) {
      parsedType = 'image';
      const img = msgContext.image || msgContext.imageMessage || {};
      mediaUrl = fixMediaUrl(img.link || img.url || null);
      caption = img.caption || null;
      if (!mediaUrl && img.jpegThumbnail) {
        mediaUrl = 'data:image/jpeg;base64,' + img.jpegThumbnail;
      }
    }
    // Video
    else if (dbType === 'video' || msgContext.videoMessage || msgContext.video) {
      parsedType = 'video';
      const vid = msgContext.video || msgContext.videoMessage || {};
      mediaUrl = fixMediaUrl(vid.link || vid.url || null);
      caption = vid.caption || null;
    }
    // Audio
    else if (dbType === 'audio' || msgContext.audioMessage || msgContext.audio) {
      parsedType = 'audio';
      const aud = msgContext.audio || msgContext.audioMessage || {};
      mediaUrl = fixMediaUrl(aud.link || aud.url || null);
    }
    // Document
    else if (dbType === 'document' || msgContext.documentMessage || msgContext.document) {
      parsedType = 'document';
      const doc = msgContext.document || msgContext.documentMessage || {};
      mediaUrl = fixMediaUrl(doc.link || doc.url || null);
      caption = doc.caption || null;
      // Extract filename from link or caption
      if (doc.fileName) {
        fileName = doc.fileName;
      } else if (doc.link) {
        const parts = doc.link.split('/');
        fileName = parts[parts.length - 1] || 'Document';
      } else if (mediaUrl) {
        const parts = mediaUrl.split('/');
        fileName = parts[parts.length - 1] || 'Document';
      }
    }
    // Sticker
    else if (dbType === 'sticker' || msgContext.stickerMessage || msgContext.sticker) {
      parsedType = 'sticker';
      const stk = msgContext.sticker || msgContext.stickerMessage || {};
      mediaUrl = fixMediaUrl(stk.link || stk.url || null);
    }
    // Location
    else if (dbType === 'location' || msgContext.locationMessage || msgContext.location) {
      parsedType = 'location';
      const loc = msgContext.location || msgContext.locationMessage || {};
      locationData = {
        latitude: loc.latitude || loc.degreesLatitude || null,
        longitude: loc.longitude || loc.degreesLongitude || null,
        name: loc.name || null,
        address: loc.address || null
      };
    }
    // Contact
    else if (dbType === 'contact' || msgContext.contactMessage || msgContext.contact || msgContext.contactsArrayMessage) {
      parsedType = 'contact';
      const ct = msgContext.contact || msgContext.contactMessage || {};
      const vcard = ct.vcard || '';
      let cName = ct.name || ct.displayName || null;
      let cPhone = null;
      // Parse vCard
      if (vcard) {
        const fnMatch = vcard.match(/FN[;:]([^\n\r]+)/);
        if (fnMatch) cName = fnMatch[1].trim();
        const telMatch = vcard.match(/TEL[^:]*:([\+\d\s]+)/);
        if (telMatch) cPhone = telMatch[1].trim();
      }
      contactData = { name: cName, phone: cPhone, vcard: vcard };
    }
    // Interactive (buttons)
    else if (dbType === 'interactive' || dbType === 'button' || msgContext.interactive) {
      parsedType = 'interactive';
      const inter = msgContext.interactive || msgContext;
      const bodyText = inter.body?.text || null;
      const buttons = inter.action?.buttons?.map(b => b.reply?.title || b.title || '') || [];
      interactiveData = { body: bodyText, buttons: buttons };
    }
    // Poll
    else if (dbType === 'poll_creation' || msgContext.pollCreationMessage) {
      parsedType = 'poll';
      const poll = msgContext.pollCreationMessage || msgContext;
      pollData = {
        question: poll.name || poll.question || 'Poll',
        options: (poll.options || []).map(o => o.optionName || o.name || o)
      };
    }
    // Reaction
    else if (dbType === 'reaction' || msgContext.reactionMessage) {
      parsedType = 'reaction';
    }
    // Text types
    else if (msgContext.text?.body) {
      parsedType = 'text';
    } else if (msgContext.conversation) {
      parsedType = 'text';
    } else if (msgContext.extendedTextMessage?.text) {
      parsedType = 'text';
    }
  }

  // Extract text content
  let textContent = null;
  if (msgContext && typeof msgContext === 'object') {
    if (msgContext.text?.body) textContent = msgContext.text.body;
    else if (typeof msgContext.text === 'string') textContent = msgContext.text;
    else if (msgContext.conversation) textContent = msgContext.conversation;
    else if (msgContext.extendedTextMessage?.text) textContent = msgContext.extendedTextMessage.text;
    else if (caption) textContent = caption;
    else if (interactiveData?.body) textContent = interactiveData.body;
  } else if (typeof msgContext === 'string') {
    textContent = msgContext;
  }

  return {
    ...row,
    msgContext: msgContext,
    parsedType: parsedType,
    textContent: textContent,
    mediaUrl: mediaUrl,
    caption: caption,
    fileName: fileName,
    locationData: locationData,
    contactData: contactData,
    interactiveData: interactiveData,
    pollData: pollData,
    quotedMsg: quotedMsg,
    reaction: row.reaction || null,
    senderName: row.senderName || null,
    senderMobile: row.senderMobile || null
  };
}

// ===== Sidebar preview =====
function getSidebarPreview(row) {
  const parsed = parseMessageRow(row);
  switch (parsed.parsedType) {
    case 'image': return '📷 Photo' + (parsed.caption ? ': ' + parsed.caption.substring(0, 40) : '');
    case 'video': return '🎬 Video' + (parsed.caption ? ': ' + parsed.caption.substring(0, 40) : '');
    case 'audio': return '🎤 Voice message';
    case 'document': return '📎 ' + (parsed.fileName || 'Document');
    case 'sticker': return '🏷️ Sticker';
    case 'location': return '📍 ' + (parsed.locationData?.name || 'Location');
    case 'contact': return '👤 ' + (parsed.contactData?.name || 'Contact');
    case 'interactive': return parsed.interactiveData?.body || '📋 Interactive';
    case 'poll': return '📊 ' + (parsed.pollData?.question || 'Poll');
    case 'reaction': return parsed.reaction || '👍';
    default: return parsed.textContent ? parsed.textContent.substring(0, 80) : '';
  }
}

// Auth middleware
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const token = authHeader.split(' ')[1];
    jwt.verify(token, JWT_SECRET);
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Login
app.post('/api/login', (req, res) => {
  const { password } = req.body;
  if (password === LOGIN_PASSWORD) {
    const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '30d' });
    return res.json({ token });
  }
  return res.status(401).json({ error: 'Wrong password' });
});

// Get WA lines — only ACTIVE instances
app.get('/api/lines', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT i.uid, i.number, i.title, i.status, u.api_key FROM instance i JOIN user u ON i.uid = u.uid WHERE i.number IS NOT NULL AND i.number != '' AND UPPER(i.status) = 'ACTIVE'`
    );
    const lines = rows.map(r => ({
      uid: r.uid,
      number: r.number,
      name: r.title || r.number,
      api_key: r.api_key
    }));
    res.json(lines);
  } catch (e) {
    console.error('GET /api/lines error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Get chats for a line
app.get('/api/chats/:lineUid', authMiddleware, async (req, res) => {
  try {
    const { lineUid } = req.params;
    const search = req.query.search || '';
    const [inst] = await pool.query('SELECT number FROM instance WHERE uid = ?', [lineUid]);
    if (!inst.length) return res.status(404).json({ error: 'Line not found' });
    const lineNum = inst[0].number;

    let query = `SELECT * FROM beta_chats WHERE chat_id LIKE ? ORDER BY updatedAt DESC`;
    let params = [`${lineNum}_%`];

    if (search) {
      query = `SELECT * FROM beta_chats WHERE chat_id LIKE ? AND (sender_name LIKE ? OR sender_mobile LIKE ? OR chat_label LIKE ?) ORDER BY updatedAt DESC`;
      params = [`${lineNum}_%`, `%${search}%`, `%${search}%`, `%${search}%`];
    }

    const [rows] = await pool.query(query, params);

    // For each chat, get the last message for better preview
    const chats = await Promise.all(rows.map(async (r) => {
      let lastMsg = null;
      let profile = null;
      try { lastMsg = typeof r.last_message === 'string' ? JSON.parse(r.last_message) : r.last_message; } catch(e) {}
      try { profile = typeof r.profile === 'string' ? JSON.parse(r.profile) : r.profile; } catch(e) {}

      const odooName = getOdooContactName(r.sender_mobile);

      // Get last message from beta_conversation for rich preview
      let preview = '';
      try {
        const [lastMsgs] = await pool.query(
          'SELECT * FROM beta_conversation WHERE chat_id = ? ORDER BY id DESC LIMIT 1', [r.chat_id]
        );
        if (lastMsgs.length) {
          preview = getSidebarPreview(lastMsgs[0]);
        }
      } catch(e) {}

      // Determine if this is a group chat
      const parts = r.chat_id.split('_');
      const contactId = parts.slice(1).join('_');
      const isGroup = contactId.length >= 15 && /^\d+$/.test(contactId.replace(/_[^_]+$/, ''));

      return {
        ...r,
        last_message: lastMsg,
        profile: profile,
        preview: preview,
        isGroup: isGroup,
        displayName: r.chat_label || odooName || (r.sender_name && r.sender_name !== 'API' ? r.sender_name : null) || r.sender_mobile || 'Unknown'
      };
    }));
    res.json(chats);
  } catch (e) {
    console.error('GET /api/chats error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Get messages for a chat (with full parsing)
app.get('/api/messages/:chatId', authMiddleware, async (req, res) => {
  try {
    const { chatId } = req.params;
    const limit = parseInt(req.query.limit) || 100;
    const before = req.query.before || null;

    let query = `SELECT * FROM beta_conversation WHERE chat_id = ?`;
    let params = [chatId];

    if (before) {
      query += ` AND id < ?`;
      params.push(before);
    }

    query += ` ORDER BY id DESC LIMIT ?`;
    params.push(limit);

    const [rows] = await pool.query(query, params);
    const messages = rows.map(row => parseMessageRow(row));
    res.json(messages.reverse());
  } catch (e) {
    console.error('GET /api/messages error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Send message
app.post('/api/send', authMiddleware, async (req, res) => {
  try {
    const { lineUid, chatId, text } = req.body;
    if (!lineUid || !chatId || !text) return res.status(400).json({ error: 'Missing fields' });

    const [userRow] = await pool.query(
      'SELECT u.api_key, i.number FROM user u JOIN instance i ON i.uid = u.uid WHERE i.uid = ?', [lineUid]
    );
    if (!userRow.length) return res.status(404).json({ error: 'Line not found' });
    const { api_key, number: lineNum } = userRow[0];

    const parts = chatId.split('_');
    const contactId = parts.slice(1).join('_');
    const isGroup = /^\d{15,}$/.test(contactId);

    let apiUrl, payload;
    if (isGroup) {
      apiUrl = 'https://dardasha.om/api/qr/rest/group/send';
      payload = { token: api_key, from: lineNum, groupId: contactId + '@g.us', messageType: 'text', text: text };
    } else {
      apiUrl = 'https://dardasha.om/api/qr/rest/send_message';
      payload = { token: api_key, from: lineNum, to: contactId, messageType: 'text', text: text };
    }

    const apiRes = await axios.post(apiUrl, payload, { timeout: 15000 }).catch(e => ({ data: { error: e.message } }));

    const now = new Date();
    const timestamp = Math.floor(now.getTime() / 1000);
    const msgContext = JSON.stringify({ text: { body: text } });
    const metaChatId = apiRes.data?.data?.key?.id || apiRes.data?.messageId || null;

    await pool.query(
      `INSERT INTO beta_conversation (chat_id, uid, type, status, msgContext, senderName, senderMobile, route, timestamp, metaChatId)
       VALUES (?, ?, 'text', 'sent', ?, ?, ?, 'OUTGOING', ?, ?)`,
      [chatId, lineUid, msgContext, 'BHD', lineNum, timestamp, metaChatId]
    );

    const lastMsg = JSON.stringify({ text: { body: text }, route: 'OUTGOING', timestamp: timestamp });
    await pool.query(
      `UPDATE beta_chats SET last_message = ?, updatedAt = NOW() WHERE chat_id = ?`,
      [lastMsg, chatId]
    );

    res.json({ success: true, metaChatId, apiResponse: apiRes.data });
  } catch (e) {
    console.error('POST /api/send error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Rename chat
app.post('/api/chats/rename', authMiddleware, async (req, res) => {
  try {
    const { chatId, label } = req.body;
    if (!chatId) return res.status(400).json({ error: 'Missing chatId' });
    await pool.query('UPDATE beta_chats SET chat_label = ? WHERE chat_id = ?', [label || null, chatId]);
    res.json({ success: true });
  } catch (e) {
    console.error('POST /api/chats/rename error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Mark chat as read
app.post('/api/mark-read/:chatId', authMiddleware, async (req, res) => {
  try {
    const { chatId } = req.params;
    await pool.query('UPDATE beta_chats SET unread_count = 0 WHERE chat_id = ?', [chatId]);
    res.json({ success: true });
  } catch (e) {
    console.error('POST /api/mark-read error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Start new chat
app.post('/api/start-chat', authMiddleware, async (req, res) => {
  try {
    const { lineUid, contactNumber, contactName } = req.body;
    if (!lineUid || !contactNumber) return res.status(400).json({ error: 'Missing fields' });

    const [inst] = await pool.query('SELECT number FROM instance WHERE uid = ?', [lineUid]);
    if (!inst.length) return res.status(404).json({ error: 'Line not found' });
    const lineNum = inst[0].number;

    const cleanNumber = contactNumber.replace(/[^0-9]/g, '');
    const chatId = `${lineNum}_${cleanNumber}`;

    const [existing] = await pool.query('SELECT chat_id FROM beta_chats WHERE chat_id = ?', [chatId]);
    if (existing.length) {
      return res.json({ success: true, chatId, existing: true });
    }

    await pool.query(
      `INSERT INTO beta_chats (chat_id, sender_name, sender_mobile, chat_label, unread_count, uid, updatedAt)
       VALUES (?, ?, ?, ?, 0, ?, NOW())`,
      [chatId, contactName || cleanNumber, cleanNumber, contactName || null, lineUid]
    );

    res.json({ success: true, chatId, existing: false });
  } catch (e) {
    console.error('POST /api/start-chat error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Delete message
app.delete('/api/messages/:messageId', authMiddleware, async (req, res) => {
  try {
    const { messageId } = req.params;

    const [msgRows] = await pool.query('SELECT * FROM beta_conversation WHERE id = ?', [messageId]);
    if (!msgRows.length) return res.status(404).json({ error: 'Message not found' });

    const msg = msgRows[0];

    // Try to delete via Dardasha for outgoing messages
    if (msg.metaChatId && msg.route === 'OUTGOING') {
      const [userRow] = await pool.query(
        'SELECT u.api_key, i.number FROM user u JOIN instance i ON i.uid = u.uid WHERE i.uid = ?', [msg.uid]
      );
      if (userRow.length) {
        const { api_key, number: lineNum } = userRow[0];
        const parts = msg.chat_id.split('_');
        const contactId = parts.slice(1).join('_');
        const isGroup = /^\d{15,}$/.test(contactId);
        const jid = isGroup ? contactId + '@g.us' : contactId + '@s.whatsapp.net';

        await axios.post('https://dardasha.om/api/qr/rest/group/delete-message', {
          token: api_key,
          from: lineNum,
          chatId: jid,
          messageId: msg.metaChatId,
          fromMe: true
        }, { timeout: 10000 }).catch(() => {});
      }
    }

    await pool.query('DELETE FROM beta_conversation WHERE id = ?', [messageId]);
    res.json({ success: true });
  } catch (e) {
    console.error('DELETE /api/messages error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Get contacts for a line
app.get('/api/contacts/:lineUid', authMiddleware, async (req, res) => {
  try {
    const { lineUid } = req.params;
    const [inst] = await pool.query('SELECT number FROM instance WHERE uid = ?', [lineUid]);
    if (!inst.length) return res.status(404).json({ error: 'Line not found' });
    const lineNum = inst[0].number;

    const [rows] = await pool.query(
      `SELECT DISTINCT sender_name, sender_mobile, chat_label, chat_id FROM beta_chats WHERE chat_id LIKE ? ORDER BY sender_name`,
      [`${lineNum}_%`]
    );

    const enriched = rows.map(r => ({
      ...r,
      odooName: getOdooContactName(r.sender_mobile),
      displayName: r.chat_label || getOdooContactName(r.sender_mobile) || (r.sender_name && r.sender_name !== 'API' ? r.sender_name : null) || r.sender_mobile || 'Unknown'
    }));

    res.json(enriched);
  } catch (e) {
    console.error('GET /api/contacts error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Odoo contacts
app.get('/api/odoo-contacts', authMiddleware, (req, res) => {
  if (Date.now() - odooContactsCacheTime > ODOO_CACHE_TTL) refreshOdooContacts();
  res.json({ count: Object.keys(odooContactsCache).length, contacts: odooContactsCache });
});

app.post('/api/odoo-contacts/refresh', authMiddleware, (req, res) => {
  refreshOdooContacts();
  res.json({ success: true, count: Object.keys(odooContactsCache).length });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString(), odooContacts: Object.keys(odooContactsCache).length });
});

// Serve frontend
app.use(express.static(path.join(__dirname, '..', 'frontend', 'dist')));

// SPA fallback (Express 5 syntax)
app.get('/{*splat}', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`BHD Chat server running on port ${PORT}`);
});
