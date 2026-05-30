import { Outlet, useLocation } from 'react-router-dom';
import TopNavigation from './TopNavigation';
import LeftSidebar from './LeftSidebar';
import RightSidebar from './RightSidebar';
import BottomNav from './BottomNav';
import { useCart } from '../context/CartContext';
import CartDrawer from './CartDrawer';
import CheckoutModal from './CheckoutModal';

const FEED_ROUTES = ['/'];
const RIGHT_SIDEBAR_ROUTES = ['/'];
const FULLWIDTH_ROUTES = ['/marketplace', '/messages', '/admin'];

const MainLayout = ({ onLogout, onOpenChat }) => {
  const { pathname } = useLocation();
  const { isCheckoutOpen, setIsCheckoutOpen } = useCart();
  const showRightSidebar = RIGHT_SIDEBAR_ROUTES.includes(pathname);
  const isFeed = FEED_ROUTES.includes(pathname);
  const isFullwidth = FULLWIDTH_ROUTES.includes(pathname);

  return (
    <div className="min-h-screen bg-[#f0f2f5] font-sans text-[#050505]">
      <TopNavigation onLogout={onLogout} />

      <div className="pt-[56px]">
        {isFullwidth ? (
          <Outlet />
        ) : (
          <div className="max-w-[1500px] mx-auto flex">
            <LeftSidebar />
            <div className="flex-1 min-w-0 flex flex-col items-center pt-4 px-2 pb-20 lg:pb-6">
              <div className={`w-full ${isFeed ? 'max-w-[590px]' : 'max-w-[860px]'}`}>
                <Outlet />
              </div>
            </div>
            {showRightSidebar && <RightSidebar onOpenChat={onOpenChat} />}
          </div>
        )}
      </div>

      <BottomNav />
      <CartDrawer />
      {isCheckoutOpen && <CheckoutModal onClose={() => setIsCheckoutOpen(false)} />}
    </div>
  );
};

export default MainLayout;
