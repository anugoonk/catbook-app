import { useState } from 'react';
import { X, Minus, Plus, MapPin, Check } from 'lucide-react';
import PawIcon from './PawIcon';
import { useCart } from '../context/CartContext';
import { useUser } from '../context/UserContext';
import { useNavigate } from 'react-router-dom';

const CAT_EMOJI = {
  'อาหารแมว': '🐟', 'ทรายแมว': '🪣', 'ของเล่น': '🎾',
  'คอนโดและที่นอน': '🏠', 'ปลอกคอ': '💜', 'อุปกรณ์': '🔧',
};

const StockBadge = ({ stock }) => {
  if (stock === undefined) return null;
  if (stock === 0)  return <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">สินค้าหมด</span>;
  if (stock <= 3)   return <span className="text-xs font-bold text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full">เหลือ {stock} ชิ้น!</span>;
  if (stock <= 10)  return <span className="text-xs font-bold text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded-full">เหลือ {stock} ชิ้น</span>;
  return <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">มีสินค้า {stock} ชิ้น</span>;
};

const ProductDetailModal = ({ product, onClose }) => {
  const { currentUser, setViewedCat } = useUser();
  const navigate = useNavigate();
  const { items, addItem, setIsOpen: openCart } = useCart();
  const [qty, setQty]           = useState(1);
  const [justAdded, setJustAdded] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState('');

  if (!product) return null;

  const cartItem      = items.find(i => i.product.id === product.id);
  const isOwn         = product.seller?.id === currentUser.activeCat?.id;
  const reservedInCart = cartItem?.qty ?? 0;
  const availableStock = (product.stock ?? 99) - reservedInCart;
  const outOfStock    = availableStock <= 0;

  const handleAdd = async () => {
    if (outOfStock || isOwn) return;
    if (isAdding) return;

    const addQty = Math.min(qty, availableStock);
    setIsAdding(true);
    setAddError('');
    const result = await addItem(product, addQty);
    setIsAdding(false);

    if (!result?.ok) {
      setAddError(result?.error || 'Unable to add product to cart');
      return;
    }

    setJustAdded(true);
    setTimeout(() => {
      setJustAdded(false);
      onClose();
      openCart(true);
    }, 900);
  };

  const goToSeller = () => {
    setViewedCat(product.seller);
    navigate('/profile');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/55 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white w-full max-w-[600px] rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">

        {/* Image */}
        <div className="relative shrink-0">
          <img src={product.img} alt={product.title} loading="eager" decoding="async" className="w-full h-60 sm:h-72 object-cover" />
          <button
            onClick={onClose}
            className="absolute top-3 right-3 bg-black/40 hover:bg-black/60 text-white rounded-full p-1.5 transition-colors backdrop-blur-sm"
          >
            <X className="w-4 h-4" />
          </button>
          <span className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm text-[#4267B2] text-xs font-bold px-2.5 py-1 rounded-full">
            {CAT_EMOJI[product.category] || '🐾'} {product.category}
          </span>
          {outOfStock && product.stock === 0 && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="bg-red-500 text-white font-black text-xl px-6 py-2 rounded-full -rotate-6 shadow-lg">สินค้าหมด</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <p className="font-black text-3xl text-[#4267B2]">{product.price.toLocaleString()} ฿</p>
            <h2 className="text-lg font-bold text-gray-900 mt-1 leading-snug">{product.title}</h2>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <MapPin className="w-3.5 h-3.5" /> {product.location}
              </span>
              <StockBadge stock={availableStock < (product.stock ?? 99) ? availableStock : product.stock} />
            </div>
          </div>

          {product.desc && (
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">รายละเอียด</p>
              <p className="text-sm text-gray-700 leading-relaxed">{product.desc}</p>
            </div>
          )}

          {product.seller?.avatar && (
            <button
              onClick={goToSeller}
              className="flex items-center gap-3 p-3 bg-blue-50 hover:bg-blue-100 rounded-xl w-full text-left transition-colors border border-blue-100"
            >
              <img src={product.seller.avatar} loading="lazy" decoding="async" className="w-10 h-10 rounded-full object-cover border-2 border-white shadow" alt="" />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-gray-400 font-medium">ขายโดย</p>
                <p className="text-sm font-bold text-gray-800 truncate">{product.seller.name}</p>
              </div>
              <span className="text-xs text-[#4267B2] font-semibold shrink-0">ดูโปรไฟล์ →</span>
            </button>
          )}

          {cartItem && (
            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-2.5 flex items-center justify-between">
              <span className="text-sm text-green-700 font-semibold">
                ✓ อยู่ในถาดเหมียวแล้ว {cartItem.qty} ชิ้น
              </span>
              <button
                onClick={() => { openCart(true); onClose(); }}
                className="text-xs text-[#4267B2] font-bold hover:underline"
              >
                ดูถาด →
              </button>
            </div>
          )}
          {addError && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-red-600">
              {addError}
            </div>
          )}
        </div>

        {/* Footer */}
        {!isOwn && (
          <div className="border-t border-gray-100 p-4 flex items-center gap-3 bg-white shrink-0">
            {!outOfStock && (
              <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2.5 shrink-0">
                <button
                  onClick={() => setQty(q => Math.max(1, q - 1))}
                  className="text-gray-500 hover:text-gray-800 w-6 h-6 flex items-center justify-center"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-7 text-center font-black text-gray-800 text-sm">{qty}</span>
                <button
                  onClick={() => setQty(q => Math.min(availableStock, q + 1))}
                  className="text-gray-500 hover:text-gray-800 w-6 h-6 flex items-center justify-center"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            <button
              onClick={handleAdd}
              disabled={outOfStock || justAdded || isAdding}
              className={`flex-1 flex items-center justify-center gap-2 font-black py-3 rounded-xl transition-all text-[15px]
                ${justAdded
                  ? 'bg-green-500 text-white'
                  : outOfStock || isAdding
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-[#4267B2] hover:bg-[#3b5998] text-white active:scale-[0.98]'}`}
            >
              {justAdded ? (
                <><Check className="w-4 h-4" /> หยิบแล้ว! เปิดถาด...</>
              ) : isAdding ? (
                'Adding...'
              ) : outOfStock ? (
                'สินค้าหมดแล้ว 😿'
              ) : (
                <><PawIcon className="w-4 h-4" /> หยิบใส่ถาด · {(product.price * qty).toLocaleString()} ฿</>
              )}
            </button>
          </div>
        )}
        {isOwn && (
          <div className="border-t p-4 text-center text-sm text-gray-400 bg-gray-50 shrink-0">
            🐾 นี่คือสินค้าของคุณ
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductDetailModal;
