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
    <div className="bg-white rounded-xl overflow-hidden border border-[#e4e6eb] hover:border-[#4267B2]/40 hover:shadow-md transition-all duration-200 flex flex-col group">
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
        <span className="absolute top-2 left-2 bg-white/90 text-[#65676B] text-[11px] font-medium px-2 py-0.5 rounded-full shadow-sm border border-[#e4e6eb]/80">
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

        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-200" />
      </div>

      <div className="p-3 flex flex-col flex-1 gap-1.5">
        {/* Price */}
        <div className="flex items-baseline gap-0.5">
          <span className="font-bold text-[18px] text-[#050505] leading-none">{item.price.toLocaleString()}</span>
          <span className="text-[#65676B] text-[13px] ml-0.5">฿</span>
        </div>

        {/* Title */}
        <p
          className="text-[#050505] text-[13px] font-medium line-clamp-2 leading-snug cursor-pointer hover:text-[#4267B2] transition-colors"
          onClick={() => onSelect(item)}
        >
          {item.title}
        </p>

        <p className="text-[#65676B] text-[12px]">📍 {item.location}</p>

        {item.seller?.avatar && (
          <button onClick={goToSeller} className="flex items-center gap-1.5 w-fit hover:opacity-75 transition-opacity">
            <img src={item.seller.avatar} loading="lazy" decoding="async" className="w-5 h-5 rounded-full object-cover" alt="" />
            <span className="text-[12px] text-[#65676B]">{item.seller.name}</span>
          </button>
        )}

        <div className="flex-1" />

        {/* Cart button */}
        <button
          onClick={handleAdd}
          disabled={isAdding || isOwn}
          className={`w-full font-semibold text-[13px] py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5
            ${isOwn
              ? 'bg-[#f0f2f5] text-[#bcc0c4] cursor-default'
              : inCart
                ? 'bg-blue-50 text-[#4267B2] border border-[#4267B2]/20 hover:bg-blue-100'
                : isAdding
                  ? 'bg-[#f0f2f5] text-[#bcc0c4] cursor-wait'
                  : justAdded
                    ? 'bg-[#42b883] text-white'
                    : 'bg-[#4267B2] hover:bg-[#3b5998] text-white'}`}
        >
          {isOwn    ? 'สินค้าของคุณ'
          : inCart  ? <><ShoppingCart className="w-3.5 h-3.5" /> ดูในถาดเหมียว</>
          : isAdding ? 'กำลังหยิบ...'
          : justAdded ? <><Check className="w-3.5 h-3.5" /> หยิบแล้ว!</>
          : <><PawIcon className="w-3.5 h-3.5" /> หยิบใส่ถาด</>}
        </button>

        {/* Affiliate */}
        <div className="flex gap-1.5 mt-0.5">
          <a
            href={shopeeUrl} target="_blank" rel="noopener noreferrer sponsored"
            onClick={() => handleAffiliateClick('shopee', shopeeUrl)}
            className="flex-1 flex items-center justify-center gap-1 bg-[#f0f2f5] hover:bg-[#e4e6eb] text-[#65676B] text-[11px] font-medium py-1.5 rounded-lg transition-colors"
          >
            <ShopeeIcon className="w-3 h-3" /> Shopee
          </a>
          <a
            href={lazadaUrl} target="_blank" rel="noopener noreferrer sponsored"
            onClick={() => handleAffiliateClick('lazada', lazadaUrl)}
            className="flex-1 flex items-center justify-center gap-1 bg-[#f0f2f5] hover:bg-[#e4e6eb] text-[#65676B] text-[11px] font-medium py-1.5 rounded-lg transition-colors"
          >
            <LazadaIcon className="w-3 h-3" /> Lazada
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
      <div className="hidden md:block w-[280px] shrink-0 bg-white border-r border-[#e4e6eb] sticky top-[56px] h-[calc(100vh-56px)] overflow-y-auto no-scrollbar px-2 pt-3 pb-4">

        {/* Header — logo */}
        <div className="px-3 pt-2 pb-3">
          <img
            src="/logo-shop.png"
            alt="Cat Shop"
            className="h-12 w-auto object-contain"
          />
          <p className="text-[13px] text-[#65676B] mt-1">สินค้าสำหรับน้องแมวโดยเฉพาะ</p>
        </div>

        {/* Action buttons */}
        <div className="px-1 pb-3 space-y-1">
          {isSeller && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#e4e6eb] text-[#050505] font-medium text-[15px] transition-colors"
            >
              <Plus className="w-6 h-6 text-[#4267B2] shrink-0" />
              <span>ลงขายสินค้าใหม่</span>
            </button>
          )}
          <button
            onClick={() => setIsOpen(true)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#e4e6eb] text-[#050505] font-medium text-[15px] transition-colors"
          >
            <ShoppingCart className="w-6 h-6 text-[#4267B2] shrink-0" />
            <span className="flex-1 text-left">ถาดเหมียว</span>
            {count > 0 && (
              <span className="bg-[#4267B2] text-white text-[11px] font-semibold px-1.5 py-0.5 rounded-full">{count}</span>
            )}
          </button>
        </div>

        <div className="mx-3 h-px bg-[#e4e6eb] mb-3" />

        {/* Categories — copy LeftSidebar style ทุก token */}
        <ul className="space-y-0.5 px-1">
          {CATEGORIES.map(({ id, emoji }) => {
            const cnt   = id === 'ทั้งหมด' ? items.length : items.filter(i => i.category === id).length;
            const isActive = activeCategory === id;
            return (
              <li key={id}>
                <button
                  onClick={() => setActiveCategory(id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors font-medium text-[15px]
                    ${isActive
                      ? 'bg-blue-50 text-[#4267B2] font-semibold'
                      : 'hover:bg-[#e4e6eb] text-[#050505]'}`}
                >
                  <span className="w-6 h-6 flex items-center justify-center text-[18px] leading-none shrink-0">{emoji}</span>
                  <span className="flex-1 text-left truncate">{id}</span>
                  <span className={`text-[13px] ${isActive ? 'text-[#4267B2]/60' : 'text-[#bcc0c4]'}`}>{cnt}</span>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="mx-3 h-px bg-[#e4e6eb] my-3" />

        {/* Affiliate */}
        <ul className="space-y-0.5 px-1">
          <li>
            <a href={shopeeLink} target="_blank" rel="noopener noreferrer sponsored"
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#e4e6eb] transition-colors font-medium text-[15px] text-[#050505]">
              <ShopeeIcon className="w-6 h-6 shrink-0" />
              <span className="flex-1">Shopee</span>
              <ExternalLink className="w-3.5 h-3.5 text-[#bcc0c4] shrink-0" />
            </a>
          </li>
          <li>
            <a href={lazadaLink} target="_blank" rel="noopener noreferrer sponsored"
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#e4e6eb] transition-colors font-medium text-[15px] text-[#050505]">
              <LazadaIcon className="w-6 h-6 shrink-0" />
              <span className="flex-1">Lazada</span>
              <ExternalLink className="w-3.5 h-3.5 text-[#bcc0c4] shrink-0" />
            </a>
          </li>
        </ul>
      </div>

      {/* ── Main ── */}
      <div className="flex-1 min-w-0 p-4 md:p-6">

        {/* Mobile top bar */}
        <div className="flex items-center gap-2 mb-4 md:hidden">
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar flex-1">
            {CATEGORIES.map(({ id, emoji }) => (
              <button
                key={id}
                onClick={() => setActiveCategory(id)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-[13px] font-medium transition-colors
                  ${activeCategory === id
                    ? 'bg-[#4267B2] text-white'
                    : 'bg-white text-[#050505] border border-[#e4e6eb] hover:bg-[#e4e6eb]'}`}
              >
                {emoji} {id}
              </button>
            ))}
          </div>
          <button onClick={() => setIsOpen(true)} className="relative shrink-0 bg-white border border-[#e4e6eb] text-[#050505] p-2 rounded-lg hover:bg-[#e4e6eb] transition-colors">
            <ShoppingCart className="w-5 h-5 text-[#4267B2]" />
            {count > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#4267B2] text-white text-[9px] font-semibold w-4 h-4 rounded-full flex items-center justify-center">{count}</span>
            )}
          </button>
          {isSeller && (
            <button onClick={() => setIsModalOpen(true)} className="shrink-0 flex items-center gap-1.5 bg-[#ebf5ff] text-[#4267B2] font-semibold text-[13px] px-3 py-2 rounded-lg hover:bg-[#dce9ff] transition-colors">
              <Plus className="w-4 h-4" /> ลงขาย
            </button>
          )}
        </div>

        {/* Section header */}
        <div className="mb-3">
          <h2 className="text-[18px] font-semibold text-[#050505]">
            {activeCategory === 'ทั้งหมด' ? 'สินค้าทั้งหมด' : activeCategory}
            <span className="text-[#65676B] font-normal text-[14px] ml-2">({displayed.length} รายการ)</span>
          </h2>
        </div>

        {/* Product grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, idx) => (
              <div key={idx} className="bg-white rounded-xl border border-[#e4e6eb] overflow-hidden animate-pulse">
                <div className="aspect-square bg-[#f0f2f5]" />
                <div className="p-3 space-y-2">
                  <div className="h-4 bg-[#f0f2f5] rounded w-16" />
                  <div className="h-3 bg-[#f0f2f5] rounded" />
                  <div className="h-3 bg-[#f0f2f5] rounded w-2/3" />
                  <div className="h-8 bg-[#f0f2f5] rounded-lg mt-2" />
                </div>
              </div>
            ))}
          </div>
        ) : displayed.length === 0 ? (
          <div className="bg-white rounded-xl border border-[#e4e6eb] py-16 text-center">
            <p className="text-4xl mb-3">🐾</p>
            <p className="font-semibold text-[#050505] text-[15px]">ยังไม่มีสินค้าในหมวดนี้</p>
            <p className="text-[#65676B] text-[13px] mt-1 mb-5">ลองดูใน Marketplace ข้างนอกได้เลย</p>
            <div className="flex gap-2 justify-center">
              <a href={shopeeLink} target="_blank" rel="noopener noreferrer sponsored"
                className="flex items-center gap-1.5 bg-[#EE4D2D] text-white text-[13px] font-semibold px-4 py-2 rounded-lg">
                <ShopeeIcon className="w-4 h-4" /> Shopee
              </a>
              <a href={lazadaLink} target="_blank" rel="noopener noreferrer sponsored"
                className="flex items-center gap-1.5 bg-[#0F0F60] text-white text-[13px] font-semibold px-4 py-2 rounded-lg">
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
