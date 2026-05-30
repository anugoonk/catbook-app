import { lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { UserContext } from './context/UserContext';
import { NotificationProvider } from './context/NotificationContext';
import { CartProvider } from './context/CartContext';
import { OrderProvider } from './context/OrderContext';
import MainLayout from './components/MainLayout';
import ChatWindow from './components/ChatWindow';
import LoginPage from './pages/LoginPage';
import { authApi } from './services/commerceApi';
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
  <Suspense fallback={<RouteFallback />}>
    <Component />
  </Suspense>
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
  const isLoggedIn = currentUser !== null;

  useEffect(() => {
    let isMounted = true;
    captureUtmContext();
    setSeoMeta(defaultSeoMeta);

    authApi.me()
      .then(({ user }) => {
        if (isMounted) setCurrentUser(user);
      })
      .catch(() => {
        if (isMounted) setCurrentUser(null);
      })
      .finally(() => {
        if (isMounted) setIsAuthReady(true);
      });

    return () => { isMounted = false; };
  }, []);

  const handleLogin = (user) => { setCurrentUser(user); setViewedCat(null); };
  const handleLogout = async () => {
    try {
      await authApi.logout();
    } finally {
      setCurrentUser(null);
      setActiveChat(null);
      setViewedCat(null);
    }
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
    <UserContext.Provider value={{ currentUser, viewedCat, setViewedCat, updateProfile }}>
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
            <Route
              element={
                isLoggedIn
                  ? <MainLayout onLogout={handleLogout} onOpenChat={setActiveChat} />
                  : <Navigate to="/login" replace />
              }
            >
              <Route path="/"              element={lazyElement(HomePage)} />
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
              <Route path="*"              element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
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
  );
}
