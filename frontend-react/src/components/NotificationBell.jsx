import { useState, useEffect, useRef } from 'react';
import { Bell, X, TrendingUp, Megaphone, AlertTriangle, DollarSign, ChevronRight, Info } from 'lucide-react';
import { apiService } from '../config/api';
import './NotificationBell.css';

const STATIC_NOTIFICATIONS = [
  {
    id: 'fin-1',
    type: 'finance',
    title: 'GST Planning Reminder',
    message: 'Estimate your quarterly GST liability using Finance AI before month-end to avoid surprises.',
    badge: 'Finance',
    badgeColor: 'gold',
    icon: 'dollar',
  },
  {
    id: 'fin-2',
    type: 'finance',
    title: 'Income Tax Insight',
    message: 'New regime: No income tax up to ₹12 lakh. Use Finance AI to simulate your exact tax slab.',
    badge: 'Tax',
    badgeColor: 'blue',
    icon: 'trending',
  },
  {
    id: 'mkt-1',
    type: 'marketing',
    title: 'AI Campaign Ready',
    message: 'Add any product and instantly get AI product photography + a full launch campaign strategy.',
    badge: 'Marketing',
    badgeColor: 'purple',
    icon: 'megaphone',
  },
  {
    id: 'mkt-2',
    type: 'marketing',
    title: 'Boost Weekend Sales',
    message: 'Bundle 2–3 related products as a combo deal — retailers typically see a 15–20% sales lift.',
    badge: 'Tip',
    badgeColor: 'coral',
    icon: 'megaphone',
  },
  {
    id: 'mkt-3',
    type: 'marketing',
    title: 'Festive Season Strategy',
    message: 'Build WhatsApp broadcast lists now. Festive outreach gets 3× better open rates than email.',
    badge: 'Marketing',
    badgeColor: 'purple',
    icon: 'megaphone',
  },
  {
    id: 'fin-3',
    type: 'finance',
    title: 'Input GST Credit',
    message: 'Reconcile your purchase invoices this week to maximise your eligible input GST credit claims.',
    badge: 'Finance',
    badgeColor: 'gold',
    icon: 'info',
  },
];

const NotificationBell = () => {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState(STATIC_NOTIFICATIONS);
  const [allRead, setAllRead] = useState(false);
  const panelRef = useRef(null);

  useEffect(() => {
    apiService.getProducts({ includeOutOfStock: true })
      .then(res => {
        const prods = res.data?.products || [];
        const lowStock = prods.filter(p => Number(p.quantity || 0) <= 5);
        const stockNotifs = lowStock.slice(0, 4).map(p => ({
          id: `stock-${p.productID || p._id}`,
          type: 'stock',
          title: `Low Stock: ${p.name}`,
          message: `Only ${p.quantity} unit${p.quantity === 1 ? '' : 's'} left. Restock before you run out.`,
          badge: 'Inventory',
          badgeColor: 'red',
          icon: 'alert',
        }));
        if (stockNotifs.length > 0) {
          setNotifications(prev => [...stockNotifs, ...prev]);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const unreadCount = allRead ? 0 : notifications.length;

  const dismissOne = (id, e) => {
    e.stopPropagation();
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const getIcon = (iconType) => {
    switch (iconType) {
      case 'dollar':    return <DollarSign size={15} />;
      case 'trending':  return <TrendingUp size={15} />;
      case 'megaphone': return <Megaphone size={15} />;
      case 'alert':     return <AlertTriangle size={15} />;
      case 'info':      return <Info size={15} />;
      default:          return <Bell size={15} />;
    }
  };

  return (
    <div className="nbell-root" ref={panelRef}>
      <button
        className="nbell-trigger"
        onClick={() => { setOpen(o => !o); setAllRead(true); }}
        aria-label={`Notifications — ${unreadCount} unread`}
      >
        <Bell size={21} />
        {unreadCount > 0 && (
          <span className="nbell-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {open && (
        <div className="nbell-panel">
          <div className="nbell-header">
            <span className="nbell-header-title">
              <Bell size={14} /> Notifications
            </span>
            {notifications.length > 0 && (
              <button className="nbell-markread" onClick={() => setNotifications([])}>
                Clear all
              </button>
            )}
          </div>

          <div className="nbell-list">
            {notifications.length === 0 ? (
              <div className="nbell-empty">
                <span className="nbell-empty-icon">🎉</span>
                <p>All clear! No new alerts.</p>
              </div>
            ) : (
              notifications.map(n => (
                <div key={n.id} className="nbell-item">
                  <div className={`nbell-icon nbell-icon-${n.badgeColor}`}>
                    {getIcon(n.icon)}
                  </div>
                  <div className="nbell-body">
                    <div className="nbell-top">
                      <span className="nbell-title">{n.title}</span>
                      <span className={`nbell-tag nbell-tag-${n.badgeColor}`}>{n.badge}</span>
                    </div>
                    <p className="nbell-msg">{n.message}</p>
                  </div>
                  <button className="nbell-dismiss" onClick={(e) => dismissOne(n.id, e)} aria-label="Dismiss">
                    <X size={12} />
                  </button>
                </div>
              ))
            )}
          </div>

          {notifications.length > 0 && (
            <div className="nbell-footer">
              <button className="nbell-footer-clear" onClick={() => { setNotifications([]); setOpen(false); }}>
                Dismiss all <ChevronRight size={13} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
