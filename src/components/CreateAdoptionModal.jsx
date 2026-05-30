import { useState, useEffect, useRef } from 'react';
import { X, ImagePlus } from 'lucide-react';
import { useUser } from '../context/UserContext';

const FALLBACK_IMG = 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=400&q=80';

const Field = ({ label, required, error, children }) => (
  <div>
    <label className="block text-[13px] font-semibold text-[#050505] mb-1">
      {label}
      {required && <span className="text-red-400 ml-0.5">*</span>}
    </label>
    {children}
    {error && <p className="text-red-500 text-[12px] mt-1">{error}</p>}
  </div>
);

const inputCls =
  'w-full bg-[#f0f2f5] hover:bg-[#e4e6eb] border border-transparent focus:border-[#4267B2] focus:bg-white rounded-lg px-3 py-2.5 text-[15px] text-[#050505] outline-none transition-all placeholder:text-[#bcc0c4]';

const CreateAdoptionModal = ({ isOpen, onClose, onSubmit }) => {
  const { currentUser } = useUser();
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [location, setLocation] = useState('');
  const [contact, setContact] = useState('');
  const [story, setStory] = useState('');
  const [imagePreview, setImagePreview] = useState(null);
  const [errors, setErrors] = useState({});
  const fileRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      setName(''); setAge(''); setGender(''); setLocation('');
      setContact(''); setStory(''); setImagePreview(null); setErrors({});
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  const validate = () => {
    const e = {};
    if (!name.trim())     e.name     = 'กรุณากรอกชื่อแมว';
    if (!age.trim())      e.age      = 'กรุณากรอกอายุ';
    if (!gender)          e.gender   = 'กรุณาเลือกเพศ';
    if (!location.trim()) e.location = 'กรุณากรอกพิกัด/จังหวัด';
    if (!contact.trim())  e.contact  = 'กรุณากรอกเบอร์ติดต่อ';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    onSubmit({
      id: `a-${Date.now()}`,
      name: name.trim(),
      age: age.trim(),
      gender,
      location: location.trim(),
      story: story.trim() || 'ยังไม่มีข้อมูลเพิ่มเติม',
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
        <div className="relative flex items-center justify-center h-[56px] border-b border-[#dddfe2] shrink-0">
          <h2 className="font-bold text-[18px] text-[#050505]">ประกาศหาบ้านให้น้องแมว</h2>
          <button
            onClick={onClose}
            className="absolute right-3 bg-[#e4e6eb] hover:bg-[#d8dadf] text-[#050505] rounded-full p-2 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {/* Image Upload */}
          <Field label="รูปน้องแมว">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full border-2 border-dashed border-[#dddfe2] rounded-xl bg-[#f0f2f5] hover:bg-[#e4e6eb] transition-colors flex flex-col items-center justify-center overflow-hidden"
              style={{ minHeight: imagePreview ? 'auto' : '140px' }}
            >
              {imagePreview ? (
                <div className="relative w-full">
                  <img src={imagePreview} alt="preview" className="w-full max-h-48 object-cover" />
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <p className="text-white text-sm font-semibold">เปลี่ยนรูป</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 py-8">
                  <div className="w-12 h-12 bg-[#e4e6eb] rounded-full flex items-center justify-center">
                    <ImagePlus className="w-6 h-6 text-[#65676B]" />
                  </div>
                  <p className="font-semibold text-[#050505] text-sm">เพิ่มรูปน้องแมว</p>
                  <p className="text-[#65676B] text-xs">PNG, JPG ขนาดไม่เกิน 10MB</p>
                </div>
              )}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
          </Field>

          {/* Name + Age */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="ชื่อแมว" required error={errors.name}>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="เช่น น้องขาว"
                className={inputCls}
              />
            </Field>
            <Field label="อายุ" required error={errors.age}>
              <input
                type="text"
                value={age}
                onChange={e => setAge(e.target.value)}
                placeholder="เช่น 3 เดือน"
                className={inputCls}
              />
            </Field>
          </div>

          {/* Gender */}
          <Field label="เพศ" required error={errors.gender}>
            <div className="flex gap-3">
              {[{ value: 'ผู้', label: '♂ ผู้' }, { value: 'เมีย', label: '♀ เมีย' }].map(g => (
                <button
                  key={g.value}
                  type="button"
                  onClick={() => setGender(g.value)}
                  className={`flex-1 py-2.5 rounded-lg border-2 font-semibold text-sm transition-colors
                    ${gender === g.value
                      ? 'border-[#4267B2] bg-blue-50 text-[#4267B2]'
                      : 'border-[#dddfe2] text-[#65676B] hover:bg-[#f0f2f5]'}`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </Field>

          {/* Location */}
          <Field label="พิกัด/จังหวัด" required error={errors.location}>
            <input
              type="text"
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="เช่น กรุงเทพฯ, เชียงใหม่"
              className={inputCls}
            />
          </Field>

          {/* Contact */}
          <Field label="เบอร์ติดต่อ" required error={errors.contact}>
            <input
              type="text"
              value={contact}
              onChange={e => setContact(e.target.value)}
              placeholder="เช่น 081-234-5678"
              className={inputCls}
            />
          </Field>

          {/* Story */}
          <Field label="ประวัติ / นิสัยน้องแมว">
            <textarea
              value={story}
              onChange={e => setStory(e.target.value)}
              placeholder="เล่าให้ฟังว่าน้องเป็นยังไง ชอบอะไร ฉีดวัคซีนแล้วหรือยัง..."
              rows={3}
              className={`${inputCls} resize-none`}
            />
          </Field>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-[#dddfe2] shrink-0">
          <button
            onClick={handleSubmit}
            className="w-full py-2.5 bg-[#4267B2] hover:bg-[#3b5998] text-white font-bold text-[15px] rounded-lg transition-colors"
          >
            ประกาศหาบ้าน
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateAdoptionModal;
