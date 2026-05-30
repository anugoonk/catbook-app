import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Send, Phone, Video, Info, Smile, ImageIcon } from 'lucide-react';
import { mockUsers } from '../data/mockData';
import { useUser } from '../context/UserContext';

/* ── Static data ── */
const AUTO_REPLIES = {
  c0: ['เมี๊ยวๆ บอสดูแลระบบอยู่ 🛡️', 'โอเคจ้า 😸', 'ขอบคุณที่แจ้งนะ 🐾', 'เข้าใจแล้ว จะดูแลให้'],
  c1: ['เมี๊ยวว! กินข้าวด้วยกันมั้ย? 🐟', 'น่ารักมากเลย 🥰', 'ทาสฉันเพิ่งซื้อปลาทูมา 😻', 'มาเล่นด้วยกันสิ!', 'อิจฉาจัง 😸'],
  c2: ['ปลาทูอร่อยมากเลย 🐟', 'ทาสฉันก็เพิ่งกลับบ้านนะ 😸', 'วันนี้นอนดีมากเลย 💤', 'เมี๊ยวๆ 🐾', 'จริงๆ ด้วย!'],
  c3: ['ส้มๆ เมี๊ยว! 😽', 'ซนมากวันนี้เลย', 'ไปล่าจิ้งหรีดมาแล้ว 🦗', 'ชอบกล่องมากๆ เลย 📦', 'วิ่งเล่นทั้งวันเลย 🏃'],
};
const QUICK_EMOJIS = ['😸', '🐾', '😻', '🐟', '😸', '😸', '😽', '😽', '💕', '❤️', '👍', '😂', '🎉', '🙈', '📦', '🏠'];
const CAT_STICKERS  = ['🐱', '😸', '😸', '😸', '😻', '😽', '😽', '👀', '😿', '😿', '🐾', '🐟', '🏠', '🐟', '🎣', '📦'];

const MOCK_HISTORY = {
  c0: [
    { id: 1, from: 'c0', text: 'เมี๊ยวๆ ดูแลระบบอยู่นะ 🛡️', time: '09:00' },
    { id: 2, from: 'me', text: 'สบายดีไหมเมี๊ยวบอส?',         time: '09:05' },
    { id: 3, from: 'c0', text: 'โอเคจ้า กำลัง review โพสต์อยู่ 🐾', time: '09:06' },
  ],
  c1: [
    { id: 1, from: 'c1', text: 'เมี๊ยว! สวัสดีตอนเช้านะ 🐾',         time: '09:10' },
    { id: 2, from: 'me', text: 'สวัสดีจ้า ออกไปล่าเหยื่อมาเหรอ?',   time: '09:12' },
    { id: 3, from: 'c1', text: 'ไม่ได้ออกไปไหน แค่นั่งมองหน้าต่างอยู่ 😸', time: '09:13' },
  ],
  c2: [
    { id: 1, from: 'c2', text: 'วันนี้ทาสซื้อปลาทูมาให้ หัวใจพอง 🐟', time: '08:30' },
    { id: 2, from: 'me', text: 'อิจฉาจัง ทาสฉันยังไม่กลับบ้านเลย 😿', time: '08:35' },
  ],
  c3: [
    { id: 1, from: 'c3', text: 'แอบนอนในกล่องรองเท้าอีกแล้ว 📦', time: 'เมื่อวาน' },
    { id: 2, from: 'me', text: 'น่ารักมากเลยยยย! 😻',               time: 'เมื่อวาน' },
  ],
};

const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];
const getAutoReply = (catId) => getRandom(AUTO_REPLIES[catId] ?? ['เมี๊ยว! 🐾', '😸', 'อรอรอ...']);
const nowTime = () => new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

/* ── Typing indicator dots ── */
const TypingBubble = ({ avatar }) => (
  <div className="flex items-end gap-2">
    <img src={avatar} className="w-7 h-7 rounded-full object-cover shrink-0" alt="" />
    <div className="bg-[#f0f2f5] px-4 py-3 rounded-2xl rounded-bl-sm flex gap-1 items-center h-9">
      {[0, 150, 300].map(delay => (
        <span
          key={delay}
          className="w-2 h-2 bg-[#65676B] rounded-full animate-bounce"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </div>
  </div>
);

/* ── Main component ── */
const MessagesPage = () => {
  const { currentUser } = useUser();
  const [searchParams] = useSearchParams();
  const [selectedId, setSelectedId]   = useState(null);
  const [messages, setMessages]       = useState(MOCK_HISTORY);
  const [input, setInput]             = useState('');
  const [search, setSearch]           = useState('');
  const [typingConv, setTypingConv]   = useState(null); // catId currently "typing"
  const [readFor, setReadFor]         = useState({});   // { catId: lastMsgId }
  const [showEmoji, setShowEmoji]     = useState(false);
  const [showSticker, setShowSticker] = useState(false);
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);
  const timeoutsRef = useRef([]);

  /* Reset on account switch */
  useEffect(() => {
    setSelectedId(null);
    setMessages(MOCK_HISTORY);
    setSearch('');
    setInput('');
    setTypingConv(null);
    setReadFor({});
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  }, [currentUser.activeCat.id]);

  const friends = mockUsers
    .filter(u => u.activeCat.id !== currentUser.activeCat.id)
    .map(u => u.activeCat);

  const selectedCat   = friends.find(c => c.id === selectedId);
  const chatMessages  = selectedId ? (messages[selectedId] || []) : [];
  const filtered      = friends.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

  useEffect(() => {
    const catId = searchParams.get('cat');
    if (catId && friends.some(friend => friend.id === catId)) setSelectedId(catId);
  }, [friends, searchParams]);

  const getLastMsg = (catId) => {
    const msgs = messages[catId];
    if (!msgs?.length) return '...';
    const last = msgs[msgs.length - 1];
    return last.from === 'me' ? `คุณ: ${last.text}` : last.text;
  };

  const selectConversation = (catId) => {
    setSelectedId(catId);
    setInput('');
    setShowEmoji(false);
    setShowSticker(false);
  };

  /* Send a message and trigger auto-reply */
  const addMyMessage = (text) => {
    if (!text || !selectedId) return;
    const catId  = selectedId;
    const newMsg = { id: Date.now(), from: 'me', text, time: nowTime() };

    setMessages(prev => ({
      ...prev,
      [catId]: [...(prev[catId] || []), newMsg],
    }));

    // Mark as "อ่านแล้ว" after 1 s
    timeoutsRef.current.push(setTimeout(() => setReadFor(prev => ({ ...prev, [catId]: newMsg.id })), 1000));

    // Show typing indicator then auto-reply
    const replyDelay = 1600 + Math.random() * 1200;
    timeoutsRef.current.push(setTimeout(() => setTypingConv(catId), 700));
    timeoutsRef.current.push(setTimeout(() => {
      setTypingConv(null);
      setMessages(prev => ({
        ...prev,
        [catId]: [...(prev[catId] || []), {
          id: Date.now() + 1,
          from: catId,
          text: getAutoReply(catId),
          time: nowTime(),
        }],
      }));
    }, replyDelay));
  };

  useEffect(() => () => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  }, []);

  const showUnavailable = (feature) => {
    setInput(prev => prev || `${feature} is not connected yet.`);
    inputRef.current?.focus();
  };

  const send = () => {
    const text = input.trim();
    if (!text) return;
    addMyMessage(text);
    setInput('');
    setShowEmoji(false);
  };

  /* Last message sent by "me" in current chat (for read receipt) */
  const lastMyMsgId = [...chatMessages].reverse().find(m => m.from === 'me')?.id;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages.length, typingConv]);

  useEffect(() => {
    if (selectedId) inputRef.current?.focus();
  }, [selectedId]);

  return (
    <div className="flex w-full h-[calc(100vh-56px)] bg-white border border-[#dddfe2] overflow-hidden">

      {/* ── Conversation list ── */}
      <div className={`w-full md:w-[340px] shrink-0 border-r border-[#dddfe2] flex flex-col ${selectedId ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-[#dddfe2]">
          <h2 className="font-bold text-[20px] text-[#050505] mb-3">แชท</h2>
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="ค้นหาใน Messenger"
              className="w-full bg-[#f0f2f5] rounded-full py-2 pl-9 pr-4 text-[14px] outline-none"
            />
            <Search className="w-4 h-4 text-[#65676B] absolute left-3 top-2.5" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar">
          {filtered.length === 0 ? (
            <p className="text-center text-[#65676B] text-sm py-8">ไม่พบการสนทนา</p>
          ) : filtered.map(cat => (
            <button
              key={cat.id}
              onClick={() => selectConversation(cat.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-[#f0f2f5] transition-colors text-left
                ${selectedId === cat.id ? 'bg-[#e7f3ff]' : ''}`}
            >
              <div className="relative shrink-0">
                <img src={cat.avatar} className="w-12 h-12 rounded-full object-cover" alt={cat.name} />
                <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[#050505] text-[15px]">{cat.name}</p>
                <p className={`text-[13px] truncate ${typingConv === cat.id ? 'text-green-500 italic' : 'text-[#65676B]'}`}>
                  {typingConv === cat.id ? 'กำลังพิมพ์...' : getLastMsg(cat.id)}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Chat area ── */}
      {selectedId ? (
        <div className="flex-1 flex flex-col min-w-0">

          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-[#dddfe2] shrink-0">
            <button
              onClick={() => setSelectedId(null)}
              className="md:hidden text-[#4267B2] font-semibold text-sm mr-1"
            >← กลับ</button>
            <img src={selectedCat?.avatar} className="w-10 h-10 rounded-full object-cover shrink-0" alt="" />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-[#050505] leading-tight">{selectedCat?.name}</p>
              <p className="text-[12px] text-green-500 font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />ออนไลน์
              </p>
            </div>
            <div className="flex gap-0.5">
              <button title="โทรออก" onClick={() => showUnavailable('Voice call')} className="p-2.5 rounded-full hover:bg-[#f0f2f5] text-[#4267B2] transition-colors">
                <Phone className="w-5 h-5" />
              </button>
              <button title="วิดีโอคอล" onClick={() => showUnavailable('Video call')} className="p-2.5 rounded-full hover:bg-[#f0f2f5] text-[#4267B2] transition-colors">
                <Video className="w-5 h-5" />
              </button>
              <button title="ข้อมูล" onClick={() => showUnavailable(`${selectedCat?.name || 'Contact'} info`)} className="p-2.5 rounded-full hover:bg-[#f0f2f5] text-[#4267B2] transition-colors">
                <Info className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-4 space-y-1.5">
            {chatMessages.map(msg => (
              <div key={msg.id}>
                <div className={`flex items-end gap-2 ${msg.from === 'me' ? 'justify-end' : 'justify-start'}`}>
                  {msg.from !== 'me' && (
                    <img src={selectedCat?.avatar} className="w-7 h-7 rounded-full object-cover shrink-0" alt="" />
                  )}
                  <div className={`max-w-[68%] px-3 py-2 rounded-2xl text-[14px] leading-relaxed
                    ${msg.from === 'me'
                      ? 'bg-[#4267B2] text-white rounded-br-sm'
                      : 'bg-[#f0f2f5] text-[#050505] rounded-bl-sm'}`}>
                    <p>{msg.text}</p>
                    <p className={`text-[10px] mt-0.5 text-right ${msg.from === 'me' ? 'text-blue-200' : 'text-[#65676B]'}`}>
                      {msg.time}
                    </p>
                  </div>
                  {msg.from === 'me' && (
                    <img src={currentUser.activeCat.avatar} className="w-7 h-7 rounded-full object-cover shrink-0" alt="" />
                  )}
                </div>

                {/* Read receipt */}
                {msg.from === 'me' && msg.id === lastMyMsgId && readFor[selectedId] === msg.id && (
                  <div className="flex justify-end pr-9 mt-0.5">
                    <span className="text-[11px] text-[#65676B]">อ่านแล้ว</span>
                  </div>
                )}
              </div>
            ))}

            {/* Typing indicator */}
            {typingConv === selectedId && selectedCat && (
              <TypingBubble avatar={selectedCat.avatar} />
            )}
            <div ref={bottomRef} />
          </div>

          {/* Emoji picker */}
          {showEmoji && (
            <div className="px-4 pb-2 shrink-0">
              <div className="bg-white border border-[#dddfe2] rounded-2xl shadow-lg p-3 flex flex-wrap gap-2">
                {QUICK_EMOJIS.map((e, i) => (
                  <button key={i} onClick={() => { addMyMessage(e); setShowEmoji(false); }}
                    className="text-2xl hover:scale-125 transition-transform leading-none">
                    {e}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Sticker picker */}
          {showSticker && (
            <div className="px-4 pb-2 shrink-0">
              <div className="bg-white border border-[#dddfe2] rounded-2xl shadow-lg p-3">
                <p className="text-xs font-semibold text-[#65676B] mb-2">Cat Stickers 🐱</p>
                <div className="flex flex-wrap gap-2">
                  {CAT_STICKERS.map((s, i) => (
                    <button key={i} onClick={() => { addMyMessage(s); setShowSticker(false); }}
                      className="text-3xl hover:scale-125 transition-transform leading-none">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Input bar */}
          <div className="px-3 py-3 border-t border-[#dddfe2] flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => { setShowSticker(s => !s); setShowEmoji(false); }}
              className={`p-2.5 rounded-full transition-colors shrink-0 ${showSticker ? 'bg-blue-100 text-[#4267B2]' : 'text-[#4267B2] hover:bg-[#f0f2f5]'}`}
              title="สติกเกอร์"
            >
              <ImageIcon className="w-5 h-5" />
            </button>
            <button
              onClick={() => { setShowEmoji(e => !e); setShowSticker(false); }}
              className={`p-2.5 rounded-full transition-colors shrink-0 ${showEmoji ? 'bg-blue-100 text-[#4267B2]' : 'text-[#4267B2] hover:bg-[#f0f2f5]'}`}
              title="อีโมจิ"
            >
              <Smile className="w-5 h-5" />
            </button>
            <img src={currentUser.activeCat.avatar} className="w-8 h-8 rounded-full object-cover shrink-0" alt="" />
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder="Aa"
                className="w-full bg-[#f0f2f5] rounded-full py-2 pl-4 pr-10 text-[15px] outline-none focus:ring-2 focus:ring-[#4267B2]/20 transition-all"
              />
              <button
                onClick={send}
                disabled={!input.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-[#4267B2] disabled:text-[#bcc0c4] transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="hidden md:flex flex-1 items-center justify-center text-[#65676B] flex-col gap-3">
          <div className="w-16 h-16 bg-[#f0f2f5] rounded-full flex items-center justify-center">
            <Send className="w-8 h-8 text-[#4267B2]" />
          </div>
          <p className="font-semibold text-[#050505] text-[17px]">ข้อความของคุณ</p>
          <p className="text-sm">เลือกการสนทนาทางซ้ายเพื่อเริ่มแชท</p>
        </div>
      )}
    </div>
  );
};

export default MessagesPage;
