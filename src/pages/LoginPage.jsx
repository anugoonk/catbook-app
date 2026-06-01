import { useState } from 'react';
import { Link } from 'react-router-dom';
import PawIcon from '../components/PawIcon';
import { signInWithGoogle } from '../services/authFirebase';

const LoginPage = () => {
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleGoogleLogin = async () => {
    setIsSubmitting(true);
    setError('');
    try {
      await signInWithGoogle();
      // onAuthStateChanged ใน App.jsx จะจัดการ redirect เอง
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setError(err.code || err.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f2f5] flex flex-col items-center justify-center p-4">
      <div className="mb-6 text-center flex flex-col items-center">
        <div className="bg-[#4267B2] p-3 rounded-full mb-3 shadow-lg">
          <PawIcon className="w-10 h-10 text-white" />
        </div>

        {/* CatB + ตีนแมว 2 อัน (ซ้อน pattern เหมือนรอยเท้า) + k */}
        <div className="select-none" style={{ marginBottom: '0.75rem' }}>
          <h1 className="text-5xl tracking-tight flex items-center gap-0 leading-none"
              style={{ color: '#4267B2', fontWeight: 900 }}>
            <span>CatB</span>

            {/* container ตีนแมว — overflow ด้านล่างสำหรับตีนที่ 2 */}
            <span className="relative shrink-0"
                  style={{ width: '0.9em', height: '0.9em', display: 'inline-block' }}>

              {/* ตีนที่ 1 */}
              <PawIcon className="text-orange-500 w-full h-full block"
                style={{ transform: 'rotate(-10deg)',
                         filter: 'drop-shadow(0 2px 5px rgba(234,88,12,0.4))' }} />

              {/* ตีนที่ 2 — ล่างขวา ไม่ซ้อน */}
              <PawIcon className="text-orange-500 absolute"
                style={{ width: '74%', height: '74%',
                         top: '70%', left: '38%',
                         transform: 'rotate(11deg)',
                         filter: 'drop-shadow(0 2px 4px rgba(234,88,12,0.3))' }} />
            </span>

            <span>k</span>
          </h1>
        </div>

        <p className="text-xl text-gray-600 font-medium">Pet social commerce platform</p>
      </div>

      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md space-y-4">
        <p className="text-center text-gray-500 text-sm">เข้าสู่ระบบเพื่อเริ่มใช้งาน CatBook</p>

        {error && (
          <p className="text-red-500 text-sm font-medium text-center">{error}</p>
        )}

        <button
          onClick={handleGoogleLogin}
          disabled={isSubmitting}
          className="w-full flex items-center justify-center gap-3 border border-[#dddfe2] hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed bg-white text-gray-700 font-semibold text-[15px] py-3 rounded-lg transition-colors shadow-sm"
        >
          {/* Google logo SVG */}
          <svg width="20" height="20" viewBox="0 0 48 48">
            <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
            <path fill="#FF3D00" d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
            <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
            <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
          </svg>
          {isSubmitting ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบด้วย Google'}
        </button>
      </div>

      <div className="mt-4 text-center text-[12px] text-[#65676B]">
        <Link to="/privacy" className="hover:underline">นโยบายความเป็นส่วนตัว</Link>
        {' · '}
        <Link to="/terms" className="hover:underline">ข้อกำหนดการใช้งาน</Link>
      </div>
    </div>
  );
};

export default LoginPage;
