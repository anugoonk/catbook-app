import { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import CreatePostBox from '../components/CreatePostBox';
import PostCard from '../components/PostCard';
import { mockPosts } from '../data/mockData';
import { useUser } from '../context/UserContext';

const HomePage = () => {
  const { currentUser } = useUser();
  const [posts, setPosts] = useState(mockPosts);
  const [searchQuery, setSearchQuery] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    setPosts(mockPosts);
    setSearchQuery('');
  }, [currentUser.activeCat.id]);

  const handleAddPost = (newPost) => {
    setPosts(prev => [newPost, ...prev]);
  };

  const filteredPosts = searchQuery.trim()
    ? posts.filter(p =>
        p.cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : posts;

  const handleIconClick = () => {
    if (searchQuery) {
      setSearchQuery('');
      inputRef.current?.focus();
    } else {
      inputRef.current?.focus();
    }
  };

  return (
    <div className="w-full">
      <CreatePostBox onAddPost={handleAddPost} />

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
          onClick={handleIconClick}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#65676B] hover:text-[#4267B2] transition-colors"
        >
          <Search className="w-4.5 h-4.5 w-[18px] h-[18px]" />
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

      {/* Results */}
      {filteredPosts.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#dddfe2] shadow-sm p-10 text-center">
          <p className="text-4xl mb-3">🔍</p>
          <p className="font-semibold text-[#050505] text-[15px]">ไม่พบเพื่อนแมวที่คุณค้นหา</p>
          <p className="text-[#65676B] text-sm mt-1">ลองค้นหาด้วยชื่ออื่น หรือ
            <button onClick={() => setSearchQuery('')} className="text-[#4267B2] hover:underline ml-1">ล้างการค้นหา</button>
          </p>
        </div>
      ) : (
        filteredPosts.map(post => <PostCard key={post.id} post={post} />)
      )}
    </div>
  );
};

export default HomePage;
