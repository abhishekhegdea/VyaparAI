import { Store } from 'lucide-react';
import './LoadingScreen.css';

const LoadingScreen = () => {
  return (
    <div className="loading-screen">
      <div className="loading-content">
        <div className="loading-logo">
          <Store size={48} />
        </div>
        <div className="loading-spinner"></div>
        <h2>Welcome to VyaparAI</h2>
        <p>Loading your shopping experience...</p>
      </div>
    </div>
  );
};

export default LoadingScreen; 