const SOUNDS = [
  'เมี๊ยว', 'เหมียว', 'เมี้ยว', 'เมี๊ยวๆ', 'เมียว~',
  'ปุ๋ยๆ', 'ฟรื้อ~', 'เหมียวๆ', 'เมี๊ยวๆๆ', 'เมี้ยว!',
  'เมี๊ยว~', 'เหมียว💕', 'เมี้ยว🐾', 'ปุ๋ย!',
];
const rnd = () => SOUNDS[Math.floor(Math.random() * SOUNDS.length)];

const MAP = {
  'สวัสดี': 'เมี๊ยวดี', 'สวัสดีครับ': 'เมี๊ยวดีครับ', 'สวัสดีค่ะ': 'เมี๊ยวดีค่ะ',
  'หวัดดี': 'เมี้ยวดี', 'ลาก่อน': 'เมี๊ยวลา~',
  'ฉัน': 'เมี๊ยว', 'ผม': 'เมี๊ยว', 'หนู': 'เมี้ยว', 'เรา': 'พวกเมี๊ยว',
  'คุณ': 'เมียว~', 'เธอ': 'เมียว~', 'เขา': 'เมี้ยวๆ', 'มัน': 'เมียว',
  'รัก': 'เหมียว💕', 'ชอบ': 'เมี๊ยวชอบ', 'เกลียด': 'เมี้ยว!!!',
  'ดีใจ': 'เมี๊ยวดีใจ!', 'เสียใจ': 'เมี้ยวๆๆ', 'โกรธ': 'เมี้ยว!!!!',
  'กลัว': 'เมี้ยว!!', 'ตกใจ': 'เมี้ยว!!!', 'เหนื่อย': 'เมี้ยวเหนื่อย',
  'สุข': 'เมี๊ยวสุข', 'เศร้า': 'เมี้ยวๆ', 'หิว': 'เมี้ยวหิวว',
  'ง่วง': 'เมี้ยวง่วง', 'เมื่อย': 'เมี้ยวๆ',
  'กิน': 'อ้าว~', 'นอน': 'zzz...เมี้ยว', 'หลับ': 'zzz...',
  'เล่น': 'เมี๊ยวเล่น!', 'วิ่ง': 'เมี๊ยว!!!', 'กระโดด': 'เมี๊ยว!!',
  'ไป': 'เมี๊ยวไป~', 'มา': 'มาเมี๊ยว', 'ทำ': 'เมี๊ยวทำ',
  'ดู': 'เมี๊ยวดู', 'ฟัง': 'เมี๊ยวฟัง',
  'บ้าน': 'รังเมี๊ยว', 'ปลา': 'ปลาอร่อย🐟', 'นม': 'นมเย็น~',
  'ข้าว': 'เมี๊ยว🍚', 'กล่อง': 'กล่องเมี๊ยว📦',
  'ดี': 'เมี๊ยวดี', 'สวย': 'เหมียวสวย', 'น่ารัก': 'เมี๊ยวน่ารัก💕',
  'ใช่': 'เมี๊ยว!', 'ไม่': 'เมี้ยว...', 'ขอบคุณ': 'ขอบเมี๊ยว',
  'ขอโทษ': 'เมี้ยว...ขอโทษ', 'โอเค': 'เมี๊ยวโอเค',
  'อยาก': 'เมี๊ยวอยาก', 'ต้องการ': 'เมี๊ยวต้องการ',
  'hello': 'meow', 'hi': 'mew~', 'bye': 'meow~bye',
  'love': 'purrr💕', 'food': 'meow meow', 'fish': '🐟meow',
  'sleep': 'zzz~meow', 'play': 'meow!!!', 'yes': 'meow!', 'no': 'mew...',
  'i': 'meow', 'me': 'meow', 'you': 'mew~', 'good': 'purr~',
  'cat': 'meow meow meow', 'cute': 'purr💕',
};

export const translateToMeow = (text) => {
  if (!text.trim()) return '';
  const tokens = text.split(/(\s+)/);
  const result = [];
  let wordCount = 0;
  let nextInsert = 3 + Math.floor(Math.random() * 3);

  for (const token of tokens) {
    if (/^\s+$/.test(token)) { result.push(token); continue; }
    if (token.startsWith('@')) { result.push(token); continue; }

    const punct = token.match(/[.!?,]$/)?.[0] || '';
    const clean = token.replace(/[.!?,]$/, '');
    const lower = clean.toLowerCase();

    const mapped = MAP[clean] || MAP[lower];
    if (mapped) {
      result.push(mapped + punct);
    } else {
      const r = Math.random();
      if      (r < 0.20) result.push(rnd() + punct);
      else if (r < 0.34) result.push(rnd() + clean + punct);
      else if (r < 0.46) result.push(clean + '~เมี๊ยว' + punct);
      else               result.push(token);
    }

    wordCount++;
    if (wordCount >= nextInsert) {
      result.push(' ' + rnd());
      wordCount = 0;
      nextInsert = 3 + Math.floor(Math.random() * 3);
    }
  }

  const joined = result.join('').trimEnd();
  const endsWithSound = SOUNDS.some(s => joined.endsWith(s));
  const lastFour = joined.slice(-4);
  return endsWithSound || lastFour.includes('💕') || lastFour.includes('🐾')
    ? joined
    : joined + ' ' + rnd() + '~';
};
