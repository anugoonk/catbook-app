import { useState, useEffect } from 'react';
import { Calendar, MapPin, Plus } from 'lucide-react';
import Toast from '../components/Toast';
import useToast from '../hooks/useToast';
import CreateEventModal from '../components/CreateEventModal';
import { useUser } from '../context/UserContext';
import { subscribeEvents, createEvent, attendEvent, leaveEvent } from '../services/eventStore';

const EventCard = ({ event, currentUser, onToggle }) => {
  const isAttending = (event.attendeeUids || []).includes(currentUser.uid);
  const isOrganizer = event.organizerUid === currentUser.uid || event.organizer?.id === currentUser.uid;
  const count = (event.attendeeUids || []).length;

  return (
    <div className="bg-white rounded-xl border border-[#dddfe2] overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col">
      <div className="relative">
        {event.img ? (
          <img src={event.img} className="w-full h-40 object-cover" alt={event.title} />
        ) : (
          <div className="w-full h-40 bg-blue-50 flex items-center justify-center text-5xl">📅</div>
        )}
        {isOrganizer && (
          <span className="absolute top-2 left-2 bg-[#4267B2] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            ผู้จัดงาน
          </span>
        )}
      </div>

      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-center gap-1.5 mb-2">
          {event.organizer?.avatar && (
            <img src={event.organizer.avatar} className="w-5 h-5 rounded-full object-cover shrink-0" alt="" />
          )}
          <span className="text-[12px] text-[#65676B]">
            จัดโดย <span className="font-semibold text-[#050505]">{event.organizer?.name}</span>
          </span>
        </div>

        <h3 className="font-bold text-[#050505] text-[15px] mb-3 leading-snug">{event.title}</h3>

        <div className="space-y-1.5 text-[13px] text-[#65676B] mb-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 shrink-0 text-[#4267B2]" />
            <span>{event.date}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 shrink-0 text-[#4267B2]" />
            <span>{event.location}</span>
          </div>
        </div>

        {count > 0 && (
          <p className="text-[12px] text-[#65676B] mb-3">🐾 {count} คนสนใจ</p>
        )}

        <button
          onClick={() => onToggle(event)}
          disabled={isOrganizer}
          className={`mt-auto w-full font-semibold text-sm py-2 rounded-lg transition-colors
            ${isOrganizer
              ? 'bg-gray-100 text-gray-400 cursor-default'
              : isAttending
                ? 'bg-[#4267B2] text-white hover:bg-[#3b5998]'
                : 'bg-[#ebf5ff] text-[#1877f2] hover:bg-[#dce9ff]'}`}
        >
          {isOrganizer ? 'คุณเป็นผู้จัดงาน' : isAttending ? '✓ สนใจแล้ว' : 'สนใจเข้าร่วม'}
        </button>
      </div>
    </div>
  );
};

function compressImg(file, maxW = 800, maxH = 500, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxW / img.width, maxH / img.height);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = reject;
    img.src = url;
  });
}

const EventsPage = () => {
  const { currentUser } = useUser();
  const [events, setEvents] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toast, showToast] = useToast();

  useEffect(() => {
    const unsub = subscribeEvents(setEvents);
    return unsub;
  }, []);

  const handleAddEvent = async (newEvent) => {
    try {
      let img = newEvent.img;
      if (img && img.startsWith('blob:')) {
        const res = await fetch(img);
        const blob = await res.blob();
        img = await compressImg(new File([blob], 'img.jpg', { type: blob.type }));
        URL.revokeObjectURL(newEvent.img);
      }
      await createEvent({
        title: newEvent.title || '',
        date: newEvent.date || '',
        location: newEvent.location || '',
        img: img || '',
        organizerUid: currentUser.uid,
        organizer: {
          id: currentUser.uid,
          name: currentUser.activeCat?.name || currentUser.name,
          avatar: currentUser.activeCat?.avatar || '',
        },
        attendeeUids: [],
      });
      showToast(`สร้างกิจกรรม "${newEvent.title}" เรียบร้อยแล้ว! 📅`);
    } catch {
      showToast('สร้างกิจกรรมไม่สำเร็จ กรุณาลองใหม่');
    }
  };

  const toggleAttend = async (event) => {
    const isAttending = (event.attendeeUids || []).includes(currentUser.uid);
    try {
      if (isAttending) {
        await leaveEvent(event.id, currentUser.uid);
        showToast(`ยกเลิกความสนใจใน "${event.title}" แล้ว`);
      } else {
        await attendEvent(event.id, currentUser.uid);
        showToast(`บันทึกความสนใจใน "${event.title}" แล้ว! 📅`);
      }
    } catch {
      showToast('เกิดข้อผิดพลาด กรุณาลองใหม่');
    }
  };

  return (
    <div className="w-full pb-20">
      <Toast message={toast} />

      <div className="flex items-center justify-between mb-6">
        <h2 className="font-bold text-2xl text-[#050505]">กิจกรรม 📅</h2>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-[#ebf5ff] hover:bg-[#dce9ff] text-[#1877f2] font-semibold px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          สร้างกิจกรรม
        </button>
      </div>

      {events.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 py-16 text-center text-gray-400">
          <p className="text-4xl mb-2">📅</p>
          <p className="font-semibold">ยังไม่มีกิจกรรม</p>
          <p className="text-sm mt-1">สร้างกิจกรรมแรกได้เลย</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {events.map(event => (
          <EventCard
            key={event.id}
            event={event}
            currentUser={currentUser}
            onToggle={toggleAttend}
          />
        ))}
      </div>

      <CreateEventModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleAddEvent}
      />
    </div>
  );
};

export default EventsPage;
