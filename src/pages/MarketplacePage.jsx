import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Plus, Check, ExternalLink, ShoppingCart } from 'lucide-react';
import PawIcon from '../components/PawIcon';
import Toast from '../components/Toast';
import useToast from '../hooks/useToast';
import { useUser } from '../context/UserContext';
import { useCart } from '../context/CartContext';
import CreateListingModal from '../components/CreateListingModal';
import ProductDetailModal from '../components/ProductDetailModal';
import { subscribeListings, createListing } from '../services/listingStore';
import { trackMarketingEvent } from '../services/marketingTracking';
import { productSeoMeta, setSeoMeta } from '../utils/seo';

const CATEGORIES = [
  { id: 'ทั้งหมด',        emoji: '🐾' },
  { id: 'อาหารแมว',       emoji: '🍱' },
  { id: 'ทรายแมว',        emoji: '🏖️' },
  { id: 'ของเล่น',        emoji: '🧸' },
  { id: 'คอนโดและที่นอน', emoji: '🏠' },
  { id: 'ปลอกคอ',         emoji: '🎀' },
  { id: 'อุปกรณ์',        emoji: '🔧' },
];

const SHOPEE_CAT_LINKS = {
  'ทั้งหมด':        'https://shopee.co.th/cat.pet_food',
  'อาหารแมว':       'https://shopee.co.th/cat.pet_food',
  'ทรายแมว':        'https://shopee.co.th/cat.cat_litter',
  'ของเล่น':        'https://shopee.co.th/cat.pet_toys',
  'คอนโดและที่นอน': 'https://shopee.co.th/cat.pet_house',
  'ปลอกคอ':         'https://shopee.co.th/cat.pet_collar',
  'อุปกรณ์':        'https://shopee.co.th/cat.pet_grooming',
};

const LAZADA_CAT_LINKS = {
  'ทั้งหมด':        'https://www.lazada.co.th/shop-cat-food/',
  'อาหารแมว':       'https://www.lazada.co.th/shop-cat-food/',
  'ทรายแมว':        'https://www.lazada.co.th/shop-cat-litter/',
  'ของเล่น':        'https://www.lazada.co.th/shop-cat-toys/',
  'คอนโดและที่นอน': 'https://www.lazada.co.th/shop-cat-beds/',
  'ปลอกคอ':         'https://www.lazada.co.th/shop-pet-collars/',
  'อุปกรณ์':        'https://www.lazada.co.th/shop-pet-grooming/',
};

function compressImgUrl(blobUrl, maxW, maxH, quality = 0.75) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxW / img.width, maxH / img.height);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.src = blobUrl;
  });
}

const ShopeeIcon = ({ className = 'w-4 h-4' }) => (
  <img src="https://www.google.com/s2/favicons?domain=shopee.co.th&sz=64" className={`${className} object-contain rounded-sm`} alt="" aria-hidden="true" />
);
const LazadaIcon = ({ className = 'w-4 h-4' }) => (
  <img src="https://www.google.com/s2/favicons?domain=lazada.co.th&sz=64" className={`${className} object-contain rounded-sm`} alt="" aria-hidden="true" />
);

/* ── Cat SVG (ใช้แทน emoji ใน hero) ── */
const CatSilhouette = ({ className = '' }) => (
  <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="50" cy="66" rx="28" ry="26" fill="currentColor" />
    <ellipse cx="50" cy="39" rx="21" ry="20" fill="currentColor" />
    <polygon points="29,27 21,9 40,23" fill="currentColor" />
    <polygon points="71,27 79,9 60,23" fill="currentColor" />
    <circle cx="43" cy="37" r="3.5" fill="rgba(0,0,0,.2)" />
    <circle cx="57" cy="37" r="3.5" fill="rgba(0,0,0,.2)" />
    <ellipse cx="50" cy="44" rx="4" ry="3" fill="rgba(255,200,200,.5)" />
    <line x1="35" y1="42" x2="22" y2="40" stroke="rgba(0,0,0,.15)" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="35" y1="46" x2="22" y2="46" stroke="rgba(0,0,0,.15)" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="65" y1="42" x2="78" y2="40" stroke="rgba(0,0,0,.15)" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="65" y1="46" x2="78" y2="46" stroke="rgba(0,0,0,.15)" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

/* ── Paw SVG ── */
const PawSVG = ({ className = '' }) => (
  <svg className={className} viewBox="0 0 40 40" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="20" cy="27" rx="9" ry="7" />
    <ellipse cx="9"  cy="16" rx="4.5" ry="3.5" />
    <ellipse cx="31" cy="16" rx="4.5" ry="3.5" />
    <ellipse cx="15" cy="10" rx="3.5" ry="3" />
    <ellipse cx="25" cy="10" rx="3.5" ry="3" />
  </svg>
);

/* ── Product Card ── */
const ProductCard = ({ item, onAdd, onSelect }) => {
  const { currentUser, setViewedCat } = useUser();
  const navigate = useNavigate();
  const { items, setIsOpen, isProductPending } = useCart();
  const [justAdded, setJustAdded] = useState(false);

  const isOwn    = item.sellerUid ? item.sellerUid === currentUser.uid : item.seller?.id === currentUser.activeCat?.id;
  const cartItem = items.find(i => i.product.id === item.id);
  const inCart   = Boolean(cartItem);
  const isAdding = isProductPending(item.id);
  const catInfo  = CATEGORIES.find(c => c.id === item.category) || { emoji: '🐾' };

  const shopeeUrl = item.shopeeUrl || SHOPEE_CAT_LINKS[item.category] || SHOPEE_CAT_LINKS['ทั้งหมด'];
  const lazadaUrl = item.lazadaUrl || LAZADA_CAT_LINKS[item.category] || LAZADA_CAT_LINKS['ทั้งหมด'];

  const goToSeller = (e) => {
    e.stopPropagation();
    setViewedCat(item.seller);
    navigate('/profile');
  };

  const handleAdd = async () => {
    if (isOwn || isAdding) return;
    if (inCart) { setIsOpen(true); return; }
    const result = await onAdd(item);
    if (!result?.ok) return;
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1500);
  };

  const handleAffiliateClick = (platform, url) => {
    trackMarketingEvent('affiliate_click', { platform, product_id: item.id, product_title: item.title, value: item.price, currency: 'THB', url });
  };

  return (
    <div className="bg-white rounded-3xl overflow-hidden border border-[#e4e6eb] hover:border-[#4267B2]/30 hover:shadow-lg hover:-translate-y-1 transition-all duration-200 flex flex-col group">
      {/* Image */}
      <div
        className="aspect-square overflow-hidden bg-[#f0f2f5] relative cursor-pointer"
        onClick={() => onSelect(item)}
      >
        {item.img ? (
          <img
            src={item.img}
            alt={item.title}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl opacity-25">
            {catInfo.emoji}
          </div>
        )}

        {/* Category badge */}
        <span className="absolute top-2 left-2 bg-white/95 text-[#4267B2] text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm">
          {catInfo.emoji} {item.category}
        </span>

        {isOwn && (
          <span className="absolute top-2 right-2 bg-[#4267B2] text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm">
            ของคุณ
          </span>
        )}
        {inCart && !isOwn && (
          <span className="absolute top-2 right-2 bg-emerald-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-0.5 shadow-sm">
            <Check className="w-2.5 h-2.5" /> ×{cartItem.qty}
          </span>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/0 group-hover:from-black/10 transition-all duration-200 flex items-end pb-2.5 justify-center">
          <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/95 text-[#050505] text-[11px] font-bold px-3 py-1.5 rounded-full shadow">
            ดูรายละเอียด
          </span>
        </div>
      </div>

      <div className="p-4 flex flex-col flex-1 gap-2">
        {/* Price */}
        <div className="flex items-baseline gap-1">
          <span className="font-black text-[22px] text-[#FF6B35] leading-none">{item.price.toLocaleString()}</span>
          <span className="text-gray-400 text-[12px] font-medium">฿</span>
        </div>

        {/* Title */}
        <p
          className="text-[#050505] text-[13px] font-semibold line-clamp-2 leading-snug cursor-pointer hover:text-[#4267B2] transition-colors"
          onClick={() => onSelect(item)}
        >
          {item.title}
        </p>

        <p className="text-[#65676B] text-[11px]">📍 {item.location}</p>

        {item.seller?.avatar && (
          <button onClick={goToSeller} className="flex items-center gap-1.5 w-fit hover:opacity-75 transition-opacity">
            <img src={item.seller.avatar} loading="lazy" decoding="async" className="w-5 h-5 rounded-full object-cover ring-1 ring-[#e4e6eb]" alt="" />
            <span className="text-[11px] text-[#65676B] font-medium">{item.seller.name}</span>
          </button>
        )}

        <div className="flex-1" />

        {/* Cart button */}
        <button
          onClick={handleAdd}
          disabled={isAdding || isOwn}
          className={`w-full font-bold text-[13px] py-2.5 rounded-2xl transition-all flex items-center justify-center gap-1.5 active:scale-[0.97]
            ${isOwn
              ? 'bg-[#f0f2f5] text-[#bcc0c4] cursor-default'
              : inCart
                ? 'bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100'
                : isAdding
                  ? 'bg-[#f0f2f5] text-[#bcc0c4] cursor-wait'
                  : justAdded
                    ? 'bg-emerald-500 text-white'
                    : 'bg-[#FF6B35] hover:bg-[#e55a25] text-white shadow-sm'}`}
        >
          {isOwn    ? 'สินค้าของคุณ'
          : inCart  ? <><ShoppingCart className="w-3.5 h-3.5" /> ดูในถาดเหมียว</>
          : isAdding ? 'กำลังหยิบ...'
          : justAdded ? <><Check className="w-3.5 h-3.5" /> หยิบแล้ว!</>
          : <><PawIcon className="w-3.5 h-3.5" /> หยิบใส่ถาด</>}
        </button>

        {/* Affiliate */}
        <div className="flex gap-1.5">
          <a
            href={shopeeUrl} target="_blank" rel="noopener noreferrer sponsored"
            onClick={() => handleAffiliateClick('shopee', shopeeUrl)}
            className="flex-1 flex items-center justify-center gap-1 bg-[#fff0ed] hover:bg-[#ffe0d9] text-[#EE4D2D] text-[10px] font-bold py-1.5 rounded-xl transition-colors border border-[#EE4D2D]/15"
          >
            <ShopeeIcon className="w-3.5 h-3.5" /> Shopee
          </a>
          <a
            href={lazadaUrl} target="_blank" rel="noopener noreferrer sponsored"
            onClick={() => handleAffiliateClick('lazada', lazadaUrl)}
            className="flex-1 flex items-center justify-center gap-1 bg-[#eeeeff] hover:bg-[#ddddf5] text-[#0F0F60] text-[10px] font-bold py-1.5 rounded-xl transition-colors border border-[#0F0F60]/10"
          >
            <LazadaIcon className="w-3.5 h-3.5" /> Lazada
          </a>
        </div>
      </div>
    </div>
  );
};

/* ── Marketplace Page ── */
const MarketplacePage = () => {
  const { currentUser } = useUser();
  const location = useLocation();
  const isSeller = currentUser?.role === 'SELLER' || currentUser?.isAdmin;
  const { addItem, count, setIsOpen } = useCart();
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('ทั้งหมด');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [toast, showToast] = useToast();
  const handledProductLinkRef = useRef('');

  useEffect(() => {
    setIsLoading(true);
    const unsub = subscribeListings(listings => {
      setItems(listings);
      setIsLoading(false);
    });
    return unsub;
  }, []);

  const handleSelect = (item) => {
    setSelectedProduct(item);
    trackMarketingEvent('view_product', { product_id: item.id, sku: item.sku || '', value: item.price, currency: 'THB' });
  };

  const handleAdd = async (item) => {
    const result = await addItem(item);
    if (!result?.ok) {
      showToast(result?.error || 'ไม่สามารถเพิ่มสินค้าได้');
      return result;
    }
    trackMarketingEvent('add_to_cart', { product_id: item.id, sku: item.sku || '', value: item.price, currency: 'THB' });
    showToast(`🐾 หยิบ "${item.title.slice(0, 20)}..." แล้ว`);
    return result;
  };

  const handleAddListing = async (newItem) => {
    let img = newItem.img;
    if (img && img.startsWith('blob:')) {
      img = await compressImgUrl(img, 800, 600);
      URL.revokeObjectURL(newItem.img);
    }
    const listing = {
      ...newItem, img,
      sellerUid: currentUser.uid,
      seller: {
        id: currentUser.uid, uid: currentUser.uid,
        name: currentUser.activeCat.name,
        avatar: currentUser.activeCat.avatar || '',
      },
    };
    await createListing(listing);
    showToast(`✅ ลงขาย "${newItem.title}" แล้ว`);
  };

  const displayed = activeCategory === 'ทั้งหมด'
    ? items
    : items.filter(i => i.category === activeCategory);

  useEffect(() => {
    setSeoMeta({
      title: activeCategory === 'ทั้งหมด' ? 'CatBook Shop | สินค้าสัตว์เลี้ยง' : `${activeCategory} | CatBook Shop`,
      description: 'เลือกซื้ออาหาร ขนม ของเล่น อุปกรณ์ สำหรับสัตว์เลี้ยง',
      url: '/marketplace',
    });
    trackMarketingEvent('view_marketplace', { category: activeCategory, total_items: displayed.length });
  }, [activeCategory, displayed.length]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const slug = params.get('product');
    if (!slug || isLoading) return;
    const linkKey = `${slug}:${items.length}`;
    if (handledProductLinkRef.current === linkKey) return;
    const product = items.find(item => item.slug === slug || item.id === slug);
    handledProductLinkRef.current = linkKey;
    if (!product) { showToast('ไม่พบสินค้า'); return; }
    setSelectedProduct(product);
    setSeoMeta(productSeoMeta(product));
    trackMarketingEvent('view_product', { product_id: product.id, sku: product.sku || '', value: product.price, currency: 'THB' });
  }, [items, isLoading, location.search, showToast]);

  const shopeeLink = SHOPEE_CAT_LINKS[activeCategory] || SHOPEE_CAT_LINKS['ทั้งหมด'];
  const lazadaLink = LAZADA_CAT_LINKS[activeCategory] || LAZADA_CAT_LINKS['ทั้งหมด'];
  const activeCat  = CATEGORIES.find(c => c.id === activeCategory);

  return (
    <div className="flex w-full min-h-[calc(100vh-56px)] bg-[#f0f2f5]">
      <Toast message={toast} />

      {/* ── Sidebar ── */}
      <div className="hidden md:flex w-[240px] shrink-0 bg-white border-r border-[#e4e6eb] flex-col sticky top-[56px] h-[calc(100vh-56px)] overflow-y-auto">

        {/* Shop header */}
        <div className="px-5 pt-5 pb-4 border-b border-[#f0f2f5]">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-2xl bg-[#FF6B35] flex items-center justify-center shadow-sm shrink-0">
              <CatSilhouette className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-[17px] font-black text-[#050505] leading-tight">Cat Shop</h1>
              <p className="text-[11px] text-[#65676B]">สินค้าสำหรับน้องแมว 🐾</p>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="px-4 py-3 space-y-2 border-b border-[#f0f2f5]">
          <button
            onClick={() => setIsOpen(true)}
            className="w-full flex items-center justify-between bg-[#fff3ed] hover:bg-[#ffe8dc] border border-[#FF6B35]/20 text-[#FF6B35] font-bold text-[13px] py-2.5 px-4 rounded-2xl transition-colors"
          >
            <span className="flex items-center gap-2">🛒 ถาดเหมียว</span>
            {count > 0 ? (
              <span className="bg-[#FF6B35] text-white text-[10px] font-black px-2 py-0.5 rounded-full">{count}</span>
            ) : (
              <span className="text-[11px] text-[#FF6B35]/40 font-normal">ว่างอยู่</span>
            )}
          </button>
          {isSeller && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="w-full flex items-center justify-center gap-2 bg-[#4267B2] hover:bg-[#3b5998] text-white font-bold text-[13px] py-2.5 rounded-2xl transition-colors"
            >
              <Plus className="w-4 h-4" /> ลงขายสินค้าใหม่
            </button>
          )}
        </div>

        {/* Categories */}
        <div className="px-4 py-4 flex-1">
          <p className="text-[10px] font-black text-[#bcc0c4] uppercase tracking-widest mb-3">หมวดหมู่</p>
          <div className="space-y-0.5">
            {CATEGORIES.map(({ id, emoji }) => {
              const cnt = id === 'ทั้งหมด' ? items.length : items.filter(i => i.category === id).length;
              const isActive = activeCategory === id;
              return (
                <button
                  key={id}
                  onClick={() => setActiveCategory(id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-[13px] font-medium transition-all
                    ${isActive
                      ? 'bg-[#ebf5ff] text-[#4267B2] font-bold'
                      : 'text-[#65676B] hover:bg-[#f0f2f5]'}`}
                >
                  <span className="text-base w-6 text-center">{emoji}</span>
                  <span className="flex-1 text-left">{id}</span>
                  <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-semibold ${isActive ? 'bg-[#4267B2]/15 text-[#4267B2]' : 'text-[#bcc0c4]'}`}>
                    {cnt}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Affiliate partners */}
        <div className="px-4 pb-5 border-t border-[#f0f2f5] pt-3">
          <p className="text-[10px] font-black text-[#bcc0c4] uppercase tracking-widest mb-2.5">ช้อปพาร์ทเนอร์</p>
          <a href={shopeeLink} target="_blank" rel="noopener noreferrer sponsored"
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-2xl bg-[#fff0ed] border border-[#EE4D2D]/15 hover:bg-[#ffe0d9] transition-colors mb-2 group">
            <ShopeeIcon className="w-7 h-7 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-black text-[#EE4D2D]">Shopee</p>
              <p className="text-[10px] text-[#65676B] truncate">ส่งฟรี · ราคาดี</p>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-[#bcc0c4] group-hover:text-[#EE4D2D] shrink-0 transition-colors" />
          </a>
          <a href={lazadaLink} target="_blank" rel="noopener noreferrer sponsored"
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-2xl bg-[#eeeeff] border border-[#0F0F60]/10 hover:bg-[#ddddf5] transition-colors group">
            <LazadaIcon className="w-7 h-7 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-black text-[#0F0F60]">Lazada</p>
              <p className="text-[10px] text-[#65676B] truncate">ลดราคา · คืนง่าย</p>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-[#bcc0c4] group-hover:text-[#0F0F60] shrink-0 transition-colors" />
          </a>
        </div>
      </div>

      {/* ── Main ── */}
      <div className="flex-1 min-w-0 flex flex-col">

        {/* Hero banner — โทน #4267B2 แทนส้มดิบ */}
        <div className="relative overflow-hidden px-5 md:px-8 pt-6 pb-5" style={{ background: 'linear-gradient(135deg, #4267B2 0%, #3b5998 55%, #2d4373 100%)' }}>
          {/* SVG paw prints decorative */}
          <PawSVG className="absolute top-3 right-20 w-10 h-10 text-white opacity-10 -rotate-12 select-none pointer-events-none" />
          <PawSVG className="absolute bottom-1 right-10 w-7 h-7 text-white opacity-8 rotate-6 select-none pointer-events-none" />

          {/* SVG cat silhouette */}
          <CatSilhouette className="absolute right-6 bottom-0 w-28 h-28 text-white opacity-10 select-none pointer-events-none" />

          <div className="relative flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="bg-white/20 text-white text-[11px] font-bold px-3 py-1 rounded-full">
                  {activeCat?.emoji} {activeCategory}
                </span>
                {displayed.length > 0 && (
                  <span className="text-white/50 text-[11px]">{displayed.length} รายการ</span>
                )}
              </div>
              <h1 className="text-white font-black text-[26px] md:text-[28px] leading-tight">Cat Shop</h1>
              <p className="text-white/60 text-[13px] mt-0.5">สินค้าคัดพิเศษสำหรับน้องแมว</p>
            </div>

            {/* Mobile actions */}
            <div className="flex items-center gap-2 md:hidden shrink-0">
              <button onClick={() => setIsOpen(true)} className="relative bg-white/15 border border-white/25 text-white p-2.5 rounded-xl">
                <span className="text-xl leading-none">🛒</span>
                {count > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[#FF6B35] text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center">{count}</span>
                )}
              </button>
              {isSeller && (
                <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-1 bg-white/15 border border-white/25 text-white font-bold text-[13px] px-3 py-2.5 rounded-xl">
                  <Plus className="w-3.5 h-3.5" /> ลงขาย
                </button>
              )}
            </div>
          </div>

          {/* Mobile category pills */}
          <div className="flex gap-2 mt-4 overflow-x-auto no-scrollbar md:hidden pb-0.5">
            {CATEGORIES.map(({ id, emoji }) => (
              <button
                key={id}
                onClick={() => setActiveCategory(id)}
                className={`shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-[12px] font-bold transition-all
                  ${activeCategory === id ? 'bg-white text-[#4267B2]' : 'bg-white/15 text-white border border-white/25'}`}
              >
                {emoji} {id}
              </button>
            ))}
          </div>
        </div>

        {/* Affiliate banner (category selected) */}
        {activeCategory !== 'ทั้งหมด' && (
          <div className="flex gap-2 px-4 md:px-8 pt-4">
            <a href={shopeeLink} target="_blank" rel="noopener noreferrer sponsored"
              onClick={() => trackMarketingEvent('affiliate_banner_click', { platform: 'shopee', category: activeCategory })}
              className="flex-1 flex items-center gap-2 bg-gradient-to-r from-[#EE4D2D] to-[#ff7043] text-white rounded-2xl px-4 py-2.5 hover:opacity-95 transition-opacity shadow-sm">
              <ShopeeIcon className="w-7 h-7 shrink-0" />
              <div className="min-w-0">
                <p className="text-[12px] font-black leading-tight">ดู {activeCategory} ใน Shopee</p>
                <p className="text-[10px] opacity-70">ราคาดี ส่งฟรี</p>
              </div>
              <ExternalLink className="w-3.5 h-3.5 opacity-60 shrink-0 ml-auto" />
            </a>
            <a href={lazadaLink} target="_blank" rel="noopener noreferrer sponsored"
              onClick={() => trackMarketingEvent('affiliate_banner_click', { platform: 'lazada', category: activeCategory })}
              className="flex-1 flex items-center gap-2 bg-gradient-to-r from-[#0F0F60] to-[#1a1a8c] text-white rounded-2xl px-4 py-2.5 hover:opacity-95 transition-opacity shadow-sm">
              <LazadaIcon className="w-7 h-7 shrink-0" />
              <div className="min-w-0">
                <p className="text-[12px] font-black leading-tight">ดู {activeCategory} ใน Lazada</p>
                <p className="text-[10px] opacity-70">ลดราคา คืนง่าย</p>
              </div>
              <ExternalLink className="w-3.5 h-3.5 opacity-60 shrink-0 ml-auto" />
            </a>
          </div>
        )}

        {/* Product grid */}
        <div className="flex-1 p-4 md:p-6 md:pt-4">
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, idx) => (
                <div key={idx} className="bg-white rounded-3xl border border-[#e4e6eb] overflow-hidden animate-pulse">
                  <div className="aspect-square bg-[#f0f2f5]" />
                  <div className="p-4 space-y-2.5">
                    <div className="h-5 bg-[#f0f2f5] rounded-xl w-20" />
                    <div className="h-3 bg-[#f0f2f5] rounded-xl" />
                    <div className="h-3 bg-[#f0f2f5] rounded-xl w-3/4" />
                    <div className="h-9 bg-[#f0f2f5] rounded-2xl mt-3" />
                    <div className="flex gap-1.5">
                      <div className="h-7 flex-1 bg-[#fff0ed] rounded-xl" />
                      <div className="h-7 flex-1 bg-[#eeeeff] rounded-xl" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : displayed.length === 0 ? (
            <div className="bg-white rounded-3xl border border-[#e4e6eb] p-12 text-center">
              <div className="w-16 h-16 rounded-3xl bg-[#f0f2f5] flex items-center justify-center mx-auto mb-4">
                <CatSilhouette className="w-9 h-9 text-[#bcc0c4]" />
              </div>
              <p className="font-bold text-[#050505] text-[16px]">ยังไม่มีสินค้าในหมวดนี้</p>
              <p className="text-[#65676B] text-[13px] mt-1 mb-5">ลองดูใน marketplace ข้างนอกได้เลย</p>
              <div className="flex gap-2 justify-center">
                <a href={shopeeLink} target="_blank" rel="noopener noreferrer sponsored"
                  className="flex items-center gap-1.5 bg-[#EE4D2D] text-white text-[13px] font-bold px-4 py-2.5 rounded-2xl shadow-sm">
                  <ShopeeIcon className="w-4 h-4" /> Shopee
                </a>
                <a href={lazadaLink} target="_blank" rel="noopener noreferrer sponsored"
                  className="flex items-center gap-1.5 bg-[#0F0F60] text-white text-[13px] font-bold px-4 py-2.5 rounded-2xl shadow-sm">
                  <LazadaIcon className="w-4 h-4" /> Lazada
                </a>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {displayed.map(item => (
                <ProductCard key={item.id} item={item} onAdd={handleAdd} onSelect={handleSelect} />
              ))}
            </div>
          )}

          {/* Bottom affiliate strip */}
          {!isLoading && displayed.length > 0 && (
            <div className="mt-5 flex items-center gap-3 bg-white rounded-2xl border border-[#e4e6eb] px-4 py-3">
              <span className="text-[13px] text-[#65676B] flex-1">🔍 หาสินค้าเพิ่มเติมใน marketplace ชั้นนำ</span>
              <a href={shopeeLink} target="_blank" rel="noopener noreferrer sponsored"
                onClick={() => trackMarketingEvent('affiliate_strip_click', { platform: 'shopee', category: activeCategory })}
                className="shrink-0 flex items-center gap-1.5 bg-[#EE4D2D] hover:bg-[#d63a1e] text-white text-[12px] font-bold px-3 py-1.5 rounded-xl transition-colors">
                <ShopeeIcon className="w-3.5 h-3.5" /> Shopee
              </a>
              <a href={lazadaLink} target="_blank" rel="noopener noreferrer sponsored"
                onClick={() => trackMarketingEvent('affiliate_strip_click', { platform: 'lazada', category: activeCategory })}
                className="shrink-0 flex items-center gap-1.5 bg-[#0F0F60] hover:bg-[#0a0a48] text-white text-[12px] font-bold px-3 py-1.5 rounded-xl transition-colors">
                <LazadaIcon className="w-3.5 h-3.5" /> Lazada
              </a>
            </div>
          )}
        </div>
      </div>

      {isSeller && (
        <CreateListingModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleAddListing}
        />
      )}
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </div>
  );
};

export default MarketplacePage;
