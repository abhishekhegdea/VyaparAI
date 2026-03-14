import { CheckCircle, XCircle, Info, AlertTriangle } from 'lucide-react';
import './Toast.css';

const Toast = ({ message, type = 'info', onClose }) => {
  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle size={20} />;
      case 'error':
        return <XCircle size={20} />;
      case 'warning':
        return <AlertTriangle size={20} />;
      default:
        return <Info size={20} />;
    }
  };

  const getBackgroundColor = () => {
    switch (type) {
      case 'success':
        return 'var(--success)';
      case 'error':
        return 'var(--error)';
      case 'warning':
        return 'var(--warning)';
      default:
        return 'var(--info)';
    }
  };

  return (
    <div
      className={`toast ${type === 'warning' ? 'toast-warning' : ''}`}
      style={{ borderLeftColor: getBackgroundColor() }}
      role="status"
      aria-live="polite"
    >
      <div 
        className="toast-icon"
        style={{ color: getBackgroundColor() }}
      >
        {getIcon()}
      </div>
      <div className="toast-message">
        {type === 'warning' && <strong className="toast-title">Warning</strong>}
        {message}
      </div>
      {typeof onClose === 'function' && (
        <button type="button" className="toast-close" onClick={onClose} aria-label="Dismiss notification">
          ×
        </button>
      )}
    </div>
  );
};

export default Toast; 