import { useState, useEffect } from 'react';
import { CheckCircle, Heart, Plus, Phone } from 'lucide-react';
import Toast from '../components/Toast';
import useToast from '../hooks/useToast';
import CreateAdoptionModal from '../components/CreateAdoptionModal';
import { mockUsers } from '../data/mockData';
import { useUser } from '../context/UserContext';

const buildAdoption = (users) => {
  const [u1, u2, u3, u4] = users;
  return [
    {
      id: 'a1',
      name: 'น้องด่าง',
      age: '3 เดือน',
      gender: 'เมีย',
      location: 'กรุงเทพฯ',
      story: 'แมวสีขาวด่างดำ ขี้อ้อน ชอบนอนตัก ฉีดวัคซีนครบแล้ว ต้องการบ้านที่อบอุ่น',
      contact: '081-234-5678',
      img: 'https://images.unsplash.com/photo-1606428784795-3bd66cde4315?w=400&q=80',
      poster: u4.activeCat,
    },
    {
      id: 'a2',
      name: 'สามสี',
      age: '1 ปี',
      gender: 'เมีย',
      location: 'เชียงใหม่',
      story: 'แมวสามสีนิสัยดี เลี้ยงง่าย กินอาหารไม่เลือก ทำหมันแล้ว พร้อมย้ายบ้านทันที',
      contact: '089-876-5432',
      img: 'https://images.unsplash.com/photo-1555685812-4b943f1cb0eb?w=400&q=80',
      poster: u2.activeCat,
    },
    {
      id: 'a3',
      name: 'เจ้าขาว',
      age: '6 เดือน',
      gender: 'ผู้',
      location: 'ปทุมธานี',
      story: 'แมวขาวล้วน ตาฟ้า ซนนิดหน่อยแต่น่ารักมาก ชอบเล่นของเล่น ยังไม่ทำหมัน',
      contact: '062-111-2233',
      img: 'https://images.unsplash.com/photo-1548247416-ec66f4900b2e?w=400&q=80',
      poster: u1.activeCat,
    },
    {
      id: 'a4',
      name: 'มิดไนท์',
      age: '2 ปี',
      gender: 'ผู้',
      location: 'นนทบุรี',
      story: 'แมวดำล้วน นิสัยเงียบขรึม ชอบนั่งดูทิวทัศน์ ฉีดวัคซีนครบ ทำหมันแล้ว เหมาะกับคนชอบความสงบ',
      contact: '095-555-7890',
      img: 'https://images.unsplash.com/photo-1543769657-fcf29e6b1a0d?w=400&q=80',
      poster: u3.activeCat,
    },
  ];
};

const AdoptionPage = () => {
  const { currentUser } = useUser();
  const [adoption, setAdoption] = useState(() => buildAdoption(mockUsers));
  const [adoptState, setAdoptState] = useState(
    () => Object.fromEntries(buildAdoption(mockUsers).map(c => [c.id, 'idle']))
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toast, showToast] = useToast();
  const [successToast, showSuccessToast] = useToast();

  useEffect(() => {
    const fresh = buildAdoption(mockUsers);
    setAdoption(fresh);
    setAdoptState(Object.fromEntries(fresh.map(c => [c.id, 'idle'])));
  }, [currentUser.activeCat.id]);

  const handleAdopt = (cat) => {
    if (adoptState[cat.id] !== 'idle') return;
    setAdoptState(prev => ({ ...prev, [cat.id]: 'requested' }));
    showSuccessToast('ส่งความสนใจรับเลี้ยงเรียบร้อยแล้ว! ผู้ประกาศจะติดต่อกลับไป');
  };

  const handleAddAdoption = (newCat) => {
    setAdoption(prev => [newCat, ...prev]);
    setAdoptState(prev => ({ ...prev, [newCat.id]: 'idle' }));
    showToast(`ประกาศหาบ้านให้ "${newCat.name}" เรียบร้อยแล้ว! 🐾`);
  };

  return (
    <div className="w-full pb-20">
      <Toast message={toast} />
      <Toast message={successToast} variant="green" />

      {/* Banner */}
      <div className="bg-orange-50 border border-orange-200 rounded-xl p-6 mb-6 flex items-center justify-between">
        <div>
          <h2 className="font-bold text-2xl text-orange-600 mb-1">ศูนย์หาบ้าน 🏡</h2>
          <p className="text-orange-700 text-sm">ช่วยน้องแมวไร้บ้านให้มีครอบครัวที่อบอุ่น</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-bold shadow-sm transition-colors text-sm shrink-0"
        >
          <Plus className="w-4 h-4" />
          ประกาศหาบ้าน
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {adoption.map(cat => {
          const requested = adoptState[cat.id] === 'requested';
          const isOwn = cat.poster.id === currentUser.activeCat.id;

          return (
            <div key={cat.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col">
              <img src={cat.img} className="w-full h-44 object-cover" alt={cat.name} />
              <div className="p-4 flex flex-col flex-1">

                {/* Poster */}
                <div className="flex items-center gap-1.5 mb-2">
                  <img src={cat.poster.avatar} className="w-4 h-4 rounded-full object-cover shrink-0" alt="" />
                  <span className="text-[11px] text-[#65676B]">
                    ประกาศโดย <span className="font-semibold text-[#050505]">{cat.poster.name}</span>
                    {isOwn && <span className="text-[#4267B2]"> (คุณ)</span>}
                  </span>
                </div>

                {/* Name + meta */}
                <h3 className="font-bold text-[15px] text-gray-800 leading-tight">{cat.name}</h3>
                <p className="text-[12px] text-gray-400 mt-0.5 mb-2">
                  {cat.gender === 'ผู้' ? '♂' : '♀'} {cat.gender} · อายุ {cat.age} · {cat.location}
                </p>

                {/* Story */}
                <p className="text-[12px] text-gray-500 leading-snug mb-3 flex-1 line-clamp-3">{cat.story}</p>

                {/* Contact reveal after expressing interest */}
                {requested && !isOwn && cat.contact && (
                  <div className="mb-3 bg-green-50 border border-green-200 rounded-lg px-3 py-2 flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-green-600 shrink-0" />
                    <div>
                      <p className="text-[10px] text-green-600 font-semibold">ข้อมูลติดต่อ</p>
                      <p className="text-[12px] text-green-800 font-medium">{cat.contact}</p>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => handleAdopt(cat)}
                  disabled={requested || isOwn}
                  className={`mt-auto w-full font-bold text-sm py-2 rounded-lg transition-colors border flex items-center justify-center gap-2
                    ${isOwn
                      ? 'bg-gray-50 text-gray-400 border-gray-200 cursor-default'
                      : requested
                        ? 'bg-green-50 text-green-600 border-green-200 cursor-default'
                        : 'bg-sky-50 hover:bg-sky-100 text-sky-600 border-sky-200 cursor-pointer'}`}
                >
                  {isOwn
                    ? 'ประกาศของคุณ'
                    : requested
                      ? <><CheckCircle className="w-4 h-4" /> ส่งความสนใจแล้ว</>
                      : <><Heart className="w-4 h-4" /> สนใจรับเลี้ยง</>}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <CreateAdoptionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleAddAdoption}
      />
    </div>
  );
};

export default AdoptionPage;
