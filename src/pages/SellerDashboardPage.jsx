import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Store, ArrowLeft, Package } from 'lucide-react';
import { useUser } from '../context/UserContext';
import { subscribeListings, createListing, updateListing, deleteListing } from '../services/listingStore';
import Toast from '../components/Toast';
import useToast from '../hooks/useToast';

const PRODUCT_FORM_DEFAULT = {
  sku: '', slug: '', title: '', category: 'อาหารแมว',
  brand: '', species: 'cat', lifeStage: 'all',
  price: '', stock: '', status: 'active', location: '', img: '', desc: '',
};

const inputCls = (hasError) =>
  `w-full bg-gray-100 rounded-lg px-3 py-2 text-[13px] outline-none focus:ring-2 focus:ring-[#4267B2]/30 ${hasError ? 'ring-2 ring-red-300 bg-red-50' : ''}`;

const ProductFormModal = ({ product, errors, saving, onClose, onSubmit }) => {
  const [form, setForm] = useState(() => ({
    ...PRODUCT_FORM_DEFAULT, ...product,
    price: product?.price ?? '',
    stock: product?.stock ?? '',
  }));
  const set = (key) => (e) => setForm(prev => ({ ...prev, [key]: e.target.value }));

  return (
    <div className="fixed inset-0 z-[400] bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl max-h-[92vh] overflow-hidden flex flex-col">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="font-black text-gray-900 text-[18px]">{product ? 'แก้ไขสินค้า' : 'เพิ่มสินค้าใหม่'}</h2>
            <p className="text-xs text-gray-400">สินค้าจะปรากฏในตลาดนัดของ CatBook</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-sm font-semibold px-3 py-1.5 rounded-lg hover:bg-gray-100">
            ปิด
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4">
          {errors.form && <div className="bg-red-50 text-red-600 rounded-xl px-4 py-3 text-sm font-semibold">{errors.form}</div>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="text-xs font-bold text-gray-600 space-y-1">
              SKU *
              <input value={form.sku} onChange={set('sku')} className={inputCls(errors.sku)} />
              {errors.sku && <span className="block text-red-500 font-medium">{errors.sku}</span>}
            </label>
            <label className="text-xs font-bold text-gray-600 space-y-1">
              Slug (URL)
              <input value={form.slug} onChange={set('slug')} className={inputCls(false)} />
            </label>
            <label className="text-xs font-bold text-gray-600 space-y-1 md:col-span-2">
              ชื่อสินค้า *
              <input value={form.title} onChange={set('title')} className={inputCls(errors.title)} />
              {errors.title && <span className="block text-red-500 font-medium">{errors.title}</span>}
            </label>
            <label className="text-xs font-bold text-gray-600 space-y-1">
              หมวดหมู่ *
              <select value={form.category} onChange={set('category')} className={inputCls(errors.category)}>
                {['อาหารแมว','ทรายแมว','ของเล่น','คอนโดและที่นอน','ปลอกคอ','อุปกรณ์'].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              {errors.category && <span className="block text-red-500 font-medium">{errors.category}</span>}
            </label>
            <label className="text-xs font-bold text-gray-600 space-y-1">
              แบรนด์
              <input value={form.brand} onChange={set('brand')} className={inputCls(false)} />
            </label>
            <label className="text-xs font-bold text-gray-600 space-y-1">
              ราคา (฿) *
              <input type="number" min="0" value={form.price} onChange={set('price')} className={inputCls(errors.price)} />
              {errors.price && <span className="block text-red-500 font-medium">{errors.price}</span>}
            </label>
            <label className="text-xs font-bold text-gray-600 space-y-1">
              สต็อก *
              <input type="number" min="0" value={form.stock} onChange={set('stock')} className={inputCls(errors.stock)} />
              {errors.stock && <span className="block text-red-500 font-medium">{errors.stock}</span>}
            </label>
            <label className="text-xs font-bold text-gray-600 space-y-1">
              เหมาะกับ
              <select value={form.species} onChange={set('species')} className={inputCls(false)}>
                <option value="cat">แมว</option>
                <option value="dog">สุนัข</option>
                <option value="all">ทุกสัตว์</option>
              </select>
            </label>
            <label className="text-xs font-bold text-gray-600 space-y-1">
              ช่วงวัย
              <select value={form.lifeStage} onChange={set('lifeStage')} className={inputCls(false)}>
                <option value="all">ทุกช่วงวัย</option>
                <option value="kitten">ลูกแมว</option>
                <option value="adult">แมวโต</option>
                <option value="senior">แมวสูงอายุ</option>
              </select>
            </label>
            <label className="text-xs font-bold text-gray-600 space-y-1">
              สถานะ
              <select value={form.status} onChange={set('status')} className={inputCls(false)}>
                <option value="active">วางขาย</option>
                <option value="draft">ร่าง</option>
                <option value="archived">เก็บถาวร</option>
              </select>
            </label>
            <label className="text-xs font-bold text-gray-600 space-y-1">
              ที่ตั้ง
              <input value={form.location} onChange={set('location')} className={inputCls(false)} />
            </label>
            <label className="text-xs font-bold text-gray-600 space-y-1 md:col-span-2">
              URL รูปสินค้า
              <input value={form.img} onChange={set('img')} className={inputCls(false)} />
            </label>
            <label className="text-xs font-bold text-gray-600 space-y-1 md:col-span-2">
              รายละเอียด
              <textarea value={form.desc} onChange={set('desc')} rows={3} className={`${inputCls(false)} resize-none`} />
            </label>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl bg-gray-100 text-gray-600 text-sm font-bold hover:bg-gray-200">
            ยกเลิก
          </button>
          <button
            onClick={() => onSubmit(form)}
            disabled={saving}
            className="px-5 py-2 rounded-xl bg-[#4267B2] text-white text-sm font-black hover:bg-[#3b5998] disabled:bg-gray-300"
          >
            {saving ? 'กำลังบันทึก...' : 'บันทึกสินค้า'}
          </button>
        </div>
      </div>
    </div>
  );
};

const ConfirmPair = ({ onConfirm, onCancel }) => (
  <div className="flex gap-1.5">
    <button onClick={onConfirm} className="text-[12px] font-semibold px-2.5 py-1 rounded-md bg-red-500 text-white hover:bg-red-600">ยืนยัน</button>
    <button onClick={onCancel} className="text-[12px] font-semibold px-2.5 py-1 rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200">ยกเลิก</button>
  </div>
);

const Th = ({ children, center }) => (
  <th className={`px-4 py-3 text-gray-500 font-semibold text-[12px] uppercase tracking-wide ${center ? 'text-center' : 'text-left'}`}>
    {children}
  </th>
);

const SellerDashboardPage = () => {
  const navigate = useNavigate();
  const { currentUser } = useUser();
  const [toast, showToast] = useToast();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [formProduct, setFormProduct] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [formSaving, setFormSaving] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState(null);

  const isSeller = true; // all logged-in users can sell

  const loadProducts = useCallback(() => {}, []);

  useEffect(() => {
    if (!isSeller || !currentUser?.uid) return;
    setLoading(true);
    const unsub = subscribeListings((all) => {
      setProducts(all.filter(p => p.sellerUid === currentUser.uid));
      setLoading(false);
    });
    return unsub;
  }, [isSeller, currentUser?.uid]);

  const openCreate = () => { setFormProduct(null); setFormErrors({}); setIsFormOpen(true); };
  const openEdit = (p) => { setFormProduct(p); setFormErrors({}); setIsFormOpen(true); };
  const closeForm = () => { if (formSaving) return; setIsFormOpen(false); setFormProduct(null); setFormErrors({}); };

  const validateForm = (form) => {
    const errors = {};
    if (!String(form.sku || '').trim()) errors.sku = 'กรุณากรอก SKU';
    if (!String(form.title || '').trim()) errors.title = 'กรุณากรอกชื่อสินค้า';
    if (!String(form.category || '').trim()) errors.category = 'กรุณาเลือกหมวดหมู่';
    if (!Number.isFinite(Number(form.price)) || Number(form.price) <= 0) errors.price = 'ราคาต้องมากกว่า 0';
    if (!Number.isInteger(Number(form.stock)) || Number(form.stock) < 0) errors.stock = 'สต็อกต้องเป็นจำนวนเต็มบวก';
    return errors;
  };

  const saveForm = async (form) => {
    const errors = validateForm(form);
    if (Object.keys(errors).length) { setFormErrors(errors); return; }
    const payload = { ...form, price: Number(form.price), stock: Number(form.stock) };
    setFormSaving(true);
    try {
      if (formProduct) {
        await updateListing(formProduct.id, payload);
      } else {
        await createListing({
          ...payload,
          sellerUid: currentUser.uid,
          seller: {
            id: currentUser.uid,
            uid: currentUser.uid,
            name: currentUser.activeCat?.name || currentUser.name,
            avatar: currentUser.activeCat?.avatar || '',
          },
        });
      }
      showToast(formProduct ? 'อัปเดตสินค้าแล้ว' : 'เพิ่มสินค้าแล้ว');
      closeForm();
    } catch (err) {
      setFormErrors({ form: err.message || 'บันทึกสินค้าไม่สำเร็จ' });
    } finally {
      setFormSaving(false);
    }
  };

  const archiveProduct = async (id) => {
    try {
      await deleteListing(id);
      setConfirmDelete(null);
      showToast('ลบสินค้าแล้ว');
    } catch {
      showToast('ลบสินค้าไม่สำเร็จ');
    }
  };

  const adjustStock = async (id, quantity) => {
    const item = products.find(p => p.id === id);
    if (!item) return;
    const newStock = Math.max(0, (item.stock || 0) + quantity);
    try {
      await updateListing(id, { stock: newStock });
      showToast(quantity > 0 ? 'เพิ่มสต็อกแล้ว' : 'ลดสต็อกแล้ว');
    } catch {
      showToast('ปรับสต็อกไม่สำเร็จ');
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter(p => {
      if (statusFilter !== 'all' && (p.status || 'active') !== statusFilter) return false;
      if (q) {
        const hay = `${p.sku || ''} ${p.title || ''} ${p.brand || ''} ${p.category || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [products, search, statusFilter]);

  const lowStock = products.filter(p => (p.stock || 0) <= 5 && (p.status || 'active') !== 'archived');

  if (!isSeller) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-center">
        <div>
          <p className="text-5xl mb-3">🔒</p>
          <p className="font-bold text-gray-700 text-lg">สิทธิ์ไม่เพียงพอ</p>
          <p className="text-gray-400 text-sm mt-1">ต้องมีสิทธิ์ผู้ขายเพื่อเข้าถึงหน้านี้</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-w-0 p-4 lg:p-8 max-w-5xl mx-auto">
      <Toast message={toast} />
      {isFormOpen && (
        <ProductFormModal
          product={formProduct}
          errors={formErrors}
          saving={formSaving}
          onClose={closeForm}
          onSubmit={saveForm}
        />
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-gray-500 hover:text-gray-700 text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            กลับ
          </button>
          <div>
            <div className="flex items-center gap-2">
              <Store className="w-5 h-5 text-amber-600" />
              <h1 className="text-[22px] font-bold text-[#050505]">ร้านค้าของฉัน</h1>
            </div>
            <p className="text-[13px] text-gray-400">สินค้าทั้งหมด {products.length} รายการ</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadProducts}
            disabled={loading}
            className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-[13px] font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            {loading ? 'กำลังโหลด...' : 'รีเฟรช'}
          </button>
          <button
            onClick={openCreate}
            className="bg-amber-500 text-white rounded-xl px-4 py-2.5 text-[13px] font-black hover:bg-amber-600"
          >
            + เพิ่มสินค้า
          </button>
        </div>
      </div>

      {lowStock.length > 0 && (
        <div className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3">
          <p className="text-sm font-black text-red-700">สินค้าสต็อกเหลือน้อย</p>
          <p className="text-xs text-red-600 mt-0.5">
            {lowStock.map(p => `${p.title} (${p.stock || 0})`).join(', ')}
          </p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-3 mb-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="ค้นหา SKU, ชื่อสินค้า, หมวดหมู่..."
            className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-3 py-2.5 text-[13px] outline-none focus:ring-2 focus:ring-[#4267B2]/25"
          />
        </div>
        <label className="text-[11px] font-bold text-gray-500 min-w-[130px]">
          สถานะ
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="mt-1 w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-[13px] font-semibold text-gray-700 outline-none"
          >
            <option value="all">ทุกสถานะ</option>
            <option value="active">วางขาย</option>
            <option value="draft">ร่าง</option>
            <option value="archived">เก็บถาวร</option>
          </select>
        </label>
      </div>

      {products.length === 0 && !loading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
          <p className="text-5xl mb-3">📦</p>
          <p className="font-bold text-gray-700">ยังไม่มีสินค้า</p>
          <p className="text-gray-400 text-sm mt-1">กดปุ่ม "เพิ่มสินค้า" เพื่อเริ่มขายในตลาดนัด</p>
          <button
            onClick={openCreate}
            className="mt-4 bg-amber-500 text-white rounded-xl px-5 py-2.5 text-sm font-black hover:bg-amber-600"
          >
            + เพิ่มสินค้าแรก
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden overflow-x-auto">
          <table className="w-full min-w-[800px] text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <Th>สินค้า</Th>
                <Th>หมวดหมู่</Th>
                <Th>ราคา</Th>
                <Th>สต็อก</Th>
                <Th>สถานะ</Th>
                <Th>ที่ตั้ง</Th>
                <Th>จัดการ</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(item => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      {item.img ? (
                        <img src={item.img} className="w-10 h-10 rounded-lg object-cover shrink-0" alt="" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                          <Package className="w-5 h-5 text-amber-400" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-[#050505] line-clamp-1 max-w-[160px] text-[13px]">{item.title}</p>
                        <p className="text-[11px] text-gray-400">{item.sku}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-[13px]">{item.category}</td>
                  <td className="px-4 py-3 font-semibold text-[#050505] whitespace-nowrap">{item.price.toLocaleString()} ฿</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`font-bold text-[13px] ${(item.stock || 0) <= 5 ? 'text-red-500' : 'text-gray-700'}`}>
                      {(item.stock || 0).toLocaleString()}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`text-[11px] font-bold px-2 py-1 rounded-full ${
                      (item.status || 'active') === 'active' ? 'bg-green-100 text-green-700'
                        : (item.status || 'active') === 'draft' ? 'bg-gray-100 text-gray-600'
                        : 'bg-red-100 text-red-600'
                    }`}>
                      {(item.status || 'active') === 'active' ? 'วางขาย'
                        : (item.status || 'active') === 'draft' ? 'ร่าง' : 'เก็บถาวร'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 whitespace-nowrap text-[13px]">{item.location || '—'}</td>
                  <td className="px-4 py-3">
                    {confirmDelete === item.id ? (
                      <ConfirmPair onConfirm={() => archiveProduct(item.id)} onCancel={() => setConfirmDelete(null)} />
                    ) : (
                      <div className="flex gap-1.5 flex-wrap">
                        <button
                          onClick={() => openEdit(item)}
                          className="text-[12px] font-semibold px-2.5 py-1 rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100"
                        >
                          แก้ไข
                        </button>
                        <button
                          onClick={() => adjustStock(item.id, 1)}
                          className="text-[12px] font-semibold px-2.5 py-1 rounded-md bg-green-50 text-green-600 hover:bg-green-100"
                        >
                          +สต็อก
                        </button>
                        <button
                          onClick={() => adjustStock(item.id, -1)}
                          disabled={(item.stock || 0) <= 0}
                          className="text-[12px] font-semibold px-2.5 py-1 rounded-md bg-yellow-50 text-yellow-700 hover:bg-yellow-100 disabled:opacity-40"
                        >
                          -สต็อก
                        </button>
                        {(item.status || 'active') !== 'archived' && (
                          <button
                            onClick={() => setConfirmDelete(item.id)}
                            className="text-[12px] font-semibold px-2.5 py-1 rounded-md bg-red-50 text-red-500 hover:bg-red-100"
                          >
                            Archive
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className="text-center text-gray-400 py-12 text-sm">ไม่พบสินค้าตามเงื่อนไขที่ค้นหา</p>
          )}
        </div>
      )}
    </div>
  );
};

export default SellerDashboardPage;
