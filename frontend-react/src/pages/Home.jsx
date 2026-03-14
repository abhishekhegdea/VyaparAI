import { Link } from 'react-router-dom';
import { ShoppingBag, ArrowRight } from 'lucide-react';
import './Home.css';

const Home = () => {
  return (
    <div className="home onboarding-shell">
      <section className="onboarding-card">
        <div className="app-mark">
          <div className="mark-icon">
            <ShoppingBag size={20} />
          </div>
          <h2 className="brand-wordmark" aria-label="DukaanSaathi">
            <span className="brand-dukaan">Dukaan</span>
            <span className="brand-saathi">Saathi</span>
          </h2>
        </div>

        <div className="hero-photo-wrap">
          <div className="hero-photo" />
        </div>

        <div className="onboarding-copy">
          <h1>Run Your Shop Smarter with AI</h1>
          <p className="lang-caption">Select your preferred language</p>

          <div className="language-pills" role="tablist" aria-label="Language selector">
            <button type="button" className="pill active">English</button>
            <button type="button" className="pill">Hindi</button>
            <button type="button" className="pill">Kannada</button>
          </div>
        </div>

        <Link to="/auth" className="btn btn-primary btn-large onboarding-cta">
          Get Started
          <ArrowRight size={20} />
        </Link>

        <p className="onboarding-footnote">
          By continuing, you agree to DukaanSaathi&apos;s Terms of Service and Privacy Policy.
        </p>
      </section>

      <section className="home-quick-info">
        <h3>Built for modern retailers</h3>
        <p>Inventory, billing, and AI recommendations in one workflow.</p>
        <Link to="/products" className="btn btn-outline">
          Browse Products
        </Link>
      </section>
        </div>
  );
};

export default Home; 