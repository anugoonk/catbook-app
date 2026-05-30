import { useState } from 'react';
import { Copy, RefreshCw } from 'lucide-react';
import PawIcon from '../components/PawIcon';
import Toast from '../components/Toast';
import useToast from '../hooks/useToast';
import { translateToMeow } from '../utils/meowTranslator';

/* ── Example phrases ── */
const EXAMPLES = [
  'สวัสดีครับ วันนี้อากาศดีมาก',
  'หิวข้าวมากเลย ทาสยังไม่กลับบ้าน',
  'ฉันรักคุณมากที่สุดเลยนะ',
  'อยากนอนทั้งวันจริงๆ',
  'วันนี้เล่นกล่องแล้วสนุกมาก',
];

const CAT_FACE = { idle: '😸', thinking: '🤔', happy: '😻', copy: '😺' };

const MeowTranslatorPage = () => {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [mood, setMood] = useState('idle');
  const [busy, setBusy] = useState(false);
  const [toast, showToast] = useToast();

  const translate = () => {
    if (!input.trim() || busy) return;
    setBusy(true);
    setMood('thinking');
    setTimeout(() => {
      setOutput(translateToMeow(input));
      setMood('happy');
      setBusy(false);
    }, 550);
  };

  const handleCopy = async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      setMood('copy');
      showToast('คัดลอกภาษาแมวแล้ว! 🐾');
      setTimeout(() => setMood('happy'), 1500);
    } catch {
      showToast('ไม่สามารถคัดลอกได้');
    }
  };

  const handleClear = () => {
    setInput(''); setOutput(''); setMood('idle');
  };

  const applyExample = (ex) => {
    setInput(ex); setOutput(''); setMood('idle');
  };

  const handleRetranslate = () => {
    if (!input.trim()) return;
    setOutput(translateToMeow(input));
    setMood('happy');
  };

  return (
    <div className="w-full pb-20 max-w-xl mx-auto">
      <Toast message={toast} />

      {/* Header card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-4 overflow-hidden">
        <div className="bg-gradient-to-r from-[#4267B2] to-[#6b8dd6] px-6 py-6 text-center">
          <div className="text-6xl mb-2 transition-all duration-300 select-none">{CAT_FACE[mood]}</div>
          <h1 className="text-white font-bold text-2xl tracking-tight">Meow Translator</h1>
          <p className="text-white/75 text-sm mt-1">แปลภาษาคนเป็นภาษาแมว 🐾</p>
        </div>

        {/* Example chips */}
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
          <p className="text-[11px] text-gray-400 font-bold mb-2 uppercase tracking-wider">ลองดูตัวอย่าง</p>
          <div className="flex flex-wrap gap-1.5">
            {EXAMPLES.map(ex => (
              <button
                key={ex}
                onClick={() => applyExample(ex)}
                className="text-xs bg-white border border-gray-200 hover:border-[#4267B2] hover:bg-blue-50 hover:text-[#4267B2] text-gray-600 px-3 py-1.5 rounded-full transition-colors font-medium"
              >
                {ex.length > 18 ? ex.slice(0, 18) + '…' : ex}
              </button>
            ))}
          </div>
        </div>

        {/* Input area */}
        <div className="p-4">
          <label className="block text-sm font-semibold text-gray-600 mb-2">
            ข้อความภาษาคน 🧑
          </label>
          <textarea
            value={input}
            onChange={e => { setInput(e.target.value); if (output) setOutput(''); setMood('idle'); }}
            onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) translate(); }}
            placeholder="พิมพ์ข้อความที่ต้องการแปลที่นี่..."
            rows={4}
            className="w-full bg-[#f0f2f5] rounded-xl px-4 py-3 text-[15px] outline-none focus:ring-2 focus:ring-[#4267B2]/20 resize-none transition-all placeholder:text-gray-400"
          />
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400">{input.length} ตัวอักษร</span>
              <span className="text-xs text-gray-300">Ctrl+Enter เพื่อแปล</span>
            </div>
            <div className="flex gap-2">
              {(input || output) && (
                <button
                  onClick={handleClear}
                  className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  ล้าง
                </button>
              )}
              <button
                onClick={translate}
                disabled={!input.trim() || busy}
                className="flex items-center gap-2 bg-[#4267B2] hover:bg-[#3b5998] disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-5 py-2 rounded-lg font-semibold text-sm transition-colors"
              >
                <PawIcon className="w-4 h-4" />
                {busy ? 'กำลังแปล...' : 'แปลเลย!'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Output card */}
      {output && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-4 pt-4 pb-3 flex items-center justify-between border-b border-gray-100">
            <div className="flex items-center gap-2">
              <span className="text-xl">😺</span>
              <span className="text-sm font-semibold text-gray-700">ภาษาแมว</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleRetranslate}
                title="แปลใหม่อีกครั้ง"
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                แปลใหม่
              </button>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 text-sm text-[#4267B2] font-semibold hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
                คัดลอก
              </button>
            </div>
          </div>
          <div className="p-4">
            <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border border-blue-100 rounded-xl px-4 py-4 min-h-[80px]">
              <p className="text-[16px] leading-relaxed text-gray-800 font-medium break-words">
                {output}
              </p>
            </div>
            <p className="text-xs text-gray-400 mt-2 text-right">🐾 ผลลัพธ์จะต่างกันทุกครั้งที่แปล</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MeowTranslatorPage;
