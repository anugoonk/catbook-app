import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Image as ImageIcon, Heart, Cat, Smile, Edit3, UserPlus, UserCheck, MessageCircle, ArrowLeft, X, Upload } from 'lucide-react';
import CreatePostBox from '../components/CreatePostBox';
import PostCard from '../components/PostCard';
import Toast from '../components/Toast';
import useToast from '../hooks/useToast';
import { useUser } from '../context/UserContext';
import { updateUserProfile, deleteUserDoc, followUser, unfollowUser, getFollowing, clearUsersCache } from '../services/userStore';
import { subscribePostsByUser, updateAuthorInPosts } from '../services/postStore';
import { deleteUser } from 'firebase/auth';
import { auth } from '../firebase';
import { COVERS } from '../components/CatAvatarPicker';

function compressImage(file, maxW, maxH, quality = 0.75) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxW / img.width, maxH / img.height);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = reject;
    img.src = url;
  });
}

const TABS = ['โพสต์', 'เกี่ยวกับ', 'เพื่อนเหมียว', 'รูปภาพ'];

const ProfilePage = () => {
  const { currentUser, viewedCat, setViewedCat, updateProfile } = useUser();
  const navigate = useNavigate();

  const isOwnProfile = !viewedCat || viewedCat.uid === currentUser.uid || viewedCat.id === currentUser.uid;
  const profileUid = isOwnProfile ? currentUser.uid : (viewedCat?.uid || viewedCat?.id);

  const profileCat = isOwnProfile
    ? (currentUser.activeCat || { name: '', avatar: '/favicon.svg', breed: '', bio: '', cover: '' })
    : { name: viewedCat?.name || '', avatar: viewedCat?.avatar || '/favicon.svg', breed: viewedCat?.breed || '', bio: viewedCat?.bio || '', cover: viewedCat?.cover || '' };
  const profileOwner = isOwnProfile ? currentUser.name : (viewedCat?.owner || '—');

  const [activeTab, setActiveTab] = useState('โพสต์');
  const [posts, setPosts] = useState([]);
  const [coverImg, setCoverImg] = useState(currentUser.activeCat?.cover || '');
  const [avatarImg, setAvatarImg] = useState(currentUser.activeCat?.avatar || '');
  const [toast, showToast] = useToast();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', breed: '', bio: '' });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [showCoverPicker, setShowCoverPicker] = useState(false);
  const coverRef = useRef(null);
  const avatarRef = useRef(null);

  useEffect(() => {
    if (!profileUid) return;
    const unsub = subscribePostsByUser(profileUid, setPosts);
    return unsub;
  }, [profileUid]);

  useEffect(() => {
    setActiveTab('โพสต์');
    if (isOwnProfile) {
      setCoverImg(currentUser.activeCat?.cover || '');
      setAvatarImg(currentUser.activeCat?.avatar || '');
    }
  }, [viewedCat?.id, currentUser.activeCat?.avatar, currentUser.activeCat?.cover, isOwnProfile]);

  useEffect(() => {
    if (isOwnProfile || !profileUid) return;
    getFollowing(currentUser.uid).then(set => setIsFollowing(set.has(profileUid))).catch(() => {});
  }, [isOwnProfile, profileUid, currentUser.uid]);

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      await deleteUserDoc(currentUser.uid);
      await deleteUser(auth.currentUser);
      window.location.href = '/login';
    } catch (err) {
      if (err.code === 'auth/requires-recent-login') {
        showToast('กรุณา Sign in ใหม่ก่อนลบบัญชี');
      } else {
        showToast('ลบบัญชีไม่สำเร็จ กรุณาลองใหม่');
      }
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const openEditModal = () => {
    setEditForm({
      name: currentUser.activeCat?.name || '',
      breed: currentUser.activeCat?.breed || '',
      bio: currentUser.activeCat?.bio || '',
    });
    setIsEditModalOpen(true);
  };

  const handleSaveProfile = async () => {
    if (!editForm.name.trim()) return;
    try {
      const trimName = editForm.name.trim();
      await updateUserProfile(currentUser.uid, {
        'activeCat.name': trimName,
        'activeCat.breed': editForm.breed.trim(),
        'activeCat.bio': editForm.bio.trim(),
      });
      clearUsersCache();
      updateProfile({ name: trimName, breed: editForm.breed.trim(), bio: editForm.bio.trim() });
      updateAuthorInPosts(currentUser.uid, { name: trimName }).catch(console.error);
      setIsEditModalOpen(false);
      showToast('อัปเดตโปรไฟล์สำเร็จ! 🐾');
    } catch {
      showToast('บันทึกไม่สำเร็จ กรุณาลองใหม่');
    }
  };

  const handleFileChange = async (e, type) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    e.target.value = '';
    showToast('กำลังบีบอัดรูปภาพ...');

    try {
      const maxW = type === 'avatar' ? 400 : 1200;
      const maxH = type === 'avatar' ? 400 : 400;
      const b64 = await compressImage(file, maxW, maxH, 0.75);
      if (type === 'avatar') {
        setAvatarImg(b64);
        await updateUserProfile(currentUser.uid, { 'activeCat.avatar': b64 });
        clearUsersCache();
        updateProfile({ avatar: b64 });
        updateAuthorInPosts(currentUser.uid, { avatar: b64 }).catch(console.error);
      } else {
        setCoverImg(b64);
        await updateUserProfile(currentUser.uid, { 'activeCat.cover': b64 });
        updateProfile({ cover: b64 });
      }
      showToast('อัปเดตรูปภาพสำเร็จ! 🐾');
    } catch {
      showToast('อัปโหลดไม่สำเร็จ กรุณาลองใหม่');
    }
  };

  const selectCover = async (css) => {
    setCoverImg(css);
    setShowCoverPicker(false);
    try {
      await updateUserProfile(currentUser.uid, { 'activeCat.cover': css });
      updateProfile({ cover: css });
      showToast('อัปเดตหน้าปกสำเร็จ! 🐾');
    } catch {
      showToast('บันทึกไม่สำเร็จ');
    }
  };

  const toggleFollow = async () => {
    const prev = isFollowing;
    setIsFollowing(!prev);
    try {
      if (prev) {
        await unfollowUser(currentUser.uid, profileUid);
        showToast(`ยกเลิกการติดตาม ${profileCat.name} แล้ว`);
      } else {
        await followUser(currentUser.uid, profileUid);
        showToast(`ติดตาม ${profileCat.name} แล้ว! 🐾`);
      }
    } catch {
      setIsFollowing(prev);
      showToast('เกิดข้อผิดพลาด กรุณาลองใหม่');
    }
  };

  const openMessage = () => {
    navigate(`/messages?cat=${encodeURIComponent(profileUid)}`);
  };

  const displayCover = isOwnProfile ? (coverImg || '') : (profileCat.cover || '');
  const displayAvatar = isOwnProfile ? (avatarImg || '/favicon.svg') : (profileCat.avatar || '/favicon.svg');
  const isGradient = (v) => v?.startsWith('linear-gradient') || v?.startsWith('radial-gradient');

  return (
    <div className="w-full">
      <Toast message={toast} />

      {!isOwnProfile && (
        <button
          onClick={() => { setViewedCat(null); navigate('/profile'); }}
          className="flex items-center gap-1.5 text-[#4267B2] font-semibold text-sm mb-3 hover:underline"
        >
          <ArrowLeft className="w-4 h-4" /> กลับโปรไฟล์ของฉัน
        </button>
      )}

      <div className="bg-white rounded-b-xl shadow-sm mb-4 relative pb-4">
        {/* Cover */}
        <div className="h-64 w-full bg-gray-200 rounded-b-xl overflow-hidden relative">
          {isGradient(displayCover) ? (
            <div className="w-full h-full" style={{ background: displayCover }} />
          ) : displayCover ? (
            <img src={displayCover} className="w-full h-full object-cover" alt="cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#4267B2] to-[#764ba2]" />
          )}
          {isOwnProfile && (
            <>
              <button
                onClick={() => setShowCoverPicker(true)}
                className="absolute bottom-4 right-4 bg-white/90 hover:bg-white text-gray-800 px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors shadow-sm"
              >
                <ImageIcon className="w-4 h-4" /> เปลี่ยนหน้าปก
              </button>
              <input ref={coverRef} type="file" accept="image/*" className="hidden" onChange={e => handleFileChange(e, 'cover')} />
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
                  <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={e => handleFileChange(e, 'avatar')} />
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
                  onClick={toggleFollow}
                  className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-colors
                    ${isFollowing
                      ? 'bg-gray-100 hover:bg-red-50 hover:text-red-500 text-gray-800'
                      : 'bg-[#4267B2] hover:bg-[#3b5998] text-white'}`}
                >
                  {isFollowing ? <UserCheck className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                  {isFollowing ? 'ติดตามแล้ว' : 'ติดตาม'}
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
            {isOwnProfile && <CreatePostBox />}
            {posts.length > 0
              ? posts.map(p => <PostCard key={p.id} post={p} />)
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

      {/* Tab: รูปภาพ */}
      {activeTab === 'รูปภาพ' && (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h2 className="font-bold text-xl mb-2 text-gray-800">รูปภาพ</h2>
          <p className="text-gray-400 text-sm">ยังไม่มีรูปภาพ</p>
        </div>
      )}

      {/* Cover Picker Modal */}
      {showCoverPicker && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4"
          onClick={e => { if (e.target === e.currentTarget) setShowCoverPicker(false); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-800">เลือกหน้าปก</h2>
              <button onClick={() => setShowCoverPicker(false)} className="p-2 rounded-full hover:bg-gray-100 text-gray-400 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4">
              {/* Gradient swatches */}
              <p className="text-xs font-bold text-gray-500 mb-3 uppercase tracking-wide">เลือกสีพื้นหลัง</p>
              <div className="grid grid-cols-5 gap-2 mb-4">
                {COVERS.map(cover => {
                  const isActive = coverImg === cover.css;
                  return (
                    <button
                      key={cover.id}
                      onClick={() => selectCover(cover.css)}
                      title={cover.name}
                      className={`h-12 rounded-xl transition-all hover:scale-105 active:scale-95 ${isActive ? 'ring-3 ring-[#4267B2] ring-offset-2 scale-105' : ''}`}
                      style={{ background: cover.css }}
                    />
                  );
                })}
              </div>

              {/* Upload custom image */}
              <div className="border-t border-gray-100 pt-3">
                <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">หรืออัพโหลดรูปเอง</p>
                <button
                  onClick={() => { setShowCoverPicker(false); coverRef.current?.click(); }}
                  className="w-full flex items-center justify-center gap-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 font-semibold text-sm py-2.5 rounded-xl transition-colors"
                >
                  <Upload className="w-4 h-4" /> เลือกไฟล์รูปภาพ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {isEditModalOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4"
          onClick={(e) => { if (e.target === e.currentTarget) setIsEditModalOpen(false); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-800">แก้ไขโปรไฟล์</h2>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-gray-500 hover:bg-gray-100 p-2 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

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
                <select
                  value={editForm.breed}
                  onChange={e => setEditForm(f => ({ ...f, breed: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#4267B2]/30 focus:border-[#4267B2] transition-all bg-white"
                >
                  <option value="">— เลือกสายพันธุ์ —</option>
                  {[
                    'สก็อตติชโฟลด์ (Scottish Fold)',
                    'บริติชชอร์ตแฮร์ (British Shorthair)',
                    'เปอร์เซีย (Persian)',
                    'แร็กดอลล์ (Ragdoll)',
                    'เมนคูน (Maine Coon)',
                    'วิเชียรมาศ (Siamese)',
                    'อเมริกันชอร์ตแฮร์ (American Shorthair)',
                    'เอ็กโซติกชอร์ตแฮร์ (Exotic Shorthair)',
                    'เบงกอล (Bengal)',
                    'มันช์กิน (Munchkin)',
                    'นอร์วีเจียนฟอเรสต์แคต (Norwegian Forest Cat)',
                    'รัสเซียนบลู (Russian Blue)',
                    'เบอร์แมน (Birman)',
                    'อบิสซิเนียน (Abyssinian)',
                    'พม่า (Burmese)',
                    'ขาวมณี (Khao Manee)',
                    'โคราช (Korat)',
                    'แมวไทย (Mixed Thai)',
                    'ไม่ทราบสายพันธุ์',
                  ].map(b => <option key={b} value={b}>{b}</option>)}
                </select>
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
