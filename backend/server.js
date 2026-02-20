const express = require('express');
const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
const axios = require('axios');

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
    // Get line number
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
    const chats = rows.map(r => {
      let lastMsg = null;
      let profile = null;
      try { lastMsg = typeof r.last_message === 'string' ? JSON.parse(r.last_message) : r.last_message; } catch(e) {}
      try { profile = typeof r.profile === 'string' ? JSON.parse(r.profile) : r.profile; } catch(e) {}
      return {
        ...r,
        last_message: lastMsg,
        profile: profile,
        displayName: r.chat_label || (r.sender_name && r.sender_name !== 'API' ? r.sender_name : null) || r.sender_mobile || 'Unknown'
      };
    });
    res.json(chats);
  } catch (e) {
    console.error('GET /api/chats error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Get messages for a chat
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
    const messages = rows.map(r => {
      let msgContext = null;
      try { msgContext = typeof r.msgContext === 'string' ? JSON.parse(r.msgContext) : r.msgContext; } catch(e) {}
      return { ...r, msgContext };
    });
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

    // Get API key and line number
    const [userRow] = await pool.query(
      'SELECT u.api_key, i.number FROM user u JOIN instance i ON i.uid = u.uid WHERE i.uid = ?', [lineUid]
    );
    if (!userRow.length) return res.status(404).json({ error: 'Line not found' });
    const { api_key, number: lineNum } = userRow[0];

    // Extract contactId from chat_id (format: lineNum_contactId)
    const parts = chatId.split('_');
    const contactId = parts.slice(1).join('_');
    const isGroup = /^\d{15,}$/.test(contactId);

    let apiUrl, payload;
    if (isGroup) {
      apiUrl = 'https://dardasha.om/api/qr/rest/group/send';
      payload = {
        token: api_key,
        from: lineNum,
        groupId: contactId + '@g.us',
        messageType: 'text',
        text: text
      };
    } else {
      apiUrl = 'https://dardasha.om/api/qr/rest/send_message';
      payload = {
        token: api_key,
        from: lineNum,
        to: contactId,
        messageType: 'text',
        text: text
      };
    }

    // Send via Dardasha
    const apiRes = await axios.post(apiUrl, payload, { timeout: 15000 }).catch(e => ({ data: { error: e.message } }));

    // Insert into beta_conversation
    const now = new Date();
    const timestamp = Math.floor(now.getTime() / 1000);
    const msgContext = JSON.stringify({ text: text });
    const metaChatId = apiRes.data?.data?.key?.id || apiRes.data?.messageId || null;

    await pool.query(
      `INSERT INTO beta_conversation (chat_id, uid, type, status, msgContext, senderName, senderMobile, route, timestamp, metaChatId)
       VALUES (?, ?, 'text', 'sent', ?, ?, ?, 'OUTGOING', ?, ?)`,
      [chatId, lineUid, msgContext, 'BHD', lineNum, timestamp, metaChatId]
    );

    // Update last_message in beta_chats
    const lastMsg = JSON.stringify({ text: text, route: 'OUTGOING', timestamp: timestamp });
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

    // Check if chat exists
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

    // Get message details first
    const [msgRows] = await pool.query('SELECT * FROM beta_conversation WHERE id = ?', [messageId]);
    if (!msgRows.length) return res.status(404).json({ error: 'Message not found' });

    const msg = msgRows[0];

    // Try to delete via Dardasha if outgoing and has metaChatId
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
    res.json(rows);
  } catch (e) {
    console.error('GET /api/contacts error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Sync Odoo contacts (placeholder — fetches from Odoo XML-RPC)
app.post('/api/sync-odoo-contacts', authMiddleware, async (req, res) => {
  try {
    // This would sync contacts from Odoo — simplified version
    res.json({ success: true, message: 'Odoo sync not yet configured' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Serve frontend static files
app.use(express.static(path.join(__dirname, '..', 'frontend', 'dist')));

// SPA fallback (Express 5 syntax)
app.get('/{*splat}', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`BHD Chat server running on port ${PORT}`);
});
