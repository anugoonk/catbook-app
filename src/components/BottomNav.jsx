import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Users, Store, Cat, AlertTriangle, MessageCircle } from 'lucide-react';
import { useUser } from '../context/UserContext';

const navItems = [
  { path: '/',            icon: Home,          label: 'หน้าหลัก' },
  { path: '/friends',     icon: Users,         label: 'เพื่อน' },
  { path: '/messages',    icon: MessageCircle, label: 'แชท' },
  { path: '/marketplace', icon: Store,         label: 'ตลาด' },
  { path: '/profile',     icon: Cat,           label: 'โปรไฟล์' },
];

const BottomNav = ({ unreadMessages = 0 }) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { currentUser, setViewedCat } = useUser();

  if (!currentUser) return null;

  const handleNav = (path) => {
    if (path === '/profile') setViewedCat(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    navigate(path);
  };

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-200 z-50 flex items-center shadow-[0_-2px_12px_rgba(0,0,0,0.08)]">
      {navItems.map(({ path, icon: Icon, label }) => {
        const active = pathname === path;
        return (
          <button
            key={path}
            onClick={() => handleNav(path)}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 h-full relative"
          >
            {active && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[#4267B2] rounded-full" />
            )}
            <div className="relative">
              <Icon className={`w-6 h-6 transition-transform ${active ? 'text-[#4267B2] scale-110' : 'text-gray-500'}`} />
              {path === '/messages' && unreadMessages > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {unreadMessages > 99 ? '99+' : unreadMessages}
                </span>
              )}
            </div>
            <span className={`text-[10px] font-medium ${active ? 'text-[#4267B2] font-bold' : 'text-gray-500'}`}>
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};

export default BottomNav;
