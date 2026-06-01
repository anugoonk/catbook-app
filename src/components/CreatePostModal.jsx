import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Image as ImageIcon, UserPlus, Smile, Upload } from 'lucide-react';
import { mockUsers } from '../data/mockData';
import { useUser } from '../context/UserContext';
import { useNotifications } from '../context/NotificationContext';
import { translateToMeow } from '../utils/meowTranslator';
import { createPost } from '../services/postStore';

const FEELINGS = [
  { emoji: '😴', label: 'ง่วงนอน' },
  { emoji: '😋', label: 'หิวโซ' },
  { emoji: '😈', label: 'ซน' },
  { emoji: '😻', label: 'ตื่นเต้น' },
  { emoji: '😾', label: 'งอน' },
  { emoji: '😸', label: 'มีความสุข' },
  { emoji: '🙀', label: 'ตกใจ' },
  { emoji: '😿', label: 'เศร้า' },
];

function compressImage(file, maxW = 1200, maxH = 900, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxW / img.width, maxH / img.height);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = reject;
    img.src = url;
  });
}

/* Preview grid layout for up to 4 images */
const PreviewGrid = ({ images, onRemove }) => {
  const count = images.length;
  if (count === 0) return null;

  const imgClass = "w-full h-full object-cover";
  const removeBtn = (idx) => (
    <button
      onClick={() => onRemove(idx)}
      className="absolute top-1.5 right-1.5 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 transition-colors z-10"
    >
      <X className="w-3.5 h-3.5" />
    </button>
  );

  if (count === 1) return (
    <div className="relative mt-3 rounded-xl overflow-hidden border border-[#dddfe2] max-h-64">
      <img src={images[0]} alt="" className="w-full h-full object-cover" />
      {removeBtn(0)}
    </div>
  );

  if (count === 2) return (
    <div className="mt-3 grid grid-cols-2 gap-0.5 rounded-xl overflow-hidden border border-[#dddfe2]" style={{ height: 200 }}>
      {images.map((src, i) => (
        <div key={i} className="relative">
          <img src={src} alt="" className={imgClass} />
          {removeBtn(i)}
        </div>
      ))}
    </div>
  );

  if (count === 3) return (
    <div className="mt-3 flex gap-0.5 rounded-xl overflow-hidden border border-[#dddfe2]" style={{ height: 220 }}>
      <div className="relative flex-1">
        <img src={images[0]} alt="" className={imgClass} />
        {removeBtn(0)}
      </div>
      <div className="flex flex-col gap-0.5 flex-1">
        {[1, 2].map(i => (
          <div key={i} className="relative flex-1">
            <img src={images[i]} alt="" className={imgClass} />
            {removeBtn(i)}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="mt-3 grid grid-cols-2 gap-0.5 rounded-xl overflow-hidden border border-[#dddfe2]">
      {images.map((src, i) => (
        <div key={i} className="relative" style={{ height: 130 }}>
          <img src={src} alt="" className={imgClass} />
          {removeBtn(i)}
        </div>
      ))}
    </div>
  );
};

const CreatePostModal = ({ isOpen, onClose, initialPanel = null }) => {
  const { currentUser } = useUser();
  const { addNotification } = useNotifications();
  const [text, setText] = useState('');
  const [activePanel, setActivePanel] = useState(null);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [compressing, setCompressing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [taggedCats, setTaggedCats] = useState([]);
  const [tagSearch, setTagSearch] = useState('');
  const [selectedFeeling, setSelectedFeeling] = useState(null);
  const [meowMode, setMeowMode] = useState(true);
  const [posting, setPosting] = useState(false);
  const [mentionQuery, setMentionQuery] = useState(null);
  const [mentionStart, setMentionStart] = useState(0);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const cursorRef = useRef(0);

  const mentionableCats = mockUsers
    .filter(u => u.activeCat.id !== currentUser?.activeCat?.id)
    .map(u => u.activeCat);
  const mentionFiltered = mentionQuery !== null
    ? mentionableCats.filter(c => c.name.toLowerCase().includes(mentionQuery.toLowerCase()))
    : [];

  useEffect(() => {
    if (isOpen) {
      setActivePanel(initialPanel);
      document.body.style.overflow = 'hidden';
      setTimeout(() => textareaRef.current?.focus(), 80);
    } else {
      document.body.style.overflow = '';
      setText('');
      setActivePanel(null);
      setImagePreviews([]);
      setImageFiles([]);
      setIsDragging(false);
      setTaggedCats([]);
      setTagSearch('');
      setSelectedFeeling(null);
      setMeowMode(false);
      setMentionQuery(null);
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen, initialPanel]);

  if (!isOpen) return null;

  const canPost = text.trim() || imagePreviews.length > 0;

  const addImages = useCallback(async (files) => {
    const file = Array.from(files).find(f => f.type.startsWith('image/'));
    if (!file) return;
    setCompressing(true);
    try {
      const b64 = await compressImage(file);
      setImagePreviews([b64]);
      setActivePanel('photo');
    } catch {
      // ignore compress error
    } finally {
      setCompressing(false);
    }
  }, []);

  const removeImage = (idx) => {
    setImagePreviews(prev => prev.filter((_, i) => i !== idx));
  };

  const handleImageChange = (e) => {
    addImages(e.target.files);
    e.target.value = '';
  };

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    addImages(e.dataTransfer.files);
  };

  const handleTextChange = (e) => {
    const val = e.target.value;
    setText(val);
    const cursor = e.target.selectionStart ?? val.length;
    cursorRef.current = cursor;
    const before = val.slice(0, cursor);
    const match = before.match(/@(\S*)$/);
    if (match) { setMentionQuery(match[1]); setMentionStart(match.index); }
    else setMentionQuery(null);
  };

  const selectMentionInText = (cat) => {
    const before = text.slice(0, mentionStart);
    const after = text.slice(cursorRef.current);
    setText(`${before}@${cat.name} ${after}`);
    setMentionQuery(null);
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const handlePost = async () => {
    if (!canPost || posting) return;
    const rawContent = text.trim();
    const content = meowMode && rawContent ? translateToMeow(rawContent) : rawContent;

    setPosting(true);
    try {
      await createPost({
        content,
        feeling: selectedFeeling ? `${selectedFeeling.emoji} ${selectedFeeling.label}` : null,
        imageUrl: imagePreviews[0] || null,
        currentUser,
      });

      [...rawContent.matchAll(/@(\S+)/g)].forEach(([, name]) => {
        if (mentionableCats.find(c => c.name === name)) {
          addNotification({
            type: 'tag',
            actor: { name: currentUser.activeCat.name, avatar: currentUser.activeCat.avatar },
            message: `แท็กคุณในโพสต์: "${rawContent.length > 40 ? rawContent.slice(0, 40) + '…' : rawContent}"`,
          });
        }
      });

      onClose();
    } catch {
      // keep modal open on error
    } finally {
      setPosting(false);
    }
  };

  const toggleTag = (cat) => {
    setTaggedCats(prev =>
      prev.find(c => c.id === cat.id) ? prev.filter(c => c.id !== cat.id) : [...prev, cat]
    );
  };

  const togglePanel = (panel) => setActivePanel(prev => prev === panel ? null : panel);

  const selectFeeling = (f) => {
    setSelectedFeeling(prev => prev?.label === f.label ? null : f);
    setActivePanel(null);
  };

  const friends = mockUsers
    .filter(u => u.activeCat.id !== currentUser.activeCat.id)
    .map(u => u.activeCat);
  const filteredCats = friends.filter(c =>
    c.name.toLowerCase().includes(tagSearch.toLowerCase())
  );

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white w-full max-w-[500px] rounded-xl shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="relative flex items-center justify-center h-[56px] border-b border-[#dddfe2] shrink-0">
          <h2 className="font-bold text-[18px] text-[#050505]">สร้างโพสต์</h2>
          <button
            onClick={onClose}
            className="absolute right-3 bg-[#e4e6eb] hover:bg-[#d8dadf] text-[#050505] rounded-full p-2 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-2">

          {/* User info */}
          <div className="flex items-center gap-2 mb-4">
            <img
              src={currentUser.activeCat.avatar}
              alt="avatar"
              className="w-10 h-10 rounded-full object-cover shrink-0"
            />
            <div>
              <p className="font-bold text-[#050505] text-[15px] leading-tight">{currentUser.activeCat.name}</p>
              <div className="flex flex-wrap gap-x-1 text-[13px] text-[#65676B]">
                {selectedFeeling && <span>รู้สึก {selectedFeeling.emoji} {selectedFeeling.label}</span>}
                {taggedCats.length > 0 && (
                  <span>{selectedFeeling ? '·' : ''} กับ <span className="text-[#4267B2] font-medium">{taggedCats.map(c => c.name).join(', ')}</span></span>
                )}
              </div>
            </div>
          </div>

          {/* Meow Mode banner */}
          {meowMode && (
            <div className="flex items-center gap-2 px-3 py-2 mb-3 bg-purple-50 border border-purple-200 rounded-xl">
              <span className="text-lg leading-none">🐾</span>
              <p className="text-[12px] text-purple-700 font-semibold flex-1">Meow Mode เปิดอยู่ — โพสต์จะถูกแปลเป็นภาษาแมวให้อัตโนมัติ</p>
              <button onClick={() => setMeowMode(false)} className="text-purple-400 hover:text-purple-600 font-bold text-xs px-1">✕</button>
            </div>
          )}

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleTextChange}
            onSelect={e => { cursorRef.current = e.target.selectionStart; }}
            placeholder={meowMode ? `พิมพ์อะไรก็ได้ แมวจะแปลให้เอง~ 🐾` : `คุณกำลังคิดอะไรอยู่เหมียว, ${currentUser.activeCat.name}? (พิมพ์ @ เพื่อแท็กเพื่อน)`}
            rows={4}
            className={`w-full resize-none outline-none text-[18px] sm:text-[20px] text-[#050505] leading-relaxed rounded-xl px-1 transition-all
              ${meowMode ? 'placeholder:text-purple-300 ring-2 ring-purple-200 bg-purple-50 p-3' : 'placeholder:text-[#bcc0c4]'}`}
          />

          {/* Tagged badges */}
          {taggedCats.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {taggedCats.map(cat => (
                <span key={cat.id} className="inline-flex items-center gap-1 bg-blue-50 border border-blue-200 rounded-full pl-1 pr-2 py-0.5">
                  <img src={cat.avatar} className="w-5 h-5 rounded-full object-cover" alt={cat.name} />
                  <span className="text-[13px] text-[#4267B2] font-medium">{cat.name}</span>
                  <button onClick={() => toggleTag(cat)} className="text-[#65676B] hover:text-red-500 leading-none">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Image preview */}
          {imagePreviews.length > 0 && (
            <PreviewGrid images={imagePreviews} onRemove={removeImage} />
          )}

          {/* Drop zone — show when photo panel active and no image yet */}
          {activePanel === 'photo' && imagePreviews.length === 0 && (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`w-full mt-3 border-2 border-dashed rounded-xl flex flex-col items-center justify-center py-10 gap-3 cursor-pointer transition-all
                ${isDragging
                  ? 'border-[#4267B2] bg-blue-50 scale-[1.01]'
                  : 'border-[#dddfe2] bg-[#f0f2f5] hover:bg-[#e4e6eb] hover:border-gray-400'}`}
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors
                ${isDragging ? 'bg-[#4267B2] text-white' : 'bg-[#e4e6eb] text-[#65676B]'}`}
              >
                <Upload className="w-6 h-6" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-[#050505] text-sm">
                  {isDragging ? 'วางรูปที่นี่เลย! 🐾' : 'เพิ่มรูปภาพ'}
                </p>
                <p className="text-[#65676B] text-xs mt-0.5">ลากวางหรือคลิกเพื่อเลือกรูป</p>
              </div>
            </div>
          )}

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageChange}
          />

          {/* Panel: Tag Friends */}
          {activePanel === 'tag' && (
            <div className="mt-3 border border-[#dddfe2] rounded-xl overflow-hidden">
              <div className="p-3 border-b border-[#dddfe2]">
                <input
                  autoFocus
                  type="text"
                  value={tagSearch}
                  onChange={e => setTagSearch(e.target.value)}
                  placeholder="ค้นหาเพื่อนเหมียว..."
                  className="w-full bg-[#f0f2f5] rounded-full py-1.5 px-4 text-sm outline-none focus:ring-2 focus:ring-[#4267B2]/20"
                />
              </div>
              <div className="max-h-44 overflow-y-auto divide-y divide-[#f0f2f5]">
                {filteredCats.map(cat => {
                  const tagged = taggedCats.find(c => c.id === cat.id);
                  return (
                    <div
                      key={cat.id}
                      onClick={() => toggleTag(cat)}
                      className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors
                        ${tagged ? 'bg-blue-50' : 'hover:bg-[#f0f2f5]'}`}
                    >
                      <img src={cat.avatar} className="w-9 h-9 rounded-full object-cover shrink-0" alt={cat.name} />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-[#050505] text-sm">{cat.name}</p>
                        <p className="text-[#65676B] text-xs truncate">{cat.breed}</p>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors
                        ${tagged ? 'bg-[#4267B2] border-[#4267B2]' : 'border-[#bcc0c4]'}`}
                      >
                        {tagged && <span className="text-white text-[10px] font-bold">✓</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Panel: Feelings */}
          {activePanel === 'feeling' && (
            <div className="mt-3">
              <p className="text-[#65676B] text-sm font-semibold mb-2">คุณรู้สึกอย่างไรวันนี้?</p>
              <div className="grid grid-cols-2 gap-2">
                {FEELINGS.map(f => (
                  <button
                    key={f.label}
                    onClick={() => selectFeeling(f)}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-colors text-left
                      ${selectedFeeling?.label === f.label
                        ? 'border-[#4267B2] bg-blue-50'
                        : 'border-[#dddfe2] hover:bg-[#f0f2f5]'}`}
                  >
                    <span className="text-2xl leading-none">{f.emoji}</span>
                    <span className={`text-sm font-medium ${selectedFeeling?.label === f.label ? 'text-[#4267B2]' : 'text-[#050505]'}`}>
                      {f.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Mention dropdown — between body and footer, avoids overflow clipping */}
        {mentionQuery !== null && mentionFiltered.length > 0 && (
          <div className="border-t border-[#dddfe2] max-h-44 overflow-y-auto shrink-0">
            <p className="text-[11px] text-[#65676B] font-semibold px-4 py-2">แท็กเพื่อนเหมียว 🐾</p>
            {mentionFiltered.map(cat => (
              <div
                key={cat.id}
                onMouseDown={e => { e.preventDefault(); selectMentionInText(cat); }}
                className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-[#f0f2f5]"
              >
                <img src={cat.avatar} className="w-8 h-8 rounded-full object-cover shrink-0" alt={cat.name} />
                <div>
                  <p className="font-semibold text-[#050505] text-sm">{cat.name}</p>
                  <p className="text-xs text-[#65676B]">{cat.breed}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="px-4 py-3 border-t border-[#dddfe2] shrink-0">
          <div className="flex gap-1 mb-3 flex-wrap">
            <button
              onClick={() => togglePanel('photo')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                ${activePanel === 'photo' || imagePreviews.length > 0
                  ? 'bg-green-50 text-green-600'
                  : 'hover:bg-[#f0f2f5] text-[#65676B]'}`}
            >
              <ImageIcon className="w-5 h-5 text-green-500 shrink-0" />
              <span>รูปภาพ</span>
            </button>
            <button
              onClick={() => togglePanel('tag')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                ${activePanel === 'tag' ? 'bg-blue-50 text-[#4267B2]' : 'hover:bg-[#f0f2f5] text-[#65676B]'}`}
            >
              <UserPlus className="w-5 h-5 text-blue-500 shrink-0" />
              <span>แท็กเพื่อน</span>
            </button>
            <button
              onClick={() => togglePanel('feeling')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                ${activePanel === 'feeling' ? 'bg-yellow-50 text-yellow-600' : 'hover:bg-[#f0f2f5] text-[#65676B]'}`}
            >
              <Smile className="w-5 h-5 text-yellow-500 shrink-0" />
              <span>ความรู้สึก</span>
            </button>
            <button
              onClick={() => setMeowMode(m => !m)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                ${meowMode ? 'bg-purple-100 text-purple-600' : 'hover:bg-purple-50 text-[#65676B] hover:text-purple-500'}`}
            >
              <span className="text-base leading-none">🐾</span>
              <span>Meow Mode</span>
            </button>
          </div>

          <button
            onClick={handlePost}
            disabled={!canPost || posting || compressing}
            className={`w-full py-2.5 rounded-lg font-bold text-[15px] transition-colors
              disabled:bg-[#e4e6eb] disabled:text-[#bcc0c4] disabled:cursor-not-allowed
              ${meowMode
                ? 'enabled:bg-purple-500 enabled:hover:bg-purple-600 enabled:text-white'
                : 'enabled:bg-[#4267B2] enabled:hover:bg-[#3b5998] enabled:text-white'}`}
          >
            {compressing ? 'กำลังบีบอัดรูป...' : posting ? 'กำลังโพสต์...' : meowMode ? '🐾 โพสต์เป็นภาษาแมว' : 'โพสต์'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreatePostModal;
