import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useUser } from './UserContext';
import { mockUsers } from '../data/mockData';

const NotificationContext = createContext(null);

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) return {
    notifications: [], unreadCount: 0,
    addNotification: () => {}, markAsRead: () => {}, markAllAsRead: () => {},
    deleteNotification: () => {},
  };
  return ctx;
};

const REALTIME_POOL = [
  { type: 'like',           message: 'ถูกใจโพสต์ของคุณ',                                     preview: 'วันนี้แอบนอนในกล่องรองเท้าอีกแล้ว 📦💤' },
  { type: 'comment',        message: 'แสดงความคิดเห็น: "เมี๊ยวๆ น่ารักจังเลย!"',             preview: null },
  { type: 'follow',         message: 'เริ่มติดตามคุณแล้ว',                                    preview: null },
  { type: 'friend_request', message: 'ส่งคำขอเป็นเพื่อนเหมียวกับคุณ',                        preview: null },
  { type: 'share',          message: 'แชร์โพสต์ของคุณต่อให้เพื่อน',                            preview: 'นั่งรอทาสกลับบ้านเมื่อไหร่จะมาเทข้าว 😾' },
  { type: 'like',           message: 'และเพื่อนอีก 2 ตัว ถูกใจโพสต์ของคุณ',                 preview: null },
  { type: 'comment',        message: 'ตอบกลับความคิดเห็น: "555 แมวเหมือนกันเลย!"',           preview: null },
  { type: 'tag',            message: 'แท็กคุณในโพสต์: "เพื่อนเหมียวสุดน่ารัก" 🐾',          preview: null },
];

const buildInitial = (others) => {
  const [a, b, c] = others;
  const fb = others[0];
  if (!fb) return [];
  return [
    { id: 'n1', type: 'follow',         actor: a,     message: 'เริ่มติดตามคุณแล้ว',                                                         time: '5 นาทีที่แล้ว',    isRead: false, preview: null },
    { id: 'n2', type: 'like',           actor: b||fb, message: 'ถูกใจโพสต์ของคุณ',                                                         time: '20 นาทีที่แล้ว',   isRead: false, preview: 'นั่งรอทาสกลับบ้านเมื่อไหร่จะมาเทข้าววววว 😾' },
    { id: 'n3', type: 'comment',        actor: c||fb, message: 'แสดงความคิดเห็นในโพสต์ของคุณ: "เมี๊ยวๆ เป็นกำลังใจให้นะ!"',             time: '1 ชั่วโมงที่แล้ว',  isRead: false, preview: 'นั่งรอทาสกลับบ้านเมื่อไหร่จะมาเทข้าววววว 😾' },
    { id: 'n4', type: 'share',          actor: a,     message: 'แชร์โพสต์ของคุณต่อให้เพื่อน',                                             time: '3 ชั่วโมงที่แล้ว',  isRead: false, preview: 'นั่งรอทาสกลับบ้านเมื่อไหร่จะมาเทข้าววววว 😾' },
    { id: 'n5', type: 'friend_request', actor: b||fb, message: 'ส่งคำขอเป็นเพื่อนเหมียวกับคุณ',                                          time: '5 ชั่วโมงที่แล้ว', isRead: true,  preview: null },
    { id: 'n6', type: 'like',           actor: c||fb, message: `และเพื่อนอีก ${Math.max(1, others.length - 1)} ตัว ถูกใจโพสต์ของคุณ`,   time: 'เมื่อวานนี้',      isRead: true,  preview: 'นั่งรอทาสกลับบ้านเมื่อไหร่จะมาเทข้าววววว 😾' },
    { id: 'n7', type: 'tag',            actor: b||fb, message: 'แท็กคุณในโพสต์: "แมวบ้านนี้ขโมยที่นอนฉันอีกแล้ว!"',                     time: 'เมื่อวานนี้',      isRead: true,  preview: null },
    { id: 'n8', type: 'comment',        actor: c||fb, message: 'ตอบกลับความคิดเห็นของคุณ: "555 เป็นแมวทุกตัวเลยนะ"',                    time: '2 วันที่แล้ว',    isRead: true,  preview: null },
  ];
};

export const NotificationProvider = ({ children }) => {
  const { currentUser } = useUser();
  const catId = currentUser?.activeCat?.id;

  const getOthers = useCallback(() => {
    if (!catId) return [];
    return mockUsers
      .filter(u => u.activeCat.id !== catId)
      .map(u => ({ name: u.activeCat.name, avatar: u.activeCat.avatar }));
  }, [catId]);

  const [notifications, setNotifications] = useState(() => buildInitial(getOthers()));
  const timerRef = useRef(null);

  useEffect(() => {
    setNotifications(buildInitial(getOthers()));
  }, [catId, getOthers]);

  useEffect(() => {
    if (!catId) return;

    const schedule = () => {
      const delay = 25000 + Math.random() * 20000;
      timerRef.current = setTimeout(() => {
        const others = mockUsers
          .filter(u => u.activeCat.id !== catId)
          .map(u => ({ name: u.activeCat.name, avatar: u.activeCat.avatar }));
        if (!others.length) { schedule(); return; }
        const actor = others[Math.floor(Math.random() * others.length)];
        const event = REALTIME_POOL[Math.floor(Math.random() * REALTIME_POOL.length)];
        const newNotif = { id: `rt_${Date.now()}`, actor, ...event, time: 'เมื่อกี้', isRead: false };
        setNotifications(prev => [newNotif, ...prev]);
        schedule();
      }, delay);
    };

    schedule();
    return () => { clearTimeout(timerRef.current); };
  }, [catId]);

  const addNotification = useCallback((notif) =>
    setNotifications(prev => [{ id: `n_${Date.now()}`, isRead: false, time: 'เมื่อกี้', ...notif }, ...prev])
  , []);

  const markAsRead = useCallback((id) =>
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))
  , []);

  const markAllAsRead = useCallback(() =>
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
  , []);

  const deleteNotification = useCallback((id) =>
    setNotifications(prev => prev.filter(n => n.id !== id))
  , []);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <NotificationContext.Provider value={{
      notifications,
      addNotification,
      markAsRead,
      markAllAsRead,
      deleteNotification,
      unreadCount,
    }}>
      {children}
    </NotificationContext.Provider>
  );
};
