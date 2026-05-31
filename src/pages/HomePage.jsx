import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import CreatePostBox from '../components/CreatePostBox';
import PostCard from '../components/PostCard';
import { socialApi } from '../services/socialApi';
import { useUser } from '../context/UserContext';

const HomePage = () => {
  const { currentUser } = useUser();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const inputRef = useRef(null);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await socialApi.listPosts();
      setPosts(data.posts || []);
    } catch {
      // keep empty — user sees no posts rather than crashing
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const handleAddPost = (newPost) => {
    setPosts(prev => [newPost, ...prev]);
  };

  const filteredPosts = searchQuery.trim()
    ? posts.filter(p =>
        p.cat?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.content?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : posts;

  const isGuest = !currentUser;

  return (
    <div className="w-full">
      {isGuest && (
        <div className="bg-white border border-[#dddfe2] rounded-xl shadow-sm mb-3 px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1">
            <p className="font-bold text-[#050505] text-[15px]">🐾 ยินดีต้อนรับสู่ CatBook!</p>
            <p className="text-[13px] text-gray-500 mt-0.5">เข้าสู่ระบบเพื่อโพสต์ แสดงความรู้สึก และพูดคุยกับแมวทั่วไทย</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <a href="/register" className="px-4 py-2 rounded-lg bg-[#4267B2] text-white font-bold text-sm hover:bg-[#3b5998] transition-colors">
              สมัครสมาชิก
            </a>
            <a href="/login" className="px-4 py-2 rounded-lg border border-[#4267B2] text-[#4267B2] font-bold text-sm hover:bg-blue-50 transition-colors">
              เข้าสู่ระบบ
            </a>
          </div>
        </div>
      )}

      {!isGuest && <CreatePostBox onAddPost={handleAddPost} />}

      {/* Search bar */}
      <div className="relative mb-3">
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="ค้นหาเพื่อนแมว..."
          className="w-full bg-white border border-[#dddfe2] rounded-full py-2.5 pl-11 pr-10 text-[15px] text-[#050505] outline-none focus:border-[#4267B2] focus:ring-2 focus:ring-[#4267B2]/20 placeholder:text-[#bcc0c4] transition-all shadow-sm"
        />
        <button
          onClick={() => searchQuery ? (setSearchQuery(''), inputRef.current?.focus()) : inputRef.current?.focus()}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#65676B] hover:text-[#4267B2] transition-colors"
        >
          <Search className="w-[18px] h-[18px]" />
        </button>
        {searchQuery && (
          <button
            onClick={() => { setSearchQuery(''); inputRef.current?.focus(); }}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#65676B] hover:text-[#050505] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-lg border border-[#dddfe2] shadow-sm p-4 animate-pulse">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-gray-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-28" />
                  <div className="h-2 bg-gray-100 rounded w-20" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-gray-100 rounded w-full" />
                <div className="h-3 bg-gray-100 rounded w-4/5" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Posts */}
      {!loading && filteredPosts.length === 0 && (
        <div className="bg-white rounded-xl border border-[#dddfe2] shadow-sm p-10 text-center">
          <p className="text-4xl mb-3">{searchQuery ? '🔍' : '🐱'}</p>
          <p className="font-semibold text-[#050505] text-[15px]">
            {searchQuery ? 'ไม่พบเพื่อนแมวที่คุณค้นหา' : 'ยังไม่มีโพสต์ — เป็นคนแรกที่โพสต์!'}
          </p>
          {searchQuery && (
            <p className="text-[#65676B] text-sm mt-1">
              <button onClick={() => setSearchQuery('')} className="text-[#4267B2] hover:underline">ล้างการค้นหา</button>
            </p>
          )}
        </div>
      )}

      {!loading && filteredPosts.map(post => (
        <PostCard key={post.id} post={post} onDeleted={(id) => setPosts(prev => prev.filter(p => p.id !== id))} />
      ))}
    </div>
  );
};

export default HomePage;
