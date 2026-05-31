import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Users, Store, Heart, Cat, AlertTriangle, Languages, Package, ShoppingBag } from 'lucide-react';
import { useUser } from '../context/UserContext';

const STATIC_MENU = [
  { path: '/',            icon: Home,          label: 'News Feed' },
  { path: '/friends',     icon: Users,         label: 'เพื่อนเหมียว (Cat Friends)' },
  { path: '/lostcats',    icon: AlertTriangle, label: 'แมวหาย (Lost Cats)' },
  { path: '/marketplace', icon: Store,         label: 'ตลาดนัด (Marketplace)' },
  { path: '/adoption',        icon: Heart,      label: 'หาบ้าน (Adoption Center)' },
  { path: '/meow-translator', icon: Languages,  label: 'Meow Translator 🐾' },
  { path: '/orders',          icon: Package,    label: 'ประวัติคำสั่งซื้อ' },
];

const LeftSidebar = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { currentUser, setViewedCat } = useUser();

  if (!currentUser) return null;

  const isSeller = currentUser?.role === 'SELLER' || currentUser?.isAdmin;

  const menuItems = [
    { path: '/profile', icon: Cat, label: currentUser.activeCat.name, img: currentUser.activeCat.avatar },
    ...STATIC_MENU,
    ...(isSeller ? [{ path: '/seller', icon: ShoppingBag, label: 'ร้านค้าของฉัน' }] : []),
  ];

  const handleNav = (path) => {
    if (path === '/profile') setViewedCat(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    navigate(path);
  };

  return (
    <aside className="hidden lg:block w-[280px] xl:w-[320px] shrink-0 sticky top-[56px] h-[calc(100vh-56px)] overflow-y-auto no-scrollbar px-2 pt-3">
      <ul className="space-y-0.5">
        {menuItems.map(item => {
          const active = pathname === item.path;
          return (
            <li key={item.path}>
              <button
                onClick={() => handleNav(item.path)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors font-medium text-[15px]
                  ${active
                    ? 'bg-blue-50 text-[#4267B2] font-semibold'
                    : 'hover:bg-[#e4e6eb] text-[#050505]'}`}
              >
                {item.img ? (
                  <img src={item.img} className="w-9 h-9 rounded-full object-cover shrink-0" alt="icon" />
                ) : (
                  <item.icon className={`w-6 h-6 shrink-0 ${active ? 'text-[#4267B2]' : 'text-[#4267B2]'}`} />
                )}
                <span className="truncate">{item.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </aside>
  );
};

export default LeftSidebar;
