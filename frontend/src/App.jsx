import { useState, useEffect, useCallback, useRef } from 'react';
import * as api from './api';
import Login from './Login';
import Sidebar from './Sidebar';
import ChatView from './ChatView';
import EmptyChat from './EmptyChat';

export default function App() {
  const [loggedIn, setLoggedIn] = useState(api.isLoggedIn());
  const [lines, setLines] = useState([]);
  const [activeLine, setActiveLine] = useState(null);
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [search, setSearch] = useState('');
  const [loadingChats, setLoadingChats] = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const pollRef = useRef(null);
  const chatPollRef = useRef(null);

  // Load lines on login
  useEffect(() => {
    if (!loggedIn) return;
    api.getLines().then(data => {
      if (data && data.length > 0) {
        setLines(data);
        setActiveLine(data[0]);
      }
    });
  }, [loggedIn]);

  // Load chats when line changes or search changes
  const loadChats = useCallback(async (silent = false) => {
    if (!activeLine) return;
    if (!silent) setLoadingChats(true);
    const data = await api.getChats(activeLine.uid, search);
    if (data) setChats(data);
    if (!silent) setLoadingChats(false);
  }, [activeLine, search]);

  useEffect(() => {
    loadChats();
  }, [loadChats]);

  // Poll chats every 4s
  useEffect(() => {
    if (!activeLine) return;
    chatPollRef.current = setInterval(() => loadChats(true), 4000);
    return () => clearInterval(chatPollRef.current);
  }, [activeLine, loadChats]);

  // Load messages when chat changes
  const loadMessages = useCallback(async (silent = false) => {
    if (!activeChat) return;
    if (!silent) setLoadingMsgs(true);
    const data = await api.getMessages(activeChat.chat_id);
    if (data) setMessages(data);
    if (!silent) setLoadingMsgs(false);
  }, [activeChat]);

  useEffect(() => {
    loadMessages();
    if (activeChat) {
      api.markRead(activeChat.chat_id);
    }
  }, [activeChat?.chat_id]);

  // Poll messages every 3s
  useEffect(() => {
    if (!activeChat) return;
    pollRef.current = setInterval(() => loadMessages(true), 3000);
    return () => clearInterval(pollRef.current);
  }, [activeChat, loadMessages]);

  const handleSend = async (text) => {
    if (!activeLine || !activeChat || !text.trim()) return;
    await api.sendMessage(activeLine.uid, activeChat.chat_id, text.trim());
    loadMessages(true);
    setTimeout(() => loadChats(true), 500);
  };

  const handleDelete = async (msgId) => {
    await api.deleteMessage(msgId);
    loadMessages(true);
  };

  const handleSelectChat = (chat) => {
    setActiveChat(chat);
    // Reset unread locally
    setChats(prev => prev.map(c => c.chat_id === chat.chat_id ? { ...c, unread_count: 0 } : c));
  };

  if (!loggedIn) return <Login onLogin={() => setLoggedIn(true)} />;

  return (
    <div className="h-screen flex bg-wa-darker">
      <Sidebar
        lines={lines}
        activeLine={activeLine}
        setActiveLine={(l) => { setActiveLine(l); setActiveChat(null); setMessages([]); }}
        chats={chats}
        activeChat={activeChat}
        onSelectChat={handleSelectChat}
        search={search}
        setSearch={setSearch}
        loading={loadingChats}
        onNewChat={async (number, name) => {
          const res = await api.startChat(activeLine.uid, number, name);
          if (res?.chatId) {
            await loadChats();
            const found = chats.find(c => c.chat_id === res.chatId);
            if (found) setActiveChat(found);
          }
        }}
      />
      {activeChat ? (
        <ChatView
          chat={activeChat}
          messages={messages}
          loading={loadingMsgs}
          onSend={handleSend}
          onDelete={handleDelete}
          activeLine={activeLine}
        />
      ) : (
        <EmptyChat />
      )}
    </div>
  );
}
