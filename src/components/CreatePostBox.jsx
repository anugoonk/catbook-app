import { useState } from 'react';
import { Image as ImageIcon, Smile, UserPlus } from 'lucide-react';
import { useUser } from '../context/UserContext';
import CreatePostModal from './CreatePostModal';

const CreatePostBox = () => {
  const { currentUser } = useUser();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [initialPanel, setInitialPanel] = useState(null);

  if (!currentUser) return null;

  const openModal = (panel = null) => {
    setInitialPanel(panel);
    setIsModalOpen(true);
  };

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm border border-[#dddfe2] p-3 mb-3">
        <div className="flex gap-2 mb-3">
          <img
            src={currentUser.activeCat?.avatar}
            alt="Profile"
            className="w-10 h-10 rounded-full object-cover shrink-0"
          />
          <button
            onClick={() => openModal(null)}
            className="flex-1 bg-[#f0f2f5] hover:bg-[#e4e6eb] rounded-full px-4 text-left text-[#65676B] text-[15px] transition-colors"
          >
            คุณกำลังคิดอะไรอยู่เหมียว?
          </button>
        </div>

        <div className="border-t border-[#dddfe2] pt-2 flex">
          <button
            onClick={() => openModal('photo')}
            className="flex-1 flex items-center justify-center gap-2 text-[#65676B] hover:bg-[#f0f2f5] py-2 rounded-lg transition-colors font-semibold text-sm"
          >
            <ImageIcon className="w-5 h-5 text-green-500 shrink-0" />
            <span className="hidden sm:inline">รูปภาพ/วิดีโอ</span>
          </button>
          <button
            onClick={() => openModal('tag')}
            className="flex-1 flex items-center justify-center gap-2 text-[#65676B] hover:bg-[#f0f2f5] py-2 rounded-lg transition-colors font-semibold text-sm"
          >
            <UserPlus className="w-5 h-5 text-blue-500 shrink-0" />
            <span className="hidden sm:inline">แท็กเพื่อนเหมียว</span>
          </button>
          <button
            onClick={() => openModal('feeling')}
            className="flex-1 flex items-center justify-center gap-2 text-[#65676B] hover:bg-[#f0f2f5] py-2 rounded-lg transition-colors font-semibold text-sm"
          >
            <Smile className="w-5 h-5 text-yellow-500 shrink-0" />
            <span className="hidden sm:inline">ความรู้สึก/กิจกรรม</span>
          </button>
        </div>
      </div>

      <CreatePostModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialPanel={initialPanel}
      />
    </>
  );
};

export default CreatePostBox;
