import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Search, Home, Users, MessageCircle, Cat, Store, LogOut, X, Shield,
  AlertTriangle, Share2, UserPlus, Tag, CheckCheck, ShoppingBag,
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import PawIcon from './PawIcon';
import NavButton from './NavButton';
import IconButton from './IconButton';
import Toast from './Toast';
import useToast from '../hooks/useToast';
import { useUser } from '../context/UserContext';
import { useNotifications } from '../context/NotificationContext';
import { mockUsers, mockCats } from '../data/mockData';

const TYPE_META = {
  like:           { bg: 'bg-pink-500',   Icon: PawIcon },
  comment:        { bg: 'bg-green-500',  Icon: MessageCircle },
  share:          { bg: 'bg-sky-500',    Icon: Share2 },
  follow:         { bg: 'bg-purple-500', Icon: Users },
  friend_request: { bg: 'bg-orange-500', Icon: UserPlus },
  tag:            { bg: 'bg-pink-400',   Icon: Tag },
};

const NotifDropdownItem = ({ notif, onRead, onClose }) => {
  const meta = TYPE_META[notif.type] ?? TYPE_META.like;
  const Icon = meta.Icon;
  return (
    <div
      onClick={() => { onRead(notif.id); onClose(); }}
      className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors
        ${notif.isRead ? 'hover:bg-gray-50' : 'bg-blue-50 hover:bg-blue-100'}`}
    >
      <div className="relative shrink-0">
        <img src={notif.actor.avatar} className="w-11 h-11 rounded-full object-cover border border-gray-200" alt="" />
        <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center ${meta.bg} shadow`}>
          <Icon className="w-2.5 h-2.5 text-white" />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] text-gray-800 leading-snug line-clamp-2">
          <span className="font-bold">{notif.actor.name}</span>{' '}
          {notif.message}
        </p>
        {notif.preview && (
          <p className="text-xs text-gray-500 mt-0.5 truncate border-l-2 border-gray-200 pl-2">{notif.preview}</p>
        )}
        <p className={`text-[11px] mt-1 font-semibold ${notif.isRead ? 'text-gray-400' : 'text-[#4267B2]'}`}>
          {notif.time}
        </p>
      </div>
      {!notif.isRead && (
        <div className="w-2.5 h-2.5 rounded-full bg-[#4267B2] shrink-0 mt-1.5" />
      )}
    </div>
  );
};

/* All cats pool for search suggestions */
const buildAllCats = () => {
  const fromUsers = mockUsers.map(u => ({
    id: u.activeCat.id,
    name: u.activeCat.name,
    avatar: u.activeCat.avatar,
    breed: u.activeCat.breed || '—',
    ownerName: u.ownerName,
  }));
  const userIds = new Set(fromUsers.map(c => c.id));
  const fromCats = mockCats
    .filter(c => !userIds.has(c.id))
    .map(c => ({ id: c.id, name: c.name, avatar: c.avatar, breed: c.breed || '—', ownerName: c.owner }));
  return [...fromUsers, ...fromCats];
};

const TopNavigation = ({ onLogout }) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { currentUser, setViewedCat } = useUser();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const { count: cartCount, setIsOpen: openCart } = useCart();

  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [toast] = useToast();
  const [bellRing, setBellRing] = useState(false);

  const searchRef = useRef(null);
  const notifPanelRef = useRef(null);
  const prevUnreadRef = useRef(unreadCount);

  useEffect(() => {
    if (unreadCount > prevUnreadRef.current) {
      setBellRing(true);
      const t = setTimeout(() => setBellRing(false), 700);
      return () => clearTimeout(t);
    }
    prevUnreadRef.current = unreadCount;
  }, [unreadCount]);

  const allCats = useMemo(buildAllCats, []);

  const suggestions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return allCats
      .filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.breed.toLowerCase().includes(q) ||
        c.ownerName.toLowerCase().includes(q)
      )
      .slice(0, 5);
  }, [searchQuery, allCats]);

  /* Close search suggestions on outside click */
  useEffect(() => {
    if (!showSuggestions) return;
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showSuggestions]);

  /* Close notification panel on outside click */
  useEffect(() => {
    if (!showNotifPanel) return;
    const handler = (e) => {
      if (notifPanelRef.current && !notifPanelRef.current.contains(e.target)) {
        setShowNotifPanel(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showNotifPanel]);

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      setShowSuggestions(false);
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const handleMobileSearch = (e) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      closeMobileSearch();
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const closeMobileSearch = () => {
    setMobileSearchOpen(false);
    setSearchQuery('');
    setShowSuggestions(false);
  };

  const goToProfile = (cat) => {
    setViewedCat({ id: cat.id, name: cat.name, avatar: cat.avatar });
    navigate('/profile');
    setShowSuggestions(false);
    setSearchQuery('');
  };

  return (
    <>
      <Toast message={toast} />
      <div className="fixed top-0 left-0 right-0 h-14 bg-[#4267B2] shadow-md z-50 flex items-center justify-between px-3 lg:px-4">

        {/* Mobile search overlay */}
        {mobileSearchOpen && (
          <div className="absolute inset-0 bg-[#4267B2] flex items-center px-3 gap-2 z-10">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={handleMobileSearch}
                placeholder="ค้นหาเพื่อนเหมียว..."
                autoFocus
                className="w-full bg-white rounded-full py-1.5 pl-4 pr-4 outline-none text-sm"
              />
            </div>
            <button onClick={closeMobileSearch} className="text-white p-1 shrink-0">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Left: Logo + desktop search */}
        <div className="flex items-center gap-2 flex-1 lg:w-1/3 lg:flex-none min-w-0">
          <div className="flex items-center gap-2 cursor-pointer shrink-0" onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); navigate('/'); }}>
            <div className="text-[#f5a623]">
              <PawIcon className="w-8 h-8" />
            </div>
            <span className="text-white font-bold text-xl lg:text-2xl hidden sm:block tracking-wide">CatBook</span>
          </div>

          {/* Desktop search with suggestions */}
          <div className="hidden lg:flex relative ml-4 flex-1 max-w-xs" ref={searchRef}>
            <div className="relative w-full text-gray-600">
              <input
                type="text"
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setShowSuggestions(true); }}
                onFocus={() => setShowSuggestions(true)}
                onKeyDown={handleSearchKeyDown}
                placeholder="ค้นหาเพื่อนเหมียว..."
                className="w-full bg-white border border-gray-200 rounded-full py-1.5 pl-10 pr-4 outline-none focus:ring-2 focus:ring-white/40 transition-all text-sm"
              />
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            </div>

            {/* Suggestions dropdown */}
            {showSuggestions && (suggestions.length > 0 || searchQuery.trim()) && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 z-[60] overflow-hidden">
                {suggestions.length > 0 && (
                  <>
                    <p className="text-[11px] text-gray-400 font-semibold px-4 pt-3 pb-1.5 uppercase tracking-wider">แมว</p>
                    {suggestions.map(cat => (
                      <button
                        key={cat.id}
                        onMouseDown={() => goToProfile(cat)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left"
                      >
                        <img src={cat.avatar} className="w-8 h-8 rounded-full object-cover shrink-0 border border-gray-200" alt="" />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate">{cat.name}</p>
                          <p className="text-xs text-gray-400 truncate">{cat.breed}</p>
                        </div>
                      </button>
                    ))}
                  </>
                )}
                {searchQuery.trim() && (
                  <button
                    onMouseDown={() => {
                      setShowSuggestions(false);
                      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 border-t border-gray-100 text-sm text-[#4267B2] font-semibold transition-colors"
                  >
                    <Search className="w-4 h-4 shrink-0" />
                    ค้นหา "{searchQuery.trim()}"
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Center: Nav buttons — desktop only */}
        <div className="hidden lg:flex items-center justify-center gap-8 w-1/3 h-full">
          <NavButton icon={Home}          active={pathname === '/'}            onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); navigate('/'); }} />
          <NavButton icon={Users}         active={pathname === '/friends'}     onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); navigate('/friends'); }} />
          <NavButton icon={Store}         active={pathname === '/marketplace'} onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); navigate('/marketplace'); }} />
          <NavButton icon={AlertTriangle} active={pathname === '/lostcats'}    onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); navigate('/lostcats'); }} />
        </div>

        {/* Right: Icons */}
        <div className="flex items-center justify-end gap-1.5 lg:gap-3 lg:w-1/3">
          <button
            onClick={() => setMobileSearchOpen(true)}
            className="lg:hidden bg-[#ffffff1a] hover:bg-[#ffffff33] p-2.5 rounded-full text-white transition-colors"
          >
            <Search className="w-5 h-5" />
          </button>

          <div className="hidden lg:block cursor-pointer" onClick={() => { setViewedCat(null); navigate('/profile'); }}>
            <img src={currentUser.activeCat.avatar} alt="Profile" className="w-8 h-8 rounded-full border border-gray-300 object-cover" />
          </div>

          {/* Cart button */}
          <button
            onClick={() => openCart(true)}
            className="relative bg-white/10 hover:bg-white/20 p-2.5 rounded-full text-white transition-colors"
            title="ถาดเหมียว"
          >
            <ShoppingBag className="w-5 h-5" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-yellow-400 text-gray-900 text-[9px] font-black min-w-[16px] h-[16px] px-0.5 rounded-full flex items-center justify-center leading-none">
                {cartCount > 9 ? '9+' : cartCount}
              </span>
            )}
          </button>

          <IconButton icon={MessageCircle} onClick={() => navigate('/messages')} />

          {/* Notification bell with dropdown */}
          <div className="relative" ref={notifPanelRef}>
            <button
              onClick={() => setShowNotifPanel(v => !v)}
              className={`relative p-2.5 rounded-full text-white transition-colors
                ${showNotifPanel ? 'bg-white/30' : 'bg-white/10 hover:bg-white/20'}`}
            >
              <Cat className={`w-5 h-5 ${bellRing ? 'bell-ring' : ''}`} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center leading-none">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            {showNotifPanel && (
              <div className="absolute top-full right-0 mt-2 w-[360px] bg-white rounded-2xl shadow-2xl border border-gray-100 z-[60] overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                  <span className="font-bold text-gray-900 text-[15px]">การแจ้งเตือน</span>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="flex items-center gap-1.5 text-[13px] font-medium text-[#4267B2] hover:bg-blue-50 px-2.5 py-1 rounded-lg transition-colors"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      อ่านทั้งหมด
                    </button>
                  )}
                </div>
                <div className="max-h-[420px] overflow-y-auto divide-y divide-gray-50">
                  {notifications.length === 0 ? (
                    <div className="py-12 text-center text-gray-400 text-sm">ไม่มีการแจ้งเตือน 🐾</div>
                  ) : (
                    notifications.slice(0, 6).map(n => (
                      <NotifDropdownItem
                        key={n.id}
                        notif={n}
                        onRead={markAsRead}
                        onClose={() => setShowNotifPanel(false)}
                      />
                    ))
                  )}
                </div>
                <div className="border-t border-gray-100 p-2">
                  <button
                    onClick={() => { setShowNotifPanel(false); navigate('/notifications'); }}
                    className="w-full py-2 rounded-xl text-[13px] font-semibold text-[#4267B2] hover:bg-blue-50 transition-colors"
                  >
                    ดูการแจ้งเตือนทั้งหมด
                  </button>
                </div>
              </div>
            )}
          </div>

          {currentUser.isAdmin && (
            <div className="hidden lg:block">
              <button
                onClick={() => navigate('/admin')}
                title="Admin Dashboard"
                className="bg-[#ffffff1a] hover:bg-[#ffffff33] p-2 rounded-full text-white transition-colors"
              >
                <Shield className="w-5 h-5" />
              </button>
            </div>
          )}

          <div className="hidden lg:block">
            <button
              onClick={onLogout}
              className="bg-[#ffffff1a] hover:bg-[#ffffff33] p-2 rounded-full text-white transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default TopNavigation;
