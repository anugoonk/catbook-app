const CATS = [
  { id: 'orange',    bg: '#FFB347', ear: '#E8870A', eye: '#2E7D32', cheek: '#FF8C69', name: 'ส้ม' },
  { id: 'gray',      bg: '#9E9E9E', ear: '#616161', eye: '#1565C0', cheek: '#BDBDBD', name: 'เทา' },
  { id: 'black',     bg: '#37474F', ear: '#1C313A', eye: '#FFD600', cheek: '#546E7A', name: 'ดำ' },
  { id: 'white',     bg: '#ECEFF1', ear: '#CFD8DC', eye: '#1976D2', cheek: '#F8BBD9', name: 'ขาว' },
  { id: 'brown',     bg: '#8D6E63', ear: '#5D4037', eye: '#388E3C', cheek: '#BCAAA4', name: 'น้ำตาล' },
  { id: 'golden',    bg: '#FFD54F', ear: '#F9A825', eye: '#1565C0', cheek: '#FFCC02', name: 'ทอง' },
  { id: 'pink',      bg: '#F48FB1', ear: '#E91E8C', eye: '#6A1B9A', cheek: '#FCE4EC', name: 'ชมพู' },
  { id: 'lavender',  bg: '#CE93D8', ear: '#9C27B0', eye: '#E65100', cheek: '#EDE7F6', name: 'ม่วง' },
  { id: 'teal',      bg: '#4DB6AC', ear: '#00796B', eye: '#BF360C', cheek: '#B2DFDB', name: 'ฟ้าเขียว' },
  { id: 'blue',      bg: '#64B5F6', ear: '#1565C0', eye: '#E65100', cheek: '#BBDEFB', name: 'ฟ้า' },
  { id: 'lime',      bg: '#AED581', ear: '#689F38', eye: '#880E4F', cheek: '#DCEDC8', name: 'เขียว' },
  { id: 'red',       bg: '#EF9A9A', ear: '#C62828', eye: '#1A237E', cheek: '#FFCDD2', name: 'แดง' },
];

export const COVERS = [
  { id: 'blue-purple',  css: 'linear-gradient(135deg,#667eea,#764ba2)', name: 'ม่วงน้ำเงิน' },
  { id: 'pink-red',     css: 'linear-gradient(135deg,#f093fb,#f5576c)', name: 'ชมพูแดง' },
  { id: 'sky-blue',     css: 'linear-gradient(135deg,#4facfe,#00f2fe)', name: 'ฟ้าใส' },
  { id: 'sunset',       css: 'linear-gradient(135deg,#fa709a,#fee140)', name: 'พระอาทิตย์ตก' },
  { id: 'orange-gold',  css: 'linear-gradient(135deg,#f6d365,#fda085)', name: 'ส้มทอง' },
  { id: 'green-yellow', css: 'linear-gradient(135deg,#0fd850,#f9f047)', name: 'เขียวเหลือง' },
  { id: 'ocean',        css: 'linear-gradient(135deg,#2980B9,#6DD5FA)', name: 'มหาสมุทร' },
  { id: 'dark',         css: 'linear-gradient(135deg,#434343,#000000)', name: 'กลางคืน' },
  { id: 'mint',         css: 'linear-gradient(135deg,#a8edea,#fed6e3)', name: 'มินต์ชมพู' },
  { id: 'forest',       css: 'linear-gradient(135deg,#134e5e,#71b280)', name: 'ป่าไม้' },
];

function CatSVG({ cat, size = 80 }) {
  const { bg, ear, eye, cheek } = cat;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      {/* Body circle */}
      <circle cx="50" cy="55" r="42" fill={bg} />
      {/* Left ear */}
      <polygon points="14,42 24,8 44,38" fill={ear} />
      <polygon points="19,40 24,14 40,38" fill="#FFB7C5" opacity="0.6" />
      {/* Right ear */}
      <polygon points="56,38 76,8 86,42" fill={ear} />
      <polygon points="60,38 76,14 81,40" fill="#FFB7C5" opacity="0.6" />
      {/* Face circle */}
      <circle cx="50" cy="58" r="36" fill={bg} />
      {/* Cheeks */}
      <circle cx="28" cy="66" r="9" fill={cheek} opacity="0.5" />
      <circle cx="72" cy="66" r="9" fill={cheek} opacity="0.5" />
      {/* Left eye white */}
      <ellipse cx="37" cy="54" rx="9" ry="10" fill="white" />
      {/* Right eye white */}
      <ellipse cx="63" cy="54" rx="9" ry="10" fill="white" />
      {/* Left eye iris */}
      <circle cx="37" cy="55" r="6" fill={eye} />
      {/* Right eye iris */}
      <circle cx="63" cy="55" r="6" fill={eye} />
      {/* Left pupil */}
      <ellipse cx="37" cy="56" rx="3" ry="4" fill="#111" />
      {/* Right pupil */}
      <ellipse cx="63" cy="56" rx="3" ry="4" fill="#111" />
      {/* Eye shine */}
      <circle cx="39" cy="53" r="2" fill="white" opacity="0.9" />
      <circle cx="65" cy="53" r="2" fill="white" opacity="0.9" />
      {/* Nose */}
      <polygon points="50,65 47,70 53,70" fill="#FF9999" />
      {/* Mouth */}
      <path d="M47,70 Q50,74 53,70" fill="none" stroke="#99666699" strokeWidth="1.5" />
      {/* Left whiskers */}
      <line x1="14" y1="65" x2="43" y2="67" stroke="#66666688" strokeWidth="1.5" />
      <line x1="14" y1="71" x2="43" y2="69" stroke="#66666688" strokeWidth="1.5" />
      {/* Right whiskers */}
      <line x1="57" y1="67" x2="86" y2="65" stroke="#66666688" strokeWidth="1.5" />
      <line x1="57" y1="69" x2="86" y2="71" stroke="#66666688" strokeWidth="1.5" />
    </svg>
  );
}

export function catToDataUrl(cat, size = 200) {
  const { bg, ear, eye, cheek } = cat;
  const svg = `<svg width="${size}" height="${size}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="55" r="42" fill="${bg}"/>
    <polygon points="14,42 24,8 44,38" fill="${ear}"/>
    <polygon points="19,40 24,14 40,38" fill="#FFB7C5" opacity="0.6"/>
    <polygon points="56,38 76,8 86,42" fill="${ear}"/>
    <polygon points="60,38 76,14 81,40" fill="#FFB7C5" opacity="0.6"/>
    <circle cx="50" cy="58" r="36" fill="${bg}"/>
    <circle cx="28" cy="66" r="9" fill="${cheek}" opacity="0.5"/>
    <circle cx="72" cy="66" r="9" fill="${cheek}" opacity="0.5"/>
    <ellipse cx="37" cy="54" rx="9" ry="10" fill="white"/>
    <ellipse cx="63" cy="54" rx="9" ry="10" fill="white"/>
    <circle cx="37" cy="55" r="6" fill="${eye}"/>
    <circle cx="63" cy="55" r="6" fill="${eye}"/>
    <ellipse cx="37" cy="56" rx="3" ry="4" fill="#111"/>
    <ellipse cx="63" cy="56" rx="3" ry="4" fill="#111"/>
    <circle cx="39" cy="53" r="2" fill="white" opacity="0.9"/>
    <circle cx="65" cy="53" r="2" fill="white" opacity="0.9"/>
    <polygon points="50,65 47,70 53,70" fill="#FF9999"/>
    <path d="M47,70 Q50,74 53,70" fill="none" stroke="#99666699" stroke-width="1.5"/>
    <line x1="14" y1="65" x2="43" y2="67" stroke="#66666688" stroke-width="1.5"/>
    <line x1="14" y1="71" x2="43" y2="69" stroke="#66666688" stroke-width="1.5"/>
    <line x1="57" y1="67" x2="86" y2="65" stroke="#66666688" stroke-width="1.5"/>
    <line x1="57" y1="69" x2="86" y2="71" stroke="#66666688" stroke-width="1.5"/>
  </svg>`;
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
}

export default function CatAvatarPicker({ selectedId, onSelect }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
      {CATS.map(cat => (
        <button
          key={cat.id}
          onClick={() => onSelect(cat)}
          title={cat.name}
          style={{
            background: 'none', border: 'none', padding: 2, cursor: 'pointer',
            borderRadius: '50%',
            outline: selectedId === cat.id ? `3px solid #4267B2` : '3px solid transparent',
            transition: 'transform 0.1s, outline 0.1s',
            transform: selectedId === cat.id ? 'scale(1.15)' : 'scale(1)',
          }}
        >
          <CatSVG cat={cat} size={52} />
        </button>
      ))}
    </div>
  );
}

export { CATS };
