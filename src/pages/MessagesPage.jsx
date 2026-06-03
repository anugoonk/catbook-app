import { useState, useEffect, useRef } from 'react';
import { Search, Send, X, Smile, ArrowLeft } from 'lucide-react';
import { useUser } from '../context/UserContext';
import { getAllUsers } from '../services/userStore';
import { subscribeMessages, sendMessage, clearUnread, subscribeUnread } from '../services/chatStore';

const QUICK_EMOJIS = ['😺','🐾','😻','🐟','😸','😹','😼','😽','💕','❤️','👍','😂','🎉','🙈','📦','🐠'];
const nowTime = () => new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

const Bubble = ({ msg, partnerAvatar, myAvatar }) => {
  const isMe = msg.from === 'me';
  return (
    <div className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
      {!isMe && <img src={partnerAvatar || '/favicon.svg'} className="w-7 h-7 rounded-full object-cover shrink-0 border border-gray-200" alt="" />}
      <div className={`max-w-[65%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
        {msg.replyTo && (
          <div className={`text-[11px] px-2 py-1 mb-1 border-l-2 border-[#4267B2] bg-gray-100 rounded-lg line-clamp-1 ${isMe ? 'text-right' : ''}`}>
            <span className="text-gray-500">{msg.replyTo.text}</span>
          </div>
        )}
        {msg.deleted ? (
          <div className="px-3 py-1.5 text-[13px] italic text-gray-400 bg-gray-100 rounded-2xl border border-gray-200">ลบข้อความแล้ว</div>
        ) : (
          <div className={`px-3 py-2 rounded-2xl text-[14px] leading-snug break-words
            ${isMe ? 'bg-[#4267B2] text-white rounded-br-sm' : 'bg-[#f0f2f5] text-[#050505] rounded-bl-sm'}`}>
            {msg.text}
          </div>
        )}
        <p className="text-[10px] text-[#bcc0c4] mt-0.5">{msg.time}</p>
      </div>
      {isMe && <img src={myAvatar || '/favicon.svg'} className="w-7 h-7 rounded-full object-cover shrink-0 border border-gray-200" alt="" />}
    </div>
  );
};

const MessagesPage = () => {
  const { currentUser } = useUser();
  const myUid = currentUser?.uid;

  const [users, setUsers] = useState([]);
  const [inbox, setInbox] = useState({});
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!myUid) return;
    getAllUsers().then(list => {
      setUsers(list.filter(u => u.uid !== myUid && u.activeCat?.name));
    });
  }, [myUid]);

  useEffect(() => {
    if (!myUid) return;
    const unsub = subscribeUnread(myUid, (_, senders) => {
      const map = {};
      senders.forEach(s => { map[s.uid] = s; });
      setInbox(map);
    });
    return unsub;
  }, [myUid]);

  useEffect(() => {
    if (!selected || !myUid) return;
    clearUnread(myUid, selected.uid).catch(() => {});
    const unsub = subscribeMessages(myUid, selected.uid, setMessages);
    return unsub;
  }, [selected?.uid, myUid]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async (text) => {
    const t = (text ?? input).trim();
    if (!t || !selected) return;
    setInput('');
    setShowEmoji(false);
    const rt = replyTo;
    setReplyTo(null);
    await sendMessage(myUid, selected.uid, {
      text: t,
      replyTo: rt,
      senderName: currentUser.activeCat?.name || currentUser.name || '',
      senderAvatar: currentUser.activeCat?.avatar || currentUser.avatar || '',
    });
  };

  const filteredUsers = users.filter(u => {
    const q = search.toLowerCase();
    return !q || (u.activeCat?.name || '').toLowerCase().includes(q) || (u.name || '').toLowerCase().includes(q);
  });

  const myAvatar = currentUser?.activeCat?.avatar || currentUser?.avatar || '/favicon.svg';

  return (
    <div className="flex h-[calc(100vh-120px)] lg:h-[calc(100vh-56px)] bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm">

      {/* Left: conversation list — hidden on mobile when chat is open */}
      <div className={`${selected ? 'hidden lg:flex' : 'flex'} flex-col w-full lg:w-[320px] lg:shrink-0 border-r border-gray-200`}>
        <div className="p-4 border-b border-gray-100">
          <h2 className="font-bold text-xl text-[#050505] mb-3">แชท</h2>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="ค้นหาใน Messenger"
              className="w-full bg-[#f0f2f5] rounded-full pl-9 pr-4 py-2 text-[14px] outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredUsers.length === 0 && (
            <p className="text-center text-gray-400 text-sm py-8">ยังไม่มีเพื่อนเหมียว</p>
          )}
          {filteredUsers.map(u => {
            const cat = u.activeCat || {};
            const unread = inbox[u.uid];
            const isSelected = selected?.uid === u.uid;
            return (
              <button
                key={u.uid}
                onClick={() => setSelected({ uid: u.uid, name: cat.name, avatar: cat.avatar })}
                className={`w-full flex items-center gap-3 px-4 py-3 transition-colors text-left
                  ${isSelected ? 'bg-blue-50' : 'hover:bg-[#f0f2f5]'}`}
              >
                <div className="relative shrink-0">
                  <img src={cat.avatar || '/favicon.svg'} className="w-12 h-12 rounded-full object-cover border border-gray-200" alt={cat.name} />
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline">
                    <p className={`font-semibold text-[14px] truncate ${unread?.count > 0 ? 'text-[#050505]' : 'text-[#050505]'}`}>{cat.name}</p>
                    {unread?.lastTime && <p className="text-[11px] text-gray-400 shrink-0 ml-1">{nowTime()}</p>}
                  </div>
                  <p className={`text-[13px] truncate ${unread?.count > 0 ? 'text-[#050505] font-medium' : 'text-gray-500'}`}>
                    {unread?.lastMessage || cat.bio || '—'}
                  </p>
                </div>
                {unread?.count > 0 && (
                  <span className="bg-[#4267B2] text-white text-[11px] font-bold min-w-[20px] h-5 px-1 rounded-full flex items-center justify-center shrink-0">
                    {unread.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Right: chat area — hidden on mobile when no chat selected */}
      {!selected ? (
        <div className="hidden lg:flex flex-1 flex-col items-center justify-center text-center text-gray-400 gap-3">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-3xl">💬</div>
          <p className="font-semibold text-gray-600">ข้อความของคุณ</p>
          <p className="text-sm">เลือกการสนทนาทางซ้ายเพื่อเริ่มแชท</p>
        </div>
      ) : (
        <div className="flex flex-1 flex-col min-w-0">
          {/* Chat header */}
          <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-3">
            <button
              onClick={() => setSelected(null)}
              className="lg:hidden p-1.5 -ml-1 rounded-full hover:bg-gray-100 text-gray-500 transition-colors shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <img src={selected.avatar || '/favicon.svg'} className="w-10 h-10 rounded-full object-cover border border-gray-200" alt={selected.name} />
            <div className="flex-1">
              <p className="font-bold text-[15px] text-[#050505]">{selected.name}</p>
              <p className="text-[12px] text-green-500">ออนไลน์</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {messages.length === 0 && (
              <p className="text-center text-gray-400 text-sm py-8">เริ่มการสนทนากับ {selected.name} 🐾</p>
            )}
            {messages.map(msg => (
              <Bubble key={msg.id} msg={msg} partnerAvatar={selected.avatar} myAvatar={myAvatar} />
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Reply bar */}
          {replyTo && (
            <div className="px-4 py-2 bg-blue-50 border-t border-blue-100 flex items-center gap-2">
              <div className="w-0.5 h-8 bg-[#4267B2] rounded-full shrink-0" />
              <p className="flex-1 text-[12px] text-gray-500 truncate">{replyTo.text}</p>
              <button onClick={() => setReplyTo(null)} className="text-gray-400 hover:text-gray-600 p-1">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Emoji picker */}
          {showEmoji && (
            <div className="px-4 py-2 border-t border-gray-200 grid grid-cols-8 gap-1">
              {QUICK_EMOJIS.map(e => (
                <button key={e} onClick={() => { setInput(p => p + e); setShowEmoji(false); inputRef.current?.focus(); }}
                  className="text-lg hover:bg-gray-100 rounded p-0.5 transition-colors">{e}</button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="px-4 py-3 border-t border-gray-200 flex items-center gap-2">
            <button
              onClick={() => setShowEmoji(v => !v)}
              className={`p-2 rounded-full transition-colors shrink-0 ${showEmoji ? 'text-[#4267B2] bg-blue-50' : 'text-gray-400 hover:text-[#4267B2] hover:bg-blue-50'}`}
            >
              <Smile className="w-5 h-5" />
            </button>
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder={`ส่งข้อความถึง ${selected.name}...`}
                autoFocus
                className="w-full bg-[#f0f2f5] rounded-full py-2 pl-4 pr-10 text-[14px] outline-none focus:ring-2 focus:ring-[#4267B2]/20"
              />
              <button
                onClick={() => send()}
                disabled={!input.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#4267B2] disabled:text-gray-300 transition-colors p-1"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessagesPage;
