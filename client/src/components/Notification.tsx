import React, { useEffect } from 'react';
import './Notification.css';

interface NotificationProps {
  message: string;
  type?: 'error' | 'success' | 'info' | 'warning';
  duration?: number;
  onClose?: () => void;
}

const Notification: React.FC<NotificationProps> = ({ 
  message, 
  type = 'info', 
  duration = 3000,
  onClose 
}) => {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        if (onClose) {
          onClose();
        }
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  return (
    <div className={`notification notification-${type}`}>
      <div className="notification-content">
        <div className="notification-icon">
          {type === 'error' && '❌'}
          {type === 'success' && '✅'}
          {type === 'info' && 'ℹ️'}
          {type === 'warning' && '⚠️'}
        </div>
        <div className="notification-message">{message}</div>
        {onClose && (
          <button className="notification-close" onClick={onClose}>
            ×
          </button>
        )}
      </div>
    </div>
  );
};

export default Notification;

