import { useEffect, useState } from 'react';
import { X, ChevronRight, ChevronLeft, Check, Truck } from 'lucide-react';
import PawIcon from './PawIcon';
import { useCart } from '../context/CartContext';
import { useOrders } from '../context/OrderContext';
import { checkoutApi } from '../services/commerceApi';
import { trackMarketingEvent } from '../services/marketingTracking';

const STEPS = ['ตรวจสอบออเดอร์', 'ที่อยู่จัดส่ง', 'ชำระเงิน', 'สำเร็จ'];

const PAYMENTS = [
  { id: 'promptpay', label: 'PromptPay QR', icon: '📱', desc: 'สแกนจ่ายด้วยแอปธนาคาร' },
  { id: 'card',      label: 'บัตรเครดิต/เดบิต', icon: '💳', desc: 'Visa, Mastercard, JCB' },
  { id: 'bank_transfer', label: 'โอนผ่านธนาคาร', icon: '🏦', desc: 'รับเลขบัญชีและ reference สำหรับโอนเงิน' },
  { id: 'cod',       label: 'เก็บเงินปลายทาง',  icon: '💰', desc: 'ชำระเมื่อได้รับสินค้า' },
];

const CAT_EMOJI = {
  'อาหารแมว': '🐟', 'ทรายแมว': '🪣', 'ของเล่น': '🎾',
  'คอนโดและที่นอน': '🏠', 'ปลอกคอ': '💜', 'อุปกรณ์': '🔧',
};

const inputCls = (err) =>
  `w-full bg-[#f0f2f5] rounded-xl px-3 py-2.5 text-[14px] outline-none focus:ring-2 focus:ring-[#4267B2]/20 transition-all resize-none ${err ? 'ring-2 ring-red-300 bg-red-50' : ''}`;

const CheckoutModal = ({ onClose }) => {
  const { items, total, count, refreshCart } = useCart();
  const { addOrder, refreshOrders } = useOrders();
  const [step, setStep]       = useState(0);
  const [form, setForm]       = useState({ name: '', phone: '', address: '', note: '' });
  const [payment, setPayment] = useState('promptpay');
  const [errors, setErrors]   = useState({});
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderId, setOrderId] = useState('');
  const [savedTotal, setSavedTotal] = useState(total);
  const [paymentInstruction, setPaymentInstruction] = useState(null);

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));

  useEffect(() => {
    trackMarketingEvent('begin_checkout', {
      value: total,
      currency: 'THB',
      item_count: count,
      items: items.map(({ product, qty }) => ({ id: product.id, sku: product.sku || '', qty })),
    });
  }, [count, items, total]);

  const validate = () => {
    const e = {};
    if (!form.name.trim())    e.name    = 'กรุณากรอกชื่อ-นามสกุล';
    if (!form.phone.trim())   e.phone   = 'กรุณากรอกเบอร์โทร';
    if (!form.address.trim()) e.address = 'กรุณากรอกที่อยู่จัดส่ง';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = async () => {
    if (step === 1 && !validate()) return;
    if (step === 2) {
      setIsSubmitting(true);
      setSubmitError('');
      try {
        const result = await checkoutApi.placeOrder({
          shippingAddress: form,
          payment,
        });
        setSavedTotal(result.order.total);
        setOrderId(result.order.id);
        setPaymentInstruction(result.order.paymentInstruction || null);
        trackMarketingEvent('purchase', {
          transaction_id: result.order.id,
          value: result.order.total,
          currency: 'THB',
          payment_method: payment,
          item_count: result.order.count,
        });
        addOrder(result.order);
        await Promise.all([refreshCart(), refreshOrders()]);
      } catch (error) {
        setSubmitError(error.message || 'ยืนยันคำสั่งซื้อไม่สำเร็จ');
        setIsSubmitting(false);
        return;
      }
      setIsSubmitting(false);
    }
    setStep(s => s + 1);
  };

  const payLabel = PAYMENTS.find(p => p.id === payment)?.label ?? '';

  return (
    <div className="fixed inset-0 bg-black/60 z-[300] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-[500px] rounded-2xl shadow-2xl flex flex-col max-h-[92vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="font-black text-[17px] text-gray-900">Checkout 🐾</h2>
            <p className="text-xs text-gray-400">{STEPS[step]}</p>
          </div>
          {step < 3 && (
            <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 text-gray-400 transition-colors">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Step dots */}
        <div className="flex items-center px-5 pt-3 pb-2 gap-1 shrink-0">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center flex-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all
                ${i < step ? 'bg-green-500 text-white' : i === step ? 'bg-[#4267B2] text-white scale-110' : 'bg-gray-100 text-gray-400'}`}>
                {i < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`h-0.5 flex-1 mx-1 rounded transition-colors ${i < step ? 'bg-green-400' : 'bg-gray-100'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-3">

          {/* Step 0: Review */}
          {step === 0 && (
            <div className="space-y-2">
              {items.map(({ product, qty }) => (
                <div key={product.id} className="flex gap-3 bg-gray-50 rounded-xl p-3 items-center">
                  <img src={product.img} className="w-14 h-14 rounded-lg object-cover shrink-0 border border-gray-200" alt="" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-gray-800 line-clamp-1">
                      {CAT_EMOJI[product.category] || '🐾'} {product.title}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{qty} ชิ้น × {product.price.toLocaleString()} ฿</p>
                  </div>
                  <p className="font-black text-[#4267B2] text-[14px] shrink-0">{(product.price * qty).toLocaleString()} ฿</p>
                </div>
              ))}
              <div className="bg-blue-50 rounded-xl p-3 flex items-center justify-between mt-1">
                <span className="text-sm text-gray-600">{count} ชิ้น · 🐱 ค่าส่งแมวเดิน</span>
                <span className="text-green-600 font-black text-sm">ฟรี!</span>
              </div>
              <div className="flex justify-between items-center px-1 pt-1">
                <span className="font-black text-gray-800">ยอดรวม 🐟</span>
                <span className="font-black text-[#4267B2] text-xl">{total.toLocaleString()} ฿</span>
              </div>
            </div>
          )}

          {/* Step 1: Address */}
          {step === 1 && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-gray-600 mb-1.5 block">ชื่อ-นามสกุล *</label>
                <input value={form.name} onChange={set('name')} placeholder="เช่น นายแมว เหมียวดี" className={inputCls(errors.name)} />
                {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 mb-1.5 block">เบอร์โทรศัพท์ *</label>
                <input value={form.phone} onChange={set('phone')} placeholder="เช่น 081-234-5678" className={inputCls(errors.phone)} />
                {errors.phone && <p className="text-red-400 text-xs mt-1">{errors.phone}</p>}
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 mb-1.5 block">ที่อยู่จัดส่ง *</label>
                <textarea value={form.address} onChange={set('address')} rows={3}
                  placeholder="บ้านเลขที่ ซอย ถนน แขวง/ตำบล เขต/อำเภอ จังหวัด รหัสไปรษณีย์"
                  className={inputCls(errors.address)} />
                {errors.address && <p className="text-red-400 text-xs mt-1">{errors.address}</p>}
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 mb-1.5 block">หมายเหตุ (ถ้ามี)</label>
                <input value={form.note} onChange={set('note')} placeholder="เช่น ฝากหน้าบ้าน, โทรก่อนส่ง" className={inputCls(false)} />
              </div>
            </div>
          )}

          {/* Step 2: Payment */}
          {step === 2 && (
            <div className="space-y-2">
              <p className="text-sm text-gray-500 mb-3">เลือกวิธีชำระเงิน</p>
              {PAYMENTS.map(p => (
                <button key={p.id} onClick={() => setPayment(p.id)}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left
                    ${payment === p.id ? 'border-[#4267B2] bg-blue-50' : 'border-gray-100 bg-gray-50 hover:border-gray-200'}`}>
                  <span className="text-2xl leading-none">{p.icon}</span>
                  <div className="flex-1">
                    <p className={`font-bold text-[14px] ${payment === p.id ? 'text-[#4267B2]' : 'text-gray-800'}`}>{p.label}</p>
                    <p className="text-xs text-gray-500">{p.desc}</p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0
                    ${payment === p.id ? 'border-[#4267B2] bg-[#4267B2]' : 'border-gray-300'}`}>
                    {payment === p.id && <Check className="w-3 h-3 text-white" />}
                  </div>
                </button>
              ))}
              <div className="bg-amber-50 rounded-xl p-3 flex items-start gap-2 mt-2">
                <Truck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">จัดส่งโดย <strong>แมวเดิน</strong> 🐱 ภายใน 3–5 วันทำการ · ฟรีทุกออเดอร์</p>
              </div>
              {submitError && (
                <div className="bg-red-50 text-red-600 rounded-xl p-3 text-xs font-semibold">
                  {submitError}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Done */}
          {step === 3 && (
            <div className="text-center py-4 space-y-4">
              <div className="text-6xl animate-bounce">😻</div>
              <div>
                <h3 className="font-black text-xl text-gray-900">สั่งซื้อสำเร็จ!</h3>
                <p className="text-gray-500 text-sm mt-0.5">ขอบคุณที่ช้อปให้น้องแมว 🐾</p>
              </div>

              {/* PromptPay QR */}
              {paymentInstruction?.type === 'promptpay' && (
                <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
                  <p className="text-sm font-black text-blue-700 mb-2">📱 สแกน PromptPay เพื่อชำระเงิน</p>
                  <img
                    src={paymentInstruction.qrDataUrl}
                    alt="PromptPay QR Code"
                    className="w-48 h-48 mx-auto rounded-xl border-4 border-white shadow"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    ยอดชำระ <span className="font-black text-gray-800">{savedTotal.toLocaleString()} ฿</span>
                  </p>
                  <p className="text-xs text-gray-400">
                    เบอร์ PromptPay: {paymentInstruction.promptpayNumber}
                  </p>
                  <p className="text-[11px] text-amber-600 mt-1 font-medium">
                    QR หมดอายุใน 15 นาที · Ref: {paymentInstruction.referenceNo}
                  </p>
                </div>
              )}

              {/* Bank Transfer */}
              {paymentInstruction?.type === 'bank_transfer' && (
                <div className="bg-green-50 rounded-2xl p-4 border border-green-100 text-left space-y-1.5">
                  <p className="text-sm font-black text-green-700 mb-2">🏦 ข้อมูลสำหรับโอนเงิน</p>
                  {[
                    ['ธนาคาร', paymentInstruction.bankName],
                    ['เลขบัญชี', paymentInstruction.accountNo],
                    ['ชื่อบัญชี', paymentInstruction.accountName],
                    ['ยอดโอน', `${savedTotal.toLocaleString()} ฿`],
                    ['Ref', paymentInstruction.referenceNo],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between text-sm">
                      <span className="text-gray-500">{label}</span>
                      <span className="font-semibold text-gray-800 text-right">{value}</span>
                    </div>
                  ))}
                  <p className="text-[11px] text-amber-600 mt-1 font-medium">
                    กรุณาใส่ Ref ในช่องหมายเหตุการโอน
                  </p>
                </div>
              )}

              {/* COD / Card */}
              {(!paymentInstruction || paymentInstruction.type === 'cod' || paymentInstruction.type === 'card') && (
                <div className="bg-gray-50 rounded-2xl p-3 text-sm text-gray-600 border border-gray-100">
                  ชำระด้วย <span className="font-semibold">{payLabel}</span>
                </div>
              )}

              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-4 text-left space-y-2 border border-blue-100">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">หมายเลขออเดอร์</span>
                  <span className="font-black text-[#4267B2] text-xs">{orderId}</span>
                </div>
                <div className="flex justify-between text-sm gap-4">
                  <span className="text-gray-500 shrink-0">ที่อยู่จัดส่ง</span>
                  <span className="font-medium text-gray-700 text-right text-xs">{form.address}</span>
                </div>
              </div>
              <p className="text-xs text-gray-400">🚚 คาดว่าจะได้รับสินค้าภายใน 3–5 วันทำการ</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 p-4 flex gap-3 shrink-0">
          {step > 0 && step < 3 && (
            <button onClick={() => setStep(s => s - 1)}
              className="flex items-center gap-1 text-gray-500 hover:text-gray-700 font-semibold px-4 py-2.5 rounded-xl hover:bg-gray-100 transition-colors text-sm">
              <ChevronLeft className="w-4 h-4" /> ย้อนกลับ
            </button>
          )}
          {step < 3 ? (
            <button onClick={next}
              disabled={isSubmitting || (step === 0 && items.length === 0)}
              className="flex-1 flex items-center justify-center gap-2 bg-[#4267B2] hover:bg-[#3b5998] disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-black py-3 rounded-xl transition-colors">
              {step === 2
                ? <><PawIcon className="w-4 h-4" /> {isSubmitting ? 'กำลังยืนยัน...' : 'ยืนยันสั่งซื้อ'}</>
                : <>ถัดไป <ChevronRight className="w-4 h-4" /></>}
            </button>
          ) : (
            <button onClick={onClose}
              className="flex-1 flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-black py-3 rounded-xl transition-colors">
              <Check className="w-4 h-4" /> เสร็จสิ้น
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CheckoutModal;
