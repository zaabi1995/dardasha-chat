const BASE = '/api';

function headers() {
  const token = localStorage.getItem('bhd_chat_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function request(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, { headers: headers(), ...opts });
  if (res.status === 401) {
    localStorage.removeItem('bhd_chat_token');
    window.location.reload();
    return null;
  }
  return res.json();
}

export async function login(password) {
  const data = await request('/login', {
    method: 'POST',
    body: JSON.stringify({ password }),
  });
  if (data?.token) {
    localStorage.setItem('bhd_chat_token', data.token);
  }
  return data;
}

export function logout() {
  localStorage.removeItem('bhd_chat_token');
  window.location.reload();
}

export function isLoggedIn() {
  return !!localStorage.getItem('bhd_chat_token');
}

export async function getLines() {
  return request('/lines');
}

export async function getChats(lineUid, search = '') {
  const q = search ? `?search=${encodeURIComponent(search)}` : '';
  return request(`/chats/${lineUid}${q}`);
}

export async function getMessages(chatId, limit = 100, before = null) {
  let q = `?limit=${limit}`;
  if (before) q += `&before=${before}`;
  return request(`/messages/${chatId}${q}`);
}

export async function sendMessage(lineUid, chatId, text) {
  return request('/send', {
    method: 'POST',
    body: JSON.stringify({ lineUid, chatId, text }),
  });
}

export async function markRead(chatId) {
  return request(`/mark-read/${chatId}`, { method: 'POST' });
}

export async function deleteMessage(messageId) {
  return request(`/messages/${messageId}`, { method: 'DELETE' });
}

export async function renameChat(chatId, label) {
  return request('/chats/rename', {
    method: 'POST',
    body: JSON.stringify({ chatId, label }),
  });
}

export async function startChat(lineUid, contactNumber, contactName) {
  return request('/start-chat', {
    method: 'POST',
    body: JSON.stringify({ lineUid, contactNumber, contactName }),
  });
}

export async function getContacts(lineUid) {
  return request(`/contacts/${lineUid}`);
}

export async function healthCheck() {
  return request('/health');
}
