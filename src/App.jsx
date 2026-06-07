import { lazy, Suspense, useEffect, useState, Component } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { UserContext } from './context/UserContext';
import { NotificationProvider } from './context/NotificationContext';
import { CartProvider } from './context/CartContext';
import { OrderProvider } from './context/OrderContext';
import MainLayout from './components/MainLayout';
import ChatWindow from './components/ChatWindow';
import LoginPage from './pages/LoginPage';
import OnboardingModal from './components/OnboardingModal';
import CookieConsent from './components/CookieConsent';
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'));
const TermsPage   = lazy(() => import('./pages/TermsPage'));
import { onAuthChange, firebaseSignOut } from './services/authFirebase';
import { getOrCreateUser } from './services/userStore';
import { subscribeUnread, clearUnread } from './services/chatStore';
import { subscribeSavedPostIds } from './services/postStore';
import { captureUtmContext, trackMarketingEvent } from './services/marketingTracking';
import { defaultSeoMeta, setSeoMeta } from './utils/seo';

const HomePage = lazy(() => import('./pages/HomePage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const FriendsPage = lazy(() => import('./pages/FriendsPage'));
const LostCatsPage = lazy(() => import('./pages/LostCatsPage'));
const MarketplacePage = lazy(() => import('./pages/MarketplacePage'));
const AdoptionPage = lazy(() => import('./pages/AdoptionPage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const SearchPage = lazy(() => import('./pages/SearchPage'));
const MessagesPage = lazy(() => import('./pages/MessagesPage'));
const EventsPage = lazy(() => import('./pages/EventsPage'));
const MeowTranslatorPage = lazy(() => import('./pages/MeowTranslatorPage'));
const OrdersPage = lazy(() => import('./pages/OrdersPage'));
const OrderDetailPage = lazy(() => import('./pages/OrderDetailPage'));
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage'));
const SellerDashboardPage = lazy(() => import('./pages/SellerDashboardPage'));

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-[#f0f2f5] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 max-w-md w-full text-center">
            <p className="text-4xl mb-3">🐱</p>
            <p className="font-bold text-gray-800 text-lg mb-1">เกิดข้อผิดพลาด</p>
            <p className="text-gray-500 text-sm mb-4">{this.state.error?.message || 'ไม่ทราบสาเหตุ'}</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-[#4267B2] text-white font-bold px-6 py-2.5 rounded-lg hover:bg-[#3b5998] transition-colors"
            >
              โหลดหน้าใหม่
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const RouteFallback = () => (
  <div className="w-full min-h-[240px] flex items-center justify-center">
    <div className="bg-white border border-gray-200 rounded-2xl px-6 py-5 shadow-sm text-center">
      <div className="w-10 h-10 rounded-full bg-[#ebf5ff] mx-auto mb-3 flex items-center justify-center text-[#4267B2] font-black animate-pulse">
        C
      </div>
      <p className="font-black text-gray-800">Loading CatBook...</p>
      <p className="text-xs text-gray-400 mt-1">Preparing the next page</p>
    </div>
  </div>
);

const lazyElement = (Component) => (
  <ErrorBoundary>
    <Suspense fallback={<RouteFallback />}>
      <Component />
    </Suspense>
  </ErrorBoundary>
);

const MarketingRouteTracker = () => {
  const location = useLocation();

  useEffect(() => {
    trackMarketingEvent('page_view', {
      path: location.pathname,
      search: location.search,
    });
  }, [location.pathname, location.search]);

  return null;
};

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [activeChat, setActiveChat] = useState(null);
  const [viewedCat, setViewedCat] = useState(null);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadSenders, setUnreadSenders] = useState([]);
  const [savedPostIds, setSavedPostIds] = useState([]);
  const isLoggedIn = currentUser !== null;

  useEffect(() => {
    captureUtmContext();
    setSeoMeta(defaultSeoMeta);

    const unsubscribe = onAuthChange(async (firebaseUser) => {
      if (firebaseUser) {
        const user = await getOrCreateUser(firebaseUser);
        setCurrentUser(user);
      } else {
        setCurrentUser(null);
      }
      setIsAuthReady(true);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!currentUser?.uid) return;
    const unsub = subscribeUnread(currentUser.uid, (total, senders) => {
      setUnreadMessages(total);
      setUnreadSenders(senders);
    });
    return unsub;
  }, [currentUser?.uid]);

  useEffect(() => {
    if (!currentUser?.uid) { setSavedPostIds([]); return; }
    return subscribeSavedPostIds(currentUser.uid, setSavedPostIds);
  }, [currentUser?.uid]);

  const handleOpenChat = (cat) => {
    setActiveChat(cat);
    if (currentUser?.uid && (cat.userId || cat.uid)) {
      clearUnread(currentUser.uid, cat.userId || cat.uid).catch(() => {});
    }
  };

  const handleLogin = (user) => { setCurrentUser(user); setViewedCat(null); };
  const handleOnboardingComplete = (catFields) => {
    setCurrentUser(prev => ({
      ...prev,
      profileComplete: true,
      activeCat: { ...prev.activeCat, ...catFields },
    }));
  };
  const handleLogout = async () => {
    await firebaseSignOut();
    setCurrentUser(null);
    setActiveChat(null);
    setViewedCat(null);
  };
  const updateProfile = (fields) =>
    setCurrentUser(prev => ({ ...prev, activeCat: { ...prev.activeCat, ...fields } }));

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-[#f0f2f5] flex items-center justify-center text-[#4267B2] font-bold">
        Loading CatBook...
      </div>
    );
  }

  return (
    <ErrorBoundary>
    <UserContext.Provider value={{ currentUser, viewedCat, setViewedCat, updateProfile, savedPostIds }}>
      <NotificationProvider>
        <CartProvider>
        <OrderProvider>
        <BrowserRouter>
          <MarketingRouteTracker />
          <Routes>
            <Route
              path="/login"
              element={isLoggedIn ? <Navigate to="/" replace /> : <LoginPage onLogin={handleLogin} />}
            />
            <Route path="/register" element={<Navigate to="/login" replace />} />
            <Route path="/privacy" element={lazyElement(PrivacyPage)} />
            <Route path="/terms"   element={lazyElement(TermsPage)} />
            {/* Public: เข้าได้โดยไม่ต้อง login */}
            <Route element={<MainLayout onLogout={handleLogout} onOpenChat={handleOpenChat} unreadMessages={unreadMessages} unreadSenders={unreadSenders} />}>
              <Route path="/" element={lazyElement(HomePage)} />
              <Route path="/lostcats" element={lazyElement(LostCatsPage)} />
            </Route>

            {/* Auth required */}
            <Route
              element={
                isLoggedIn
                  ? <MainLayout onLogout={handleLogout} onOpenChat={handleOpenChat} unreadMessages={unreadMessages} unreadSenders={unreadSenders} />
                  : <Navigate to="/login" replace />
              }
            >
              <Route path="/profile"       element={lazyElement(ProfilePage)} />
              <Route path="/friends"       element={lazyElement(FriendsPage)} />
              <Route path="/lostcats"      element={lazyElement(LostCatsPage)} />
              <Route path="/marketplace"   element={lazyElement(MarketplacePage)} />
              <Route path="/adoption"      element={lazyElement(AdoptionPage)} />
              <Route path="/notifications" element={lazyElement(NotificationsPage)} />
              <Route path="/search"        element={lazyElement(SearchPage)} />
              <Route path="/messages"      element={lazyElement(MessagesPage)} />
              <Route path="/events"        element={lazyElement(EventsPage)} />
              <Route path="/meow-translator" element={lazyElement(MeowTranslatorPage)} />
              <Route path="/orders"          element={lazyElement(OrdersPage)} />
              <Route path="/orders/:orderId" element={lazyElement(OrderDetailPage)} />
              <Route path="/admin"         element={currentUser?.isAdmin ? lazyElement(AdminDashboardPage) : <Navigate to="/" replace />} />
              <Route path="/seller"        element={lazyElement(SellerDashboardPage)} />
              <Route path="*"              element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
          <CookieConsent />
          {isLoggedIn && currentUser?.profileComplete !== true && (
            <OnboardingModal onComplete={handleOnboardingComplete} />
          )}
        </BrowserRouter>

        {isLoggedIn && activeChat && (
          <ChatWindow
            key={activeChat.id}
            cat={activeChat}
            onClose={() => setActiveChat(null)}
          />
        )}
      </OrderProvider>
      </CartProvider>
      </NotificationProvider>
    </UserContext.Provider>
    </ErrorBoundary>
  );
}
