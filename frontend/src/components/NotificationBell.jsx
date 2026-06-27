import React, { useState, useRef, useEffect } from 'react';
import { Bell } from 'lucide-react';

const NotificationBell = ({ notifications = [], onClearAll, onClickNotification }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="topbar-action-wrap" ref={dropdownRef} style={{ position: 'relative' }}>
      <button 
        className={`topbar-action-btn ${notifications.length > 0 ? 'has-badge' : ''}`}
        onClick={() => setShowDropdown(!showDropdown)}
        title="Thông báo"
      >
        <Bell size={20} />
        {notifications.length > 0 && (
          <span style={{
            position: 'absolute',
            top: '-4px',
            right: '-4px',
            backgroundColor: 'var(--accent-red)',
            color: 'white',
            borderRadius: '50%',
            width: '18px',
            height: '18px',
            fontSize: '0.65rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700
          }}>
            {notifications.length}
          </span>
        )}
      </button>

      {showDropdown && (
        <div 
          className="glass-panel animate-fade" 
          style={{
            position: 'absolute',
            right: 0,
            top: '40px',
            width: '320px',
            maxHeight: '400px',
            overflowY: 'auto',
            zIndex: 1000,
            padding: '16px',
            boxShadow: 'var(--shadow-lg)',
            borderRadius: 'var(--border-radius-md)',
            backgroundColor: 'var(--card-bg, #ffffff)',
            border: '1px solid var(--border-color)',
            textAlign: 'left'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>Thông báo</h4>
            <button 
              style={{ background: 'none', border: 'none', color: '#006D44', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}
              onClick={() => {
                if (onClearAll) onClearAll();
                setShowDropdown(false);
              }}
            >
              Xóa tất cả
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {notifications.length === 0 ? (
              <p style={{ fontSize: '0.8rem', color: 'var(--neutral-medium)', textAlign: 'center', margin: '20px 0' }}>Không có thông báo mới.</p>
            ) : (
              notifications.map(n => (
                <div 
                  key={n.id} 
                  onClick={() => {
                    if (onClickNotification) onClickNotification(n);
                    setShowDropdown(false);
                  }}
                  className="notification-item-card"
                  style={{ padding: '8px', borderRadius: '4px', backgroundColor: 'var(--neutral-lightest)', borderLeft: '3px solid var(--primary)', cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <strong style={{ fontSize: '0.8rem', color: 'var(--neutral-darkest)' }}>{n.title}</strong>
                    <span style={{ fontSize: '0.65rem', color: 'var(--neutral-medium)' }}>
                      {new Date(n.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: 'var(--neutral-dark)' }}>{n.message}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
