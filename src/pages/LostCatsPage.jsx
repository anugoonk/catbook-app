import { useState, useEffect } from 'react';
import { AlertTriangle, Plus, Phone, MapPin, Calendar } from 'lucide-react';
import Toast from '../components/Toast';
import useToast from '../hooks/useToast';
import CreateLostCatModal from '../components/CreateLostCatModal';
import { mockUsers } from '../data/mockData';
import { useUser } from '../context/UserContext';

const buildLostCats = (users) => {
  const [u1, u2, u3, u4] = users;
  return [
    {
      id: 'l1',
      name: 'น้องส้ม',
      breed: 'แมวส้ม',
      age: '2 ปี',
      gender: 'ผู้',
      lastSeen: '14 พ.ค. 2568',
      location: 'ลาดพร้าว กทม.',
      reward: 5000,
      marks: 'มีปลอกคอสีแดง หูซ้ายมีรอยบิ่นเล็กน้อย ขนสีส้มล้วน',
      contact: '081-234-5678',
      img: 'https://images.unsplash.com/photo-1596854407944-bf87f6fdd49e?w=400&q=80',
      poster: u4.activeCat,
    },
    {
      id: 'l2',
      name: 'มิวมิว',
      breed: 'สก็อตติช โฟลด์',
      age: '1 ปี',
      gender: 'เมีย',
      lastSeen: '12 พ.ค. 2568',
      location: 'สีลม กทม.',
      reward: 3000,
      marks: 'หูพับ ขนสีขาวครีม มีจุดน้ำตาลที่หลัง ตาสีเหลือง',
      contact: '089-876-5432',
      img: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=400&q=80',
      poster: u2.activeCat,
    },
    {
      id: 'l3',
      name: 'เจ้าขาว',
      breed: 'แมวไทย',
      age: '3 ปี',
      gender: 'ผู้',
      lastSeen: '10 พ.ค. 2568',
      location: 'นิมมานเหมินทร์ เชียงใหม่',
      reward: 2000,
      marks: 'ขนขาวล้วน ตาฟ้า ไม่ได้ใส่ปลอกคอ ตัวใหญ่กว่าแมวทั่วไป',
      contact: '062-111-2233',
      img: 'https://images.unsplash.com/photo-1495360010541-f48722b34f7d?w=400&q=80',
      poster: u3.activeCat,
    },
    {
      id: 'l4',
      name: 'บอสใหญ่',
      breed: 'เมนคูน',
      age: '4 ปี',
      gender: 'ผู้',
      lastSeen: '8 พ.ค. 2568',
      location: 'ปิ่นเกล้า กทม.',
      reward: 8000,
      marks: 'ขนยาวสีน้ำตาลลาย ตัวใหญ่มาก หางยาวฟู ใส่ปลอกคอสีดำ',
      contact: '095-555-7890',
      img: 'https://images.unsplash.com/photo-1574158622682-e40e69881006?w=400&q=80',
      poster: u1.activeCat,
    },
  ];
};

const LostCatsPage = () => {
  const { currentUser } = useUser();
  const [lostCats, setLostCats] = useState(() => buildLostCats(mockUsers));
  const [tipState, setTipState] = useState(
    () => Object.fromEntries(buildLostCats(mockUsers).map(c => [c.id, 'idle']))
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toast, showToast] = useToast();
  const [successToast, showSuccessToast] = useToast();

  useEffect(() => {
    const fresh = buildLostCats(mockUsers);
    setLostCats(fresh);
    setTipState(Object.fromEntries(fresh.map(c => [c.id, 'idle'])));
  }, [currentUser.activeCat.id]);

  const handleTip = (cat) => {
    if (tipState[cat.id] !== 'idle') return;
    setTipState(prev => ({ ...prev, [cat.id]: 'sent' }));
    showSuccessToast('ส่งเบาะแสเรียบร้อย! เจ้าของแมวจะติดต่อกลับหาคุณ');
  };

  const handleAddReport = (newCat) => {
    setLostCats(prev => [newCat, ...prev]);
    setTipState(prev => ({ ...prev, [newCat.id]: 'idle' }));
    showToast(`ประกาศตามหา "${newCat.name}" เรียบร้อยแล้ว! 🔍`);
  };

  return (
    <div className="w-full pb-20">
      <Toast message={toast} />
      <Toast message={successToast} variant="green" />

      {/* Banner */}
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-6 flex items-center justify-between">
        <div>
          <h2 className="font-bold text-2xl text-red-600 mb-1">ศูนย์ตามหาแมวหาย 🔍</h2>
          <p className="text-red-700 text-sm">ช่วยกันตามหาน้องแมวที่หายไป ส่งเบาะแสให้เจ้าของได้เลย</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-bold shadow-sm transition-colors text-sm shrink-0"
        >
          <Plus className="w-4 h-4" />
          แจ้งแมวหาย
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {lostCats.map(cat => {
          const sent = tipState[cat.id] === 'sent';
          const isOwn = cat.poster.id === currentUser.activeCat.id;

          return (
            <div key={cat.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col">
              {/* Image */}
              <img src={cat.img} className="w-full h-44 object-cover" alt={cat.name} />

              <div className="p-4 flex flex-col flex-1">
                {/* Poster */}
                <div className="flex items-center gap-1.5 mb-2">
                  <img src={cat.poster.avatar} className="w-4 h-4 rounded-full object-cover shrink-0" alt="" />
                  <span className="text-[11px] text-[#65676B]">
                    ประกาศโดย <span className="font-semibold text-[#050505]">{cat.poster.name}</span>
                    {isOwn && <span className="text-red-500"> (คุณ)</span>}
                  </span>
                </div>

                {/* Name + meta */}
                <h3 className="font-bold text-[16px] text-gray-800 leading-tight">{cat.name}</h3>
                <p className="text-[12px] text-gray-400 mt-0.5 mb-1">
                  {cat.gender === 'ผู้' ? '♂' : '♀'} {cat.gender} · {cat.breed} · อายุ {cat.age}
                </p>

                {/* Last seen + location */}
                <div className="flex flex-col gap-0.5 mb-2">
                  <p className="text-[12px] text-gray-500 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-red-400 shrink-0" />
                    หายล่าสุด: {cat.lastSeen}
                  </p>
                  <p className="text-[12px] text-gray-500 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-red-400 shrink-0" />
                    {cat.location}
                  </p>
                </div>

                {/* Marks */}
                {cat.marks && (
                  <p className="text-[11px] text-gray-400 leading-snug mb-3 flex-1 line-clamp-2 bg-gray-50 rounded-lg px-2 py-1.5">
                    {cat.marks}
                  </p>
                )}

                {/* Contact reveal */}
                {sent && !isOwn && cat.contact && (
                  <div className="mb-3 bg-green-50 border border-green-200 rounded-lg px-3 py-2 flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-green-600 shrink-0" />
                    <div>
                      <p className="text-[10px] text-green-600 font-semibold">ข้อมูลติดต่อเจ้าของ</p>
                      <p className="text-[12px] text-green-800 font-medium">{cat.contact}</p>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => handleTip(cat)}
                  disabled={sent || isOwn}
                  className={`mt-auto w-full font-bold text-sm py-2 rounded-lg transition-colors border flex items-center justify-center gap-2
                    ${isOwn
                      ? 'bg-gray-50 text-gray-400 border-gray-200 cursor-default'
                      : sent
                        ? 'bg-green-50 text-green-600 border-green-200 cursor-default'
                        : 'bg-red-50 hover:bg-red-100 text-red-600 border-red-200 cursor-pointer'}`}
                >
                  {isOwn
                    ? 'ประกาศของคุณ'
                    : sent
                      ? <><Phone className="w-4 h-4" /> ส่งเบาะแสแล้ว</>
                      : <><AlertTriangle className="w-4 h-4" /> แจ้งเบาะแส</>}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <CreateLostCatModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleAddReport}
      />
    </div>
  );
};

export default LostCatsPage;
