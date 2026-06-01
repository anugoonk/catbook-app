import { useState, useRef, useEffect } from 'react';
import { X, Send, Smile, Sticker, ImageIcon, CornerUpLeft, Trash2 } from 'lucide-react';
import { useUser } from '../context/UserContext';
import { subscribeMessages, sendMessage, deleteMessage } from '../services/chatStore.js';

const INIT_MESSAGES = {
  c2: [{ id: 1, from: 'c2', text: 'เมี๊ยววว ทำอะไรอยู่คะ? 🐾', time: 'เมื่อกี้', reactions: {} }],
  c3: [{ id: 1, from: 'c3', text: 'หิวข้าวมากเลย ทาสเธอกลับบ้านมั้ย? 😾', time: 'เมื่อกี้', reactions: {} }],
  c4: [{ id: 1, from: 'c4', text: 'แมวเปอร์เซียทักทายมานะเหมียว 💅', time: 'เมื่อกี้', reactions: {} }],
  c5: [{ id: 1, from: 'c5', text: 'ไปล่าสัตว์ด้วยกันมั้ย? 🐭', time: 'เมื่อกี้', reactions: {} }],
  c6: [{ id: 1, from: 'c6', text: 'เมี๊ยวๆ สวัสดีจ้า 🐾', time: 'เมื่อกี้', reactions: {} }],
};

const AUTO_REPLIES = {
  c0: ['เมี๊ยวๆ บอสดูแลระบบอยู่ 🛡️', 'โอเคๆ จะดูให้นะ 🐾', 'บอสรับทราบแล้ว!', 'เมี๊ยวว อย่าลืมกินข้าวด้วย 🍚'],
  c1: ['เมี๊ยวว! กินข้าวด้วยกันมั้ย? 🐟', 'น่ารักจังเลย 😻', 'มะลิชอบมากเลย! 💕', 'เมี๊ยวๆ มาเล่นกันมั้ย?'],
  c2: ['ปลาทูอร่อยมากเลย 🐟', 'ถุงเงินว่าอย่างนั้นเหมือนกัน!', 'เมี๊ยวว ใช่เลย! 🐾', 'โอเค วันนี้นอนแล้วค่อยคุยนะ 💤'],
  c3: ['ส้มๆ เมี๊ยว! 😼', 'ส้มฉุนก็คิดแบบนั้นเหมือนกัน!', 'เมี๊ยวๆๆ วิ่งเล่นด้วยกันมั้ย? 🏃', 'ฮ่าๆ เหมือนกันเลย! 😹'],
  c4: ['เปอร์เซียขนฟูทักทาย 💅', 'น่ารักจังเลยที่บอกแบบนี้ 😻', 'เมี๊ยวว ชอบมากเลย! 🌸', 'โอเค นอนก่อนนะ ง่วงแล้ว 😴'],
  c5: ['เสือออกล่าสัตว์มาแล้ว 🐆', 'เบงกอลแข็งแกร่งมาก! 💪', 'เมี๊ยวว ด้วยกันนะ!', 'โอเค เจอกันพรุ่งนี้!'],
  c6: ['เอ็กโซติกทักทายจ้า 😺', 'โมจิก็รู้สึกแบบนั้นเหมือนกัน!', 'เมี๊ยวๆ ขอบคุณนะ 🥰', 'น่ารักมากเลย! 💕'],
};

const QUICK_EMOJIS  = ['😺', '🐾', '😻', '🐟', '😸', '😹', '😼', '😽', '💕', '❤️', '👍', '😂', '🎉', '🙈', '📦', '🐠'];
const CAT_STICKERS  = ['🐱', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾', '🐾', '🐟', '🐠', '🐡', '🎣', '📦'];
const REACTION_EMOJIS = ['😺', '🐾', '😻', '😹', '🐟', '❤️'];

const nowTime = () => new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
const getAutoReply = (catId) => {
  const replies = AUTO_REPLIES[catId] ?? ['เมี๊ยวว 🐾'];
  return replies[Math.floor(Math.random() * replies.length)];
};

const makeMsg = (from, text, extra = {}) => ({
  id: Date.now() + Math.random(),
  from, text, time: nowTime(), reactions: {}, ...extra,
});

/* ── Typing bubble ── */
const TypingBubble = ({ avatar }) => (
  <div className="flex items-end gap-1.5">
    <img src={avatar} className="w-6 h-6 rounded-full object-cover shrink-0" alt="" />
    <div className="bg-[#f0f2f5] px-3 py-2.5 rounded-2xl rounded-bl-sm flex gap-1 items-center h-8">
      {[0, 150, 300].map(d => (
        <span key={d} className="w-1.5 h-1.5 bg-[#65676B] rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
      ))}
    </div>
  </div>
);

/* ── Reply preview bar ── */
const ReplyBar = ({ replyTo, catName, onCancel }) => (
  <div className="bg-blue-50 border-t border-blue-100 px-3 py-1.5 flex items-center gap-2">
    <div className="w-0.5 h-8 bg-[#4267B2] rounded-full shrink-0" />
    <div className="flex-1 min-w-0">
      <p className="text-[11px] font-bold text-[#4267B2]">
        {replyTo.from === 'me' ? 'คุณ' : catName}
      </p>
      <p className="text-[12px] text-gray-500 truncate">
        {replyTo.img ? '📷 รูปภาพ' : replyTo.text}
      </p>
    </div>
    <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors">
      <X className="w-3.5 h-3.5" />
    </button>
  </div>
);

/* ── Message bubble ── */
const Bubble = ({ msg, cat, isLastMy, isRead, onReact, onReply, onDelete, hoveredId, setHoveredId, reactionTarget, setReactionTarget }) => {
  const isMe      = msg.from === 'me';
  const isHovered = hoveredId === msg.id;
  const hasReact  = Object.keys(msg.reactions || {}).length > 0;

  return (
    <div
      className={`flex items-end gap-1.5 group ${isMe ? 'justify-end' : 'justify-start'}`}
      onMouseEnter={() => setHoveredId(msg.id)}
      onMouseLeave={() => { setHoveredId(null); setReactionTarget(null); }}
    >
      {!isMe && <img src={cat.avatar} className="w-6 h-6 rounded-full object-cover shrink-0" alt="" />}

      <div className={`flex flex-col max-w-[75%] ${isMe ? 'items-end' : 'items-start'}`}>

        {/* Reply quote */}
        {msg.replyTo && (
          <div className={`text-[11px] rounded-lg px-2 py-1 mb-1 border-l-2 border-[#4267B2] bg-gray-100 line-clamp-1 w-full ${isMe ? 'text-right border-r-2 border-l-0' : ''}`}>
            <span className="font-bold text-[#4267B2]">
              {msg.replyTo.from === 'me' ? 'คุณ' : cat.name}:{' '}
            </span>
            <span className="text-gray-500">{msg.replyTo.img ? '📷' : msg.replyTo.text}</span>
          </div>
        )}

        <div className={`flex items-center gap-1 ${isMe ? 'flex-row-reverse' : ''}`}>
          {/* Reaction + Reply + Delete (hover) */}
          {isHovered && !msg.deleted && (
            <div className="flex gap-0.5 relative">
              {/* Reaction picker popup */}
              {reactionTarget === msg.id && (
                <div className={`absolute ${isMe ? 'right-0' : 'left-0'} bottom-full mb-1 bg-white rounded-full shadow-lg border border-gray-100 flex px-2 py-1 gap-0.5 z-20`}>
                  {REACTION_EMOJIS.map(e => (
                    <button key={e} onClick={() => { onReact(msg.id, e); setReactionTarget(null); }}
                      className="text-base hover:scale-125 transition-transform p-0.5">
                      {e}
                    </button>
                  ))}
                </div>
              )}
              <button
                onClick={() => setReactionTarget(v => v === msg.id ? null : msg.id)}
                className="p-1 hover:bg-gray-100 rounded-full text-sm"
                title="React"
              >😊</button>
              <button
                onClick={() => onReply({ id: msg.id, from: msg.from, text: msg.text, img: msg.img })}
                className="p-1 hover:bg-gray-100 rounded-full"
                title="ตอบกลับ"
              >
                <CornerUpLeft className="w-3 h-3 text-gray-500" />
              </button>
              {isMe && (
                <button onClick={() => onDelete(msg.id)} className="p-1 hover:bg-red-50 rounded-full" title="ลบ">
                  <Trash2 className="w-3 h-3 text-red-400" />
                </button>
              )}
            </div>
          )}

          {/* Bubble content */}
          {msg.deleted ? (
            <div className="px-3 py-1.5 rounded-2xl text-[12px] italic text-gray-400 bg-gray-100 border border-gray-200">
              ลบข้อความแล้ว
            </div>
          ) : msg.type === 'image' ? (
            <div className={`rounded-2xl overflow-hidden max-w-[160px] ${isMe ? 'rounded-br-sm' : 'rounded-bl-sm'}`}>
              <img src={msg.img} className="w-full object-cover" alt="รูปภาพ" />
            </div>
          ) : (
            <div className={`px-3 py-1.5 rounded-2xl text-[13px] leading-snug break-words
              ${isMe ? 'bg-[#4267B2] text-white rounded-br-sm' : 'bg-[#f0f2f5] text-[#050505] rounded-bl-sm'}`}>
              {msg.text}
            </div>
          )}
        </div>

        {/* Reactions row */}
        {hasReact && (
          <div className={`flex gap-0.5 mt-0.5 flex-wrap ${isMe ? 'justify-end' : 'justify-start'}`}>
            {Object.entries(msg.reactions).map(([emoji]) => (
              <button
                key={emoji}
                onClick={() => onReact(msg.id, emoji)}
                className="bg-white border border-gray-200 rounded-full px-1.5 py-px text-xs hover:bg-gray-50 flex items-center gap-0.5 shadow-sm"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        {/* Time + seen */}
        <div className={`flex items-center gap-1 mt-0.5 ${isMe ? 'flex-row-reverse' : ''}`}>
          <p className="text-[10px] text-[#bcc0c4]">{msg.time}</p>
          {isMe && isLastMy && isRead && !msg.deleted && (
            <p className="text-[10px] text-[#4267B2] font-semibold">อ่านแล้ว</p>
          )}
        </div>
      </div>
    </div>
  );
};


/* ── ChatWindow ── */
const ChatWindow = ({ cat, onClose }) => {
  const { currentUser } = useUser();
  const myUid = currentUser.uid;
  const partnerUid = cat.userId || cat.uid || cat.id;

  const [messages, setMessages] = useState([]);
  const [input, setInput]         = useState('');
  const [sending, setSending]     = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showSticker, setShowSticker] = useState(false);
  const [replyTo, setReplyTo]     = useState(null);
  const [hoveredId, setHoveredId] = useState(null);
  const [reactionTarget, setReactionTarget] = useState(null);

  const bottomRef = useRef(null);
  const inputRef  = useRef(null);
  const fileRef   = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Subscribe real-time messages
  useEffect(() => {
    if (!myUid || !partnerUid) return;
    const unsub = subscribeMessages(myUid, partnerUid, setMessages);
    return unsub;
  }, [myUid, partnerUid]);

  const send = async (text) => {
    const trimmed = (text ?? input).trim();
    if (!trimmed || sending || !partnerUid) return;
    setSending(true);
    setInput('');
    setShowEmoji(false);
    setShowSticker(false);
    const rt = replyTo;
    setReplyTo(null);
    try {
      await sendMessage(myUid, partnerUid, {
        text: trimmed,
        replyTo: rt,
        senderName: currentUser.activeCat?.name || currentUser.name || '',
        senderAvatar: currentUser.activeCat?.avatar || currentUser.avatar || '',
      });
    } catch {
      setInput(trimmed);
    } finally {
      setSending(false);
    }
  };

  const sendImage = (file) => {
    const url = URL.createObjectURL(file);
    const msg = makeMsg('me', '', { type: 'image', img: url, replyTo });
    setMessages(prev => [...prev, msg]);
    setReplyTo(null);
  };

  const insertEmoji = (emoji) => {
    setInput(prev => prev + emoji);
    setShowEmoji(false);
    inputRef.current?.focus();
  };

  const handleReact = (msgId, emoji) => {
    setMessages(prev => prev.map(m => {
      if (m.id !== msgId) return m;
      const reactions = { ...m.reactions };
      if (reactions[emoji]) delete reactions[emoji];
      else reactions[emoji] = 1;
      return { ...m, reactions };
    }));
  };

  const handleDelete = async (msgId) => {
    try {
      await deleteMessage(myUid, partnerUid, msgId);
    } catch {
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, deleted: true, text: '' } : m));
    }
  };

  const handleReply = (msg) => {
    setReplyTo(msg);
    setHoveredId(null);
    inputRef.current?.focus();
  };

  const lastMyMsgId = [...messages].reverse().find(m => m.from === 'me')?.id;
  const isTyping = false;
  const readId = lastMyMsgId; // mark ข้อความสุดท้ายของเราว่า "ส่งแล้ว"

  return (
    <div className="fixed bottom-0 right-10 z-[100] w-[328px] rounded-t-xl shadow-2xl flex flex-col overflow-hidden border border-[#dddfe2] bg-white">

      {/* Header */}
      <div className="bg-[#4267B2] px-3 py-2.5 flex items-center gap-2.5 shrink-0">
        <div className="relative shrink-0">
          <img src={cat.avatar} alt={cat.name} className="w-9 h-9 rounded-full object-cover border-2 border-white/30" />
          <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 border-2 border-white rounded-full" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-[14px] leading-tight truncate">{cat.name}</p>
          <p className={`text-[11px] transition-colors ${isTyping ? 'text-yellow-300 italic' : 'text-green-300'}`}>
            {isTyping ? 'กำลังพิมพ์...' : 'ออนไลน์'}
          </p>
        </div>
        <button onClick={onClose} className="text-white/70 hover:text-white hover:bg-white/20 p-1.5 rounded-full transition-colors shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="bg-white h-[272px] overflow-y-auto no-scrollbar px-3 py-3 space-y-3">
        {messages.map(msg => (
          <Bubble
            key={msg.id}
            msg={msg}
            cat={cat}
            isLastMy={msg.id === lastMyMsgId}
            isRead={readId === msg.id}
            onReact={handleReact}
            onReply={handleReply}
            onDelete={handleDelete}
            hoveredId={hoveredId}
            setHoveredId={setHoveredId}
            reactionTarget={reactionTarget}
            setReactionTarget={setReactionTarget}
          />
        ))}
        {isTyping && <TypingBubble avatar={cat.avatar} />}
        <div ref={bottomRef} />
      </div>

      {/* Emoji picker */}
      {showEmoji && (
        <div className="bg-white border-t border-[#dddfe2] px-3 py-2 grid grid-cols-8 gap-1 shrink-0">
          {QUICK_EMOJIS.map(e => (
            <button key={e} onClick={() => insertEmoji(e)} className="text-lg hover:bg-[#f0f2f5] rounded p-0.5 transition-colors">
              {e}
            </button>
          ))}
        </div>
      )}

      {/* Sticker picker */}
      {showSticker && (
        <div className="bg-white border-t border-[#dddfe2] px-3 py-2 grid grid-cols-8 gap-1 shrink-0">
          {CAT_STICKERS.map(s => (
            <button key={s} onClick={() => send(s)} className="text-xl hover:bg-[#f0f2f5] rounded p-0.5 transition-colors">
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Reply preview */}
      {replyTo && (
        <ReplyBar replyTo={replyTo} catName={cat.name} onCancel={() => setReplyTo(null)} />
      )}

      {/* Input */}
      <div className="bg-white border-t border-[#dddfe2] px-2 py-2 flex items-center gap-1 shrink-0">
        <img src={currentUser.activeCat.avatar} className="w-7 h-7 rounded-full object-cover shrink-0" alt="" />

        <button
          onClick={() => { setShowEmoji(v => !v); setShowSticker(false); }}
          className={`p-1.5 rounded-full transition-colors shrink-0 ${showEmoji ? 'text-[#4267B2] bg-blue-50' : 'text-[#65676B] hover:bg-[#f0f2f5]'}`}
        >
          <Smile className="w-4 h-4" />
        </button>

        <button
          onClick={() => { setShowSticker(v => !v); setShowEmoji(false); }}
          className={`p-1.5 rounded-full transition-colors shrink-0 ${showSticker ? 'text-[#4267B2] bg-blue-50' : 'text-[#65676B] hover:bg-[#f0f2f5]'}`}
        >
          <Sticker className="w-4 h-4" />
        </button>

        <button
          onClick={() => fileRef.current?.click()}
          className="p-1.5 rounded-full text-[#65676B] hover:bg-[#f0f2f5] transition-colors shrink-0"
          title="ส่งรูปภาพ"
        >
          <ImageIcon className="w-4 h-4" />
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => {
            if (e.target.files?.[0]) sendImage(e.target.files[0]);
            e.target.value = '';
          }}
        />

        <div className="flex-1 relative min-w-0">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Aa"
            autoFocus
            className="w-full bg-[#f0f2f5] rounded-full py-1.5 pl-3 pr-8 text-[14px] outline-none"
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || sending}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-[#4267B2] disabled:text-[#bcc0c4] transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;
