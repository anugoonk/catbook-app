import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, UserCheck, UserPlus } from 'lucide-react';
import Toast from '../components/Toast';
import useToast from '../hooks/useToast';
import { mockUsers } from '../data/mockData';
import { useUser } from '../context/UserContext';

const FriendsPage = () => {
  const { currentUser, setViewedCat } = useUser();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, showToast] = useToast();

  const allFriends = useMemo(() =>
    mockUsers
      .filter(u => u.activeCat.id !== currentUser.activeCat.id)
      .map(u => ({ ...u.activeCat, owner: u.ownerName })),
    [currentUser.activeCat.id]
  );

  const [isFriend, setIsFriend] = useState(
    () => Object.fromEntries(allFriends.map(c => [c.id, true]))
  );

  useEffect(() => {
    setIsFriend(Object.fromEntries(allFriends.map(c => [c.id, true])));
  }, [allFriends]);

  const filteredCats = useMemo(() => {
    const q = searchQuery.toLowerCase();
    if (!q) return allFriends;
    return allFriends.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.owner.toLowerCase().includes(q) ||
      c.breed.toLowerCase().includes(q)
    );
  }, [searchQuery, allFriends]);

  const toggleFriend = (cat) => {
    const was = isFriend[cat.id];
    setIsFriend(prev => ({ ...prev, [cat.id]: !was }));
    showToast(was
      ? `ยกเลิกการเป็นเพื่อนกับ ${cat.name} แล้ว`
      : `เพิ่ม ${cat.name} เป็นเพื่อนแล้ว! 🐾`
    );
  };

  const goToProfile = (cat) => { setViewedCat(cat); navigate('/profile'); };

  return (
    <div className="w-full pb-20">
      <Toast message={toast} />
      <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-200 mb-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-bold text-xl text-gray-800">เพื่อนเหมียวทั้งหมด</h2>
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="ค้นหาเพื่อน..."
              className="bg-[#f0f2f5] rounded-full pl-9 pr-4 py-1.5 text-sm outline-none focus:ring-2 focus:ring-[#4267B2]/20 w-52 transition-all"
            />
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2" />
          </div>
        </div>

        {filteredCats.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-3xl mb-2">🐾</p>
            <p className="font-medium">ไม่พบเพื่อนที่ค้นหา</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredCats.map(cat => {
              const friend = isFriend[cat.id];
              return (
                <div key={cat.id} className="border border-gray-200 rounded-lg overflow-hidden flex flex-col items-center p-4">
                  <img
                    src={cat.avatar}
                    className="w-24 h-24 rounded-full object-cover mb-3 shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
                    alt={cat.name}
                    onClick={() => goToProfile(cat)}
                  />
                  <h3
                    className="font-bold text-gray-800 cursor-pointer hover:underline"
                    onClick={() => goToProfile(cat)}
                  >
                    {cat.name}
                  </h3>
                  <p className="text-xs text-gray-500 mb-3">{cat.breed}</p>
                  <button
                    onClick={() => toggleFriend(cat)}
                    className={`w-full font-medium text-sm py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1.5
                      ${friend
                        ? 'bg-gray-100 hover:bg-red-50 hover:text-red-500 text-gray-800'
                        : 'bg-[#4267B2] hover:bg-[#3b5998] text-white'}`}
                  >
                    {friend ? <UserCheck className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                    {friend ? 'เพื่อนแล้ว' : 'เพิ่มเพื่อน'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default FriendsPage;
