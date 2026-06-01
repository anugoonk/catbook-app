import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CreditCard, MapPin, Package, Truck } from 'lucide-react';
import { getOrder } from '../services/orderStore';

const ORDER_STEPS = [
  { id: 'pending', label: 'รอรับคำสั่งซื้อ' },
  { id: 'paid', label: 'ชำระเงินแล้ว' },
  { id: 'packed', label: 'เตรียมสินค้า' },
  { id: 'shipped', label: 'จัดส่งแล้ว' },
  { id: 'delivered', label: 'สำเร็จ' },
];

const STATUS_LABEL = {
  pending: 'รอดำเนินการ',
  paid: 'ชำระเงินแล้ว',
  packed: 'แพ็คสินค้าแล้ว',
  shipped: 'จัดส่งแล้ว',
  delivered: 'จัดส่งสำเร็จ',
  cancelled: 'ยกเลิกแล้ว',
};

const PAYMENT_LABEL = {
  pending: 'รอชำระเงิน',
  paid: 'ชำระเงินแล้ว',
  failed: 'ชำระเงินไม่สำเร็จ',
  refunded: 'คืนเงินแล้ว',
  pending_cod: 'เก็บเงินปลายทาง',
};

const SHIPPING_LABEL = {
  pending: 'รอจัดส่ง',
  packed: 'แพ็คสินค้าแล้ว',
  shipped: 'อยู่ระหว่างจัดส่ง',
  delivered: 'จัดส่งสำเร็จ',
  cancelled: 'ยกเลิกจัดส่ง',
};

const fmt = (date) => new Date(date).toLocaleDateString('th-TH', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const badgeCls = (kind) => {
  const map = {
    ok: 'bg-green-100 text-green-700',
    warn: 'bg-yellow-100 text-yellow-700',
    danger: 'bg-red-100 text-red-700',
    info: 'bg-blue-100 text-blue-700',
    muted: 'bg-gray-100 text-gray-600',
  };
  return `inline-flex items-center rounded-full px-2.5 py-1 text-[12px] font-bold ${map[kind] || map.muted}`;
};

const paymentKind = (status) => {
  if (status === 'paid') return 'ok';
  if (status === 'failed' || status === 'refunded') return 'danger';
  if (status === 'pending_cod') return 'info';
  return 'warn';
};

const shippingKind = (status) => {
  if (status === 'delivered') return 'ok';
  if (status === 'shipped' || status === 'packed') return 'info';
  if (status === 'cancelled') return 'danger';
  return 'warn';
};

const OrderDetailPage = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    getOrder(orderId)
      .then((detail) => {
        if (isMounted) {
          if (detail) setOrder(detail);
          else setError('ไม่พบคำสั่งซื้อ');
        }
      })
      .catch(() => {
        if (isMounted) setError('โหลดรายละเอียดคำสั่งซื้อไม่สำเร็จ');
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => { isMounted = false; };
  }, [orderId]);

  const currentStepIndex = useMemo(() => {
    if (!order || order.status === 'cancelled') return -1;
    return Math.max(0, ORDER_STEPS.findIndex(step => step.id === order.status));
  }, [order]);

  if (isLoading) {
    return (
      <div className="w-full max-w-3xl mx-auto pb-20">
        <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center text-gray-400 font-semibold">
          กำลังโหลดรายละเอียดคำสั่งซื้อ...
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="w-full max-w-3xl mx-auto pb-20">
        <button onClick={() => navigate('/orders')} className="mb-4 flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4" /> กลับไปประวัติคำสั่งซื้อ
        </button>
        <div className="bg-white border border-red-100 rounded-2xl p-10 text-center text-red-500 font-semibold">
          {error || 'ไม่พบคำสั่งซื้อ'}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto pb-20 space-y-4">
      <button onClick={() => navigate('/orders')} className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-700">
        <ArrowLeft className="w-4 h-4" /> กลับไปประวัติคำสั่งซื้อ
      </button>

      <div className="bg-white border border-gray-200 rounded-2xl p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-black text-gray-900">{order.id}</h1>
            <p className="text-xs text-gray-400 mt-1">{fmt(order.createdAt)}</p>
          </div>
          <span className={badgeCls(order.status === 'cancelled' ? 'danger' : order.status === 'delivered' ? 'ok' : 'info')}>
            {STATUS_LABEL[order.status] || order.status}
          </span>
        </div>

        {order.status === 'cancelled' ? (
          <div className="mt-5 rounded-xl bg-red-50 text-red-600 px-4 py-3 text-sm font-semibold">
            ยกเลิกคำสั่งซื้อ: {order.cancelReason || '-'}
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-5 gap-2">
            {ORDER_STEPS.map((step, index) => {
              const isDone = index <= currentStepIndex;
              return (
                <div key={step.id} className="flex flex-col items-center gap-2 text-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black ${isDone ? 'bg-[#4267B2] text-white' : 'bg-gray-100 text-gray-400'}`}>
                    {index + 1}
                  </div>
                  <p className={`text-[11px] font-semibold ${isDone ? 'text-gray-800' : 'text-gray-400'}`}>{step.label}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-white border border-gray-200 rounded-2xl p-4">
          <p className="text-xs text-gray-400 flex items-center gap-1 mb-2"><CreditCard className="w-3.5 h-3.5" /> Payment</p>
          <span className={badgeCls(paymentKind(order.paymentStatus))}>{PAYMENT_LABEL[order.paymentStatus] || order.paymentStatus}</span>
          <p className="text-xs text-gray-500 mt-2">{order.payment}</p>
          {order.paymentInstruction?.referenceNo && <p className="text-xs text-[#4267B2] font-bold mt-1">{order.paymentInstruction.referenceNo}</p>}
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-4">
          <p className="text-xs text-gray-400 flex items-center gap-1 mb-2"><Truck className="w-3.5 h-3.5" /> Shipping</p>
          <span className={badgeCls(shippingKind(order.shippingStatus))}>{SHIPPING_LABEL[order.shippingStatus] || order.shippingStatus}</span>
          <p className="text-xs text-gray-500 mt-2">Tracking: <span className="font-bold text-gray-700">{order.trackingNo || '-'}</span></p>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-4">
          <p className="text-xs text-gray-400 flex items-center gap-1 mb-2"><Package className="w-3.5 h-3.5" /> Total</p>
          <p className="text-2xl font-black text-[#4267B2]">{order.total.toLocaleString()} ฿</p>
          <p className="text-xs text-gray-400 mt-1">{order.count} ชิ้น</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 font-black text-gray-900">สินค้าในคำสั่งซื้อ</div>
        <div className="divide-y divide-gray-100">
          {order.items.map(({ product, qty, unitPrice, lineTotal }) => (
            <div key={product.id} className="px-5 py-4 flex gap-3 items-center">
              <img src={product.img} loading="lazy" decoding="async" className="w-14 h-14 rounded-xl object-cover border border-gray-200 shrink-0" alt="" />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-800 line-clamp-1">{product.title}</p>
                <p className="text-xs text-gray-400 mt-1">{qty} x {(unitPrice ?? product.price).toLocaleString()} ฿</p>
              </div>
              <p className="font-black text-gray-900">{(lineTotal ?? product.price * qty).toLocaleString()} ฿</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-5">
        <p className="text-xs text-gray-400 flex items-center gap-1 mb-2"><MapPin className="w-3.5 h-3.5" /> ที่อยู่จัดส่ง</p>
        <p className="font-bold text-gray-800">{order.address.name} · {order.address.phone}</p>
        <p className="text-sm text-gray-600 mt-1">{order.address.address}</p>
        {order.address.note && <p className="text-sm text-gray-400 mt-1">{order.address.note}</p>}
      </div>
    </div>
  );
};

export default OrderDetailPage;
