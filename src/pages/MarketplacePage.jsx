import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Plus, Tag, ShoppingBag, Check, ExternalLink } from 'lucide-react';
import PawIcon from '../components/PawIcon';
import Toast from '../components/Toast';
import useToast from '../hooks/useToast';
import { mockUsers } from '../data/mockData';
import { useUser } from '../context/UserContext';
import { useCart } from '../context/CartContext';
import CreateListingModal from '../components/CreateListingModal';
import ProductDetailModal from '../components/ProductDetailModal';
import { adminApi, productApi, sellerApi } from '../services/commerceApi';
import { trackMarketingEvent } from '../services/marketingTracking';
import { productSeoMeta, setSeoMeta } from '../utils/seo';

const CATEGORIES = ['ทั้งหมด', 'อาหารแมว', 'ทรายแมว', 'ของเล่น', 'คอนโดและที่นอน', 'ปลอกคอ', 'อุปกรณ์'];

// Shopee category affiliate landing pages (placeholder – replace with real affiliate links)
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

const buildMarket = (users) => {
  const [u1, u2, u3, u4] = users;
  return [
    {
      id: 'm1',
      title: 'คอนโดแมว 3 ชั้น พร้อมที่ลับเล็บและของเล่นแขวน',
      price: 850,
      category: 'คอนโดและที่นอน',
      location: 'กรุงเทพฯ',
      desc: 'สภาพดี ใช้มาแล้ว 3 เดือน ขายเพราะแมวไม่ค่อยใช้ สูง 120 ซม. สีครีม',
      seller: u1.activeCat,
      img: 'https://images.unsplash.com/photo-1545249390-6bdfa286032f?w=400&q=80',
      shopeeUrl: 'https://shopee.co.th/search?keyword=คอนโดแมว',
      lazadaUrl: 'https://www.lazada.co.th/catalog/?q=คอนโดแมว',
    },
    {
      id: 'm2',
      title: 'อาหารเปียกรสทูน่า ยกลัง 24 กระป๋อง',
      price: 420,
      category: 'อาหารแมว',
      location: 'เชียงใหม่',
      desc: 'อาหารเปียกสำหรับแมวโต รสทูน่า แพ็ก 24 กระป๋อง ยังไม่เปิด Exp. 2026',
      seller: u3.activeCat,
      img: 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=400&q=80',
      shopeeUrl: 'https://shopee.co.th/search?keyword=whiskas',
      lazadaUrl: 'https://www.lazada.co.th/catalog/?q=whiskas',
    },
    {
      id: 'm3',
      title: 'ของเล่นแมว เมาส์ไฟฟ้าอัตโนมัติ ชาร์จ USB',
      price: 299,
      category: 'ของเล่น',
      location: 'กรุงเทพฯ',
      desc: 'ของเล่นวิ่งสุ่มทิศทาง มีเซนเซอร์หลบหลีก ชาร์จ USB แบตอยู่ได้ประมาณ 2 ชั่วโมง',
      seller: u2.activeCat,
      img: 'https://images.unsplash.com/photo-1526336024174-e58f5cdd8e13?w=400&q=80',
      shopeeUrl: 'https://shopee.co.th/search?keyword=ของเล่นแมว',
      lazadaUrl: 'https://www.lazada.co.th/catalog/?q=ของเล่นแมว',
    },
    {
      id: 'm4',
      title: 'ทรายแมวอนามัย กลิ่นมะนาว ก้อนแน่น 10 ลิตร',
      price: 185,
      category: 'ทรายแมว',
      location: 'นนทบุรี',
      desc: 'ทรายแมวสูตรจับตัวเป็นก้อน ดูดซับกลิ่นดี เหมาะกับบ้านที่มีแมวหลายตัว',
      seller: u4.activeCat,
      img: 'https://images.unsplash.com/photo-1511275539165-cc46b1ee89bf?w=400&q=80',
      shopeeUrl: 'https://shopee.co.th/search?keyword=ทรายแมว',
      lazadaUrl: 'https://www.lazada.co.th/catalog/?q=ทรายแมว',
    },
    {
      id: 'm5',
      title: 'Royal Canin Persian อาหารแห้ง สูตรเปอร์เซีย 2 กก.',
      price: 620,
      category: 'อาหารแมว',
      location: 'กรุงเทพฯ',
      desc: 'สูตรพิเศษสำหรับแมวเปอร์เซีย ช่วยบำรุงขนและการย่อยอาหาร',
      seller: u2.activeCat,
      img: 'https://images.unsplash.com/photo-1589924691995-400dc9a0b089?w=400&q=80',
      shopeeUrl: 'https://shopee.co.th/search?keyword=royal+canin',
      lazadaUrl: 'https://www.lazada.co.th/catalog/?q=royal+canin',
    },
    {
      id: 'm6',
      title: 'ขนมแมวรสทูน่า แพ็ก 3 ถุง',
      price: 129,
      category: 'อาหารแมว',
      location: 'ปทุมธานี',
      desc: 'ขนมแมวกรอบนอกนุ่มใน รสทูน่า ขนาด 85g x 3 ถุง',
      seller: u1.activeCat,
      img: 'https://images.unsplash.com/photo-1548681528-6a5c45b66b42?w=400&q=80',
      shopeeUrl: 'https://shopee.co.th/search?keyword=ขนมแมว',
      lazadaUrl: 'https://www.lazada.co.th/catalog/?q=ขนมแมว',
    },
    {
      id: 'm7',
      title: 'ไม้ตกแมว ขนนกธรรมชาติ หมุนได้ 360°',
      price: 149,
      category: 'ของเล่น',
      location: 'ระยอง',
      desc: 'ขนนกจริง ล่อแมวได้ดีมาก ด้ามยาว 60 ซม. แกว่งได้ทุกทิศ',
      seller: u3.activeCat,
      img: 'https://images.unsplash.com/photo-1576201836106-db1758fd1c97?w=400&q=80',
      shopeeUrl: 'https://shopee.co.th/search?keyword=ไม้ตกแมว',
      lazadaUrl: 'https://www.lazada.co.th/catalog/?q=ไม้ตกแมว',
    },
    {
      id: 'm8',
      title: 'อุโมงค์แมว ลาย Space Cat 🚀 ยาว 90 ซม.',
      price: 220,
      category: 'ของเล่น',
      location: 'ขอนแก่น',
      desc: 'ผ้าอ๊อกซ์ฟอร์ด พับเก็บได้ มีลูกบอลแขวนในอุโมงค์ แมวชอบมาก',
      seller: u4.activeCat,
      img: 'https://images.unsplash.com/photo-1592194996308-7b43878e84a6?w=400&q=80',
      shopeeUrl: 'https://shopee.co.th/search?keyword=อุโมงค์แมว',
      lazadaUrl: 'https://www.lazada.co.th/catalog/?q=อุโมงค์แมว',
    },
    {
      id: 'm9',
      title: 'ที่นอนทรงโดม ขนนุ่มพิเศษ สีครีม Luxury Edition',
      price: 490,
      category: 'คอนโดและที่นอน',
      location: 'เชียงใหม่',
      desc: 'ด้านนอกกันน้ำ ด้านในขนนุ่มมาก ถอดซักได้ ขนาด M เหมาะสำหรับแมวหนัก 4-6 กก.',
      seller: u1.activeCat,
      img: 'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=400&q=80',
      shopeeUrl: 'https://shopee.co.th/search?keyword=ที่นอนแมว',
      lazadaUrl: 'https://www.lazada.co.th/catalog/?q=ที่นอนแมว',
    },
    {
      id: 'm10',
      title: 'ปลอกคอหนัง PU พร้อมจี้ปลาสีทอง ปรับได้',
      price: 199,
      category: 'ปลอกคอ',
      location: 'กรุงเทพฯ',
      desc: 'หนัง PU อย่างดี ไม่แข็ง ระบายอากาศดี มีกระดิ่งเล็กๆ น่ารักมาก',
      seller: u2.activeCat,
      img: 'https://images.unsplash.com/photo-1571566882372-1598d88abd90?w=400&q=80',
      shopeeUrl: 'https://shopee.co.th/search?keyword=ปลอกคอแมว',
      lazadaUrl: 'https://www.lazada.co.th/catalog/?q=ปลอกคอแมว',
    },
    {
      id: 'm11',
      title: 'แปรงขนซิลิโคน Self-Cleaning ดีไซน์ก้ามกุ้ง',
      price: 320,
      category: 'อุปกรณ์',
      location: 'นครปฐม',
      desc: 'ซิลิโคนอ่อนนุ่ม กดปุ่มเดียวขนออกหมด เหมาะสำหรับแมวขนยาว',
      seller: u3.activeCat,
      img: 'https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=400&q=80',
      shopeeUrl: 'https://shopee.co.th/search?keyword=แปรงขนแมว',
      lazadaUrl: 'https://www.lazada.co.th/catalog/?q=แปรงขนแมว',
    },
    {
      id: 'm12',
      title: 'น้ำพุแมว Ceramic Fountain ระบบกรอง 3 ชั้น',
      price: 890,
      category: 'อุปกรณ์',
      location: 'กรุงเทพฯ',
      desc: 'เซรามิกแท้ ทำความสะอาดง่าย ระบบกรองคาร์บอน + ฝ้าย + ฟองน้ำ เสียงเบามาก',
      seller: u4.activeCat,
      img: 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=400&q=80',
      shopeeUrl: 'https://shopee.co.th/search?keyword=น้ำพุแมว',
      lazadaUrl: 'https://www.lazada.co.th/catalog/?q=น้ำพุแมว',
    },
  ];
};

/* ── Brand icon components (real logos via Google favicon service) ── */
const ShopeeIcon = ({ className = "w-3.5 h-3.5" }) => (
  <img src="https://www.google.com/s2/favicons?domain=shopee.co.th&sz=64" className={`${className} object-contain rounded-sm`} alt="" aria-hidden="true" />
);
const LazadaIcon = ({ className = "w-3.5 h-3.5" }) => (
  <img src="https://www.google.com/s2/favicons?domain=lazada.co.th&sz=64" className={`${className} object-contain rounded-sm`} alt="" aria-hidden="true" />
);


/* ── Product Card ── */
const ProductCard = ({ item, onAdd, onSelect }) => {
  const { currentUser, setViewedCat } = useUser();
  const navigate = useNavigate();
  const { items, setIsOpen, isProductPending } = useCart();
  const [justAdded, setJustAdded] = useState(false);

  const isOwn = item.seller?.id === currentUser.activeCat.id;
  const cartItem = items.find(i => i.product.id === item.id);
  const inCart = Boolean(cartItem);
  const isAdding = isProductPending(item.id);

  const shopeeUrl = item.shopeeUrl || SHOPEE_CAT_LINKS[item.category] || SHOPEE_CAT_LINKS['ทั้งหมด'];
  const lazadaUrl = item.lazadaUrl || LAZADA_CAT_LINKS[item.category] || LAZADA_CAT_LINKS['ทั้งหมด'];

  const goToSeller = (e) => {
    e.stopPropagation();
    setViewedCat(item.seller);
    navigate('/profile');
  };

  const handleAdd = async () => {
    if (isOwn || inCart) {
      if (inCart) setIsOpen(true);
      return;
    }
    if (isAdding) return;

    const result = await onAdd(item);
    if (!result?.ok) return;

    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1500);
  };

  const handleAffiliateClick = (platform, url) => {
    trackMarketingEvent('affiliate_click', {
      platform,
      product_id: item.id,
      product_title: item.title,
      value: item.price,
      currency: 'THB',
      url,
    });
  };

  return (
    <div className="bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm hover:shadow-md transition-shadow flex flex-col group">
      {/* Image */}
      <div className="aspect-square overflow-hidden bg-[#f0f2f5] relative cursor-pointer" onClick={() => onSelect(item)}>
        <img
          src={item.img}
          alt={item.title}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <span className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm text-[#4267B2] text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1">
          <Tag className="w-2.5 h-2.5" />
          {item.category}
        </span>
        {isOwn && (
          <span className="absolute top-2 right-2 bg-[#4267B2] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            ของคุณ
          </span>
        )}
        {inCart && !isOwn && (
          <span className="absolute top-2 right-2 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5">
            <Check className="w-2.5 h-2.5" />
            ในถาด ×{cartItem.qty}
          </span>
        )}
      </div>

      <div className="p-3 flex flex-col flex-1">
        <p className="font-black text-[#050505] text-[17px] leading-tight">
          {item.price.toLocaleString()} ฿
        </p>
        <p
          className="text-[#050505] text-[13px] mt-0.5 line-clamp-2 leading-snug cursor-pointer hover:text-[#4267B2] transition-colors"
          onClick={() => onSelect(item)}
        >
          {item.title}
        </p>
        <p className="text-[#65676B] text-[11px] mt-0.5 mb-1">📍 {item.location}</p>

        {item.desc && (
          <p className="text-[11px] text-gray-400 leading-snug line-clamp-2 mb-2 flex-1">{item.desc}</p>
        )}

        {item.seller?.avatar && (
          <button onClick={goToSeller} className="flex items-center gap-1.5 mb-2 text-left hover:underline w-fit">
            <img src={item.seller.avatar} loading="lazy" decoding="async" className="w-5 h-5 rounded-full object-cover shrink-0" alt="" />
            <span className="text-[11px] text-[#65676B]">{item.seller.name}</span>
          </button>
        )}

        {/* Cart button */}
        <button
          onClick={handleAdd}
          disabled={isAdding}
          className={`w-full font-bold text-sm py-2 rounded-lg transition-all border flex items-center justify-center gap-1.5 active:scale-[0.97]
            ${isOwn
              ? 'bg-gray-50 text-gray-400 border-gray-200 cursor-default'
              : inCart
                ? 'bg-green-50 text-green-600 border-green-200 hover:bg-green-100 cursor-pointer'
                : isAdding
                  ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-wait'
                : justAdded
                  ? 'bg-green-500 text-white border-green-500'
                  : 'bg-[#4267B2] hover:bg-[#3b5998] text-white border-[#4267B2] cursor-pointer'}`}
        >
          {isOwn ? (
            'สินค้าของคุณ'
          ) : inCart ? (
            <><ShoppingBag className="w-3.5 h-3.5" /> ดูในถาดเหมียว</>
          ) : isAdding ? (
            'Adding...'
          ) : justAdded ? (
            <><Check className="w-3.5 h-3.5" /> หยิบแล้ว!</>
          ) : (
            <><PawIcon className="w-3.5 h-3.5" /> หยิบใส่ถาด</>
          )}
        </button>

        {/* Affiliate buttons — always show using category fallback */}
        <div className="mt-1.5 space-y-0.5">
          <div className="flex items-center gap-1">
            <a
              href={shopeeUrl}
              target="_blank"
              rel="noopener noreferrer sponsored"
              onClick={() => handleAffiliateClick('shopee', shopeeUrl)}
              className="flex-1 flex items-center justify-center gap-1 bg-[#FFECE8] hover:bg-[#FFD8CF] active:scale-[0.97] text-[#EE4D2D] text-[10px] font-bold py-1 rounded-md transition-all border border-[#EE4D2D]/20"
            >
              <ShopeeIcon className="w-4 h-4" />
              Shopee
            </a>
            <a
              href={lazadaUrl}
              target="_blank"
              rel="noopener noreferrer sponsored"
              onClick={() => handleAffiliateClick('lazada', lazadaUrl)}
              className="flex-1 flex items-center justify-center gap-1 bg-[#EEEEFF] hover:bg-[#DDDDF5] active:scale-[0.97] text-[#0F0F60] text-[10px] font-bold py-1 rounded-md transition-all border border-[#0F0F60]/15"
            >
              <LazadaIcon className="w-4 h-4" />
              Lazada
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ── Affiliate Partner Card (sidebar) ── */
const AffiliatePartnerCard = ({ href, color, bgColor, borderColor, icon, name, desc, badge }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer sponsored"
    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border ${borderColor} ${bgColor} hover:opacity-90 transition-opacity mb-2 group`}
  >
    <span className="w-8 h-8 shrink-0 flex items-center justify-center">{icon}</span>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-1.5">
        <p className={`text-[13px] font-black ${color}`}>{name}</p>
        {badge && (
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${color} bg-white/60`}>
            {badge}
          </span>
        )}
      </div>
      <p className="text-[10px] text-gray-400 truncate">{desc}</p>
    </div>
    <ExternalLink className="w-3.5 h-3.5 text-gray-300 shrink-0 group-hover:text-gray-400 transition-colors" />
  </a>
);

/* ── Marketplace Page ── */
const MarketplacePage = () => {
  const { currentUser } = useUser();
  const location = useLocation();
  const isAdmin = currentUser.isAdmin;
  const isSeller = currentUser.role === 'SELLER' || currentUser.isAdmin;
  const { addItem, count, setIsOpen } = useCart();
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [activeCategory, setActiveCategory] = useState('ทั้งหมด');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [toast, showToast] = useToast();
  const handledProductLinkRef = useRef('');

  useEffect(() => {
    let isMounted = true;

    setIsLoading(true);
    setLoadError('');

    productApi.list()
      .then(({ products }) => {
        if (!isMounted) return;
        setItems(products || []);
        setActiveCategory('ทั้งหมด');
      })
      .catch(() => {
        if (!isMounted) return;
        setItems(buildMarket(mockUsers));
        setLoadError('โหลดสินค้าจาก API ไม่สำเร็จ กำลังใช้ข้อมูลสำรอง');
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => { isMounted = false; };
  }, [currentUser.activeCat.id]);

  const handleSelect = (item) => {
    setSelectedProduct(item);
    trackMarketingEvent('view_product', {
      product_id: item.id,
      sku: item.sku || '',
      value: item.price,
      currency: 'THB',
    });
  };

  const handleAdd = async (item) => {
    const result = await addItem(item);
    if (!result?.ok) {
      showToast(result?.error || 'Unable to add product to cart');
      return result;
    }
    trackMarketingEvent('add_to_cart', {
      product_id: item.id,
      sku: item.sku || '',
      value: item.price,
      currency: 'THB',
    });
    showToast(`Added "${item.title.slice(0, 20)}..." to cart`);
    return result;
  };

  const handleAddListing = async (newItem) => {
    const sku = newItem.sku || `MKT-${Date.now().toString(36).toUpperCase()}`;
    const payload = { ...newItem, sku, slug: newItem.slug || sku.toLowerCase(), status: 'active' };
    const api = isAdmin ? adminApi : sellerApi;
    const response = await api.createProduct(payload);
    setItems(prev => [response.product, ...prev]);
    showToast(`บันทึก "${response.product.title}" แล้ว`);
  };

  const displayed = activeCategory === 'ทั้งหมด'
    ? items
    : items.filter(i => i.category === activeCategory);

  useEffect(() => {
    setSeoMeta({
      title: activeCategory === 'ทั้งหมด'
        ? 'CatBook Shop | สินค้าสัตว์เลี้ยง'
        : `${activeCategory} | CatBook Shop`,
      description: 'เลือกซื้ออาหาร ขนม ของเล่น อุปกรณ์ และบริการสำหรับสัตว์เลี้ยง พร้อมตะกร้าและ checkout',
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

    if (!product) {
      showToast('Product link not found');
      return;
    }

    setSelectedProduct(product);
    setSeoMeta(productSeoMeta(product));
    trackMarketingEvent('view_product', {
      product_id: product.id,
      sku: product.sku || '',
      value: product.price,
      currency: 'THB',
    });
  }, [items, isLoading, location.search, showToast]);

  const shopeeLink = SHOPEE_CAT_LINKS[activeCategory] || SHOPEE_CAT_LINKS['ทั้งหมด'];
  const lazadaLink = LAZADA_CAT_LINKS[activeCategory] || LAZADA_CAT_LINKS['ทั้งหมด'];

  return (
    <div className="flex w-full min-h-[calc(100vh-56px)] bg-[#f0f2f5]">
      <Toast message={toast} />

      {/* ── Sidebar ── */}
      <div className="hidden md:flex w-[280px] shrink-0 bg-white border-r border-[#ced0d4] flex-col sticky top-[56px] h-[calc(100vh-56px)] overflow-y-auto">
        <div className="px-4 pt-5 pb-3">
          <h1 className="text-[22px] font-black text-black mb-1">Cat Shop 🐾</h1>
          <p className="text-[12px] text-gray-400 mb-4">สินค้าสำหรับน้องแมวโดยเฉพาะ</p>

          {isSeller && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="w-full flex items-center justify-center gap-2 bg-[#ebf5ff] hover:bg-[#dce9ff] text-[#1877f2] font-semibold text-[14px] py-2.5 rounded-lg transition-colors mb-3"
            >
              <Plus className="w-4 h-4" />
              ลงขายสินค้าใหม่
            </button>
          )}

          {/* Cart shortcut */}
          <button
            onClick={() => setIsOpen(true)}
            className="w-full flex items-center justify-between bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 font-semibold text-[14px] py-2.5 px-4 rounded-lg transition-colors mb-4"
          >
            <span className="flex items-center gap-2">
              <span className="text-lg">🛒</span>
              ถาดเหมียว
            </span>
            {count > 0 && (
              <span className="bg-[#4267B2] text-white text-xs font-black px-2 py-0.5 rounded-full">
                {count}
              </span>
            )}
          </button>

          {/* Affiliate Partners */}
          <div className="mb-4">
            <p className="text-[11px] font-bold text-[#65676B] mb-2 uppercase tracking-wide">
              ซื้อผ่านพาร์ทเนอร์
            </p>
            <AffiliatePartnerCard
              href={shopeeLink}
              color="text-[#EE4D2D]"
              bgColor="bg-[#fff4f2]"
              borderColor="border-[#EE4D2D]/20"
              icon={<ShopeeIcon className="w-7 h-7" />}
              name="Shopee"
              desc={`ค้นหา ${activeCategory === 'ทั้งหมด' ? 'สินค้าแมว' : activeCategory} ใน Shopee`}
              badge="ส่งฟรี"
            />
            <AffiliatePartnerCard
              href={lazadaLink}
              color="text-[#0F0F60]"
              bgColor="bg-[#f0f0ff]"
              borderColor="border-[#0F0F60]/20"
              icon={<LazadaIcon className="w-7 h-7" />}
              name="Lazada"
              desc={`ค้นหา ${activeCategory === 'ทั้งหมด' ? 'สินค้าแมว' : activeCategory} ใน Lazada`}
              badge="ลดราคา"
            />
          </div>
        </div>

        {/* Category filter */}
        <div className="px-4 pb-6">
          <p className="text-[12px] font-semibold text-[#65676B] mb-2 uppercase tracking-wide">หมวดหมู่</p>
          <div className="space-y-0.5">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`w-full text-left px-3 py-2 rounded-lg text-[14px] font-medium transition-colors
                  ${activeCategory === cat
                    ? 'bg-[#ebf5ff] text-[#1877f2]'
                    : 'text-gray-600 hover:bg-gray-100'}`}
              >
                {cat}
                {cat !== 'ทั้งหมด' && (
                  <span className="ml-1.5 text-[11px] text-gray-400">
                    ({items.filter(i => i.category === cat).length})
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="flex-1 min-w-0 p-4 md:p-6">

        {/* Mobile top bar */}
        <div className="flex items-center justify-between mb-4 md:hidden gap-2">
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar flex-1">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`shrink-0 px-3 py-1 rounded-full text-[12px] font-semibold transition-colors
                  ${activeCategory === cat
                    ? 'bg-[#1877f2] text-white'
                    : 'bg-white text-gray-600 border border-gray-200'}`}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="flex gap-1.5 shrink-0">
            <button
              onClick={() => setIsOpen(true)}
              className="relative bg-amber-50 border border-amber-200 text-amber-700 p-2 rounded-lg"
            >
              <span className="text-lg leading-none">🛒</span>
              {count > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#4267B2] text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                  {count}
                </span>
              )}
            </button>
            {isSeller && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-1 bg-[#ebf5ff] text-[#1877f2] font-semibold text-sm px-3 py-1.5 rounded-lg"
              >
                <Plus className="w-4 h-4" />
                ลงขาย
              </button>
            )}
          </div>
        </div>

        {/* Header row */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h2 className="text-[18px] font-bold text-[#050505]">
            {activeCategory === 'ทั้งหมด' ? 'สินค้าทั้งหมด' : activeCategory}
            <span className="text-gray-400 font-normal text-[14px] ml-2">({displayed.length} รายการ)</span>
          </h2>

          {/* Mobile affiliate buttons */}
          <div className="flex gap-2 md:hidden">
            <a
              href={shopeeLink}
              target="_blank"
              rel="noopener noreferrer sponsored"
              onClick={() => trackMarketingEvent('affiliate_click', { platform: 'shopee', category: activeCategory })}
              className="flex items-center gap-1.5 bg-[#EE4D2D] text-white text-[11px] font-bold px-2.5 py-1.5 rounded-lg"
            >
              <ShopeeIcon className="w-3.5 h-3.5" /> Shopee
            </a>
            <a
              href={lazadaLink}
              target="_blank"
              rel="noopener noreferrer sponsored"
              onClick={() => trackMarketingEvent('affiliate_click', { platform: 'lazada', category: activeCategory })}
              className="flex items-center gap-1.5 bg-[#0F0F60] text-white text-[11px] font-bold px-2.5 py-1.5 rounded-lg"
            >
              <LazadaIcon className="w-3.5 h-3.5" /> Lazada
            </a>
          </div>
        </div>

        {/* Affiliate banner — shown when category selected */}
        {activeCategory !== 'ทั้งหมด' && (
          <div className="mb-4 flex gap-2">
            <a
              href={shopeeLink}
              target="_blank"
              rel="noopener noreferrer sponsored"
              onClick={() => trackMarketingEvent('affiliate_banner_click', { platform: 'shopee', category: activeCategory })}
              className="flex-1 flex items-center gap-2.5 bg-gradient-to-r from-[#EE4D2D] to-[#ff7043] text-white rounded-xl px-4 py-2.5 hover:opacity-95 transition-opacity shadow-sm"
            >
              <ShopeeIcon className="w-8 h-8 shrink-0" />
              <div className="min-w-0">
                <p className="text-[13px] font-black leading-tight">ดู {activeCategory} ใน Shopee</p>
                <p className="text-[10px] opacity-80">ราคาดี ส่งฟรี มีรีวิวจริง</p>
              </div>
              <ExternalLink className="w-4 h-4 opacity-70 shrink-0 ml-auto" />
            </a>
            <a
              href={lazadaLink}
              target="_blank"
              rel="noopener noreferrer sponsored"
              onClick={() => trackMarketingEvent('affiliate_banner_click', { platform: 'lazada', category: activeCategory })}
              className="flex-1 flex items-center gap-2.5 bg-gradient-to-r from-[#0F0F60] to-[#1a1a8c] text-white rounded-xl px-4 py-2.5 hover:opacity-95 transition-opacity shadow-sm"
            >
              <LazadaIcon className="w-8 h-8 shrink-0" />
              <div className="min-w-0">
                <p className="text-[13px] font-black leading-tight">ดู {activeCategory} ใน Lazada</p>
                <p className="text-[10px] opacity-80">ลดราคา รับประกัน คืนง่าย</p>
              </div>
              <ExternalLink className="w-4 h-4 opacity-70 shrink-0 ml-auto" />
            </a>
          </div>
        )}

        {loadError && (
          <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-700 text-sm font-medium rounded-xl px-4 py-3">
            {loadError}
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, idx) => (
              <div key={idx} className="bg-white rounded-xl border border-gray-200 overflow-hidden animate-pulse">
                <div className="aspect-square bg-gray-200" />
                <div className="p-3 space-y-2">
                  <div className="h-5 bg-gray-200 rounded w-20" />
                  <div className="h-3 bg-gray-200 rounded" />
                  <div className="h-3 bg-gray-100 rounded w-2/3" />
                  <div className="h-9 bg-gray-200 rounded-lg mt-3" />
                  <div className="flex gap-2">
                    <div className="h-7 flex-1 bg-orange-100 rounded-lg" />
                    <div className="h-7 flex-1 bg-indigo-100 rounded-lg" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : displayed.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
            <p className="text-4xl mb-2">🐾</p>
            <p className="font-medium">ไม่มีสินค้าในหมวดนี้</p>
            <div className="mt-4 flex gap-2 justify-center">
              <a href={shopeeLink} target="_blank" rel="noopener noreferrer sponsored"
                className="flex items-center gap-1.5 bg-[#EE4D2D] text-white text-sm font-bold px-4 py-2 rounded-lg">
                <ShopeeIcon className="w-4 h-4" /> ค้นหาใน Shopee
              </a>
              <a href={lazadaLink} target="_blank" rel="noopener noreferrer sponsored"
                className="flex items-center gap-1.5 bg-[#0F0F60] text-white text-sm font-bold px-4 py-2 rounded-lg">
                <LazadaIcon className="w-4 h-4" /> ค้นหาใน Lazada
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
          <div className="mt-6 flex items-center gap-3 bg-white rounded-xl border border-gray-200 px-4 py-3">
            <span className="text-[13px] text-gray-500 flex-1">
              🔍 หาสินค้าเพิ่มเติมใน Marketplace ชั้นนำ
            </span>
            <a
              href={shopeeLink}
              target="_blank"
              rel="noopener noreferrer sponsored"
              onClick={() => trackMarketingEvent('affiliate_strip_click', { platform: 'shopee', category: activeCategory })}
              className="shrink-0 flex items-center gap-1.5 bg-[#EE4D2D] hover:bg-[#d63a1e] text-white text-[12px] font-bold px-3 py-1.5 rounded-lg transition-colors"
            >
              <ShopeeIcon className="w-3.5 h-3.5" /> Shopee
            </a>
            <a
              href={lazadaLink}
              target="_blank"
              rel="noopener noreferrer sponsored"
              onClick={() => trackMarketingEvent('affiliate_strip_click', { platform: 'lazada', category: activeCategory })}
              className="shrink-0 flex items-center gap-1.5 bg-[#0F0F60] hover:bg-[#0a0a48] text-white text-[12px] font-bold px-3 py-1.5 rounded-lg transition-colors"
            >
              <LazadaIcon className="w-3.5 h-3.5" /> Lazada
            </a>
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
