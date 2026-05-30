import { useState, useEffect, useRef } from 'react';
import { X, ImagePlus } from 'lucide-react';
import { useUser } from '../context/UserContext';

const CATEGORIES = ['อาหารแมว', 'ทรายแมว', 'ของเล่น', 'คอนโดและที่นอน', 'ปลอกคอ', 'อุปกรณ์'];

const MOCK_FALLBACK_IMG = 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=400&q=80';

const Field = ({ label, required, error, children }) => (
  <div>
    <label className="block text-[13px] font-semibold text-[#050505] mb-1">
      {label}{required && <span className="text-red-400 ml-0.5">*</span>}
    </label>
    {children}
    {error && <p className="text-red-500 text-[12px] mt-1">{error}</p>}
  </div>
);

const inputCls =
  'w-full bg-[#f0f2f5] hover:bg-[#e4e6eb] border border-transparent focus:border-[#4267B2] focus:bg-white rounded-lg px-3 py-2.5 text-[15px] text-[#050505] outline-none transition-all placeholder:text-[#bcc0c4]';

/* initialValues = existing product when editing; null = creating new */
const CreateListingModal = ({ isOpen, onClose, onSubmit, initialValues = null }) => {
  const { currentUser } = useUser();
  const isEdit = Boolean(initialValues?.id);

  const [title, setTitle]           = useState('');
  const [price, setPrice]           = useState('');
  const [category, setCategory]     = useState('');
  const [location, setLocation]     = useState('');
  const [stock, setStock]           = useState('10');
  const [desc, setDesc]             = useState('');
  const [imagePreview, setImagePreview] = useState(null);
  const [errors, setErrors]         = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      if (initialValues) {
        setTitle(initialValues.title ?? '');
        setPrice(String(initialValues.price ?? ''));
        setCategory(initialValues.category ?? '');
        setLocation(initialValues.location ?? '');
        setStock(String(initialValues.stock ?? 10));
        setDesc(initialValues.desc ?? '');
        setImagePreview(initialValues.img ?? null);
      }
    } else {
      document.body.style.overflow = '';
      setTitle(''); setPrice(''); setCategory('');
      setLocation(''); setStock('10'); setDesc('');
      setImagePreview(null); setErrors({});
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen, initialValues]);

  if (!isOpen) return null;

  const validate = () => {
    const e = {};
    if (!title.trim())    e.title    = 'กรุณากรอกชื่อสินค้า';
    if (!price.trim())    e.price    = 'กรุณากรอกราคา';
    else if (isNaN(Number(price)) || Number(price) <= 0) e.price = 'ราคาต้องเป็นตัวเลขที่มากกว่า 0';
    if (!category)        e.category = 'กรุณาเลือกหมวดหมู่';
    if (!location.trim()) e.location = 'กรุณากรอกพื้นที่/จังหวัด';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setIsSubmitting(true);
    setErrors({});
    try {
      await onSubmit({
        id:       isEdit ? initialValues.id : `m-${Date.now()}`,
        title:    title.trim(),
        price:    Number(price),
        category,
        location: location.trim(),
        stock:    Math.max(0, parseInt(stock) || 0),
        desc:     desc.trim(),
        seller:   isEdit ? initialValues.seller : { ...currentUser.activeCat },
        img:      imagePreview || MOCK_FALLBACK_IMG,
      });
      onClose();
    } catch (err) {
      setErrors({ form: err?.message || 'Unable to save product' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) setImagePreview(URL.createObjectURL(file));
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[110] flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white w-full max-w-[480px] rounded-xl shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="relative flex items-center justify-center h-[56px] border-b border-[#dddfe2] shrink-0">
          <h2 className="font-bold text-[18px] text-[#050505]">
            {isEdit ? 'แก้ไขสินค้า' : 'ลงขายสินค้า'}
          </h2>
          <button
            onClick={onClose}
            className="absolute right-3 bg-[#e4e6eb] hover:bg-[#d8dadf] text-[#050505] rounded-full p-2 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {/* Image */}
          <Field label="รูปภาพสินค้า">
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
                  <p className="font-semibold text-[#050505] text-sm">เพิ่มรูปภาพสินค้า</p>
                  <p className="text-[#65676B] text-xs">PNG, JPG ขนาดไม่เกิน 10MB</p>
                </div>
              )}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
          </Field>

          {/* Title */}
          <Field label="ชื่อสินค้า" required error={errors.title}>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)}
              placeholder="เช่น คอนโดแมว 3 ชั้น พร้อมที่ลับเล็บ" className={inputCls} />
          </Field>

          {/* Price + Category */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="ราคา (บาท)" required error={errors.price}>
              <div className="relative">
                <input type="number" min="1" value={price} onChange={e => setPrice(e.target.value)}
                  placeholder="0" className={`${inputCls} pr-8`} />
                <span className="absolute right-3 top-2.5 text-[#65676B] text-[15px]">฿</span>
              </div>
            </Field>
            <Field label="หมวดหมู่" required error={errors.category}>
              <select value={category} onChange={e => setCategory(e.target.value)} className={`${inputCls} cursor-pointer`}>
                <option value="">เลือกหมวดหมู่</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
          </div>

          {/* Location + Stock */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="พื้นที่/จังหวัด" required error={errors.location}>
              <input type="text" value={location} onChange={e => setLocation(e.target.value)}
                placeholder="เช่น กรุงเทพฯ" className={inputCls} />
            </Field>
            <Field label="จำนวนสินค้า (ชิ้น)">
              <input type="number" min="0" value={stock} onChange={e => setStock(e.target.value)}
                placeholder="10" className={inputCls} />
            </Field>
          </div>

          {/* Description */}
          <Field label="รายละเอียดสินค้า">
            <textarea value={desc} onChange={e => setDesc(e.target.value)}
              placeholder="อธิบายสภาพ ขนาด หรือรายละเอียดเพิ่มเติม..."
              rows={3} className={`${inputCls} resize-none`} />
          </Field>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-[#dddfe2] shrink-0">
          {errors.form && <p className="text-red-500 text-[12px] font-semibold mb-2">{errors.form}</p>}
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full py-2.5 bg-[#4267B2] hover:bg-[#3b5998] disabled:bg-gray-300 disabled:cursor-wait text-white font-bold text-[15px] rounded-lg transition-colors"
          >
            {isEdit ? 'บันทึกการเปลี่ยนแปลง' : 'ลงขาย'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateListingModal;
