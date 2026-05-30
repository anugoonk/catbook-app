import { useState } from 'react';
import PawIcon from '../components/PawIcon';
import { authApi } from '../services/commerceApi';

const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

const DEV_ACCOUNTS = [
  'admin@catbook.com',
  'mali@catbook.com',
  'thungngern@catbook.com',
  'somchun@catbook.com',
];

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
              onClick={() => setError('Please contact admin@catbook.com')}
              className="text-[#4267B2] hover:underline text-sm font-medium"
            >
              Forgot password?
            </button>
          </div>
        </form>

        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 border-t border-[#dddfe2]" />
          <span className="text-[#65676B] text-sm font-medium">or</span>
          <div className="flex-1 border-t border-[#dddfe2]" />
        </div>

        <button
          type="button"
          onClick={() => setError('Google login is not enabled in Phase 1 yet')}
          className="w-full flex items-center justify-center gap-3 bg-white hover:bg-[#f0f2f5] border border-[#dddfe2] text-[#050505] font-semibold text-[15px] py-3 rounded-lg transition-colors"
        >
          <GoogleIcon />
          Continue with Google
        </button>
      </div>

      <div className="mt-4 w-full max-w-md bg-white border border-[#dddfe2] rounded-xl p-4 shadow-sm">
        <p className="text-[12px] font-bold text-[#65676B] mb-2.5 uppercase tracking-wide">
          Phase 1 Dev Accounts
        </p>
        <div className="space-y-1">
          {DEV_ACCOUNTS.map(account => (
            <button
              key={account}
              type="button"
              onClick={() => setEmail(account)}
              className="block w-full text-left text-[12px] text-[#4267B2] font-mono hover:underline"
            >
              {account}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-[#65676B] mt-2.5">
          Credentials are verified by the local API server, not by the browser bundle.
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
