import { useState } from 'react';
import { Link } from 'react-router-dom';
import PawIcon from '../components/PawIcon';
import { authApi } from '../services/commerceApi';

const CAT_BREEDS = [
  'ไม่ระบุ', 'แมวไทย', 'เปอร์เซีย', 'เมนคูน', 'สก็อตติช โฟลด์',
  'บริติช ชอร์ตแฮร์', 'รัสเซียน บลู', 'เบงกอล', 'เอ็กโซติก', 'อเมริกัน ชอร์ตแฮร์',
  'ซิลเวสทรีส', 'อื่นๆ',
];

const inputCls = (hasErr) =>
  `w-full px-4 py-3 rounded-lg border text-[15px] focus:outline-none focus:ring-1 transition-colors ${
    hasErr
      ? 'border-red-400 focus:border-red-400 focus:ring-red-400 bg-red-50'
      : 'border-[#dddfe2] focus:border-[#4267B2] focus:ring-[#4267B2]'
  }`;

const FieldError = ({ msg }) =>
  msg ? <p className="text-red-500 text-xs font-medium mt-1">{msg}</p> : null;

const RegisterPage = ({ onLogin }) => {
  const [form, setForm] = useState({
    email: '', password: '', confirmPassword: '',
    ownerName: '', catName: '', catBreed: 'ไม่ระบุ', catBio: '',
  });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const set = (key) => (e) => {
    setForm(f => ({ ...f, [key]: e.target.value }));
    setErrors(err => ({ ...err, [key]: '' }));
    setSubmitError('');
  };

  const validate = () => {
    const e = {};
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      e.email = 'กรุณากรอก Email ที่ถูกต้อง';
    }
    if (form.password.length < 8) {
      e.password = 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร';
    }
    if (form.password !== form.confirmPassword) {
      e.confirmPassword = 'รหัสผ่านไม่ตรงกัน';
    }
    if (!form.ownerName.trim()) {
      e.ownerName = 'กรุณากรอกชื่อเจ้าของ';
    }
    if (!form.catName.trim()) {
      e.catName = 'กรุณากรอกชื่อแมว';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const { user } = await authApi.register({
        email: form.email.trim().toLowerCase(),
        password: form.password,
        ownerName: form.ownerName.trim(),
        catName: form.catName.trim(),
        catBreed: form.catBreed === 'ไม่ระบุ' ? '' : form.catBreed,
        catBio: form.catBio.trim(),
      });
      onLogin(user);
    } catch (err) {
      const code = err?.payload?.error?.code;
      if (code === 'EMAIL_EXISTS') {
        setErrors(prev => ({ ...prev, email: 'Email นี้ถูกใช้งานแล้ว' }));
      } else {
        setSubmitError(err?.message || 'สมัครสมาชิกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f2f5] flex flex-col items-center justify-center p-4 py-8">
      <div className="mb-6 text-center flex flex-col items-center">
        <div className="bg-[#4267B2] p-4 rounded-full mb-4 shadow-lg">
          <PawIcon className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-4xl font-bold text-[#4267B2] tracking-tight mb-1">CatBook</h1>
        <p className="text-gray-500 font-medium">สร้างบัญชีสำหรับคุณและน้องแมว</p>
      </div>

      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md">
        <h2 className="text-[20px] font-black text-[#050505] mb-5">สมัครสมาชิก</h2>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* Account section */}
          <div className="space-y-3">
            <p className="text-[11px] font-bold text-[#65676B] uppercase tracking-wide">ข้อมูลบัญชี</p>
            <div>
              <input
                type="email"
                placeholder="Email *"
                value={form.email}
                onChange={set('email')}
                className={inputCls(errors.email)}
                autoComplete="email"
              />
              <FieldError msg={errors.email} />
            </div>
            <div>
              <input
                type="password"
                placeholder="รหัสผ่าน (อย่างน้อย 8 ตัวอักษร) *"
                value={form.password}
                onChange={set('password')}
                className={inputCls(errors.password)}
                autoComplete="new-password"
              />
              <FieldError msg={errors.password} />
            </div>
            <div>
              <input
                type="password"
                placeholder="ยืนยันรหัสผ่าน *"
                value={form.confirmPassword}
                onChange={set('confirmPassword')}
                className={inputCls(errors.confirmPassword)}
                autoComplete="new-password"
              />
              <FieldError msg={errors.confirmPassword} />
            </div>
            <div>
              <input
                type="text"
                placeholder="ชื่อเจ้าของ *"
                value={form.ownerName}
                onChange={set('ownerName')}
                className={inputCls(errors.ownerName)}
                maxLength={60}
              />
              <FieldError msg={errors.ownerName} />
            </div>
          </div>

          {/* Cat section */}
          <div className="space-y-3 pt-1">
            <p className="text-[11px] font-bold text-[#65676B] uppercase tracking-wide">ข้อมูลน้องแมว</p>
            <div>
              <input
                type="text"
                placeholder="ชื่อแมว *"
                value={form.catName}
                onChange={set('catName')}
                className={inputCls(errors.catName)}
                maxLength={40}
              />
              <FieldError msg={errors.catName} />
            </div>
            <select
              value={form.catBreed}
              onChange={set('catBreed')}
              className="w-full px-4 py-3 rounded-lg border border-[#dddfe2] text-[15px] text-gray-700 focus:outline-none focus:border-[#4267B2] focus:ring-1 focus:ring-[#4267B2]"
            >
              {CAT_BREEDS.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
            <textarea
              placeholder="Bio ของน้องแมว (ไม่บังคับ)"
              value={form.catBio}
              onChange={set('catBio')}
              rows={2}
              maxLength={200}
              className="w-full px-4 py-3 rounded-lg border border-[#dddfe2] text-[15px] focus:outline-none focus:border-[#4267B2] focus:ring-1 focus:ring-[#4267B2] resize-none"
            />
          </div>

          {submitError && (
            <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg px-4 py-3 text-sm font-medium">
              {submitError}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold text-[17px] py-3 rounded-lg transition-colors mt-2"
          >
            {isSubmitting ? 'กำลังสมัครสมาชิก...' : 'สมัครสมาชิก 🐾'}
          </button>
        </form>

        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 border-t border-[#dddfe2]" />
          <span className="text-[#65676B] text-sm">หรือ</span>
          <div className="flex-1 border-t border-[#dddfe2]" />
        </div>

        <Link
          to="/login"
          className="block w-full text-center bg-[#4267B2] hover:bg-[#3b5998] text-white font-bold text-[15px] py-2.5 rounded-lg transition-colors"
        >
          เข้าสู่ระบบ
        </Link>
      </div>
    </div>
  );
};

export default RegisterPage;
