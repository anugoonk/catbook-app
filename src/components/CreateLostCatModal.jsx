import { useState, useEffect, useRef } from 'react';
import { X, ImagePlus } from 'lucide-react';
import { useUser } from '../context/UserContext';

const FALLBACK_IMG = 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=400&q=80';

const Field = ({ label, required, error, children }) => (
  <div>
    <label className="block text-[13px] font-semibold text-[#050505] mb-1">
      {label}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
    {children}
    {error && <p className="text-red-500 text-[12px] mt-1">{error}</p>}
  </div>
);

const inputCls =
  'w-full bg-[#f0f2f5] hover:bg-[#e4e6eb] border border-transparent focus:border-red-400 focus:bg-white rounded-lg px-3 py-2.5 text-[15px] text-[#050505] outline-none transition-all placeholder:text-[#bcc0c4]';

const CreateLostCatModal = ({ isOpen, onClose, onSubmit }) => {
  const { currentUser } = useUser();
  const [name, setName] = useState('');
  const [breed, setBreed] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [lastSeen, setLastSeen] = useState('');
  const [location, setLocation] = useState('');
  const [reward, setReward] = useState('');
  const [contact, setContact] = useState('');
  const [marks, setMarks] = useState('');
  const [imagePreview, setImagePreview] = useState(null);
  const [errors, setErrors] = useState({});
  const fileRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      setName(''); setBreed(''); setAge(''); setGender('');
      setLastSeen(''); setLocation(''); setReward('');
      setContact(''); setMarks(''); setImagePreview(null); setErrors({});
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  const validate = () => {
    const e = {};
    if (!name.trim())     e.name     = 'กรุณากรอกชื่อแมว';
    if (!lastSeen.trim()) e.lastSeen = 'กรุณากรอกวันที่หายล่าสุด';
    if (!location.trim()) e.location = 'กรุณากรอกสถานที่';
    if (!contact.trim())  e.contact  = 'กรุณากรอกเบอร์ติดต่อ';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    onSubmit({
      id: `l-${Date.now()}`,
      name: name.trim(),
      breed: breed.trim() || '—',
      age: age.trim() || '—',
      gender: gender || '—',
      lastSeen: lastSeen.trim(),
      location: location.trim(),
      reward: reward ? Number(reward) : 0,
      marks: marks.trim() || 'ไม่มีข้อมูลตำหนิเพิ่มเติม',
      contact: contact.trim(),
      img: imagePreview || FALLBACK_IMG,
      poster: { ...currentUser.activeCat },
    });
    onClose();
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) setImagePreview(URL.createObjectURL(file));
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white w-full max-w-[500px] rounded-xl shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="relative flex items-center justify-center h-[56px] border-b border-[#dddfe2] shrink-0 bg-red-50 rounded-t-xl">
          <h2 className="font-bold text-[18px] text-red-700">🔍 แจ้งแมวหาย</h2>
          <button
            onClick={onClose}
            className="absolute right-3 bg-red-100 hover:bg-red-200 text-red-700 rounded-full p-2 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {/* Photo */}
          <Field label="รูปน้องแมว">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full border-2 border-dashed border-red-200 rounded-xl bg-red-50 hover:bg-red-100 transition-colors flex flex-col items-center justify-center overflow-hidden"
              style={{ minHeight: imagePreview ? 'auto' : '130px' }}
            >
              {imagePreview ? (
                <div className="relative w-full">
                  <img src={imagePreview} alt="preview" className="w-full max-h-48 object-cover" />
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <p className="text-white text-sm font-semibold">เปลี่ยนรูป</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 py-6">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                    <ImagePlus className="w-6 h-6 text-red-400" />
                  </div>
                  <p className="font-semibold text-red-600 text-sm">เพิ่มรูปน้องแมว</p>
                  <p className="text-red-400 text-xs">ยิ่งชัดยิ่งดี — ช่วยให้ตามหาได้เร็วขึ้น</p>
                </div>
              )}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
          </Field>

          {/* Name + Breed */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="ชื่อแมว" required error={errors.name}>
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="เช่น น้องส้ม" className={inputCls} />
            </Field>
            <Field label="สายพันธุ์">
              <input type="text" value={breed} onChange={e => setBreed(e.target.value)} placeholder="เช่น แมวส้ม" className={inputCls} />
            </Field>
          </div>

          {/* Age + Gender */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="อายุ">
              <input type="text" value={age} onChange={e => setAge(e.target.value)} placeholder="เช่น 2 ปี" className={inputCls} />
            </Field>
            <Field label="เพศ">
              <div className="flex gap-2">
                {[{ value: 'ผู้', label: '♂ ผู้' }, { value: 'เมีย', label: '♀ เมีย' }].map(g => (
                  <button
                    key={g.value}
                    type="button"
                    onClick={() => setGender(g.value)}
                    className={`flex-1 py-2.5 rounded-lg border-2 font-semibold text-sm transition-colors
                      ${gender === g.value
                        ? 'border-red-500 bg-red-50 text-red-600'
                        : 'border-[#dddfe2] text-[#65676B] hover:bg-[#f0f2f5]'}`}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </Field>
          </div>

          {/* Last Seen + Location */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="วันที่หายล่าสุด" required error={errors.lastSeen}>
              <input type="text" value={lastSeen} onChange={e => setLastSeen(e.target.value)} placeholder="เช่น 14 พ.ค. 2568" className={inputCls} />
            </Field>
            <Field label="เงินรางวัล (บาท)">
              <div className="relative">
                <input type="number" min="0" value={reward} onChange={e => setReward(e.target.value)} placeholder="0" className={`${inputCls} pr-8`} />
                <span className="absolute right-3 top-2.5 text-[#65676B] text-[15px]">฿</span>
              </div>
            </Field>
          </div>

          <Field label="สถานที่หายล่าสุด" required error={errors.location}>
            <input type="text" value={location} onChange={e => setLocation(e.target.value)} placeholder="เช่น ซอยลาดพร้าว 15, กรุงเทพฯ" className={inputCls} />
          </Field>

          <Field label="เบอร์ติดต่อ" required error={errors.contact}>
            <input type="text" value={contact} onChange={e => setContact(e.target.value)} placeholder="เช่น 081-234-5678" className={inputCls} />
          </Field>

          <Field label="ตำหนิ / ลักษณะเด่น">
            <textarea
              value={marks}
              onChange={e => setMarks(e.target.value)}
              placeholder="เช่น มีปลอกคอสีแดง หูขวาบิ่น ขนลายเฉพาะ..."
              rows={3}
              className={`${inputCls} resize-none`}
            />
          </Field>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-[#dddfe2] shrink-0">
          <button
            onClick={handleSubmit}
            className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-[15px] rounded-lg transition-colors"
          >
            🔍 ประกาศตามหาแมว
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateLostCatModal;
