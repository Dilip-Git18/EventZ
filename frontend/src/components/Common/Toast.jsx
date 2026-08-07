import React from 'react';
import { AlertCircle, CheckCircle, Info } from 'lucide-react';

const Toast = ({ message, type }) => {
  if (!message) return null;

  const getStyles = () => {
    switch (type) {
      case 'error':
        return {
          bg: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#ef4444',
          icon: <AlertCircle size={20} />
        };
      case 'warning':
        return {
          bg: 'rgba(245, 158, 11, 0.15)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          color: '#f59e0b',
          icon: <AlertCircle size={20} />
        };
      default: // success
        return {
          bg: 'rgba(16, 185, 129, 0.15)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          color: '#10b981',
          icon: <CheckCircle size={20} />
        };
    }
  };

  const style = getStyles();

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        background: style.bg,
        border: style.border,
        color: style.color,
        backdropFilter: 'blur(10px)',
        padding: '12px 20px',
        borderRadius: '8px',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4)',
        animation: 'slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        maxWidth: '350px',
        pointerEvents: 'auto'
      }}
    >
      <div style={{ flexShrink: 0 }}>{style.icon}</div>
      <p style={{ fontSize: '14px', fontWeight: 500, lineHeight: 1.4 }}>{message}</p>

      <style>{`
        @keyframes slideIn {
          from {
            transform: translateY(-20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default Toast;
