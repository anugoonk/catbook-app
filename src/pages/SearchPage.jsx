import { useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Search, MapPin, Gift, PawPrint } from 'lucide-react';
import { mockUsers, mockCats, mockPosts, mockLostCats } from '../data/mockData';
import { useUser } from '../context/UserContext';

const buildAllCats = () => {
  const fromUsers = mockUsers.map(u => ({
    id: u.activeCat.id,
    name: u.activeCat.name,
    avatar: u.activeCat.avatar,
    breed: u.activeCat.breed || '—',
    ownerName: u.ownerName,
    bio: u.activeCat.bio || '',
    status: u.activeCat.status || '',
  }));
  const userIds = new Set(fromUsers.map(c => c.id));
  const fromCats = mockCats
    .filter(c => !userIds.has(c.id))
    .map(c => ({ id: c.id, name: c.name, avatar: c.avatar, breed: c.breed || '—', ownerName: c.owner, bio: '', status: '' }));
  return [...fromUsers, ...fromCats];
};

const highlight = (text, q) => {
  if (!q) return text;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-200 text-gray-900 rounded">{text.slice(idx, idx + q.length)}</mark>
      {text.slice(idx + q.length)}
    </>
  );
};

const SearchPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { setViewedCat } = useUser();
  const navigate = useNavigate();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [activeTab, setActiveTab] = useState('all');

  const allCats = useMemo(buildAllCats, []);

  const q = query.trim().toLowerCase();

  const matchedCats = q
    ? allCats.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.breed.toLowerCase().includes(q) ||
        c.ownerName.toLowerCase().includes(q)
      )
    : [];

  const matchedPosts = q
    ? mockPosts.filter(p =>
        p.content.toLowerCase().includes(q) ||
        (p.feeling || '').toLowerCase().includes(q) ||
        (p.location || '').toLowerCase().includes(q) ||
        p.cat.name.toLowerCase().includes(q)
      )
    : [];

  const matchedLostCats = q
    ? mockLostCats.filter(l =>
        l.name.toLowerCase().includes(q) ||
        l.location.toLowerCase().includes(q)
      )
    : [];

  const totalResults = matchedCats.length + matchedPosts.length + matchedLostCats.length;

  const handleChange = (val) => {
    setQuery(val);
    setSearchParams(val.trim() ? { q: val.trim() } : {});
    setActiveTab('all');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && query.trim()) {
      setSearchParams({ q: query.trim() });
    }
  };

  const goToProfile = (cat) => {
    setViewedCat({ id: cat.id, name: cat.name, avatar: cat.avatar });
    navigate('/profile');
  };

  const TABS = [
    { id: 'all',   label: 'ทั้งหมด', count: totalResults },
    { id: 'cats',  label: 'แมว',      count: matchedCats.length },
    { id: 'posts', label: 'โพสต์',    count: matchedPosts.length },
    { id: 'lost',  label: 'แมวหาย',   count: matchedLostCats.length },
  ];

  return (
    <div className="w-full pb-20">
      {/* Search bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
        <div className="relative">
          <Search className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={e => handleChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="ค้นหาแมว โพสต์ หรือสถานที่..."
            autoFocus
            className="w-full bg-[#f0f2f5] rounded-full py-3 pl-12 pr-4 text-[15px] outline-none focus:ring-2 focus:ring-[#4267B2]/20 transition-all"
          />
        </div>
        {q && (
          <p className="text-sm text-gray-500 mt-2.5 pl-1">
            พบ <span className="font-semibold text-gray-800">{totalResults}</span> รายการสำหรับ{' '}
            <span className="font-semibold text-[#4267B2]">"{query.trim()}"</span>
          </p>
        )}
      </div>

      {/* Tabs */}
      {q && totalResults > 0 && (
        <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar pb-1">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold transition-colors
                ${activeTab === tab.id
                  ? 'bg-[#4267B2] text-white shadow-sm'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'}`}
            >
              {tab.label}{tab.count > 0 ? ` (${tab.count})` : ''}
            </button>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!q && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 py-16 text-center">
          <Search className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="font-semibold text-gray-500">ค้นหาเพื่อนเหมียว</p>
          <p className="text-sm text-gray-400 mt-1">พิมพ์ชื่อแมว สายพันธุ์ โพสต์ หรือสถานที่</p>
        </div>
      )}

      {/* No results */}
      {q && totalResults === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 py-16 text-center">
          <p className="text-5xl mb-3">🐾</p>
          <p className="font-semibold text-gray-500">ไม่พบผลการค้นหา</p>
          <p className="text-sm text-gray-400 mt-1">ลองค้นหาด้วยคำอื่น หรือตรวจสอบการสะกดคำ</p>
        </div>
      )}

      {/* Results */}
      {q && totalResults > 0 && (
        <div className="space-y-4">

          {/* Cats */}
          {(activeTab === 'all' || activeTab === 'cats') && matchedCats.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-4 pt-4 pb-3 border-b border-gray-100 flex items-center gap-2">
                <PawPrint className="w-4 h-4 text-[#4267B2]" />
                <h2 className="font-bold text-gray-800">แมว <span className="text-gray-400 font-normal text-sm">({matchedCats.length})</span></h2>
              </div>
              <div className="divide-y divide-gray-50">
                {matchedCats.map(cat => (
                  <div
                    key={cat.id}
                    onClick={() => goToProfile(cat)}
                    className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors group"
                  >
                    <img src={cat.avatar} className="w-12 h-12 rounded-full object-cover shrink-0 border-2 border-white shadow-sm" alt="" />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-800">{highlight(cat.name, query.trim())}</p>
                      <p className="text-sm text-gray-500">{highlight(cat.breed, query.trim())} · ทาส: {highlight(cat.ownerName, query.trim())}</p>
                      {cat.bio && <p className="text-xs text-gray-400 truncate mt-0.5">{cat.bio}</p>}
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); goToProfile(cat); }}
                      className="shrink-0 text-sm font-semibold text-[#4267B2] hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    >
                      ดูโปรไฟล์
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Posts */}
          {(activeTab === 'all' || activeTab === 'posts') && matchedPosts.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-4 pt-4 pb-3 border-b border-gray-100 flex items-center gap-2">
                <Search className="w-4 h-4 text-[#4267B2]" />
                <h2 className="font-bold text-gray-800">โพสต์ <span className="text-gray-400 font-normal text-sm">({matchedPosts.length})</span></h2>
              </div>
              <div className="divide-y divide-gray-50">
                {matchedPosts.map(post => (
                  <div
                    key={post.id}
                    className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => goToProfile({ id: post.cat.id, name: post.cat.name, avatar: post.cat.avatar })}
                  >
                    <img src={post.cat.avatar} className="w-10 h-10 rounded-full object-cover shrink-0 border border-gray-200 mt-0.5" alt="" />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-800 text-sm">{post.cat.name}</p>
                      <p className="text-[13px] text-gray-600 mt-0.5 line-clamp-2">{highlight(post.content, query.trim())}</p>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                        <span>{post.time}</span>
                        <span>🐾 {post.likes}</span>
                        <span>💬 {post.comments}</span>
                      </div>
                    </div>
                    {post.image && (
                      <img src={post.image} className="w-16 h-16 rounded-lg object-cover shrink-0" alt="" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Lost cats */}
          {(activeTab === 'all' || activeTab === 'lost') && matchedLostCats.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-4 pt-4 pb-3 border-b border-gray-100 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#4267B2]" />
                <h2 className="font-bold text-gray-800">แมวหาย <span className="text-gray-400 font-normal text-sm">({matchedLostCats.length})</span></h2>
              </div>
              <div className="divide-y divide-gray-50">
                {matchedLostCats.map(cat => (
                  <div key={cat.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer">
                    <img src={cat.img} className="w-12 h-12 rounded-full object-cover shrink-0 border border-gray-200" alt="" />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-800">{highlight(cat.name, query.trim())}</p>
                      <p className="text-sm text-gray-500 flex items-center gap-1">
                        <MapPin className="w-3 h-3 shrink-0" />
                        {highlight(cat.location, query.trim())}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">หายเมื่อ {cat.lastSeen}</p>
                    </div>
                    {cat.reward > 0 && (
                      <span className="shrink-0 bg-yellow-100 text-yellow-700 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                        <Gift className="w-3 h-3" />
                        {cat.reward.toLocaleString()} ฿
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
};

export default SearchPage;
