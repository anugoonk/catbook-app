import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Image as ImageIcon, Heart, Cat, Smile, Edit3, UserPlus, MessageCircle, ArrowLeft, X } from 'lucide-react';
import CreatePostBox from '../components/CreatePostBox';
import PostCard from '../components/PostCard';
import Toast from '../components/Toast';
import useToast from '../hooks/useToast';
import { mockPosts, mockUsers, mockCats } from '../data/mockData';
import { useUser } from '../context/UserContext';
import { uploadFile } from '../services/apiClient';
import { authApi, profileApi } from '../services/commerceApi';

const TABS = ['โพสต์', 'เกี่ยวกับ', 'เพื่อนเหมียว', 'รูปภาพ'];

const ProfilePage = () => {
  const { currentUser, viewedCat, setViewedCat, updateProfile } = useUser();
  const navigate = useNavigate();

  const isOwnProfile = !viewedCat || viewedCat.id === currentUser.activeCat.id;

  const resolveProfile = () => {
    if (isOwnProfile) {
      return { cat: currentUser.activeCat, ownerName: currentUser.ownerName };
    }
    const u = mockUsers.find(u => u.activeCat.id === viewedCat.id);
    if (u) return { cat: u.activeCat, ownerName: u.ownerName };
    const c = mockCats.find(c => c.id === viewedCat.id);
    return {
      cat: { ...viewedCat, breed: c?.breed || '—', bio: '—', status: 'ออนไลน์', cover: viewedCat.avatar },
      ownerName: c?.owner || '—',
    };
  };

  const { cat: profileCat, ownerName: profileOwner } = resolveProfile();
  const basePosts = mockPosts.filter(p => p.cat.id === profileCat.id);

  const [activeTab, setActiveTab] = useState('โพสต์');
  const [ownPosts, setOwnPosts] = useState([]);
  const [coverImg, setCoverImg] = useState(currentUser.activeCat.cover);
  const [avatarImg, setAvatarImg] = useState(currentUser.activeCat.avatar);
  const [toast, showToast] = useToast();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', breed: '', bio: '' });
  const [friendIds, setFriendIds] = useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      await authApi.deleteAccount();
      window.location.href = '/login';
    } catch {
      showToast('ลบบัญชีไม่สำเร็จ กรุณาลองใหม่');
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const profilePosts = isOwnProfile ? [...ownPosts, ...basePosts] : basePosts;
  const handleAddPost = (newPost) => setOwnPosts(prev => [newPost, ...prev]);

  const openEditModal = () => {
    setEditForm({
      name: currentUser.activeCat.name,
      breed: currentUser.activeCat.breed || '',
      bio: currentUser.activeCat.bio || '',
    });
    setIsEditModalOpen(true);
  };

  const handleSaveProfile = () => {
    if (!editForm.name.trim()) return;
    updateProfile({
      name: editForm.name.trim(),
      breed: editForm.breed.trim(),
      bio: editForm.bio.trim(),
    });
    setIsEditModalOpen(false);
    showToast('อัปเดตโปรไฟล์สำเร็จ! 🐾');
  };
  const coverRef = useRef(null);
  const avatarRef = useRef(null);

  useEffect(() => {
    setActiveTab('โพสต์');
    setCoverImg(currentUser.activeCat.cover);
    setAvatarImg(currentUser.activeCat.avatar);
  }, [viewedCat?.id, currentUser.activeCat.id, currentUser.activeCat.avatar, currentUser.activeCat.cover]);

  useEffect(() => () => {
    if (coverImg?.startsWith('blob:')) URL.revokeObjectURL(coverImg);
    if (avatarImg?.startsWith('blob:')) URL.revokeObjectURL(avatarImg);
  }, [coverImg, avatarImg]);

  const displayCover = isOwnProfile ? coverImg : (profileCat.cover || profileCat.avatar);
  const displayAvatar = isOwnProfile ? avatarImg : profileCat.avatar;

  const handleFileChange = async (e, type) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    e.target.value = '';

    // Immediate blob preview
    const blobUrl = URL.createObjectURL(file);
    if (type === 'avatar') setAvatarImg(blobUrl);
    else setCoverImg(blobUrl);
    showToast('กำลังอัปโหลดรูปภาพ...');

    try {
      const { url } = await uploadFile(file);
      URL.revokeObjectURL(blobUrl);

      const cat = currentUser.activeCat;
      const updatedFields = type === 'avatar' ? { avatar: url } : { cover: url };
      await profileApi.update({ name: cat.name, breed: cat.breed, bio: cat.bio, avatar: cat.avatar, cover: cat.cover, ...updatedFields });
      updateProfile(updatedFields);
      if (type === 'avatar') setAvatarImg(url);
      else setCoverImg(url);
      showToast('อัปเดตรูปภาพสำเร็จ! 🐾');
    } catch {
      URL.revokeObjectURL(blobUrl);
      if (type === 'avatar') setAvatarImg(currentUser.activeCat.avatar);
      else setCoverImg(currentUser.activeCat.cover);
      showToast('อัปโหลดไม่สำเร็จ กรุณาลองใหม่');
    }
  };

  const addFriend = () => {
    setFriendIds(prev => prev.includes(profileCat.id) ? prev : [...prev, profileCat.id]);
    showToast(`${profileCat.name} added to local friends`);
  };

  const openMessage = () => {
    navigate(`/messages?cat=${encodeURIComponent(profileCat.id)}`);
  };

  return (
    <div className="w-full">
      <Toast message={toast} />

      {!isOwnProfile && (
        <button
          onClick={() => { setViewedCat(null); navigate('/profile'); }}
          className="flex items-center gap-1.5 text-[#4267B2] font-semibold text-sm mb-3 hover:underline"
        >
          <ArrowLeft className="w-4 h-4" /> ← กลับโปรไฟล์ของฉัน
        </button>
      )}

      <div className="bg-white rounded-b-xl shadow-sm mb-4 relative pb-4">
        {/* Cover */}
        <div className="h-64 w-full bg-gray-200 rounded-b-xl overflow-hidden relative">
          <img src={displayCover} className="w-full h-full object-cover" alt="cover" />
          {isOwnProfile && (
            <>
              <button
                onClick={() => coverRef.current?.click()}
                className="absolute bottom-4 right-4 bg-white/80 hover:bg-white text-gray-800 px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors"
              >
                <ImageIcon className="w-4 h-4" /> เปลี่ยนรูปหน้าปก
              </button>
              <input ref={coverRef} type="file" accept="image/*" className="hidden"
                onChange={e => handleFileChange(e, 'cover')} />
            </>
          )}
        </div>

        {/* Avatar + actions */}
        <div className="px-8 relative flex justify-between items-end -mt-16 mb-4">
          <div className="flex items-end gap-4">
            <div className="relative">
              <img
                src={displayAvatar}
                className="w-32 h-32 rounded-full border-4 border-white object-cover shadow-md bg-white z-10 relative"
                alt="avatar"
              />
              {isOwnProfile && (
                <>
                  <button
                    onClick={() => avatarRef.current?.click()}
                    className="absolute bottom-2 right-2 bg-gray-200 hover:bg-gray-300 p-2 rounded-full z-20 transition-colors"
                  >
                    <ImageIcon className="w-4 h-4 text-gray-800" />
                  </button>
                  <input ref={avatarRef} type="file" accept="image/*" className="hidden"
                    onChange={e => handleFileChange(e, 'avatar')} />
                </>
              )}
            </div>
            <div className="mb-2">
              <h1 className="text-3xl font-bold text-gray-800">{profileCat.name}</h1>
              <p className="text-gray-500 font-medium">{profileCat.bio || '—'}</p>
            </div>
          </div>

          <div className="mb-2 flex gap-2">
            {isOwnProfile ? (
              <button
                onClick={openEditModal}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-colors"
              >
                <Edit3 className="w-4 h-4" /> แก้ไขโปรไฟล์
              </button>
            ) : (
              <>
                <button
                  onClick={addFriend}
                  disabled={friendIds.includes(profileCat.id)}
                  className="bg-[#4267B2] hover:bg-[#3b5998] disabled:bg-green-100 disabled:text-green-700 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-colors"
                >
                  <UserPlus className="w-4 h-4" /> เพิ่มเพื่อน
                </button>
                <button
                  onClick={openMessage}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-colors"
                >
                  <MessageCircle className="w-4 h-4" /> ส่งข้อความ
                </button>
              </>
            )}
          </div>
        </div>

        {/* Tab bar */}
        <div className="border-t border-gray-200 pt-2 px-4 flex gap-1 text-sm font-bold text-gray-500">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-t-lg transition-colors ${
                activeTab === tab ? 'text-sky-500 border-b-4 border-sky-500' : 'hover:bg-gray-100'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Tab: โพสต์ */}
      {activeTab === 'โพสต์' && (
        <div className="flex gap-4">
          <div className="w-1/3 hidden md:block">
            <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-200 mb-4">
              <h2 className="font-bold text-lg mb-4 text-gray-800">แนะนำตัว</h2>
              <ul className="space-y-3 text-sm text-gray-600">
                <li className="flex items-center gap-2">
                  <Heart className="w-4 h-4 text-gray-400 shrink-0" />
                  สายพันธุ์: <span className="font-medium text-gray-800">{profileCat.breed || '—'}</span>
                </li>
                <li className="flex items-center gap-2">
                  <Cat className="w-4 h-4 text-gray-400 shrink-0" />
                  ทาสรับใช้: <span className="font-medium text-gray-800">{profileOwner}</span>
                </li>
                <li className="flex items-center gap-2">
                  <Smile className="w-4 h-4 text-gray-400 shrink-0" />
                  สถานะ: <span className="font-medium text-gray-800">{profileCat.status || '—'}</span>
                </li>
              </ul>
            </div>
          </div>
          <div className="w-full md:w-2/3">
            {isOwnProfile && <CreatePostBox onAddPost={handleAddPost} />}
            {profilePosts.length > 0
              ? profilePosts.map(p => <PostCard key={p.id} post={p} />)
              : (
                <div className="bg-white rounded-xl shadow-sm p-10 border border-gray-200 text-center text-gray-400">
                  <p className="text-4xl mb-2">📷</p>
                  <p className="font-medium text-[15px]">ยังไม่มีโพสต์</p>
                </div>
              )
            }
          </div>
        </div>
      )}

      {/* Tab: เกี่ยวกับ */}
      {activeTab === 'เกี่ยวกับ' && (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h2 className="font-bold text-xl mb-5 text-gray-800">เกี่ยวกับ {profileCat.name}</h2>
          <ul className="space-y-4 text-sm text-gray-600">
            <li className="flex items-center gap-3">
              <Heart className="w-5 h-5 text-gray-400 shrink-0" />
              สายพันธุ์: <span className="font-medium text-gray-800">{profileCat.breed || '—'}</span>
            </li>
            <li className="flex items-center gap-3">
              <Cat className="w-5 h-5 text-gray-400 shrink-0" />
              ทาสรับใช้: <span className="font-medium text-gray-800">{profileOwner}</span>
            </li>
            <li className="flex items-center gap-3">
              <Smile className="w-5 h-5 text-gray-400 shrink-0" />
              สถานะ: <span className="font-medium text-gray-800">{profileCat.status || '—'}</span>
            </li>
          </ul>

          {isOwnProfile && (
            <div className="mt-8 pt-6 border-t border-gray-200">
              <h3 className="font-bold text-[15px] text-red-600 mb-1">โซนอันตราย</h3>
              <p className="text-xs text-gray-400 mb-3">การลบบัญชีจะลบโพสต์ ความคิดเห็น และข้อมูลทั้งหมดอย่างถาวร ไม่สามารถกู้คืนได้</p>
              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-sm font-semibold text-red-500 border border-red-200 px-4 py-2 rounded-lg hover:bg-red-50 transition-colors"
                >
                  ลบบัญชีของฉัน
                </button>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <p className="font-bold text-red-700 text-sm mb-1">ยืนยันการลบบัญชี?</p>
                  <p className="text-xs text-red-500 mb-3">ข้อมูลทั้งหมดจะถูกลบอย่างถาวร ไม่มีทางกู้คืน</p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleDeleteAccount}
                      disabled={isDeleting}
                      className="px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 disabled:bg-red-300 rounded-lg transition-colors"
                    >
                      {isDeleting ? 'กำลังลบ...' : 'ยืนยัน ลบบัญชี'}
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-4 py-2 text-sm font-semibold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      ยกเลิก
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab: เพื่อนเหมียว */}
      {activeTab === 'เพื่อนเหมียว' && (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h2 className="font-bold text-xl mb-2 text-gray-800">เพื่อนเหมียวของ {profileCat.name}</h2>
          <p className="text-gray-400 text-sm">ไปดูรายชื่อเพื่อนทั้งหมดได้ที่เมนู "เพื่อนเหมียว" 🐾</p>
        </div>
      )}

      {/* Photos tab */}
      {activeTab === TABS[3] && (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h2 className="font-bold text-xl mb-2 text-gray-800">Photos</h2>
          <p className="text-gray-400 text-sm">No photos yet.</p>
        </div>
      )}

      {/* Edit Profile Modal */}
      {isEditModalOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4"
          onClick={(e) => { if (e.target === e.currentTarget) setIsEditModalOpen(false); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">

            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-800">แก้ไขโปรไฟล์</h2>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-gray-500 hover:bg-gray-100 p-2 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  ชื่อแมว <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="ชื่อแมวของคุณ"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#4267B2]/30 focus:border-[#4267B2] transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">สายพันธุ์</label>
                <input
                  type="text"
                  value={editForm.breed}
                  onChange={e => setEditForm(f => ({ ...f, breed: e.target.value }))}
                  placeholder="เช่น เปอร์เซีย, Scottish Fold"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#4267B2]/30 focus:border-[#4267B2] transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">คำอธิบาย (Bio)</label>
                <textarea
                  rows={3}
                  value={editForm.bio}
                  onChange={e => setEditForm(f => ({ ...f, bio: e.target.value }))}
                  placeholder="เล่าเรื่องราวของคุณ..."
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#4267B2]/30 focus:border-[#4267B2] transition-all resize-none"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 pb-5 flex gap-3 justify-end">
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="px-5 py-2 rounded-lg text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleSaveProfile}
                disabled={!editForm.name.trim()}
                className="px-5 py-2 rounded-lg text-sm font-semibold text-white bg-[#4267B2] hover:bg-[#3b5998] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                บันทึก
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
