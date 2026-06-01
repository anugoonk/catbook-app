import { useState, useRef } from 'react';
import CatAvatarPicker, { CATS, COVERS, catToDataUrl } from './CatAvatarPicker';
import { completeProfile } from '../services/userStore';
import { useUser } from '../context/UserContext';

function compressImage(file, size = 200) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      const s = Math.min(img.width, img.height);
      const x = (img.width - s) / 2;
      const y = (img.height - s) / 2;
      ctx.drawImage(img, x, y, s, s, 0, 0, size, size);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.75));
    };
    img.src = url;
  });
}

const OnboardingModal = ({ onComplete }) => {
  const { currentUser } = useUser();
  const [catName, setCatName] = useState('');
  const [breed, setBreed] = useState('');
  const [bio, setBio] = useState('');
  const [selectedCat, setSelectedCat] = useState(CATS[0]);
  const [selectedCover, setSelectedCover] = useState(COVERS[0]);
  const [uploadedAvatar, setUploadedAvatar] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('avatar'); // 'avatar' | 'cover'
  const fileRef = useRef(null);

  const avatarUrl = uploadedAvatar || catToDataUrl(selectedCat);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const compressed = await compressImage(file);
    setUploadedAvatar(compressed);
    e.target.value = '';
  };

  const handleSave = async () => {
    if (!catName.trim()) { setError('กรุณาใส่ชื่อแมวก่อนนะ 🐾'); return; }
    setSaving(true);
    setError('');
    try {
      await completeProfile(currentUser.uid, {
        catName: catName.trim(),
        breed: breed.trim(),
        bio: bio.trim(),
        avatar: avatarUrl,
        cover: selectedCover.css,
        email: currentUser.email,
        name: currentUser.name,
      });
      onComplete({ name: catName.trim(), breed: breed.trim(), bio: bio.trim(), avatar: avatarUrl, cover: selectedCover.css });
    } catch (err) {
      setError('❌ ' + (err.code || err.message));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:16, overflowY:'auto' }}>
      <div style={{ background:'white', width:'100%', maxWidth:460, borderRadius:16, overflow:'hidden', boxShadow:'0 25px 50px rgba(0,0,0,0.3)', margin:'auto' }}>

        {/* Header */}
        <div style={{ background:'#4267B2', padding:'18px 24px', textAlign:'center', color:'white' }}>
          <div style={{ fontSize:28, marginBottom:6 }}>🐾</div>
          <h2 style={{ fontSize:17, fontWeight:900, margin:0 }}>ยินดีต้อนรับสู่ CatBook!</h2>
          <p style={{ fontSize:12, color:'#bfdbfe', margin:'4px 0 0' }}>สร้างตัวละครแมวของคุณได้เลย</p>
        </div>

        {/* Preview */}
        <div style={{ position:'relative', height:100 }}>
          <div style={{ height:72, background:selectedCover.css }} />
          <div style={{ position:'absolute', left:20, bottom:0, width:64, height:64, borderRadius:'50%', border:'3px solid white', overflow:'hidden', background:'white', boxShadow:'0 2px 8px rgba(0,0,0,0.15)' }}>
            <img src={avatarUrl} alt="cat" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
          </div>
          <div style={{ position:'absolute', left:94, bottom:8 }}>
            <p style={{ margin:0, fontWeight:700, fontSize:14, color:'#050505' }}>{catName || 'ชื่อแมวของคุณ'}</p>
            <p style={{ margin:0, fontSize:12, color:'#65676B' }}>{breed || 'สายพันธุ์'}</p>
          </div>
        </div>

        <div style={{ padding:'16px 20px', display:'flex', flexDirection:'column', gap:14 }}>

          {/* Tabs */}
          <div style={{ display:'flex', gap:8 }}>
            {[['avatar','🐱 เลือกแมว'],['cover','🖼️ หน้าปก']].map(([id,label]) => (
              <button key={id} onClick={() => setTab(id)} style={{
                flex:1, padding:'8px 0', borderRadius:8, border:'none', cursor:'pointer', fontWeight:600, fontSize:13,
                background: tab===id ? '#4267B2' : '#f0f2f5',
                color: tab===id ? 'white' : '#65676B',
              }}>{label}</button>
            ))}
          </div>

          {/* Avatar Picker */}
          {tab === 'avatar' && (
            <div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                <p style={{ fontSize:12, color:'#65676B', margin:0, fontWeight:600 }}>
                  {uploadedAvatar ? '📷 ใช้รูปที่อัปโหลด' : `เลือกแมวที่ชอบ — ${selectedCat.name}`}
                </p>
                <div style={{ display:'flex', gap:6 }}>
                  <button onClick={() => fileRef.current?.click()} style={{ fontSize:11, padding:'4px 10px', borderRadius:6, border:'1px solid #4267B2', background:'white', color:'#4267B2', cursor:'pointer', fontWeight:600 }}>
                    📷 อัปโหลดรูปแมว
                  </button>
                  {uploadedAvatar && (
                    <button onClick={() => setUploadedAvatar(null)} style={{ fontSize:11, padding:'4px 10px', borderRadius:6, border:'1px solid #ddd', background:'white', color:'#999', cursor:'pointer' }}>
                      ใช้ avatar แทน
                    </button>
                  )}
                </div>
              </div>
              <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handleFileChange} />
              {!uploadedAvatar && <CatAvatarPicker selectedId={selectedCat.id} onSelect={setSelectedCat} />}
              {uploadedAvatar && (
                <div style={{ display:'flex', justifyContent:'center', padding:'12px 0' }}>
                  <img src={uploadedAvatar} alt="uploaded" style={{ width:100, height:100, borderRadius:'50%', objectFit:'cover', border:'3px solid #4267B2' }} />
                </div>
              )}
            </div>
          )}

          {/* Cover Picker */}
          {tab === 'cover' && (
            <div>
              <p style={{ fontSize:12, color:'#65676B', margin:'0 0 8px', fontWeight:600 }}>เลือกหน้าปก — {selectedCover.name}</p>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:6 }}>
                {COVERS.map(cover => (
                  <button key={cover.id} onClick={() => setSelectedCover(cover)} title={cover.name} style={{
                    height:36, borderRadius:8, border:'none', cursor:'pointer',
                    background: cover.css,
                    outline: selectedCover.id === cover.id ? '3px solid #4267B2' : '3px solid transparent',
                    transform: selectedCover.id === cover.id ? 'scale(1.1)' : 'scale(1)',
                    transition:'transform 0.1s, outline 0.1s',
                  }} />
                ))}
              </div>
            </div>
          )}

          {/* Cat Name */}
          <div>
            <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:4 }}>
              ชื่อแมว <span style={{ color:'red' }}>*</span>
            </label>
            <input
              type="text"
              value={catName}
              onChange={e => { setCatName(e.target.value); setError(''); }}
              placeholder="เช่น มูมู, ออมสิน, น้องหมาก"
              autoFocus
              style={{ width:'100%', padding:'10px 14px', borderRadius:8, border:'1px solid #dddfe2', fontSize:15, boxSizing:'border-box', outline:'none' }}
            />
          </div>

          {/* Breed */}
          <div>
            <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:4 }}>สายพันธุ์</label>
            <input list="breed-list" type="text" value={breed} onChange={e => setBreed(e.target.value)}
              placeholder="เลือกหรือพิมพ์สายพันธุ์..."
              style={{ width:'100%', padding:'10px 14px', borderRadius:8, border:'1px solid #dddfe2', fontSize:15, background:'white', boxSizing:'border-box', outline:'none' }}
            />
            <datalist id="breed-list">
              {['สก็อตติชโฟลด์ (Scottish Fold)','บริติชชอร์ตแฮร์ (British Shorthair)','เปอร์เซีย (Persian)','แร็กดอลล์ (Ragdoll)','เมนคูน (Maine Coon)','วิเชียรมาศ (Siamese)','อเมริกันชอร์ตแฮร์ (American Shorthair)','เอ็กโซติกชอร์ตแฮร์ (Exotic Shorthair)','เบงกอล (Bengal)','มันช์กิน (Munchkin)','นอร์วีเจียนฟอเรสต์แคต (Norwegian Forest Cat)','รัสเซียนบลู (Russian Blue)','เบอร์แมน (Birman)','อบิสซิเนียน (Abyssinian)','พม่า (Burmese)','ขาวมณี (Khao Manee)','โคราช (Korat)','แมวไทย (Mixed Thai)','ไม่ทราบสายพันธุ์'].map(b => <option key={b} value={b} />)}
            </datalist>
          </div>

          {/* Bio */}
          <div>
            <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:4 }}>แนะนำตัวสั้นๆ</label>
            <textarea value={bio} onChange={e => setBio(e.target.value)}
              placeholder="เมี๊ยวๆ ขอแนะนำตัวหน่อยนะ..."
              rows={2}
              style={{ width:'100%', padding:'10px 14px', borderRadius:8, border:'1px solid #dddfe2', fontSize:15, resize:'none', boxSizing:'border-box', outline:'none' }}
            />
          </div>

          {error && <p style={{ color:'red', fontSize:13, textAlign:'center', margin:0 }}>{error}</p>}

          <button onClick={handleSave} disabled={saving} style={{
            width:'100%', padding:'12px 0', borderRadius:12, border:'none',
            background: saving ? '#ccc' : '#4267B2', color:'white',
            fontSize:16, fontWeight:700, cursor: saving ? 'not-allowed' : 'pointer',
          }}>
            {saving ? 'กำลังบันทึก...' : 'เริ่มใช้งาน CatBook 🐾'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingModal;
