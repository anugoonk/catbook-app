import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, Share2, MoreHorizontal, Globe, SendHorizontal, PawPrint, Link2, X, Repeat2, Trash2, Pencil } from 'lucide-react';
import PawIcon from './PawIcon';
import { useUser } from '../context/UserContext';
import { useNotifications } from '../context/NotificationContext';
import { translateToMeow } from '../utils/meowTranslator';
import { mockUsers } from '../data/mockData';
import MentionText from './MentionText';
import { deletePost, updatePost, reactToPost, removeReaction, subscribeComments, addComment } from '../services/postStore';

const REACTIONS = [
  { id: 'paw',   emoji: '🐾', label: 'ส่งอุ้งเท้า', color: 'text-[#4267B2]' },
  { id: 'love',  emoji: '😺', label: 'เมี๊ยว',       color: 'text-red-500'   },
  { id: 'heart', emoji: '😻', label: 'หลงรัก',        color: 'text-pink-500'  },
  { id: 'haha',  emoji: '😹', label: 'ฮ่าๆ',          color: 'text-yellow-500'},
  { id: 'sad',   emoji: '😾', label: 'เซ็ง',           color: 'text-orange-500'},
];

const CommentItem = ({ comment, isOwn }) => (
  <div className={`flex gap-2 items-end ${isOwn ? 'flex-row-reverse' : ''}`}>
    <img src={comment.avatar} alt={comment.name} className="w-7 h-7 rounded-full object-cover shrink-0 border border-gray-200" />
    <div className={`flex flex-col max-w-[75%] ${isOwn ? 'items-end' : 'items-start'}`}>
      <div className={`px-3 py-2 text-sm break-words rounded-2xl
        ${isOwn
          ? 'bg-[#4267B2] text-white rounded-br-sm'
          : 'bg-[#f0f2f5] text-[#050505] rounded-bl-sm'}`}>
        {!isOwn && (
          <div className="flex items-center gap-1.5 mb-1.5">
            <img src={comment.avatar} alt={comment.name} className="w-4 h-4 rounded-full object-cover shrink-0" />
            <span className="font-bold text-xs text-[#4267B2]">{comment.name}</span>
          </div>
        )}
        <MentionText text={comment.text} />
      </div>
      <p className={`text-[11px] text-[#65676B] mt-1 flex items-center gap-1 ${isOwn ? 'pr-1' : 'pl-1'}`}>
        {comment.time}
        {comment.meow && <span title="ส่งด้วย Meow Mode" className="text-[10px]">🐾</span>}
      </p>
    </div>
  </div>
);

/* Image grid — supports 1-4 images */
const ImageGrid = ({ images }) => {
  const count = images.length;
  if (count === 0) return null;

  const imgClass = "w-full h-full object-cover";

  if (count === 1) return (
    <img src={images[0]} alt="" className="w-full object-cover max-h-[500px]" />
  );

  if (count === 2) return (
    <div className="grid grid-cols-2 gap-0.5" style={{ height: 280 }}>
      {images.map((src, i) => <img key={i} src={src} alt="" className={imgClass} />)}
    </div>
  );

  if (count === 3) return (
    <div className="flex gap-0.5" style={{ height: 280 }}>
      <div className="flex-1"><img src={images[0]} alt="" className={imgClass} /></div>
      <div className="flex flex-col gap-0.5 flex-1">
        <div className="flex-1"><img src={images[1]} alt="" className={imgClass} /></div>
        <div className="flex-1"><img src={images[2]} alt="" className={imgClass} /></div>
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-2 gap-0.5">
      {images.map((src, i) => (
        <div key={i} style={{ height: 200 }}>
          <img src={src} alt="" className={imgClass} />
        </div>
      ))}
    </div>
  );
};

const PostCard = ({ post, onDeleted }) => {
  const { currentUser, setViewedCat } = useUser();
  const { addNotification } = useNotifications();
  const navigate = useNavigate();

  const goToProfile = (cat) => { setViewedCat(cat); navigate('/profile'); };

  const [reaction, setReaction] = useState(post.myReaction ?? (post.isLiked ? 'paw' : null));
  const [likeCount, setLikeCount] = useState(post.likeCount ?? post.likes ?? 0);
  const [animKey, setAnimKey] = useState(0);
  const [showReactions, setShowReactions] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [showComments, setShowComments] = useState(false);
  const [commentCount, setCommentCount] = useState(post.commentCount ?? post.comments ?? 0);
  const [shareCount, setShareCount] = useState(post.shareCount ?? post.shares ?? 0);
  const [toastMsg, setToastMsg] = useState('');
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content || '');
  const [postContent, setPostContent] = useState(post.content || '');
  const [mentionQuery, setMentionQuery] = useState(null);
  const [mentionStart, setMentionStart] = useState(0);
  const hoverTimerRef = useRef(null);
  const inputRef = useRef(null);
  const cursorRef = useRef(0);

  const mentionableCats = currentUser
    ? mockUsers.filter(u => u.activeCat.id !== currentUser.activeCat.id).map(u => u.activeCat)
    : [];
  const mentionFiltered = mentionQuery !== null
    ? mentionableCats.filter(c => c.name.toLowerCase().includes(mentionQuery.toLowerCase()))
    : [];

  const isGuest = !currentUser;
  const currentReaction = REACTIONS.find(r => r.id === reaction) ?? null;
  const isOwnPost = !isGuest && post.userId === currentUser.uid;
  const isAdmin = !isGuest && currentUser.role === 'ADMIN';
  const canDelete = isOwnPost || isAdmin;

  const handleSaveEdit = async () => {
    const trimmed = editContent.trim();
    if (!trimmed || trimmed === postContent) { setIsEditing(false); return; }
    try {
      await updatePost(post.id, trimmed);
      setPostContent(trimmed);
      setIsEditing(false);
    } catch { /* ignore */ }
  };

  const requireLogin = (e) => {
    if (!isGuest) return false;
    e?.stopPropagation?.();
    navigate('/login');
    return true;
  };

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 2200);
  };

  /* ── Reaction handlers ── */
  const handleLikeClick = async () => {
    if (requireLogin()) return;
    const prev = reaction;
    const prevCount = likeCount;
    if (reaction) {
      setReaction(null);
      setLikeCount(c => c - 1);
      setShowReactions(false);
      try { await removeReaction(post.id, currentUser.uid); }
      catch { setReaction(prev); setLikeCount(prevCount); }
    } else {
      setAnimKey(k => k + 1);
      setReaction('paw');
      setLikeCount(c => c + 1);
      setShowReactions(false);
      try { await reactToPost(post.id, currentUser.uid, 'paw', null); }
      catch { setReaction(null); setLikeCount(prevCount); }
    }
  };

  const selectReaction = async (id) => {
    if (requireLogin()) return;
    const prev = reaction;
    const prevCount = likeCount;
    if (reaction === id) {
      setReaction(null);
      setLikeCount(c => c - 1);
      setShowReactions(false);
      try { await removeReaction(post.id, currentUser.uid); }
      catch { setReaction(prev); setLikeCount(prevCount); }
    } else {
      if (!reaction) setLikeCount(c => c + 1);
      setAnimKey(k => k + 1);
      setReaction(id);
      setShowReactions(false);
      try { await reactToPost(post.id, currentUser.uid, id, reaction); }
      catch { setReaction(prev); setLikeCount(prevCount); }
    }
  };

  const handleMouseEnterLike = () => {
    hoverTimerRef.current = setTimeout(() => setShowReactions(true), 450);
  };
  const handleMouseLeaveLike = () => {
    clearTimeout(hoverTimerRef.current);
    setShowReactions(false);
  };

  useEffect(() => {
    if (!showComments || commentsLoaded) return;
    setCommentsLoaded(true);
    const unsub = subscribeComments(post.id, currentUser?.uid, (data) => {
      setComments(data);
      setCommentCount(data.length);
    });
    return unsub;
  }, [showComments, commentsLoaded, post.id, currentUser?.uid]);

  /* ── Comment handlers ── */
  const toggleComments = () => {
    if (requireLogin()) return;
    const next = !showComments;
    setShowComments(next);
    if (next) setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleCommentChange = (e) => {
    const val = e.target.value;
    setCommentText(val);
    const cursor = e.target.selectionStart ?? val.length;
    cursorRef.current = cursor;
    const before = val.slice(0, cursor);
    const match = before.match(/@(\S*)$/);
    if (match) { setMentionQuery(match[1]); setMentionStart(match.index); }
    else setMentionQuery(null);
  };

  const handleInputSelect = (e) => {
    cursorRef.current = e.target.selectionStart;
  };

  const selectMention = (cat) => {
    const before = commentText.slice(0, mentionStart);
    const after = commentText.slice(cursorRef.current);
    const newText = `${before}@${cat.name} ${after}`;
    setCommentText(newText);
    setMentionQuery(null);
    setTimeout(() => {
      if (inputRef.current) {
        const pos = mentionStart + cat.name.length + 2;
        inputRef.current.setSelectionRange(pos, pos);
        inputRef.current.focus();
      }
    }, 0);
  };

  const submitComment = async () => {
    const raw = commentText.trim();
    if (!raw) return;
    const text = translateToMeow(raw);
    setCommentText('');
    setMentionQuery(null);
    try {
      await addComment(post.id, { text, meow: true, currentUser });
    } catch { /* ignore */ }
    [...raw.matchAll(/@(\S+)/g)].forEach(([, name]) => {
      if (mentionableCats.find(c => c.name === name)) {
        addNotification({
          type: 'tag',
          actor: { name: currentUser.activeCat.name, avatar: currentUser.activeCat.avatar },
          message: `แท็กคุณในคอมเมนต์: "${raw.length > 40 ? raw.slice(0, 40) + '…' : raw}"`,
        });
      }
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') { setMentionQuery(null); return; }
    if (e.key === 'Enter' && !e.shiftKey && mentionQuery === null) { e.preventDefault(); submitComment(); }
  };

  /* ── Share handlers ── */
  const postUrl = `${window.location.origin}/post/${post.id}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(postUrl);
      setShareCount(prev => prev + 1);
      setShowShareMenu(false);
      showToast('คัดลอกลิงก์แล้ว! 🔗');
    } catch {
      showToast('ไม่สามารถคัดลอกได้ ลองใหม่อีกครั้ง');
    }
  };

  const handleNativeShare = async () => {
    try {
      await navigator.share({ title: `โพสต์ของ ${post.cat.name} บน CatBook 🐾`, text: post.content, url: postUrl });
      setShareCount(prev => prev + 1);
      setShowShareMenu(false);
    } catch { /* user cancelled */ }
  };

  const handleRepost = () => {
    setShareCount(prev => prev + 1);
    setShowShareMenu(false);
    showToast(`รีโพสต์แล้ว! โพสต์ของ ${post.cat.name} อยู่บน Feed คุณแล้ว 🐾`);
  };

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm mb-3 border border-[#dddfe2] overflow-hidden relative">

        {/* In-card toast */}
        {toastMsg && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <div className="bg-[#050505cc] text-white text-sm font-semibold px-5 py-2.5 rounded-full shadow-lg">
              {toastMsg}
            </div>
          </div>
        )}

        {/* Header */}
        <div className="px-4 pt-3 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0 cursor-pointer" onClick={() => goToProfile(post.cat)}>
            <img src={post.cat.avatar} alt="Author" className="w-10 h-10 rounded-full object-cover shrink-0 hover:opacity-90 transition-opacity" />
            <div className="min-w-0">
              <h4 className="font-bold text-[#050505] text-[15px] leading-snug hover:underline">
                {post.cat.name}
                {post.feeling && <span className="text-[#65676B] font-normal"> — รู้สึก {post.feeling}</span>}
                {post.location && <span className="text-[#65676B] font-normal hidden sm:inline"> ที่ {post.location}</span>}
              </h4>
              <p className="text-xs text-[#65676B] flex items-center gap-1 mt-0.5">
                {post.time} · <Globe className="w-3 h-3 shrink-0" />
              </p>
            </div>
          </div>
          <div className="relative shrink-0 ml-1">
            <button onClick={() => setShowMenu(m => !m)} className="text-[#65676B] hover:bg-[#f0f2f5] p-2 rounded-full transition-colors">
              <MoreHorizontal className="w-5 h-5" />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-[#dddfe2] rounded-xl shadow-lg z-30 min-w-[180px] overflow-hidden">
                {isOwnPost && (
                  <button
                    onClick={() => { setShowMenu(false); setIsEditing(true); setEditContent(postContent); }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-[#050505] hover:bg-[#f0f2f5] transition-colors"
                  >
                    <Pencil className="w-4 h-4 text-[#4267B2]" /> แก้ไขโพสต์
                  </button>
                )}
                {canDelete && (
                  <button
                    onClick={async () => {
                      setShowMenu(false);
                      try {
                        await deletePost(post.id);
                        onDeleted?.(post.id);
                      } catch { /* ignore */ }
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" /> {isAdmin && !isOwnPost ? 'ลบโพสต์ (Admin)' : 'ลบโพสต์'}
                  </button>
                )}
                <button onClick={() => setShowMenu(false)} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-[#65676B] hover:bg-[#f0f2f5] transition-colors">
                  <X className="w-4 h-4" /> ปิด
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="px-4 pb-3">
          {isEditing ? (
            <div className="space-y-2">
              <textarea
                value={editContent}
                onChange={e => setEditContent(e.target.value)}
                autoFocus
                rows={3}
                className="w-full border border-[#4267B2] rounded-lg px-3 py-2 text-[15px] text-[#050505] resize-none focus:outline-none focus:ring-1 focus:ring-[#4267B2]"
              />
              <div className="flex gap-2 justify-end">
                <button onClick={() => setIsEditing(false)} className="px-4 py-1.5 rounded-lg text-sm text-[#65676B] hover:bg-[#f0f2f5] transition-colors">ยกเลิก</button>
                <button onClick={handleSaveEdit} className="px-4 py-1.5 rounded-lg text-sm bg-[#4267B2] text-white hover:bg-[#3b5998] transition-colors">บันทึก</button>
              </div>
            </div>
          ) : (
            <MentionText text={postContent} className="text-[#050505] text-[15px] leading-relaxed" />
          )}
        </div>

        <ImageGrid images={post.images?.length ? post.images : (post.image ? [post.image] : [])} />

        {/* Stats bar */}
        <div className="px-4 py-2 flex justify-between items-center text-[13px] text-[#65676B]">
          <div className="flex items-center gap-1 hover:underline cursor-pointer">
            {reaction ? (
              <span className="text-base leading-none">{currentReaction?.emoji}</span>
            ) : (
              <div className="bg-[#4267B2] p-1 rounded-full text-white">
                <PawIcon className="w-3 h-3" />
              </div>
            )}
            <span>{likeCount}</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={toggleComments} className="hover:underline">
              {commentCount} คอมเมนต์
            </button>
            {shareCount > 0 && (
              <>
                <span>·</span>
                <span>{shareCount} แชร์</span>
              </>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="mx-4 border-t border-[#dddfe2]" />

        {/* Action buttons */}
        <div className="px-2 py-1 flex">

          {/* Like button with reaction picker */}
          <div
            className="flex-1 relative"
            onMouseEnter={handleMouseEnterLike}
            onMouseLeave={handleMouseLeaveLike}
          >
            {/* Reaction picker */}
            {showReactions && (
              <div className="absolute bottom-full left-0 right-0 mx-auto w-fit mb-2 bg-white rounded-full shadow-2xl border border-gray-200 flex items-end gap-0.5 px-3 py-2.5 z-20 reaction-picker">
                {REACTIONS.map((r, i) => (
                  <button
                    key={r.id}
                    onClick={() => selectReaction(r.id)}
                    className="flex flex-col items-center gap-0.5 group px-1"
                    style={{ animationDelay: `${i * 35}ms` }}
                  >
                    <span
                      className={`text-[26px] leading-none transition-all duration-150 group-hover:scale-[1.35] group-hover:-translate-y-2
                        ${reaction === r.id ? 'scale-110 -translate-y-1' : ''}`}
                    >
                      {r.emoji}
                    </span>
                    <span className="text-[9px] text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap font-medium">
                      {r.label}
                    </span>
                  </button>
                ))}
              </div>
            )}

            <button
              onClick={handleLikeClick}
              className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg font-semibold text-[15px] transition-colors
                ${reaction
                  ? `${currentReaction?.color} hover:bg-gray-100`
                  : 'text-[#65676B] hover:bg-blue-50 hover:text-[#4267B2]'}`}
            >
              <span key={animKey} className={animKey > 0 ? 'paw-pop inline-flex shrink-0' : 'inline-flex shrink-0'}>
                {reaction ? (
                  <span className="text-xl leading-none">{currentReaction?.emoji}</span>
                ) : (
                  <PawPrint className="w-5 h-5" />
                )}
              </span>
              <span>{reaction ? currentReaction?.label : 'ส่งอุ้งเท้า'}</span>
            </button>
          </div>

          <button
            onClick={toggleComments}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-semibold text-[15px] text-[#65676B] hover:bg-purple-50 hover:text-purple-500 transition-colors"
          >
            <MessageCircle className="w-5 h-5 shrink-0" />
            <span>คอมเมนต์</span>
          </button>

          <button
            onClick={() => setShowShareMenu(true)}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-semibold text-[15px] text-[#65676B] hover:bg-orange-50 hover:text-orange-400 transition-colors"
          >
            <Share2 className="w-5 h-5 shrink-0" />
            <span>แชร์</span>
          </button>
        </div>

        {/* Comments section */}
        {showComments && (
          <div className="px-4 pb-4 border-t border-[#dddfe2] pt-3 space-y-3">
            {comments.length > 0 && (
              <div className="space-y-3">
                {comments.map(comment => (
                  <CommentItem key={comment.id} comment={comment} isOwn={comment.isOwn} />
                ))}
              </div>
            )}
            {/* Mention dropdown */}
            {mentionQuery !== null && mentionFiltered.length > 0 && (
              <div className="border border-[#dddfe2] rounded-xl overflow-hidden divide-y divide-[#f0f2f5] bg-white shadow-sm">
                <p className="text-[11px] text-[#65676B] font-semibold px-3 py-1.5">แท็กเพื่อนเหมียว</p>
                {mentionFiltered.map(cat => (
                  <div
                    key={cat.id}
                    onMouseDown={e => { e.preventDefault(); selectMention(cat); }}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-[#f0f2f5] cursor-pointer"
                  >
                    <img src={cat.avatar} className="w-7 h-7 rounded-full object-cover shrink-0" alt={cat.name} />
                    <span className="text-sm font-semibold text-[#050505]">{cat.name}</span>
                    <span className="text-xs text-[#65676B]">{cat.breed}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2 items-center">
              <div className="flex-1 relative">
                <img
                  src={currentUser.activeCat.avatar}
                  alt="Me"
                  className="absolute left-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full object-cover border border-gray-200 z-10 shrink-0"
                />
                <input
                  ref={inputRef}
                  type="text"
                  value={commentText}
                  onChange={handleCommentChange}
                  onSelect={handleInputSelect}
                  onClick={handleInputSelect}
                  onKeyDown={handleKeyDown}
                  placeholder="เมี๊ยวๆ... พิมพ์แล้วแมวจะแปลให้เอง 🐾"
                  className="w-full rounded-full py-2 pl-10 pr-9 text-[15px] outline-none transition-all bg-purple-50 hover:bg-purple-100/70 focus:ring-2 focus:ring-purple-300 placeholder:text-purple-400"
                />
                <button
                  onClick={submitComment}
                  disabled={!commentText.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full transition-colors disabled:text-[#bcc0c4] enabled:text-[#4267B2] enabled:hover:bg-blue-100"
                >
                  <SendHorizontal className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Share Modal */}
      {showShareMenu && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center px-4 pb-6 sm:pb-0"
          onClick={() => setShowShareMenu(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <span className="font-bold text-gray-800 text-[15px]">แชร์โพสต์</span>
              <button onClick={() => setShowShareMenu(false)} className="text-gray-400 hover:bg-gray-100 p-1.5 rounded-full transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-5 py-3 bg-[#f0f2f5] mx-4 mt-4 rounded-xl">
              <div className="flex items-center gap-2 mb-1">
                <img src={post.cat.avatar} className="w-7 h-7 rounded-full object-cover" alt="" />
                <span className="font-semibold text-sm text-[#050505]">{post.cat.name}</span>
              </div>
              <p className="text-sm text-[#65676B] line-clamp-2">{post.content}</p>
            </div>

            <div className="p-4 space-y-1">
              <button onClick={handleCopyLink} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[#f0f2f5] transition-colors text-left">
                <div className="bg-gray-200 p-2 rounded-full"><Link2 className="w-5 h-5 text-gray-700" /></div>
                <div>
                  <p className="font-semibold text-[#050505] text-sm">คัดลอกลิงก์</p>
                  <p className="text-xs text-[#65676B]">คัดลอก URL โพสต์นี้</p>
                </div>
              </button>

              {typeof navigator.share === 'function' && (
                <button onClick={handleNativeShare} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[#f0f2f5] transition-colors text-left">
                  <div className="bg-[#4267B2] p-2 rounded-full"><Share2 className="w-5 h-5 text-white" /></div>
                  <div>
                    <p className="font-semibold text-[#050505] text-sm">แชร์ผ่านแอป</p>
                    <p className="text-xs text-[#65676B]">เลือกแอปที่ต้องการแชร์</p>
                  </div>
                </button>
              )}

              <button onClick={handleRepost} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[#f0f2f5] transition-colors text-left">
                <div className="bg-green-100 p-2 rounded-full"><Repeat2 className="w-5 h-5 text-green-600" /></div>
                <div>
                  <p className="font-semibold text-[#050505] text-sm">รีโพสต์</p>
                  <p className="text-xs text-[#65676B]">แชร์ไปยัง Feed ของคุณ</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PostCard;
