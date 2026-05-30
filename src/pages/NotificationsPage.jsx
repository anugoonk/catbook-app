import { useState } from 'react';
import { MessageCircle, Share2, UserPlus, Users, Tag, CheckCheck, Trash2, MoreHorizontal } from 'lucide-react';
import PawIcon from '../components/PawIcon';
import { useNotifications } from '../context/NotificationContext';

const TYPE_CONFIG = {
  like:           { icon: PawIcon,       bg: 'bg-pink-500',   text: 'text-white' },
  comment:        { icon: MessageCircle, bg: 'bg-green-500',  text: 'text-white' },
  share:          { icon: Share2,        bg: 'bg-sky-500',    text: 'text-white' },
  follow:         { icon: Users,         bg: 'bg-purple-500', text: 'text-white' },
  friend_request: { icon: UserPlus,      bg: 'bg-orange-500', text: 'text-white' },
  tag:            { icon: Tag,           bg: 'bg-pink-500',   text: 'text-white' },
};

const NotificationItem = ({ notification, onRead, onDelete }) => {
  const [showMenu, setShowMenu] = useState(false);
  const config = TYPE_CONFIG[notification.type] || TYPE_CONFIG.like;
  const Icon = config.icon;

  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-xl transition-colors cursor-pointer group relative
        ${notification.isRead ? 'hover:bg-gray-100' : 'bg-blue-50 hover:bg-blue-100'}`}
      onClick={() => !notification.isRead && onRead(notification.id)}
    >
      {/* Avatar + icon badge */}
      <div className="relative shrink-0">
        <img
          src={notification.actor.avatar}
          alt={notification.actor.name}
          className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-sm"
        />
        <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center ${config.bg} shadow`}>
          <Icon className={`w-3.5 h-3.5 ${config.text}`} />
        </div>
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0 pt-0.5">
        <p className="text-sm text-gray-800 leading-snug">
          <span className="font-bold">{notification.actor.name}</span>{' '}
          {notification.message}
        </p>
        {notification.preview && (
          <p className="text-xs text-gray-500 mt-1 truncate border-l-2 border-gray-300 pl-2">
            {notification.preview}
          </p>
        )}
        <p className={`text-xs mt-1.5 font-medium ${notification.isRead ? 'text-gray-400' : 'text-[#4267B2]'}`}>
          {notification.time}
        </p>
      </div>

      {/* Unread dot */}
      {!notification.isRead && (
        <div className="shrink-0 mt-4 w-3 h-3 rounded-full bg-[#4267B2]" />
      )}

      {/* More menu */}
      <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity absolute right-3 top-3">
        <button
          onClick={(e) => { e.stopPropagation(); setShowMenu(v => !v); }}
          className="p-1.5 rounded-full hover:bg-gray-200 text-gray-500"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
        {showMenu && (
          <div className="absolute right-0 top-8 bg-white rounded-xl shadow-lg border border-gray-100 z-10 w-48 py-1 text-sm">
            {!notification.isRead && (
              <button
                onClick={(e) => { e.stopPropagation(); onRead(notification.id); setShowMenu(false); }}
                className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-100 text-gray-700"
              >
                <CheckCheck className="w-4 h-4 text-[#4267B2]" />
                ทำเครื่องหมายว่าอ่านแล้ว
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(notification.id); setShowMenu(false); }}
              className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-100 text-red-500"
            >
              <Trash2 className="w-4 h-4" />
              ลบการแจ้งเตือนนี้
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const NotificationsPage = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
  const [activeTab, setActiveTab] = useState('all');

  const displayed = activeTab === 'unread'
    ? notifications.filter(n => !n.isRead)
    : notifications;

  return (
    <div className="w-full max-w-2xl pb-20">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-4">
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">การแจ้งเตือน</h1>
            {unreadCount > 0 && (
              <p className="text-sm text-gray-500 mt-0.5">ยังไม่ได้อ่าน {unreadCount} รายการ</p>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="flex items-center gap-1.5 text-sm font-medium text-[#4267B2] hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"
            >
              <CheckCheck className="w-4 h-4" />
              อ่านทั้งหมด
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-4 pb-2">
          {[
            { id: 'all',    label: 'ทั้งหมด' },
            { id: 'unread', label: `ยังไม่ได้อ่าน${unreadCount > 0 ? ` (${unreadCount})` : ''}` },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors
                ${activeTab === tab.id
                  ? 'bg-blue-100 text-[#4267B2]'
                  : 'text-gray-600 hover:bg-gray-100'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 px-2 py-2">
        {displayed.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <PawIcon className="w-14 h-14 text-gray-200 mb-3" />
            <p className="font-medium">ไม่มีการแจ้งเตือน</p>
            <p className="text-sm mt-1">คุณอ่านหมดแล้ว เก่งมากเหมียว! 🐾</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {displayed.map(n => (
              <NotificationItem
                key={n.id}
                notification={n}
                onRead={markAsRead}
                onDelete={deleteNotification}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
