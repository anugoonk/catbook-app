import { X, Minus, Plus, Trash2 } from 'lucide-react';
import { useCart } from '../context/CartContext';
import PawIcon from './PawIcon';

const MOODS = [
  { emoji: '😴', msg: 'ถาดยังว่างอยู่เลย...', sub: 'ไปเลือกของให้น้องแมวหน่อยสิ~' },
  { emoji: '😸', msg: 'โอ้! มีของแล้ว!',        sub: 'น้องแมวตื่นเต้นมากเลย' },
  { emoji: '😻', msg: 'เยอะขึ้นเรื่อยๆ!',       sub: 'ทาสใจดีจังเลย~' },
  { emoji: '🙀', msg: 'ว้าวว เยอะมากๆ!!',       sub: 'ของดีทั้งนั้นเลย!' },
];

const getMood = (count) => {
  if (count === 0) return MOODS[0];
  if (count <= 2)  return MOODS[1];
  if (count <= 5)  return MOODS[2];
  return MOODS[3];
};

const CAT_EMOJI = {
  'อาหารแมว':      '🐟',
  'ทรายแมว':       '🪣',
  'ของเล่น':       '🎾',
  'คอนโดและที่นอน': '🏠',
  'ปลอกคอ':        '💜',
  'อุปกรณ์':       '🔧',
};

const MeowMeter = ({ count }) => {
  const max = 8;
  const pct = Math.min(count / max, 1);
  const color = pct < 0.4 ? 'bg-green-400' : pct < 0.75 ? 'bg-yellow-400' : 'bg-red-400';
  return (
    <div className="px-4 py-2 bg-amber-50 border-b border-amber-100">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wide">เมี๊ยวมิเตอร์</span>
        <span className="text-[11px] text-amber-500">{count} / {max} ชิ้น</span>
      </div>
      <div className="h-2 bg-amber-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct * 100}%` }}
        />
      </div>
    </div>
  );
};

const CartDrawer = () => {
  const { items, removeItem, updateQty, clear, total, count, isLoading, error, isOpen, setIsOpen, setIsCheckoutOpen, isProductPending } = useCart();
  const mood = getMood(count);

  if (!isOpen) return null;

  const handleCheckout = () => {
    setIsOpen(false);
    setIsCheckoutOpen(true);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-[150] backdrop-blur-[1px]"
        onClick={() => setIsOpen(false)}
      />

      {/* Drawer */}
      <div className="fixed top-0 right-0 h-full w-full max-w-[390px] bg-white z-[160] flex flex-col shadow-2xl">

        {/* Header */}
        <div className="bg-gradient-to-r from-[#4267B2] to-[#6b8dd6] px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <PawIcon className="w-5 h-5 text-white" />
            <span className="text-white font-black text-lg tracking-wide">ถาดเหมียว</span>
            {count > 0 && (
              <span className="bg-yellow-400 text-gray-900 text-xs font-black px-2 py-0.5 rounded-full leading-none">
                {count} ชิ้น
              </span>
            )}
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="text-white/80 hover:text-white p-1.5 rounded-full hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cat mood bar */}
        <div className="bg-amber-50 border-b border-amber-100 px-4 py-3 flex items-center gap-3 shrink-0">
          <span className="text-4xl leading-none select-none">{mood.emoji}</span>
          <div>
            <p className="text-sm font-black text-gray-800">{mood.msg}</p>
            <p className="text-xs text-amber-600">{mood.sub}</p>
          </div>
        </div>

        {/* Meow Meter */}
        {count > 0 && <MeowMeter count={count} />}

        {/* Items */}
        <div className="flex-1 overflow-y-auto py-3 px-3 space-y-2">
          {error && (
            <div className="bg-red-50 border border-red-100 text-red-500 rounded-xl px-3 py-2 text-xs font-semibold">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, idx) => (
                <div key={idx} className="flex gap-3 bg-gray-50 rounded-xl p-3 animate-pulse">
                  <div className="w-[68px] h-[68px] rounded-lg bg-gray-200 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-gray-200 rounded" />
                    <div className="h-4 bg-gray-200 rounded w-20" />
                    <div className="h-6 bg-gray-200 rounded w-24" />
                  </div>
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-16 gap-3">
              <span className="text-7xl select-none">🛒</span>
              <p className="text-gray-500 font-semibold">ถาดยังว่างอยู่</p>
              <p className="text-gray-400 text-sm">ไปเลือกสินค้าให้น้องแมวกัน!</p>
            </div>
          ) : (
            items.map(({ product, qty }) => {
              const isUpdating = isProductPending(product.id);
              return (
              <div key={product.id} className="flex gap-3 bg-gray-50 hover:bg-gray-100 rounded-xl p-3 transition-colors">
                <img
                  src={product.img}
                  alt={product.title}
                  className="w-[68px] h-[68px] rounded-lg object-cover shrink-0 border border-gray-200"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-1">
                    <p className="text-[13px] font-semibold text-gray-800 line-clamp-2 leading-tight">
                      {CAT_EMOJI[product.category] || '🐾'} {product.title}
                    </p>
                    <button
                      onClick={() => removeItem(product.id)}
                      className="text-gray-300 hover:text-red-400 transition-colors shrink-0 mt-0.5 p-0.5 rounded hover:bg-red-50"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <p className="text-[#4267B2] font-black text-[15px] mt-1">
                    {(product.price * qty).toLocaleString()} ฿
                  </p>

                  {/* Qty stepper */}
                  <div className="flex items-center gap-1 mt-1.5">
                    <button
                      onClick={() => updateQty(product.id, -1)}
                      disabled={isUpdating}
                      className="w-6 h-6 rounded-full bg-gray-200 hover:bg-red-100 hover:text-red-500 flex items-center justify-center transition-colors"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-7 text-center text-sm font-black text-gray-800">{qty}</span>
                    <button
                      onClick={() => updateQty(product.id, 1)}
                      disabled={isUpdating}
                      className="w-6 h-6 rounded-full bg-gray-200 hover:bg-green-100 hover:text-green-600 flex items-center justify-center transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    <span className="text-[11px] text-gray-400 ml-1">× {product.price.toLocaleString()} ฿</span>
                  </div>
                </div>
              </div>
            );})
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-gray-100 px-4 pt-3 pb-5 bg-white shrink-0 space-y-3">
            <button
              onClick={clear}
              className="text-xs text-gray-400 hover:text-red-400 transition-colors flex items-center gap-1.5"
            >
              <Trash2 className="w-3 h-3" />
              ล้างถาดเหมียวทั้งหมด
            </button>

            {/* Summary box */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-3.5 space-y-2 border border-blue-100">
              <div className="flex justify-between text-[13px] text-gray-600">
                <span>สินค้า {count} ชิ้น ({items.length} รายการ)</span>
                <span className="font-semibold">{total.toLocaleString()} ฿</span>
              </div>
              <div className="flex justify-between text-[13px] text-gray-600">
                <span>🐱 ค่าส่งแมวเดิน</span>
                <span className="text-green-600 font-bold">ฟรี!</span>
              </div>
              <div className="border-t border-blue-100 pt-2 flex justify-between font-black text-[16px] text-gray-800">
                <span>ยอดรวม 🐟</span>
                <span className="text-[#4267B2]">{total.toLocaleString()} ฿</span>
              </div>
            </div>

            {/* Checkout */}
            <button
              onClick={handleCheckout}
              className="w-full bg-[#4267B2] hover:bg-[#3b5998] active:scale-[0.98] text-white font-black py-3.5 rounded-xl flex items-center justify-center gap-2.5 transition-all text-[15px] shadow-lg shadow-blue-200"
            >
              <span className="text-2xl">🐾</span>
              ให้ทาสจ่ายเลย!
            </button>

            <p className="text-center text-[11px] text-gray-400">
              🚚 ส่งโดยแมวเดิน · จัดส่งภายใน 3-5 วันทำการ
            </p>
          </div>
        )}
      </div>
    </>
  );
};

export default CartDrawer;
