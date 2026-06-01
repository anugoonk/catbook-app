import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, UserCheck, UserPlus } from 'lucide-react';
import Toast from '../components/Toast';
import useToast from '../hooks/useToast';
import { getAllUsers, followUser, unfollowUser, getFollowing } from '../services/userStore';
import { useUser } from '../context/UserContext';

const FriendsPage = () => {
  const { currentUser, setViewedCat } = useUser();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, showToast] = useToast();
  const [allFriends, setAllFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [followed, setFollowed] = useState({});

  useEffect(() => {
    Promise.all([
      getAllUsers(),
      getFollowing(currentUser.uid),
    ]).then(([users, followingSet]) => {
      const list = users
        .filter(u => u.uid !== currentUser.uid && u.activeCat?.name)
        .map(u => ({
          id: u.uid,
          uid: u.uid,
          name: u.activeCat.name,
          avatar: u.activeCat.avatar || '/favicon.svg',
          breed: u.activeCat.breed || '',
          bio: u.activeCat.bio || '',
          owner: u.name || '',
        }));
      setAllFriends(list);
      const map = {};
      followingSet.forEach(uid => { map[uid] = true; });
      setFollowed(map);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [currentUser.uid]);

  const filteredCats = allFriends.filter(c => {
    const q = searchQuery.toLowerCase();
    return !q || c.name.toLowerCase().includes(q) || c.owner.toLowerCase().includes(q) || c.breed.toLowerCase().includes(q);
  });

  const toggleFollow = async (cat) => {
    const was = followed[cat.id];
    setFollowed(prev => ({ ...prev, [cat.id]: !was }));
    try {
      if (was) await unfollowUser(currentUser.uid, cat.id);
      else await followUser(currentUser.uid, cat.id);
      showToast(was ? `ยกเลิกการติดตาม ${cat.name} แล้ว` : `ติดตาม ${cat.name} แล้ว! 🐾`);
    } catch {
      setFollowed(prev => ({ ...prev, [cat.id]: was }));
      showToast('เกิดข้อผิดพลาด กรุณาลองใหม่');
    }
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

        {loading && (
          <div className="text-center py-12 text-gray-400">
            <p className="text-3xl mb-2 animate-bounce">🐾</p>
            <p className="font-medium">กำลังโหลด...</p>
          </div>
        )}

        {!loading && filteredCats.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p className="text-3xl mb-2">🐾</p>
            <p className="font-medium">{searchQuery ? 'ไม่พบเพื่อนที่ค้นหา' : 'ยังไม่มีเพื่อนเหมียว'}</p>
          </div>
        )}

        {!loading && filteredCats.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredCats.map(cat => {
              const isFollowed = followed[cat.id];
              return (
                <div key={cat.id} className="border border-gray-200 rounded-lg overflow-hidden flex flex-col items-center p-4">
                  <img
                    src={cat.avatar}
                    className="w-24 h-24 rounded-full object-cover mb-3 shadow-sm cursor-pointer hover:opacity-90 transition-opacity border border-gray-100"
                    alt={cat.name}
                    onClick={() => goToProfile(cat)}
                  />
                  <h3 className="font-bold text-gray-800 cursor-pointer hover:underline" onClick={() => goToProfile(cat)}>
                    {cat.name}
                  </h3>
                  <p className="text-xs text-gray-500 mb-1">{cat.breed || 'ไม่ระบุสายพันธุ์'}</p>
                  {cat.owner && <p className="text-xs text-[#65676B] mb-3">ทาส: {cat.owner}</p>}
                  <button
                    onClick={() => toggleFollow(cat)}
                    className={`w-full font-medium text-sm py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1.5
                      ${isFollowed
                        ? 'bg-gray-100 hover:bg-red-50 hover:text-red-500 text-gray-800'
                        : 'bg-[#4267B2] hover:bg-[#3b5998] text-white'}`}
                  >
                    {isFollowed ? <UserCheck className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                    {isFollowed ? 'ติดตามแล้ว' : 'ติดตาม'}
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
