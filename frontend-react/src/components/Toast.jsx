import { CheckCircle, XCircle, Info, AlertTriangle } from 'lucide-react';
import './Toast.css';

const Toast = ({ message, type = 'info' }) => {
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
      className="toast"
      style={{ borderLeftColor: getBackgroundColor() }}
    >
      <div 
        className="toast-icon"
        style={{ color: getBackgroundColor() }}
      >
        {getIcon()}
      </div>
      <div className="toast-message">
        {message}
      </div>
    </div>
  );
};

export default Toast; 