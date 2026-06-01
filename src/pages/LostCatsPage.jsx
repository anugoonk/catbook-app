import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Plus, Phone, MapPin, Calendar } from 'lucide-react';
import Toast from '../components/Toast';
import useToast from '../hooks/useToast';
import CreateLostCatModal from '../components/CreateLostCatModal';
import { useUser } from '../context/UserContext';
import { subscribeLostCats, createLostCat } from '../services/lostCatStore';

const LostCatsPage = () => {
  const { currentUser } = useUser();
  const navigate = useNavigate();
  const isGuest = !currentUser;
  const [lostCats, setLostCats] = useState([]);
  const [tipState, setTipState] = useState({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toast, showToast] = useToast();
  const [successToast, showSuccessToast] = useToast();

  useEffect(() => {
    const unsub = subscribeLostCats((cats) => {
      setLostCats(cats);
      setTipState(prev => Object.fromEntries(cats.map(c => [c.id, prev[c.id] ?? 'idle'])));
    });
    return unsub;
  }, []);

  const handleTip = (cat) => {
    if (isGuest) { navigate('/login'); return; }
    if (tipState[cat.id] !== 'idle') return;
    setTipState(prev => ({ ...prev, [cat.id]: 'sent' }));
    showSuccessToast('ส่งเบาะแสเรียบร้อย! เจ้าของแมวจะติดต่อกลับหาคุณ');
  };

  const handleAddReport = async (newCat) => {
    try {
      await createLostCat({
        name: newCat.name,
        breed: newCat.breed || '',
        age: newCat.age || '',
        gender: newCat.gender || 'ผู้',
        lastSeen: newCat.lastSeen || '',
        location: newCat.location || '',
        reward: Number(newCat.reward) || 0,
        marks: newCat.marks || '',
        contact: newCat.contact || '',
        img: newCat.img || '',
        status: 'active',
        posterUid: currentUser.uid,
        poster: {
          id: currentUser.uid,
          name: currentUser.activeCat?.name || currentUser.name,
          avatar: currentUser.activeCat?.avatar || '',
        },
      });
      showToast(`ประกาศตามหา "${newCat.name}" เรียบร้อยแล้ว! 🔍`);
    } catch {
      showToast('ประกาศไม่สำเร็จ กรุณาลองใหม่');
    }
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
          onClick={() => isGuest ? navigate('/login') : setIsModalOpen(true)}
          className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-bold shadow-sm transition-colors text-sm shrink-0"
        >
          <Plus className="w-4 h-4" />
          แจ้งแมวหาย
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {lostCats.map(cat => {
          const sent = tipState[cat.id] === 'sent';
          const isOwn = currentUser && (cat.posterUid === currentUser.uid || cat.poster?.id === currentUser.uid);

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
