import { mockUsers } from '../src/data/mockData.js';

export const PRODUCT_CATEGORIES = [
  'อาหารแมว',
  'ทรายแมว',
  'ของเล่น',
  'คอนโดและที่นอน',
  'ปลอกคอ',
  'อุปกรณ์',
];

export const buildProductCatalog = () => {
  const [admin, mali, thungngern, somchun] = mockUsers;

  return [
    {
      id: 'm1',
      sku: 'CAT-CONDO-3TIER',
      slug: 'cat-condo-3-tier',
      title: 'คอนโดแมว 3 ชั้น พร้อมที่ลับเล็บและของเล่นแขวน',
      price: 850,
      category: 'คอนโดและที่นอน',
      brand: 'CatBook Home',
      species: 'cat',
      lifeStage: 'all',
      location: 'กรุงเทพฯ',
      stock: 8,
      desc: 'คอนโดแมว 3 ชั้น สภาพดี พร้อมเสาลับเล็บและของเล่นแขวน เหมาะกับแมวทุกวัย',
      seller: admin.activeCat,
      img: 'https://images.unsplash.com/photo-1545249390-6bdfa286032f?w=400&q=80',
    },
    {
      id: 'm2',
      sku: 'WETFOOD-TUNA-24',
      slug: 'tuna-wet-food-24-cans',
      title: 'อาหารเปียกรสทูน่า ยกลัง 24 กระป๋อง',
      price: 420,
      category: 'อาหารแมว',
      brand: 'Whiskas',
      species: 'cat',
      lifeStage: 'adult',
      location: 'เชียงใหม่',
      stock: 18,
      desc: 'อาหารเปียกสำหรับแมวโต รสทูน่า แพ็ก 24 กระป๋อง ยังไม่เปิด Exp. 2026',
      seller: thungngern.activeCat,
      img: 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=400&q=80',
    },
    {
      id: 'm3',
      sku: 'TOY-AUTO-MOUSE',
      slug: 'automatic-cat-mouse-toy',
      title: 'ของเล่นแมว เมาส์ไฟฟ้าอัตโนมัติ ชาร์จ USB',
      price: 299,
      category: 'ของเล่น',
      brand: 'PlayPaw',
      species: 'cat',
      lifeStage: 'all',
      location: 'กรุงเทพฯ',
      stock: 5,
      desc: 'ของเล่นวิ่งสุ่มทิศทาง มีเซนเซอร์หลบหลีก ชาร์จ USB แบตอยู่ได้ประมาณ 2 ชั่วโมง',
      seller: mali.activeCat,
      img: 'https://images.unsplash.com/photo-1526336024174-e58f5cdd8e13?w=400&q=80',
    },
    {
      id: 'm4',
      sku: 'LITTER-LEMON-10L',
      slug: 'lemon-clumping-cat-litter-10l',
      title: 'ทรายแมวอนามัย กลิ่นมะนาว ก้อนแน่น 10 ลิตร',
      price: 185,
      category: 'ทรายแมว',
      brand: 'Pura',
      species: 'cat',
      lifeStage: 'all',
      location: 'นนทบุรี',
      stock: 22,
      desc: 'ทรายแมวสูตรจับตัวเป็นก้อน ดูดซับกลิ่นดี เหมาะกับบ้านที่มีแมวหลายตัว',
      seller: somchun.activeCat,
      img: 'https://images.unsplash.com/photo-1511275539165-cc46b1ee89bf?w=400&q=80',
    },
    {
      id: 'm5',
      sku: 'RC-PERSIAN-2KG',
      slug: 'royal-canin-persian-2kg',
      title: 'Royal Canin Persian อาหารแห้ง สูตรเปอร์เซีย 2 กก.',
      price: 620,
      category: 'อาหารแมว',
      brand: 'Royal Canin',
      species: 'cat',
      lifeStage: 'adult',
      location: 'กรุงเทพฯ',
      stock: 12,
      desc: 'สูตรพิเศษสำหรับแมวเปอร์เซีย ช่วยบำรุงขนและการย่อยอาหาร',
      seller: mali.activeCat,
      img: 'https://images.unsplash.com/photo-1589924691995-400dc9a0b089?w=400&q=80',
    },
    {
      id: 'm6',
      sku: 'TREATS-TUNA-3PACK',
      slug: 'tuna-cat-treats-3-pack',
      title: 'ขนมแมวรสทูน่า แพ็ก 3 ถุง',
      price: 129,
      category: 'อาหารแมว',
      brand: 'Temptations',
      species: 'cat',
      lifeStage: 'all',
      location: 'ปทุมธานี',
      stock: 30,
      desc: 'ขนมแมวกรอบนอกนุ่มใน รสทูน่า ขนาด 85g x 3 ถุง',
      seller: admin.activeCat,
      img: 'https://images.unsplash.com/photo-1548681528-6a5c45b66b42?w=400&q=80',
    },
  ];
};

export const filterProducts = (products, searchParams) => {
  const category = searchParams.get('category');
  const brand = searchParams.get('brand');
  const species = searchParams.get('species');
  const q = searchParams.get('q')?.trim().toLowerCase();

  return products.filter(product => {
    if (category && product.category !== category) return false;
    if (brand && product.brand !== brand) return false;
    if (species && product.species !== species) return false;
    if (q) {
      const haystack = `${product.title} ${product.desc} ${product.brand} ${product.category}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
};
