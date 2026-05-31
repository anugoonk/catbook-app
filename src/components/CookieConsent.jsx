import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Shield } from 'lucide-react';

const CONSENT_KEY = 'catbook_consent';

const CookieConsent = () => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(CONSENT_KEY);
    if (!consent) {
      const timer = setTimeout(() => setShow(true), 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  const accept = () => {
    localStorage.setItem(CONSENT_KEY, 'accepted');
    setShow(false);
  };

  const decline = () => {
    localStorage.setItem(CONSENT_KEY, 'declined');
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] bg-white border-t-2 border-[#4267B2] shadow-2xl">
      <div className="max-w-5xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <Shield className="w-5 h-5 text-[#4267B2] shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="font-semibold text-[#050505] text-sm">CatBook ใช้คุกกี้และการติดตาม</p>
            <p className="text-[#65676B] text-xs mt-0.5 leading-relaxed">
              เราเก็บข้อมูลเพื่อวิเคราะห์การใช้งานและปรับปรุงบริการ
              โดยปฏิบัติตาม{' '}
              <Link to="/privacy" className="text-[#4267B2] hover:underline font-medium">
                นโยบายความเป็นส่วนตัว
              </Link>
              {' '}และ{' '}
              <Link to="/terms" className="text-[#4267B2] hover:underline font-medium">
                ข้อกำหนดการใช้งาน
              </Link>
            </p>
          </div>
        </div>
        <div className="flex gap-2 shrink-0 w-full sm:w-auto">
          <button
            onClick={decline}
            className="flex-1 sm:flex-none px-4 py-2 text-sm font-semibold text-[#65676B] bg-[#f0f2f5] hover:bg-[#e4e6eb] rounded-lg transition-colors"
          >
            ปฏิเสธ
          </button>
          <button
            onClick={accept}
            className="flex-1 sm:flex-none px-5 py-2 text-sm font-bold text-white bg-[#4267B2] hover:bg-[#3b5998] rounded-lg transition-colors"
          >
            ยอมรับทั้งหมด
          </button>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;
