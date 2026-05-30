import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Package, MapPin, CreditCard } from 'lucide-react';
import { useOrders } from '../context/OrderContext';

const STATUS = {
  pending:   { label: 'รอยืนยัน',      color: 'bg-yellow-100 text-yellow-700',  dot: 'bg-yellow-400' },
  paid:      { label: 'ชำระเงินแล้ว', color: 'bg-green-100 text-green-700',   dot: 'bg-green-400'  },
  packed:    { label: 'เตรียมสินค้า',  color: 'bg-indigo-100 text-indigo-700', dot: 'bg-indigo-400' },
  shipped:   { label: 'กำลังจัดส่ง',   color: 'bg-blue-100 text-blue-700',     dot: 'bg-blue-400'   },
  shipping:  { label: 'กำลังจัดส่ง',   color: 'bg-blue-100 text-blue-700',     dot: 'bg-blue-400'   },
  delivered: { label: 'จัดส่งแล้ว',    color: 'bg-green-100 text-green-700',   dot: 'bg-green-500'  },
  cancelled: { label: 'ยกเลิกแล้ว',    color: 'bg-red-100 text-red-700',       dot: 'bg-red-400'    },
};

const PAYMENT_LABEL = {
  promptpay: '📱 PromptPay',
  card:      '💳 บัตรเครดิต',
  bank_transfer: '🏦 โอนผ่านธนาคาร',
  cod:       '💰 เก็บเงินปลายทาง',
};

const CAT_EMOJI = {
  'อาหารแมว': '🐟', 'ทรายแมว': '🪣', 'ของเล่น': '🎾',
  'คอนโดและที่นอน': '🏠', 'ปลอกคอ': '💜', 'อุปกรณ์': '🔧',
};

const fmt = (date) => new Date(date).toLocaleDateString('th-TH', {
  day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
});

const OrderCard = ({ order, onOpen }) => {
  const s = STATUS[order.status] ?? STATUS.pending;
  const previewItems = order.items.slice(0, 2);
  const extra = order.items.length - previewItems.length;

  return (
    <button onClick={() => onOpen(order.id)} className="w-full text-left bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:border-[#4267B2]/40 hover:shadow-md transition-all">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
        <div>
          <p className="font-black text-gray-800 text-[15px]">{order.id}</p>
          <p className="text-xs text-gray-400">{fmt(order.createdAt)}</p>
        </div>
        <span className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${s.color}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
          {s.label}
        </span>
      </div>

      {/* Items preview */}
      <div className="px-4 py-3 flex gap-2 flex-wrap">
        {previewItems.map(({ product, qty }) => (
          <div key={product.id} className="flex items-center gap-2 bg-gray-50 rounded-lg px-2.5 py-1.5">
            <img src={product.img} loading="lazy" decoding="async" className="w-8 h-8 rounded-md object-cover shrink-0" alt="" />
            <div className="min-w-0">
              <p className="text-[12px] font-semibold text-gray-700 line-clamp-1 max-w-[120px]">
                {CAT_EMOJI[product.category] || '🐾'} {product.title}
              </p>
              <p className="text-[11px] text-gray-400">×{qty}</p>
            </div>
          </div>
        ))}
        {extra > 0 && (
          <div className="flex items-center justify-center bg-gray-100 rounded-lg px-3 py-1.5 text-xs text-gray-500 font-semibold">
            +{extra} รายการ
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 grid grid-cols-3 gap-3 text-xs">
        <div>
          <p className="text-gray-400 mb-0.5 flex items-center gap-1"><MapPin className="w-3 h-3" /> จัดส่งไปที่</p>
          <p className="font-semibold text-gray-700 line-clamp-1">{order.address.name}</p>
        </div>
        <div>
          <p className="text-gray-400 mb-0.5 flex items-center gap-1"><CreditCard className="w-3 h-3" /> ชำระด้วย</p>
          <p className="font-semibold text-gray-700">{PAYMENT_LABEL[order.payment] ?? order.payment}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">{order.paymentStatus || 'pending'}</p>
        </div>
        <div className="text-right">
          <p className="text-gray-400 mb-0.5">ยอดรวม</p>
          <p className="font-black text-[#4267B2] text-[15px]">{order.total.toLocaleString()} ฿</p>
        </div>
      </div>
    </button>
  );
};

const OrdersPage = () => {
  const navigate = useNavigate();
  const { orders } = useOrders();

  return (
    <div className="w-full max-w-2xl mx-auto pb-20">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-full hover:bg-gray-200 transition-colors text-gray-600"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-black text-xl text-gray-900">ประวัติคำสั่งซื้อ</h1>
          <p className="text-xs text-gray-400">{orders.length} รายการ</p>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
          <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="font-semibold text-gray-500">ยังไม่มีคำสั่งซื้อ</p>
          <p className="text-sm text-gray-400 mt-1">ไปเลือกของให้น้องแมวก่อนนะ 🐾</p>
          <button
            onClick={() => navigate('/marketplace')}
            className="mt-4 bg-[#4267B2] text-white font-bold px-5 py-2 rounded-xl text-sm hover:bg-[#3b5998] transition-colors"
          >
            ไป Cat Shop
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map(order => <OrderCard key={order.id} order={order} onOpen={(id) => navigate(`/orders/${id}`)} />)}
        </div>
      )}
    </div>
  );
};

export default OrdersPage;
