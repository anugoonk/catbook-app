export const mockUsers = [
  {
    id: 'u1',
    ownerName: 'แอดมิน แมวส้ม',
    email: 'admin@catbook.com',
    role: 'ADMIN',
    isAdmin: true,
    activeCat: {
      id: 'c0',
      name: 'บอส',
      avatar: 'https://images.unsplash.com/photo-1574158622682-e40e69881006?w=200&q=80',
      cover: 'https://images.unsplash.com/photo-1574158622682-e40e69881006?w=800&q=80',
      breed: 'เมนคูน',
      bio: 'แมวใหญ่แต่ใจดี ดูแลระบบ CatBook',
      status: 'กำลังดูแลระบบ',
    },
  },
  {
    id: 'u2',
    ownerName: 'น้ำใส ใจดี',
    email: 'mali@catbook.com',
    role: 'SELLER',
    isAdmin: false,
    activeCat: {
      id: 'c1',
      name: 'มะลิ',
      avatar: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80',
      cover: 'https://images.unsplash.com/photo-1543852786-1cf6624b9987?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
      breed: 'สก็อตติช โฟลด์',
      bio: 'แมวอ้วนชอบนอนในกล่อง',
      status: 'กำลังหิว',
    },
  },
  {
    id: 'u3',
    ownerName: 'คุณเอก',
    email: 'thungngern@catbook.com',
    role: 'USER',
    isAdmin: false,
    activeCat: {
      id: 'c2',
      name: 'ถุงเงิน',
      avatar: 'https://images.unsplash.com/photo-1495360010541-f48722b34f7d?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80',
      cover: 'https://images.unsplash.com/photo-1495360010541-f48722b34f7d?w=800&q=80',
      breed: 'แมวไทย (สลิด)',
      bio: 'แมวสีขาว ชอบกินปลา',
      status: 'นอนอยู่บ้าน',
    },
  },
  {
    id: 'u4',
    ownerName: 'พี่แอน',
    email: 'somchun@catbook.com',
    role: 'USER',
    isAdmin: false,
    activeCat: {
      id: 'c3',
      name: 'ส้มฉุน',
      avatar: 'https://images.unsplash.com/photo-1596854407944-bf87f6fdd49e?w=200&q=80',
      cover: 'https://images.unsplash.com/photo-1574144611937-0df059b5ef3e?w=800&q=80',
      breed: 'แมวส้ม',
      bio: 'แมวส้มตัวเป็นๆ ซนมากมาย',
      status: 'วิ่งเล่นอยู่',
    },
  },
];

export const mockCats = [
  { id: 'c2', name: 'ถุงเงิน', owner: 'คุณเอก', avatar: 'https://images.unsplash.com/photo-1495360010541-f48722b34f7d?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80', breed: 'แมวไทย (สลิด)' },
  { id: 'c3', name: 'ส้มฉุน', owner: 'พี่แอน', avatar: 'https://images.unsplash.com/photo-1596854407944-bf87f6fdd49e?w=200&q=80', breed: 'แมวส้ม' },
  { id: 'c4', name: 'ไข่ตุ๋น', owner: 'น้องฟ้า', avatar: 'https://images.unsplash.com/photo-1533738363-b7f9aef128ce?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80', breed: 'เปอร์เซีย' },
  { id: 'c5', name: 'เสือ', owner: 'ลุงชัย', avatar: 'https://images.unsplash.com/photo-1513360371669-4adf3dd7dff8?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80', breed: 'เบงกอล' },
  { id: 'c6', name: 'โมจิ', owner: 'เมย์', avatar: 'https://images.unsplash.com/photo-1573865526739-10659fec78a5?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80', breed: 'เอ็กโซติก' },
];

export const mockPosts = [
  {
    id: 'p1',
    cat: mockCats[0],
    time: '10 นาทีที่แล้ว',
    content: 'วันนี้แอบนอนในกล่องรองเท้าอีกแล้ว เมี๊ยววว 📦💤',
    feeling: 'ง่วงนอน',
    location: 'บ้านอันแสนอบอุ่น',
    image: 'https://images.unsplash.com/photo-1513245543132-31f507417b26?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80',
    likes: 124,
    comments: 13,
    shares: 4,
    isLiked: false,
    commentsList: [
      { id: 'cm1', name: 'ส้มฉุน', avatar: 'https://images.unsplash.com/photo-1596854407944-bf87f6fdd49e?w=200&q=80', text: 'น่ารักมากเลยยย กล่องคือบ้านของแมว 🥰', time: '8 นาทีที่แล้ว' },
      { id: 'cm2', name: 'ไข่ตุ๋น', avatar: 'https://images.unsplash.com/photo-1533738363-b7f9aef128ce?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80', text: 'กล่องรองเท้าคือห้องสวีทชั้นหนึ่ง 📦✨', time: '5 นาทีที่แล้ว' },
    ],
  },
  {
    id: 'p2',
    cat: mockCats[1],
    time: '2 ชั่วโมงที่แล้ว',
    content: 'ทาสซื้ออาหารเม็ดรสใหม่มาให้ ชิมแล้วให้ 10/10 ไปเลยฮะ! 🐟✨',
    feeling: 'อารมณ์ดี',
    likes: 89,
    comments: 4,
    shares: 2,
    isLiked: true,
    commentsList: [
      { id: 'cm3', name: 'มะลิ', avatar: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80', text: 'ขอรีวิวด้วยนะ!! อยากได้มากเลย 🐟', time: '1 ชั่วโมงที่แล้ว' },
    ],
  },
  {
    id: 'p3',
    cat: {
      id: 'c1',
      name: 'มะลิ',
      avatar: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80',
    },
    time: '5 ชั่วโมงที่แล้ว',
    content: 'นั่งรอทาสกลับบ้านเมื่อไหร่จะมาเทข้าววววว 😾',
    feeling: 'หิวมาก',
    image: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80',
    likes: 210,
    comments: 40,
    shares: 18,
    isLiked: false,
    commentsList: [
      { id: 'cm4', name: 'ถุงเงิน', avatar: 'https://images.unsplash.com/photo-1495360010541-f48722b34f7d?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80', text: 'สู้ๆ นะ ทาสกำลังกลับบ้านแน่นอน 💪', time: '4 ชั่วโมงที่แล้ว' },
      { id: 'cm5', name: 'เสือ', avatar: 'https://images.unsplash.com/photo-1513360371669-4adf3dd7dff8?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80', text: 'เป็นกำลังใจให้เหมียวนะ 😾❤️', time: '3 ชั่วโมงที่แล้ว' },
    ],
  }
];

export const mockLostCats = [
  { id: 'l1', name: 'น้องส้ม',   lastSeen: '14 พ.ค. 2568', location: 'ลาดพร้าว กทม.',      reward: 5000, img: 'https://images.unsplash.com/photo-1596854407944-bf87f6fdd49e?w=200&q=80' },
  { id: 'l2', name: 'มิวมิว',    lastSeen: '12 พ.ค. 2568', location: 'สีลม กทม.',           reward: 3000, img: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=200&q=80' },
  { id: 'l3', name: 'เจ้าขาว',   lastSeen: '10 พ.ค. 2568', location: 'นิมมานเหมินทร์ เชียงใหม่', reward: 2000, img: 'https://images.unsplash.com/photo-1495360010541-f48722b34f7d?w=200&q=80' },
  { id: 'l4', name: 'บอสใหญ่',   lastSeen: '8 พ.ค. 2568',  location: 'ปิ่นเกล้า กทม.',     reward: 8000, img: 'https://images.unsplash.com/photo-1574158622682-e40e69881006?w=200&q=80' },
];
