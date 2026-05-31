import { useState } from 'react';
import { Link } from 'react-router-dom';
import PawIcon from '../components/PawIcon';
import { authApi } from '../services/commerceApi';


const LoginPage = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { user } = await authApi.login({
        email: email.trim().toLowerCase(),
        password,
      });
      setError('');
      onLogin(user);
    } catch {
      setError('Email or password is incorrect');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f2f5] flex flex-col items-center justify-center p-4">
      <div className="mb-8 text-center flex flex-col items-center">
        <div className="bg-[#4267B2] p-4 rounded-full mb-4 shadow-lg">
          <PawIcon className="w-12 h-12 text-white" />
        </div>
        <h1 className="text-5xl font-bold text-[#4267B2] tracking-tight mb-2">CatBook</h1>
        <p className="text-xl text-gray-600 font-medium">Pet social commerce platform</p>
      </div>

      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md">
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => { setEmail(e.target.value); setError(''); }}
            className="w-full px-4 py-3 rounded-lg border border-[#dddfe2] focus:outline-none focus:border-[#4267B2] focus:ring-1 focus:ring-[#4267B2] text-[15px]"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => { setPassword(e.target.value); setError(''); }}
            className="w-full px-4 py-3 rounded-lg border border-[#dddfe2] focus:outline-none focus:border-[#4267B2] focus:ring-1 focus:ring-[#4267B2] text-[15px]"
            required
          />

          {error && (
            <p className="text-red-500 text-sm font-medium text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-[#4267B2] hover:bg-[#3b5998] disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold text-[17px] py-3 rounded-lg transition-colors"
          >
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </button>

          <div className="text-center pt-1">
            <button
              type="button"
              onClick={() => setError('กรุณาติดต่อ admin@catbook.com เพื่อรีเซ็ตรหัสผ่าน')}
              className="text-[#4267B2] hover:underline text-sm font-medium"
            >
              ลืมรหัสผ่าน?
            </button>
          </div>
        </form>

        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 border-t border-[#dddfe2]" />
          <span className="text-[#65676B] text-sm">หรือ</span>
          <div className="flex-1 border-t border-[#dddfe2]" />
        </div>

        <Link
          to="/register"
          className="block w-full text-center bg-green-500 hover:bg-green-600 text-white font-bold text-[15px] py-2.5 rounded-lg transition-colors"
        >
          สร้างบัญชีใหม่ 🐾
        </Link>
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
