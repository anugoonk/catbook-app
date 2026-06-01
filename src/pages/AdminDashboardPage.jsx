import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart2, Users, FileText, Store, Shield, ArrowLeft,
  Crown, Search, AlertTriangle, Package,
} from 'lucide-react';
import { useUser } from '../context/UserContext';
import { subscribeAllOrders, updateOrder as updateOrderFirebase, cancelOrder as cancelOrderFirebase } from '../services/orderStore';
import { subscribeLostCats, updateLostCatStatus, deleteLostCat } from '../services/lostCatStore';
import { getAllUsers, setUserRole, setUserStatus, deleteUserDoc } from '../services/userStore';
import { db } from '../firebase';
import { collection, getDocs, updateDoc, deleteDoc, doc, orderBy, query } from 'firebase/firestore';
import { deletePost as deletePostFirestore } from '../services/postStore';
import { deleteListing, updateListing, createListing } from '../services/listingStore';
import Toast from '../components/Toast';
import useToast from '../hooks/useToast';

const MENU = [
  { id: 'overview',    label: 'ภาพรวมสถิติ',  icon: BarChart2 },
  { id: 'users',       label: 'จัดการสมาชิก',  icon: Users },
  { id: 'posts',       label: 'จัดการโพสต์',   icon: FileText },
  { id: 'marketplace', label: 'ตลาดนัด',        icon: Store },
  { id: 'lostcats',   label: 'แมวหาย',          icon: AlertTriangle },
  { id: 'orders',     label: 'คำสั่งซื้อ',      icon: Package },
];

const PAYMENT_LABEL = { promptpay: 'PromptPay 📱', card: 'บัตรเครดิต 💳', cod: 'เก็บเงินปลายทาง 💰' };
const STATUS_BADGE  = {
  pending:   'bg-yellow-100 text-yellow-700',
  paid:      'bg-green-100 text-green-700',
  packed:    'bg-indigo-100 text-indigo-700',
  shipped:   'bg-blue-100 text-blue-700',
  shipping:  'bg-blue-100 text-blue-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};
const STATUS_LABEL  = { pending: 'รอยืนยัน', paid: 'ชำระแล้ว', packed: 'แพ็คสินค้าแล้ว', shipped: 'จัดส่งแล้ว', shipping: 'กำลังจัดส่ง', delivered: 'ส่งแล้ว', cancelled: 'ยกเลิก' };
const ORDER_STATUSES = ['pending', 'paid', 'packed', 'shipped', 'delivered', 'cancelled'];
const PAYMENT_STATUSES = ['pending', 'paid', 'failed', 'refunded', 'pending_cod'];
const SHIPPING_STATUSES = ['pending', 'packed', 'shipped', 'delivered', 'cancelled'];
const ALL_FILTER = 'all';


/* ── small shared components ── */
const Th = ({ children, center }) => (
  <th className={`px-4 py-3 text-gray-500 font-semibold text-[12px] uppercase tracking-wide ${center ? 'text-center' : 'text-left'}`}>
    {children}
  </th>
);

const SearchBar = ({ value, onChange, placeholder }) => (
  <div className="relative mb-4">
    <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full max-w-sm bg-gray-100 rounded-lg pl-9 pr-4 py-2 text-[14px] outline-none focus:ring-2 focus:ring-[#4267B2]/30 transition"
    />
  </div>
);

const FilterSelect = ({ value, onChange, label, options }) => (
  <label className="min-w-[150px] flex-1 sm:flex-none text-[11px] font-bold text-gray-500">
    {label}
    <select
      value={value}
      onChange={event => onChange(event.target.value)}
      className="mt-1 w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-[13px] font-semibold text-gray-700 outline-none focus:ring-2 focus:ring-[#4267B2]/25"
    >
      {options.map(option => (
        <option key={option.value} value={option.value}>{option.label}</option>
      ))}
    </select>
  </label>
);

const StatCard = ({ emoji, value, label, bg }) => (
  <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 ${bg}`}>
      {emoji}
    </div>
    <div>
      <p className="text-[28px] font-bold text-[#050505] leading-none">{value}</p>
      <p className="text-[13px] text-gray-400 mt-1">{label}</p>
    </div>
  </div>
);

const ConfirmPair = ({ onConfirm, onCancel }) => (
  <div className="flex gap-1.5">
    <button onClick={onConfirm} className="text-[12px] font-semibold px-2.5 py-1 rounded-md bg-red-500 text-white hover:bg-red-600 transition-colors">ยืนยัน</button>
    <button onClick={onCancel}  className="text-[12px] font-semibold px-2.5 py-1 rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">ยกเลิก</button>
  </div>
);

/* ── main component ── */
const PRODUCT_FORM_DEFAULT = {
  sku: '',
  slug: '',
  title: '',
  category: 'อาหารแมว',
  brand: '',
  species: 'cat',
  lifeStage: 'all',
  price: '',
  stock: '',
  status: 'active',
  location: '',
  img: '',
  desc: '',
};

const productFormInputCls = (hasError) =>
  `w-full bg-gray-100 rounded-lg px-3 py-2 text-[13px] outline-none focus:ring-2 focus:ring-[#4267B2]/30 ${hasError ? 'ring-2 ring-red-300 bg-red-50' : ''}`;

const ProductFormModal = ({ product, errors, saving, onClose, onSubmit }) => {
  const [form, setForm] = useState(() => ({
    ...PRODUCT_FORM_DEFAULT,
    ...product,
    price: product?.price ?? '',
    stock: product?.stock ?? '',
  }));

  const set = (key) => (event) => setForm(prev => ({ ...prev, [key]: event.target.value }));

  return (
    <div className="fixed inset-0 z-[400] bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl max-h-[92vh] overflow-hidden flex flex-col">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="font-black text-gray-900 text-[18px]">{product ? 'Edit Product' : 'Add Product'}</h2>
            <p className="text-xs text-gray-400">Product data is saved through Admin Product API</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-sm font-semibold px-3 py-1.5 rounded-lg hover:bg-gray-100">
            Close
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4">
          {errors.form && <div className="bg-red-50 text-red-600 rounded-xl px-4 py-3 text-sm font-semibold">{errors.form}</div>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="text-xs font-bold text-gray-600 space-y-1">
              SKU *
              <input value={form.sku} onChange={set('sku')} className={productFormInputCls(errors.sku)} />
              {errors.sku && <span className="block text-red-500 font-medium">{errors.sku}</span>}
            </label>
            <label className="text-xs font-bold text-gray-600 space-y-1">
              Slug
              <input value={form.slug} onChange={set('slug')} className={productFormInputCls(false)} />
            </label>
            <label className="text-xs font-bold text-gray-600 space-y-1 md:col-span-2">
              Product name *
              <input value={form.title} onChange={set('title')} className={productFormInputCls(errors.title)} />
              {errors.title && <span className="block text-red-500 font-medium">{errors.title}</span>}
            </label>
            <label className="text-xs font-bold text-gray-600 space-y-1">
              Category *
              <input value={form.category} onChange={set('category')} className={productFormInputCls(errors.category)} />
              {errors.category && <span className="block text-red-500 font-medium">{errors.category}</span>}
            </label>
            <label className="text-xs font-bold text-gray-600 space-y-1">
              Brand
              <input value={form.brand} onChange={set('brand')} className={productFormInputCls(false)} />
            </label>
            <label className="text-xs font-bold text-gray-600 space-y-1">
              Price *
              <input type="number" min="0" value={form.price} onChange={set('price')} className={productFormInputCls(errors.price)} />
              {errors.price && <span className="block text-red-500 font-medium">{errors.price}</span>}
            </label>
            <label className="text-xs font-bold text-gray-600 space-y-1">
              Stock *
              <input type="number" min="0" value={form.stock} onChange={set('stock')} className={productFormInputCls(errors.stock)} />
              {errors.stock && <span className="block text-red-500 font-medium">{errors.stock}</span>}
            </label>
            <label className="text-xs font-bold text-gray-600 space-y-1">
              Species
              <select value={form.species} onChange={set('species')} className={productFormInputCls(false)}>
                <option value="cat">cat</option>
                <option value="dog">dog</option>
                <option value="all">all</option>
              </select>
            </label>
            <label className="text-xs font-bold text-gray-600 space-y-1">
              Life stage
              <select value={form.lifeStage} onChange={set('lifeStage')} className={productFormInputCls(false)}>
                <option value="all">all</option>
                <option value="kitten">kitten</option>
                <option value="adult">adult</option>
                <option value="senior">senior</option>
              </select>
            </label>
            <label className="text-xs font-bold text-gray-600 space-y-1">
              Status
              <select value={form.status} onChange={set('status')} className={productFormInputCls(false)}>
                <option value="active">active</option>
                <option value="draft">draft</option>
                <option value="archived">archived</option>
              </select>
            </label>
            <label className="text-xs font-bold text-gray-600 space-y-1">
              Location
              <input value={form.location} onChange={set('location')} className={productFormInputCls(false)} />
            </label>
            <label className="text-xs font-bold text-gray-600 space-y-1 md:col-span-2">
              Image URL
              <input value={form.img} onChange={set('img')} className={productFormInputCls(false)} />
            </label>
            <label className="text-xs font-bold text-gray-600 space-y-1 md:col-span-2">
              Description
              <textarea value={form.desc} onChange={set('desc')} rows={3} className={`${productFormInputCls(false)} resize-none`} />
            </label>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl bg-gray-100 text-gray-600 text-sm font-bold hover:bg-gray-200">
            Cancel
          </button>
          <button
            onClick={() => onSubmit(form)}
            disabled={saving}
            className="px-5 py-2 rounded-xl bg-[#4267B2] text-white text-sm font-black hover:bg-[#3b5998] disabled:bg-gray-300"
          >
            {saving ? 'Saving...' : 'Save Product'}
          </button>
        </div>
      </div>
    </div>
  );
};

const AdminDashboardPage = () => {
  const navigate = useNavigate();
  const { currentUser } = useUser();
  const [orders, setOrders] = useState([]);
  const [tab, setTab] = useState('overview');
  const [toast, showToast] = useToast();

  /* users */
  const [users, setUsers]         = useState([]);
  const [userSearch, setUserSearch] = useState('');

  /* posts */
  const [posts, setPosts]     = useState([]);
  const [postSearch, setPostSearch] = useState('');

  /* marketplace */
  const [market, setMarket]     = useState([]);
  const [marketCat, setMarketCat] = useState(ALL_FILTER);
  const [marketSearch, setMarketSearch] = useState('');
  const [marketStatus, setMarketStatus] = useState(ALL_FILTER);
  const [marketStock, setMarketStock] = useState(ALL_FILTER);
  const [marketLoading, setMarketLoading] = useState(false);
  const [marketError, setMarketError] = useState('');
  const [productFormProduct, setProductFormProduct] = useState(null);
  const [isProductFormOpen, setIsProductFormOpen] = useState(false);
  const [productFormErrors, setProductFormErrors] = useState({});
  const [productFormSaving, setProductFormSaving] = useState(false);
  const [trackingDrafts, setTrackingDrafts] = useState({});
  const [cancelDrafts, setCancelDrafts] = useState({});
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatus, setOrderStatus] = useState(ALL_FILTER);
  const [orderPayment, setOrderPayment] = useState(ALL_FILTER);
  const [orderShipping, setOrderShipping] = useState(ALL_FILTER);

  /* lost cats */
  const [lostCats, setLostCats] = useState([]);
  const [lcSearch, setLcSearch] = useState('');
  const [lcStatus, setLcStatus] = useState('all');
  /* activity */
  const [activities, setActivities] = useState([]);

  /* 2-click delete confirm: { type, id } */
  const [confirmDelete, setConfirmDelete] = useState(null);
  const isDeleting = (type, id) => confirmDelete?.type === type && confirmDelete?.id === id;

  const isSelf = (user) => user.id === currentUser.uid;

  const loadMarket = useCallback(async () => {
    setMarketLoading(true);
    try {
      const snap = await getDocs(collection(db, 'listings'));
      setMarket(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setMarketError('');
    } catch {
      setMarketError('โหลดสินค้าไม่สำเร็จ');
    } finally {
      setMarketLoading(false);
    }
  }, []);

  const loadOrders = useCallback(() => {}, []);

  const loadUsers = useCallback(async () => {
    try {
      const data = await getAllUsers();
      setUsers(data);
    } catch {
      showToast('โหลดข้อมูลสมาชิกไม่สำเร็จ');
    }
  }, [showToast]);

  const loadPosts = useCallback(async () => {
    try {
      const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      const data = snap.docs.map(d => {
        const p = d.data();
        return {
          id: d.id,
          content: p.content || '',
          feeling: p.feeling || null,
          image: p.imageUrl || null,
          cat: { name: p.authorName || '—', avatar: p.authorAvatar || '' },
          time: p.createdAt?.toDate ? p.createdAt.toDate().toLocaleString('th-TH') : '—',
          likeCount: p.likeCount || 0,
          commentCount: p.commentCount || 0,
          hidden: p.hidden || false,
        };
      });
      setPosts(data);
    } catch {
      showToast('โหลดโพสต์ไม่สำเร็จ');
    }
  }, [showToast]);

  const loadLostCats = useCallback(() => {}, []);

  const loadActivity = useCallback(async () => {
    // activity log ยังไม่ได้ migrate — skip
  }, []);

  useEffect(() => {
    if (!currentUser?.isAdmin) return;
    loadMarket();
    loadUsers();
    loadPosts();
    loadActivity();
    const unsubOrders = subscribeAllOrders(setOrders);
    const unsubLostCats = subscribeLostCats(setLostCats);
    return () => { unsubOrders(); unsubLostCats(); };
  }, [currentUser?.isAdmin, loadMarket, loadUsers, loadPosts, loadActivity]);

  useEffect(() => {
    setTrackingDrafts(prev => Object.fromEntries(orders.map(order => [order.id, prev[order.id] ?? order.trackingNo ?? ''])));
  }, [orders]);

  /* ── action handlers ── */
  const toggleBan = async (userId) => {
    const target = users.find(u => u.id === userId);
    if (!target) return;
    const next = target.status === 'banned' ? 'active' : 'banned';
    try {
      await setUserStatus(userId, next);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: next } : u));
      showToast(next === 'banned' ? 'ระงับสมาชิกแล้ว' : 'ปลดระงับสมาชิกแล้ว');
    } catch {
      showToast('ดำเนินการไม่สำเร็จ');
    }
  };
  const ROLE_CYCLE = { USER: 'SELLER', SELLER: 'ADMIN', ADMIN: 'USER' };
  const ROLE_LABEL_TH = { USER: 'สมาชิก', SELLER: 'ผู้ขาย', ADMIN: 'Admin' };

  const toggleRole = async (userId) => {
    const target = users.find(u => u.id === userId);
    if (!target) return;
    const next = ROLE_CYCLE[target.role] || 'USER';
    try {
      await setUserRole(userId, next);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: next, isAdmin: next === 'ADMIN' } : u));
      showToast(`เปลี่ยนสิทธิ์เป็น ${ROLE_LABEL_TH[next]} แล้ว`);
    } catch {
      showToast('เปลี่ยนสิทธิ์ไม่สำเร็จ');
    }
  };
  const deleteUser = async (id) => {
    try {
      await deleteUserDoc(id);
      setUsers(prev => prev.filter(u => u.id !== id));
      setConfirmDelete(null);
      showToast('ลบสมาชิกเรียบร้อยแล้ว');
    } catch {
      showToast('ลบสมาชิกไม่สำเร็จ');
    }
  };
  const toggleHidePost = async (id) => {
    const post = posts.find(p => p.id === id);
    if (!post) return;
    const next = !post.hidden;
    try {
      await updateDoc(doc(db, 'posts', id), { hidden: next });
      setPosts(prev => prev.map(p => p.id === id ? { ...p, hidden: next } : p));
      showToast(next ? 'ซ่อนโพสต์แล้ว' : 'แสดงโพสต์แล้ว');
    } catch {
      showToast('ดำเนินการไม่สำเร็จ');
    }
  };
  const deletePost = async (id) => {
    try {
      await deletePostFirestore(id);
      setPosts(prev => prev.filter(p => p.id !== id));
      setConfirmDelete(null);
      showToast('ลบโพสต์เรียบร้อยแล้ว');
    } catch {
      showToast('ลบโพสต์ไม่สำเร็จ');
    }
  };
  const deleteMarket = async (id) => {
    try {
      await deleteListing(id);
      setMarket(p => p.filter(x => x.id !== id));
      setConfirmDelete(null);
      showToast('ลบสินค้าเรียบร้อยแล้ว');
    } catch {
      showToast('ลบสินค้าไม่สำเร็จ');
    }
  };
  const adjustMarketStock = async (id, quantity) => {
    const item = market.find(x => x.id === id);
    if (!item) return;
    const newStock = Math.max(0, (item.stock || 0) + quantity);
    try {
      await updateListing(id, { stock: newStock });
      setMarket(p => p.map(x => x.id === id ? { ...x, stock: newStock } : x));
      showToast(quantity > 0 ? 'เพิ่มสต็อกแล้ว' : 'ลดสต็อกแล้ว');
    } catch {
      showToast('ปรับสต็อกไม่สำเร็จ');
    }
  };
  const openCreateProduct = () => {
    setProductFormProduct(null);
    setProductFormErrors({});
    setIsProductFormOpen(true);
  };
  const openEditProduct = (product) => {
    setProductFormProduct(product);
    setProductFormErrors({});
    setIsProductFormOpen(true);
  };
  const closeProductForm = () => {
    if (productFormSaving) return;
    setIsProductFormOpen(false);
    setProductFormProduct(null);
    setProductFormErrors({});
  };
  const validateProductForm = (form) => {
    const errors = {};
    if (!String(form.sku || '').trim()) errors.sku = 'SKU is required';
    if (!String(form.title || '').trim()) errors.title = 'Product name is required';
    if (!String(form.category || '').trim()) errors.category = 'Category is required';
    if (!Number.isFinite(Number(form.price)) || Number(form.price) <= 0) errors.price = 'Price must be greater than 0';
    if (!Number.isInteger(Number(form.stock)) || Number(form.stock) < 0) errors.stock = 'Stock must be a non-negative integer';
    return errors;
  };
  const saveProductForm = async (form) => {
    const errors = validateProductForm(form);
    if (Object.keys(errors).length) {
      setProductFormErrors(errors);
      return;
    }

    const payload = {
      ...form,
      price: Number(form.price),
      stock: Number(form.stock),
      seller: productFormProduct?.seller || currentUser?.activeCat || null,
    };

    setProductFormSaving(true);
    try {
      if (productFormProduct) await updateListing(productFormProduct.id, payload);
      else await createListing({ ...payload, sellerUid: currentUser.uid });
      await loadMarket();
      showToast(productFormProduct ? 'อัปเดตสินค้าแล้ว' : 'เพิ่มสินค้าแล้ว');
      setIsProductFormOpen(false);
      setProductFormProduct(null);
      setProductFormErrors({});
    } catch (error) {
      setProductFormErrors({ form: error.message || 'Save product failed' });
    } finally {
      setProductFormSaving(false);
    }
  };
  const updateOrder = async (orderId, payload) => {
    try {
      await updateOrderFirebase(orderId, payload);
      return { id: orderId, ...payload };
    } catch {
      return null;
    }
  };

  const cancelOrder = async (orderId, reason) => {
    try {
      await cancelOrderFirebase(orderId, reason);
      return { id: orderId, status: 'cancelled', cancelReason: reason };
    } catch {
      return null;
    }
  };

  const markPaymentPaid = (orderId) => updateOrder(orderId, { paymentStatus: 'paid' });
  const markPaymentFailed = (orderId) => updateOrder(orderId, { paymentStatus: 'failed' });
  const refundPayment = (orderId) => updateOrder(orderId, { paymentStatus: 'refunded' });

  const updateOrderField = async (orderId, payload, successMessage = 'อัปเดตคำสั่งซื้อแล้ว') => {
    const updated = await updateOrder(orderId, payload);
    showToast(updated ? successMessage : 'อัปเดตคำสั่งซื้อไม่สำเร็จ');
  };
  const saveTrackingNo = async (orderId) => {
    await updateOrderField(orderId, { trackingNo: trackingDrafts[orderId] || '' }, 'บันทึก tracking number แล้ว');
  };
  const submitCancelOrder = async (orderId) => {
    const reason = String(cancelDrafts[orderId] || '').trim();
    if (!reason) {
      showToast('กรุณาระบุเหตุผลการยกเลิก');
      return;
    }
    const updated = await cancelOrder(orderId, reason);
    showToast(updated ? 'ยกเลิกคำสั่งซื้อแล้ว' : 'ยกเลิกคำสั่งซื้อไม่สำเร็จ');
  };
  const runPaymentAction = async (action, orderId, message) => {
    const updated = await action(orderId, { gatewayRef: `MANUAL-${Date.now()}` });
    showToast(updated ? message : 'อัปเดต payment ไม่สำเร็จ');
  };
  const markFound = async (id, currentStatus) => {
    const nextStatus = currentStatus === 'found' ? 'active' : 'found';
    try {
      await updateLostCatStatus(id, nextStatus);
      showToast(nextStatus === 'found' ? '✅ บันทึกว่าพบแล้ว' : '🔄 เปลี่ยนเป็นยังหายอยู่');
    } catch { showToast('อัปเดตสถานะไม่สำเร็จ'); }
  };

  const deleteLost = async (id) => {
    try {
      await deleteLostCat(id);
      setConfirmDelete(null);
      showToast('ลบประกาศเรียบร้อยแล้ว');
    } catch {
      showToast('ลบประกาศไม่สำเร็จ');
    }
  };

  /* ── derived data ── */
  const filteredUsers  = users.filter(u => {
    const q = userSearch.toLowerCase();
    return (
      (u.activeCat?.name || '').toLowerCase().includes(q) ||
      (u.name || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q)
    );
  });
  const filteredPosts  = posts.filter(p => {
    const q = postSearch.toLowerCase();
    return !q || (p.content || '').toLowerCase().includes(q) || (p.cat?.name || '').toLowerCase().includes(q);
  });
  const marketCats = useMemo(() => [
    { value: ALL_FILTER, label: 'All categories' },
    ...[...new Set(market.map(m => m.category).filter(Boolean))]
      .map(category => ({ value: category, label: category })),
  ], [market]);
  const lowStockProducts = useMemo(
    () => market.filter(product => Number(product.stock || 0) <= 5 && (product.status || 'active') !== 'archived'),
    [market]
  );
  const filteredMarket = useMemo(() => {
    const q = marketSearch.trim().toLowerCase();
    return market.filter(product => {
      const status = product.status || 'active';
      if (marketCat !== ALL_FILTER && product.category !== marketCat) return false;
      if (marketStatus !== ALL_FILTER && status !== marketStatus) return false;
      if (marketStock === 'low' && (Number(product.stock || 0) > 5 || status === 'archived')) return false;
      if (marketStock === 'out' && Number(product.stock || 0) !== 0) return false;
      if (q) {
        const haystack = `${product.sku || ''} ${product.title || ''} ${product.brand || ''} ${product.category || ''} ${product.location || ''}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [market, marketCat, marketSearch, marketStatus, marketStock]);
  const filteredOrders = useMemo(() => {
    const q = orderSearch.trim().toLowerCase();
    return orders.filter(order => {
      if (orderStatus !== ALL_FILTER && order.status !== orderStatus) return false;
      if (orderPayment !== ALL_FILTER && (order.paymentStatus || 'pending') !== orderPayment) return false;
      if (orderShipping !== ALL_FILTER && (order.shippingStatus || 'pending') !== orderShipping) return false;
      if (q) {
        const haystack = [
          order.id,
          order.trackingNo,
          order.customer?.name,
          order.customer?.email,
          order.address?.name,
          order.address?.phone,
          order.items?.map(({ product }) => `${product?.sku || ''} ${product?.title || ''}`).join(' '),
        ].join(' ').toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [orderPayment, orderSearch, orderShipping, orderStatus, orders]);
  const totalRevenue   = market.reduce((s, m) => s + (m.price * (m.stock || 0)), 0);
  const lcActiveCount  = lostCats.filter(c => c.status === 'active').length;
  const lcFoundCount   = lostCats.filter(c => c.status === 'found').length;
  const filteredLC     = useMemo(() => lostCats.filter(c => {
    if (lcStatus !== 'all' && c.status !== lcStatus) return false;
    if (lcSearch) {
      const q = lcSearch.toLowerCase();
      return c.name.toLowerCase().includes(q) || c.location.toLowerCase().includes(q);
    }
    return true;
  }), [lostCats, lcStatus, lcSearch]);

  const chartData = posts.map(p => ({ name: p.cat?.name || '—', avatar: p.cat?.avatar || '', likes: p.likeCount || 0 }));
  const maxLikes  = Math.max(1, ...chartData.map(d => d.likes));

  /* ── render ── */
  return (
    <div className="flex flex-col lg:flex-row min-h-[calc(100vh-56px)] bg-gray-50">
      <Toast message={toast} />
      {isProductFormOpen && (
        <ProductFormModal
          product={productFormProduct}
          errors={productFormErrors}
          saving={productFormSaving}
          onClose={closeProductForm}
          onSubmit={saveProductForm}
        />
      )}

      {/* Sidebar */}
      <div className="w-full lg:w-60 shrink-0 bg-white border-b lg:border-b-0 lg:border-r border-gray-200 lg:sticky lg:top-[56px] lg:h-[calc(100vh-56px)] flex flex-col z-20">
        <div className="hidden lg:block px-5 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2 mb-0.5">
            <Shield className="w-4 h-4 text-[#4267B2]" />
            <span className="font-bold text-[#050505] text-[15px]">Admin Panel</span>
          </div>
          <p className="text-[11px] text-gray-400">ระบบจัดการหลังบ้าน</p>
        </div>

        <nav className="flex lg:flex-1 gap-2 lg:gap-0 overflow-x-auto lg:overflow-visible p-3 lg:block lg:space-y-0.5">
          {MENU.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`shrink-0 lg:w-full flex items-center gap-2 lg:gap-3 px-3 py-2.5 rounded-lg text-[13px] lg:text-[14px] font-medium transition-colors text-left
                ${tab === id ? 'bg-[#4267B2] text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="flex-1">{label}</span>
              {id === 'lostcats' && lostCats.length > 0 && (
                <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${tab === id ? 'bg-white/20 text-white' : 'bg-red-100 text-red-600'}`}>
                  {lostCats.length}
                </span>
              )}
              {id === 'orders' && orders.filter(o => o.status === 'pending').length > 0 && (
                <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${tab === id ? 'bg-white/20 text-white' : 'bg-yellow-100 text-yellow-700'}`}>
                  {orders.filter(o => o.status === 'pending').length}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="hidden lg:block p-3 border-t border-gray-200">
          <button
            onClick={() => navigate('/')}
            className="w-full flex items-center justify-center gap-2 text-[13px] text-gray-500 hover:text-gray-700 py-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            กลับสู่ CatBook
          </button>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 min-w-0 p-4 lg:p-8 overflow-y-auto">

        {/* ─── Overview ─── */}
        {tab === 'overview' && (
          <div>
            <h1 className="text-[22px] font-bold text-[#050505] mb-6">Admin overview</h1>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <StatCard emoji="👥" value={users.length}    label="สมาชิกทั้งหมด"        bg="bg-blue-50" />
              <StatCard emoji="📝" value={posts.length}    label="โพสต์ทั้งหมด"          bg="bg-green-50" />
              <StatCard emoji="📦" value={market.length}   label="สินค้าในตลาดนัด"       bg="bg-orange-50" />
              <StatCard emoji="📢" value={lostCats.length} label="ประกาศแมวหาย"          bg="bg-red-50" />
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <StatCard emoji="📋" value={orders.length}   label="คำสั่งซื้อทั้งหมด"    bg="bg-purple-50" />
              <StatCard emoji="⏳" value={orders.filter(o => o.status === 'pending').length}  label="รอยืนยัน" bg="bg-yellow-50" />
              <StatCard emoji="🚚" value={orders.filter(o => o.status === 'shipped').length} label="กำลังจัดส่ง" bg="bg-blue-50" />
              <StatCard emoji="💰" value={`${orders.reduce((s,o)=>s+o.total,0).toLocaleString()}฿`} label="ยอดขายรวม" bg="bg-green-50" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Bar chart */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="font-bold text-[#050505] text-[15px] mb-4">ยอดคลิกต่อโพสต์</h3>
                <div className="space-y-3">
                  {chartData.map((d, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <img src={d.avatar} className="w-6 h-6 rounded-full object-cover shrink-0" alt="" />
                      <span className="text-[13px] text-gray-600 w-16 truncate shrink-0">{d.name}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
                        <div
                          className="h-full bg-[#4267B2] rounded-full"
                          style={{ width: `${(d.likes / maxLikes) * 100}%` }}
                        />
                      </div>
                      <span className="text-[12px] font-semibold text-gray-500 w-8 text-right shrink-0">{d.likes}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Activity */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="font-bold text-[#050505] text-[15px] mb-4">กิจกรรมล่าสุด</h3>
                <div className="space-y-3">
                  {activities.map((a, i) => (
                    <div key={i} className="flex items-center gap-2.5">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${a.dot}`} />
                      <span className="text-[14px] text-gray-600 flex-1">{a.text}</span>
                      <span className="text-[11px] text-gray-400 whitespace-nowrap shrink-0">{a.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick links */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-bold text-[#050505] text-[15px] mb-3">ไปยังหน้าจัดการ</h3>
              <div className="flex gap-3 flex-wrap">
                {MENU.filter(m => m.id !== 'overview').map(m => (
                  <button
                    key={m.id}
                    onClick={() => setTab(m.id)}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-[#ebf5ff] text-gray-600 hover:text-[#4267B2] rounded-lg text-[14px] font-medium transition-colors border border-gray-200 hover:border-[#4267B2]/30"
                  >
                    <m.icon className="w-4 h-4" />
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─── Users ─── */}
        {tab === 'users' && (
          <div>
            <h1 className="text-[22px] font-bold text-[#050505] mb-2">
              จัดการสมาชิก <span className="text-gray-400 text-[16px] font-normal">({filteredUsers.length} คน)</span>
            </h1>
            <SearchBar value={userSearch} onChange={setUserSearch} placeholder="ค้นหาชื่อแมว, ชื่อ, อีเมล..." />

            <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
              <table className="w-full text-sm min-w-[600px]">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <Th>สมาชิก / อีเมล</Th>
                    <Th center>สิทธิ์</Th>
                    <Th center>สถานะ</Th>
                    <Th center>จัดการ</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredUsers.map(user => {
                    const cat      = user.activeCat || {};
                    const isBanned = user.status === 'banned';
                    const role     = user.role || 'USER';
                    const isAdmin  = role === 'ADMIN';
                    const isSeller = role === 'SELLER';
                    const self     = isSelf(user);
                    return (
                      <tr key={user.id} className={`transition-colors ${isBanned ? 'bg-orange-50' : 'hover:bg-gray-50'}`}>

                        {/* สมาชิก */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <img
                              src={cat.avatar || user.avatar || '/favicon.svg'}
                              className={`w-9 h-9 rounded-full object-cover shrink-0 border border-gray-200 ${isBanned ? 'opacity-40 grayscale' : ''}`}
                              alt=""
                            />
                            <div className="min-w-0">
                              <p className={`font-semibold text-[13px] leading-tight truncate ${isBanned ? 'text-gray-400 line-through' : 'text-[#050505]'}`}>
                                {cat.name || '—'} {self && <span className="text-[10px] text-[#4267B2] font-semibold">(คุณ)</span>}
                              </p>
                              <p className="text-[11px] text-gray-400 truncate">{user.name || '—'} · {cat.breed || 'ไม่ระบุสายพันธุ์'}</p>
                              <p className="text-[11px] text-[#4267B2]/70 truncate">{user.email}</p>
                            </div>
                          </div>
                        </td>

                        {/* สิทธิ์ */}
                        <td className="px-4 py-3 text-center">
                          <button
                            disabled={self}
                            onClick={() => toggleRole(user.id)}
                            title={self ? '' : 'คลิกเพื่อเปลี่ยนสิทธิ์'}
                            className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full transition-colors disabled:cursor-not-allowed
                              ${isAdmin ? 'bg-[#4267B2]/10 text-[#4267B2] hover:bg-[#4267B2]/20'
                                : isSeller ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                          >
                            {isAdmin && <Crown className="w-3 h-3" />}
                            {isAdmin ? 'Admin' : isSeller ? 'ผู้ขาย' : 'สมาชิก'}
                          </button>
                        </td>

                        {/* สถานะ */}
                        <td className="px-4 py-3 text-center">
                          <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full
                            ${isBanned ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>
                            {isBanned ? '🚫 ระงับ' : '✓ ปกติ'}
                          </span>
                        </td>

                        {/* จัดการ */}
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              disabled={self}
                              onClick={() => toggleBan(user.id)}
                              title={isBanned ? 'ปลดระงับ' : 'ระงับบัญชี'}
                              className={`text-[11px] font-semibold px-2.5 py-1 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed
                                ${isBanned
                                  ? 'bg-green-50 text-green-600 hover:bg-green-100 border border-green-200'
                                  : 'bg-orange-50 text-orange-500 hover:bg-orange-100 border border-orange-200'}`}
                            >
                              {isBanned ? '✓ ปลดบล็อก' : '🚫 บล็อก'}
                            </button>
                            {isDeleting('user', user.id) ? (
                              <ConfirmPair onConfirm={() => deleteUser(user.id)} onCancel={() => setConfirmDelete(null)} />
                            ) : (
                              <button
                                disabled={self}
                                onClick={() => setConfirmDelete({ type: 'user', id: user.id })}
                                title="ลบสมาชิก"
                                className="text-[11px] font-semibold px-2.5 py-1 rounded-md bg-red-50 text-red-500 hover:bg-red-100 border border-red-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                              >
                                🗑 ลบ
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filteredUsers.length === 0 && <p className="text-center text-gray-400 py-12 text-sm">ไม่พบสมาชิก</p>}
            </div>
          </div>
        )}

        {/* ─── Posts ─── */}
        {tab === 'posts' && (
          <div>
            <h1 className="text-[22px] font-bold text-[#050505] mb-2">
              จัดการโพสต์ <span className="text-gray-400 text-[16px] font-normal">({filteredPosts.length} โพสต์)</span>
            </h1>
            <SearchBar value={postSearch} onChange={setPostSearch} placeholder="ค้นหาเนื้อหา, ชื่อผู้โพสต์..." />

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <Th>รูป</Th>
                    <Th>ผู้โพสต์</Th>
                    <Th>เนื้อหา</Th>
                    <Th>เวลา</Th>
                    <Th center>ถูกใจ</Th>
                    <Th center>คอมเมนต์</Th>
                    <Th>จัดการ</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredPosts.map(post => {
                    const isHidden = Boolean(post.hidden);
                    return (
                      <tr key={post.id} className={`transition-colors ${isHidden ? 'opacity-40 bg-gray-50' : 'hover:bg-gray-50'}`}>
                        <td className="px-4 py-3">
                          {post.image
                            ? <img src={post.image} className="w-10 h-10 rounded-lg object-cover" alt="" />
                            : <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-lg">📝</div>
                          }
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <img src={post.cat.avatar} className="w-7 h-7 rounded-full object-cover shrink-0" alt="" />
                            <span className="font-medium text-[#050505] whitespace-nowrap text-[13px]">{post.cat.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 max-w-[220px]">
                          <p className="text-[13px] text-gray-600 truncate">{post.content}</p>
                          {post.feeling && <p className="text-[11px] text-gray-400">รู้สึก: {post.feeling}</p>}
                        </td>
                        <td className="px-4 py-3 text-gray-400 whitespace-nowrap text-[12px]">{post.time}</td>
                        <td className="px-4 py-3 text-center text-gray-500 text-[13px]">{post.likeCount ?? 0}</td>
                        <td className="px-4 py-3 text-center text-gray-500 text-[13px]">{post.commentCount ?? 0}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1.5 flex-wrap">
                            <button
                              onClick={() => toggleHidePost(post.id)}
                              className={`text-[12px] font-semibold px-2.5 py-1 rounded-md transition-colors
                                ${isHidden
                                  ? 'bg-blue-50 text-blue-500 hover:bg-blue-100'
                                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                            >
                              {isHidden ? 'แสดง' : 'ซ่อน'}
                            </button>
                            {isDeleting('post', post.id) ? (
                              <ConfirmPair onConfirm={() => deletePost(post.id)} onCancel={() => setConfirmDelete(null)} />
                            ) : (
                              <button
                                onClick={() => setConfirmDelete({ type: 'post', id: post.id })}
                                className="text-[12px] font-semibold px-2.5 py-1 rounded-md bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                              >
                                ลบ
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filteredPosts.length === 0 && <p className="text-center text-gray-400 py-12 text-sm">ไม่พบโพสต์</p>}
            </div>
          </div>
        )}

        {/* ─── Marketplace ─── */}
        {tab === 'marketplace' && (
          <div>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
              <h1 className="text-[22px] font-bold text-[#050505]">
                จัดการตลาดนัด <span className="text-gray-400 text-[16px] font-normal">({filteredMarket.length} รายการ)</span>
              </h1>
              <div className="flex items-center gap-2 shrink-0 sm:ml-4 overflow-x-auto pb-1">
                <button
                  onClick={openCreateProduct}
                  className="bg-[#4267B2] text-white rounded-xl px-4 py-2.5 text-[13px] font-black hover:bg-[#3b5998] transition-colors"
                >
                  Add Product
                </button>
                <button
                  onClick={loadMarket}
                  disabled={marketLoading}
                  className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-[13px] font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  {marketLoading ? 'กำลังโหลด...' : 'Refresh'}
                </button>
                <div className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-right">
                  <p className="text-[11px] text-gray-400">มูลค่าสต็อกรวม</p>
                  <p className="text-[18px] font-bold text-[#050505]">{totalRevenue.toLocaleString()} ฿</p>
                </div>
              </div>
            </div>
            {marketError && (
              <div className="mb-4 rounded-xl bg-red-50 text-red-600 px-4 py-3 text-sm font-semibold">
                {marketError}
              </div>
            )}
            {lowStockProducts.length > 0 && (
              <div className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <p className="text-sm font-black text-red-700">Low stock alert</p>
                    <p className="text-xs text-red-600 mt-0.5">
                      {lowStockProducts.length} products need attention: {lowStockProducts.slice(0, 3).map(product => `${product.sku || product.title} (${product.stock || 0})`).join(', ')}
                      {lowStockProducts.length > 3 ? '...' : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => setMarketStock('low')}
                    className="self-start sm:self-auto px-3 py-2 rounded-lg bg-white text-red-600 text-[12px] font-bold border border-red-100 hover:bg-red-100"
                  >
                    View low stock
                  </button>
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl border border-gray-200 p-3 mb-4">
              <div className="grid grid-cols-1 md:grid-cols-[minmax(220px,1fr)_auto_auto_auto] gap-3 items-end">
                <label className="text-[11px] font-bold text-gray-500">
                  Search products
                  <div className="relative mt-1">
                     <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <input
                      value={marketSearch}
                      onChange={event => setMarketSearch(event.target.value)}
                      placeholder="SKU, product, brand, category"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-3 py-2.5 text-[13px] outline-none focus:ring-2 focus:ring-[#4267B2]/25"
                    />
                  </div>
                </label>
                <FilterSelect value={marketCat} onChange={setMarketCat} label="Category" options={marketCats} />
                <FilterSelect
                  value={marketStatus}
                  onChange={setMarketStatus}
                  label="Status"
                  options={[
                    { value: ALL_FILTER, label: 'All status' },
                    { value: 'active', label: 'active' },
                    { value: 'draft', label: 'draft' },
                    { value: 'archived', label: 'archived' },
                  ]}
                />
                <FilterSelect
                  value={marketStock}
                  onChange={setMarketStock}
                  label="Stock"
                  options={[
                    { value: ALL_FILTER, label: 'All stock' },
                    { value: 'low', label: 'Low stock (<=5)' },
                    { value: 'out', label: 'Out of stock' },
                  ]}
                />
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden overflow-x-auto">
              <table className="w-full min-w-[980px] text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <Th>สินค้า</Th>
                    <Th>หมวดหมู่</Th>
                    <Th>ราคา</Th>
                    <Th>Stock</Th>
                    <Th>Status</Th>
                    <Th>ผู้ขาย</Th>
                    <Th>พิกัด</Th>
                    <Th>จัดการ</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredMarket.map(item => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <img src={item.img} className="w-10 h-10 rounded-lg object-cover shrink-0" alt="" />
                          <span className="font-medium text-[#050505] line-clamp-2 max-w-[180px] text-[13px]">{item.title}</span>
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
                          (item.status || 'active') === 'active'
                            ? 'bg-green-100 text-green-700'
                            : (item.status || 'active') === 'draft'
                              ? 'bg-gray-100 text-gray-600'
                              : 'bg-red-100 text-red-600'
                        }`}>
                          {item.status || 'active'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {item.seller?.avatar && (
                            <img src={item.seller.avatar} className="w-6 h-6 rounded-full object-cover shrink-0" alt="" />
                          )}
                          <span className="text-gray-500 text-[13px]">{item.seller?.name ?? item.seller}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-400 whitespace-nowrap text-[13px]">{item.location}</td>
                      <td className="px-4 py-3">
                        {isDeleting('market', item.id) ? (
                          <ConfirmPair onConfirm={() => deleteMarket(item.id)} onCancel={() => setConfirmDelete(null)} />
                        ) : (
                          <div className="flex gap-1.5 flex-wrap">
                            <button
                              onClick={() => openEditProduct(item)}
                              className="text-[12px] font-semibold px-2.5 py-1 rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => adjustMarketStock(item.id, 1)}
                              className="text-[12px] font-semibold px-2.5 py-1 rounded-md bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
                            >
                              +Stock
                            </button>
                            <button
                              onClick={() => adjustMarketStock(item.id, -1)}
                              disabled={(item.stock || 0) <= 0}
                              className="text-[12px] font-semibold px-2.5 py-1 rounded-md bg-yellow-50 text-yellow-700 hover:bg-yellow-100 disabled:opacity-40 transition-colors"
                            >
                              -Stock
                            </button>
                            {(item.status || 'active') !== 'archived' && (
                              <button
                                onClick={() => setConfirmDelete({ type: 'market', id: item.id })}
                                className="text-[12px] font-semibold px-2.5 py-1 rounded-md bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
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
              {filteredMarket.length === 0 && <p className="text-center text-gray-400 py-12 text-sm">ไม่มีสินค้าในหมวดนี้</p>}
            </div>
          </div>
        )}

        {/* ─── Orders ─── */}
        {tab === 'orders' && (
          <div>
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-4">
              <h1 className="text-[22px] font-bold text-[#050505]">
                จัดการคำสั่งซื้อ <span className="text-gray-400 text-[16px] font-normal">({filteredOrders.length}/{orders.length} ออเดอร์)</span>
              </h1>
              <button
                onClick={() => {
                  setOrderSearch('');
                  setOrderStatus(ALL_FILTER);
                  setOrderPayment(ALL_FILTER);
                  setOrderShipping(ALL_FILTER);
                }}
                className="self-start sm:self-auto bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-[13px] font-semibold text-gray-600 hover:bg-gray-50"
              >
                Clear filters
              </button>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-3 mb-4">
              <div className="grid grid-cols-1 lg:grid-cols-[minmax(240px,1fr)_auto_auto_auto] gap-3 items-end">
                <label className="text-[11px] font-bold text-gray-500">
                  Search orders
                  <div className="relative mt-1">
                    <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <input
                      value={orderSearch}
                      onChange={event => setOrderSearch(event.target.value)}
                      placeholder="Order ID, customer, tracking number"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-3 py-2.5 text-[13px] outline-none focus:ring-2 focus:ring-[#4267B2]/25"
                    />
                  </div>
                </label>
                <FilterSelect
                  value={orderStatus}
                  onChange={setOrderStatus}
                  label="Order status"
                  options={[{ value: ALL_FILTER, label: 'All orders' }, ...ORDER_STATUSES.map(status => ({ value: status, label: status }))]}
                />
                <FilterSelect
                  value={orderPayment}
                  onChange={setOrderPayment}
                  label="Payment"
                  options={[{ value: ALL_FILTER, label: 'All payments' }, ...PAYMENT_STATUSES.map(status => ({ value: status, label: status }))]}
                />
                <FilterSelect
                  value={orderShipping}
                  onChange={setOrderShipping}
                  label="Shipping"
                  options={[{ value: ALL_FILTER, label: 'All shipping' }, ...SHIPPING_STATUSES.map(status => ({ value: status, label: status }))]}
                />
              </div>
            </div>

            {orders.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
                <p className="text-5xl mb-3">📦</p>
                <p className="text-gray-400 font-medium">ยังไม่มีคำสั่งซื้อ</p>
                <p className="text-gray-300 text-sm mt-1">เมื่อลูกค้าสั่งซื้อสินค้า ออเดอร์จะปรากฏที่นี่</p>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <p className="text-gray-400 font-bold">ไม่พบออเดอร์ตามเงื่อนไขที่เลือก</p>
                <p className="text-gray-300 text-sm mt-1">ลองล้าง filter หรือค้นหาด้วย order id / customer / tracking number อื่น</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredOrders.map(order => (
                  <div key={order.id} className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="grid grid-cols-1 md:grid-cols-[140px_minmax(180px,1fr)_minmax(140px,0.6fr)_140px_210px] gap-4 items-start">
                      {/* Order ID + date */}
                      <div>
                        <p className="font-black text-[#4267B2] text-[14px]">{order.id}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          {new Date(order.createdAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>

                      {/* Items preview */}
                      <div>
                        <div className="flex gap-2 items-center flex-wrap">
                          {order.items.slice(0, 2).map(({ product, qty }) => (
                            <div key={product.id} className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-2 py-1">
                              <img src={product.img} className="w-6 h-6 rounded object-cover shrink-0" alt="" />
                              <span className="text-[12px] text-gray-700 max-w-[100px] truncate">{product.title}</span>
                              <span className="text-[11px] text-gray-400 shrink-0">×{qty}</span>
                            </div>
                          ))}
                          {order.items.length > 2 && (
                            <span className="text-[12px] text-gray-400">+{order.items.length - 2} รายการ</span>
                          )}
                        </div>
                      </div>

                      {/* Customer */}
                      <div>
                        <p className="text-[13px] font-semibold text-gray-800">{order.address.name}</p>
                        <p className="text-[11px] text-gray-400">{order.address.phone}</p>
                      </div>

                      {/* Payment + total */}
                      <div className="md:text-right">
                        <p className="font-black text-[#050505] text-[15px]">{order.total.toLocaleString()} ฿</p>
                        <p className="text-[11px] text-gray-400">{PAYMENT_LABEL[order.payment] ?? order.payment}</p>
                        <p className="text-[11px] text-gray-400">Payment: {order.paymentStatus || 'pending'}</p>
                        <p className="text-[11px] text-gray-400">Shipping: {order.shippingStatus || 'pending'}</p>
                        {order.paymentInstruction?.referenceNo && (
                          <p className="text-[11px] text-[#4267B2] font-semibold">Ref: {order.paymentInstruction.referenceNo}</p>
                        )}
                      </div>

                      {/* Status + action */}
                      <div className="flex flex-col items-start md:items-end gap-2">
                        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${STATUS_BADGE[order.status] || STATUS_BADGE.pending}`}>
                          {STATUS_LABEL[order.status] || order.status}
                        </span>
                        <div className="grid grid-cols-1 gap-1.5 w-full">
                          <select
                            value={order.status}
                            onChange={event => updateOrderField(order.id, { status: event.target.value }, 'อัปเดต order status แล้ว')}
                            className="bg-gray-100 rounded-lg px-2 py-1.5 text-[12px] font-semibold outline-none"
                          >
                            {ORDER_STATUSES.map(status => <option key={status} value={status}>{status}</option>)}
                          </select>
                          <select
                            value={order.paymentStatus || 'pending'}
                            onChange={event => updateOrderField(order.id, { paymentStatus: event.target.value }, 'อัปเดต payment status แล้ว')}
                            className="bg-gray-100 rounded-lg px-2 py-1.5 text-[12px] font-semibold outline-none"
                          >
                            {PAYMENT_STATUSES.map(status => <option key={status} value={status}>{status}</option>)}
                          </select>
                          <select
                            value={order.shippingStatus || 'pending'}
                            onChange={event => updateOrderField(order.id, { shippingStatus: event.target.value }, 'อัปเดต shipping status แล้ว')}
                            className="bg-gray-100 rounded-lg px-2 py-1.5 text-[12px] font-semibold outline-none"
                          >
                            {SHIPPING_STATUSES.map(status => <option key={status} value={status}>{status}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-gray-100 flex gap-2 flex-wrap">
                      <button
                        onClick={() => runPaymentAction(markPaymentPaid, order.id, 'Mark paid แล้ว')}
                        disabled={order.paymentStatus === 'paid'}
                        className="px-3 py-1.5 rounded-lg bg-green-50 text-green-700 text-[12px] font-bold hover:bg-green-100 disabled:opacity-40"
                      >
                        Mark Paid
                      </button>
                      <button
                        onClick={() => runPaymentAction(markPaymentFailed, order.id, 'Mark failed แล้ว')}
                        disabled={order.paymentStatus === 'failed'}
                        className="px-3 py-1.5 rounded-lg bg-yellow-50 text-yellow-700 text-[12px] font-bold hover:bg-yellow-100 disabled:opacity-40"
                      >
                        Mark Failed
                      </button>
                      <button
                        onClick={() => runPaymentAction(refundPayment, order.id, 'Refund แล้ว')}
                        disabled={order.paymentStatus !== 'paid'}
                        className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-[12px] font-bold hover:bg-red-100 disabled:opacity-40"
                      >
                        Refund
                      </button>
                    </div>

                    {/* Address row */}
                    <div className="mt-3 pt-3 border-t border-gray-100 flex items-start gap-2">
                      <span className="text-[11px] text-gray-400 shrink-0 mt-0.5">ที่อยู่จัดส่ง:</span>
                      <p className="text-[12px] text-gray-600">{order.address.address}{order.address.note ? ` · ${order.address.note}` : ''}</p>
                    </div>

                    <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-1 lg:grid-cols-2 gap-3">
                      <div className="flex gap-2">
                        <input
                          value={trackingDrafts[order.id] ?? order.trackingNo ?? ''}
                          onChange={event => setTrackingDrafts(prev => ({ ...prev, [order.id]: event.target.value }))}
                          placeholder="Tracking number"
                          className="flex-1 bg-gray-100 rounded-lg px-3 py-2 text-[12px] outline-none focus:ring-2 focus:ring-[#4267B2]/30"
                        />
                        <button
                          onClick={() => saveTrackingNo(order.id)}
                          className="px-3 py-2 rounded-lg bg-[#4267B2] text-white text-[12px] font-bold hover:bg-[#3b5998]"
                        >
                          Save
                        </button>
                      </div>
                      {order.status === 'cancelled' ? (
                        <div className="bg-red-50 text-red-600 rounded-lg px-3 py-2 text-[12px] font-semibold">
                          Cancel reason: {order.cancelReason || '-'}
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <input
                            value={cancelDrafts[order.id] || ''}
                            onChange={event => setCancelDrafts(prev => ({ ...prev, [order.id]: event.target.value }))}
                            placeholder="Cancel reason"
                            className="flex-1 bg-gray-100 rounded-lg px-3 py-2 text-[12px] outline-none focus:ring-2 focus:ring-red-200"
                          />
                          <button
                            onClick={() => submitCancelOrder(order.id)}
                            className="px-3 py-2 rounded-lg bg-red-500 text-white text-[12px] font-bold hover:bg-red-600"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── Lost Cats ─── */}
        {tab === 'lostcats' && (
            <div>
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <div>
                  <h1 className="text-[22px] font-bold text-[#050505]">ประกาศแมวหาย</h1>
                  <p className="text-[13px] text-gray-400 mt-0.5">ทั้งหมด {lostCats.length} ประกาศ</p>
                </div>
                <button onClick={loadLostCats} className="self-start sm:self-auto bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-[13px] font-semibold text-gray-600 hover:bg-gray-50">
                  รีเฟรช
                </button>
              </div>

              {/* Summary cards */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[
                  { label: 'ทั้งหมด', value: lostCats.length, color: 'bg-gray-50 border-gray-200', val: 'text-gray-800', emoji: '📢' },
                  { label: 'กำลังหา', value: lcActiveCount,   color: 'bg-red-50 border-red-100',    val: 'text-red-600',   emoji: '🔴' },
                  { label: 'พบแล้ว',  value: lcFoundCount,    color: 'bg-green-50 border-green-100', val: 'text-green-600', emoji: '✅' },
                ].map(s => (
                  <div key={s.label} className={`rounded-xl border p-4 ${s.color}`}>
                    <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wide">{s.emoji} {s.label}</p>
                    <p className={`text-[28px] font-bold leading-none mt-1 ${s.val}`}>{s.value}</p>
                  </div>
                ))}
              </div>

              {/* Search + filter */}
              <div className="bg-white rounded-xl border border-gray-200 p-3 mb-4 flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <input
                    value={lcSearch}
                    onChange={e => setLcSearch(e.target.value)}
                    placeholder="ค้นหาชื่อแมว หรือสถานที่..."
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-3 py-2.5 text-[13px] outline-none focus:ring-2 focus:ring-[#4267B2]/25"
                  />
                </div>
                <select
                  value={lcStatus}
                  onChange={e => setLcStatus(e.target.value)}
                  className="bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-[13px] font-semibold text-gray-700 outline-none"
                >
                  <option value="all">ทุกสถานะ</option>
                  <option value="active">กำลังหา</option>
                  <option value="found">พบแล้ว</option>
                </select>
              </div>

              {/* Table */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <Th>แมว</Th>
                      <Th>หายล่าสุด</Th>
                      <Th>สถานที่</Th>
                      <Th center>รางวัล</Th>
                      <Th center>สถานะ</Th>
                      <Th>จัดการ</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredLC.map(cat => {
                      const isFound = cat.status === 'found';
                      return (
                        <tr key={cat.id} className={`transition-colors ${isFound ? 'bg-green-50' : 'hover:bg-gray-50'}`}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              {cat.img ? (
                                <img src={cat.img} className={`w-11 h-11 rounded-xl object-cover shrink-0 ${isFound ? 'opacity-60 grayscale' : ''}`} alt="" />
                              ) : (
                                <div className="w-11 h-11 rounded-xl bg-red-50 flex items-center justify-center text-xl shrink-0">🐱</div>
                              )}
                              <div>
                                <p className={`font-semibold text-[14px] leading-tight ${isFound ? 'text-gray-400 line-through' : 'text-[#050505]'}`}>
                                  {cat.name}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-[13px]">{cat.lastSeen}</td>
                          <td className="px-4 py-3 text-gray-500 text-[13px] max-w-[160px] truncate">{cat.location}</td>
                          <td className="px-4 py-3 text-center font-semibold text-[13px]">
                            {cat.reward > 0
                              ? <span className="text-amber-600">฿{cat.reward.toLocaleString()}</span>
                              : <span className="text-gray-300">—</span>}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${isFound ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                              {isFound ? '✅ พบแล้ว' : '🔴 กำลังหา'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {isDeleting('lost', cat.id) ? (
                              <ConfirmPair onConfirm={() => deleteLost(cat.id)} onCancel={() => setConfirmDelete(null)} />
                            ) : (
                              <div className="flex gap-1.5 flex-wrap">
                                <button
                                  onClick={() => markFound(cat.id, cat.status)}
                                  className={`text-[12px] font-semibold px-2.5 py-1 rounded-md transition-colors ${isFound ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}
                                >
                                  {isFound ? 'ยังหายอยู่' : 'พบแล้ว'}
                                </button>
                                <button
                                  onClick={() => setConfirmDelete({ type: 'lost', id: cat.id })}
                                  className="text-[12px] font-semibold px-2.5 py-1 rounded-md bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                                >
                                  ลบ
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {filteredLC.length === 0 && (
                  <div className="text-center py-16">
                    <p className="text-4xl mb-2">{lostCats.length === 0 ? '🎉' : '🐾'}</p>
                    <p className="text-gray-400 text-sm font-medium">
                      {lostCats.length === 0 ? 'ไม่มีประกาศแมวหาย' : 'ไม่พบประกาศตามเงื่อนไข'}
                    </p>
                  </div>
                )}
              </div>
            </div>
        )}

      </div>
    </div>
  );
};

export default AdminDashboardPage;
