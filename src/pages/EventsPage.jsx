import { useState, useEffect } from 'react';
import { Calendar, MapPin, Plus } from 'lucide-react';
import Toast from '../components/Toast';
import useToast from '../hooks/useToast';
import CreateEventModal from '../components/CreateEventModal';
import { mockUsers } from '../data/mockData';
import { useUser } from '../context/UserContext';

const buildEvents = (users) => {
  const [u1, u2, u3, u4] = users;
  return [
    {
      id: 'e1',
      title: 'งานแสดงแมวประจำปี 2025',
      date: '25 พ.ค. 2025',
      location: 'ศูนย์การค้าเซ็นทรัล',
      img: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=400&q=80',
      organizer: u1.activeCat,
      attendees: [u2.activeCat, u3.activeCat],
    },
    {
      id: 'e2',
      title: 'กิจกรรมรับเลี้ยงแมวไร้บ้าน',
      date: '1 มิ.ย. 2025',
      location: 'สวนลุมพินี กรุงเทพฯ',
      img: 'https://images.unsplash.com/photo-1555685812-4b943f1cb0eb?w=400&q=80',
      organizer: u2.activeCat,
      attendees: [u1.activeCat, u4.activeCat],
    },
    {
      id: 'e3',
      title: 'Cat Cafe Meetup',
      date: '10 มิ.ย. 2025',
      location: 'Cat Cafe Silom',
      img: 'https://images.unsplash.com/photo-1513245543132-31f507417b26?w=400&q=80',
      organizer: u3.activeCat,
      attendees: [u4.activeCat, u1.activeCat, u2.activeCat],
    },
  ];
};

const AttendeeStack = ({ attendees }) => {
  const visible = attendees.slice(0, 4);
  const extra = attendees.length - visible.length;
  return (
    <div className="flex items-center gap-2">
      <div className="flex -space-x-2">
        {visible.map(a => (
          <img
            key={a.id}
            src={a.avatar}
            title={a.name}
            className="w-7 h-7 rounded-full object-cover border-2 border-white shadow-sm"
            alt={a.name}
          />
        ))}
        {extra > 0 && (
          <div className="w-7 h-7 rounded-full bg-[#e4e6eb] border-2 border-white flex items-center justify-center text-[10px] font-bold text-[#65676B]">
            +{extra}
          </div>
        )}
      </div>
      <span className="text-[12px] text-[#65676B]">{attendees.length} คนสนใจ</span>
    </div>
  );
};

const EventCard = ({ event, currentUser, onToggle }) => {
  const isAttending = event.attendees.some(a => a.id === currentUser.activeCat.id);
  const isOrganizer = event.organizer.id === currentUser.activeCat.id;

  return (
    <div className="bg-white rounded-xl border border-[#dddfe2] overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col">
      <div className="relative">
        <img src={event.img} className="w-full h-40 object-cover" alt={event.title} />
        {isOrganizer && (
          <span className="absolute top-2 left-2 bg-[#4267B2] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            ผู้จัดงาน
          </span>
        )}
      </div>

      <div className="p-4 flex flex-col flex-1">
        {/* Organizer */}
        <div className="flex items-center gap-1.5 mb-2">
          <img src={event.organizer.avatar} className="w-5 h-5 rounded-full object-cover shrink-0" alt="" />
          <span className="text-[12px] text-[#65676B]">จัดโดย <span className="font-semibold text-[#050505]">{event.organizer.name}</span></span>
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

        <div className="mb-4">
          <AttendeeStack attendees={event.attendees} />
        </div>

        <button
          onClick={() => onToggle(event.id)}
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

const EventsPage = () => {
  const { currentUser } = useUser();
  const [events, setEvents] = useState(() => buildEvents(mockUsers));
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toast, showToast] = useToast();

  useEffect(() => {
    setEvents(buildEvents(mockUsers));
  }, [currentUser.activeCat.id]);

  const handleAddEvent = (newEvent) => {
    setEvents(prev => [newEvent, ...prev]);
    showToast(`สร้างกิจกรรม "${newEvent.title}" เรียบร้อยแล้ว! 📅`);
  };

  const toggleAttend = (eventId) => {
    setEvents(prev => prev.map(ev => {
      if (ev.id !== eventId) return ev;
      const already = ev.attendees.some(a => a.id === currentUser.activeCat.id);
      const next = already
        ? ev.attendees.filter(a => a.id !== currentUser.activeCat.id)
        : [...ev.attendees, currentUser.activeCat];
      showToast(already
        ? `ยกเลิกความสนใจใน "${ev.title}" แล้ว`
        : `บันทึกความสนใจใน "${ev.title}" แล้ว! 📅`
      );
      return { ...ev, attendees: next };
    }));
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
