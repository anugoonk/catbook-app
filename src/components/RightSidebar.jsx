import { useNavigate } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { mockUsers } from '../data/mockData';
import { useUser } from '../context/UserContext';

const RightSidebar = ({ onOpenChat }) => {
  const navigate = useNavigate();
  const { currentUser, setViewedCat } = useUser();

  if (!currentUser) return null;

  const friends = mockUsers
    .filter(u => u.activeCat.id !== currentUser.activeCat.id)
    .map(u => ({ ...u.activeCat, userId: u.id }));

  const goToProfile = (cat) => { setViewedCat(cat); navigate('/profile'); };

  return (
    <aside className="hidden lg:block w-[280px] xl:w-[320px] shrink-0 sticky top-[56px] h-[calc(100vh-56px)] overflow-y-auto no-scrollbar px-2 pt-3">
      <div className="mb-5">
        <h3 className="text-[#65676B] font-bold text-[13px] px-1 mb-2">เพื่อนเหมียวออนไลน์ 🟢</h3>
        <div className="space-y-0.5">
          {friends.map(cat => (
            <div
              key={cat.id}
              className="flex items-center gap-3 px-2 py-2 hover:bg-[#e4e6eb] rounded-lg transition-colors group"
            >
              <div className="relative shrink-0 cursor-pointer" onClick={() => goToProfile(cat)}>
                <img src={cat.avatar} className="w-9 h-9 rounded-full object-cover hover:opacity-90 transition-opacity" alt={cat.name} />
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
              </div>
              <span
                className="text-[15px] font-medium text-[#050505] flex-1 cursor-pointer hover:underline"
                onClick={() => goToProfile(cat)}
              >
                {cat.name}
              </span>
              <button
                onClick={() => onOpenChat(cat)}
                className="opacity-0 group-hover:opacity-100 text-[#65676B] hover:text-[#4267B2] p-1.5 rounded-full hover:bg-[#d8dadf] transition-all shrink-0"
                title="แชท"
              >
                <MessageCircle className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
};

export default RightSidebar;
