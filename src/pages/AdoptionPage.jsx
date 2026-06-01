import { useState, useEffect } from 'react';
import { CheckCircle, Heart, Plus, Phone } from 'lucide-react';
import Toast from '../components/Toast';
import useToast from '../hooks/useToast';
import CreateAdoptionModal from '../components/CreateAdoptionModal';
import { useUser } from '../context/UserContext';
import { subscribeAdoptions, createAdoption } from '../services/adoptionStore';

function compressImg(file, maxW = 800, maxH = 600, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxW / img.width, maxH / img.height);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = reject;
    img.src = url;
  });
}

const AdoptionPage = () => {
  const { currentUser } = useUser();
  const [adoption, setAdoption] = useState([]);
  const [adoptState, setAdoptState] = useState({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toast, showToast] = useToast();
  const [successToast, showSuccessToast] = useToast();

  useEffect(() => {
    const unsub = subscribeAdoptions((cats) => {
      setAdoption(cats);
      setAdoptState(prev => Object.fromEntries(cats.map(c => [c.id, prev[c.id] ?? 'idle'])));
    });
    return unsub;
  }, []);

  const handleAdopt = (cat) => {
    if (adoptState[cat.id] !== 'idle') return;
    setAdoptState(prev => ({ ...prev, [cat.id]: 'requested' }));
    showSuccessToast('ส่งความสนใจรับเลี้ยงเรียบร้อยแล้ว! ผู้ประกาศจะติดต่อกลับไป');
  };

  const handleAddAdoption = async (newCat) => {
    try {
      let img = newCat.img;
      if (img && img.startsWith('blob:')) {
        const res = await fetch(img);
        const blob = await res.blob();
        img = await compressImg(new File([blob], 'img.jpg', { type: blob.type }));
        URL.revokeObjectURL(newCat.img);
      }
      await createAdoption({
        name: newCat.name || '',
        age: newCat.age || '',
        gender: newCat.gender || 'ผู้',
        location: newCat.location || '',
        story: newCat.story || '',
        contact: newCat.contact || '',
        img: img || '',
        posterUid: currentUser.uid,
        poster: {
          id: currentUser.uid,
          name: currentUser.activeCat?.name || currentUser.name,
          avatar: currentUser.activeCat?.avatar || '',
        },
      });
      showToast(`ประกาศหาบ้านให้ "${newCat.name}" เรียบร้อยแล้ว! 🐾`);
    } catch {
      showToast('ประกาศไม่สำเร็จ กรุณาลองใหม่');
    }
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

      {adoption.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 py-16 text-center text-gray-400">
          <p className="text-4xl mb-2">🏡</p>
          <p className="font-semibold">ยังไม่มีประกาศหาบ้าน</p>
          <p className="text-sm mt-1">เป็นคนแรกที่ช่วยน้องแมวหาบ้านใหม่</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {adoption.map(cat => {
          const requested = adoptState[cat.id] === 'requested';
          const isOwn = cat.posterUid === currentUser.uid || cat.poster?.id === currentUser.uid;

          return (
            <div key={cat.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col">
              {cat.img ? (
                <img src={cat.img} className="w-full h-44 object-cover" alt={cat.name} />
              ) : (
                <div className="w-full h-44 bg-orange-50 flex items-center justify-center text-5xl">🐱</div>
              )}
              <div className="p-4 flex flex-col flex-1">

                {/* Poster */}
                <div className="flex items-center gap-1.5 mb-2">
                  {cat.poster?.avatar && (
                    <img src={cat.poster.avatar} className="w-4 h-4 rounded-full object-cover shrink-0" alt="" />
                  )}
                  <span className="text-[11px] text-[#65676B]">
                    ประกาศโดย <span className="font-semibold text-[#050505]">{cat.poster?.name}</span>
                    {isOwn && <span className="text-[#4267B2]"> (คุณ)</span>}
                  </span>
                </div>

                <h3 className="font-bold text-[15px] text-gray-800 leading-tight">{cat.name}</h3>
                <p className="text-[12px] text-gray-400 mt-0.5 mb-2">
                  {cat.gender === 'ผู้' ? '♂' : '♀'} {cat.gender} · อายุ {cat.age} · {cat.location}
                </p>

                <p className="text-[12px] text-gray-500 leading-snug mb-3 flex-1 line-clamp-3">{cat.story}</p>

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
