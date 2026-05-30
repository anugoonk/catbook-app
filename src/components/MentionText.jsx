import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { mockUsers, mockCats } from '../data/mockData';

const fullCats = mockUsers.map(u => u.activeCat);
const extraCats = mockCats.filter(c => !mockUsers.some(u => u.activeCat.id === c.id));
const allCats = [...fullCats, ...extraCats];

const MentionText = ({ text, className = '' }) => {
  const { setViewedCat } = useUser();
  const navigate = useNavigate();

  if (!text) return null;

  const segments = [];
  const regex = /@(\S+)/g;
  let lastIdx = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIdx) {
      segments.push({ type: 'text', value: text.slice(lastIdx, match.index) });
    }
    const name = match[1];
    const cat = allCats.find(c => c.name === name);
    segments.push({ type: cat ? 'mention' : 'text', value: match[0], cat });
    lastIdx = regex.lastIndex;
  }

  if (lastIdx < text.length) {
    segments.push({ type: 'text', value: text.slice(lastIdx) });
  }

  return (
    <span className={className}>
      {segments.map((seg, i) =>
        seg.type === 'mention' ? (
          <span
            key={i}
            className="text-[#4267B2] font-semibold cursor-pointer hover:underline"
            onClick={e => {
              e.stopPropagation();
              setViewedCat(seg.cat);
              navigate('/profile');
            }}
          >
            {seg.value}
          </span>
        ) : (
          <span key={i}>{seg.value}</span>
        )
      )}
    </span>
  );
};

export default MentionText;
