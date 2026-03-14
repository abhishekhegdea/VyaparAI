import { Link } from 'react-router-dom';
import { ShoppingBag, ArrowRight } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import './Home.css';

const Home = () => {
  const { language, setLanguage, t } = useLanguage();

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
          <h1>{t('home.title')}</h1>
          <p className="lang-caption">{t('home.languagePrompt')}</p>

          <div className="language-pills" role="tablist" aria-label="Language selector">
            <button
              type="button"
              className={`pill ${language === 'en' ? 'active' : ''}`}
              onClick={() => setLanguage('en')}
              aria-pressed={language === 'en'}
            >
              {t('common.english')}
            </button>
            <button
              type="button"
              className={`pill ${language === 'hi' ? 'active' : ''}`}
              onClick={() => setLanguage('hi')}
              aria-pressed={language === 'hi'}
            >
              {t('common.hindi')}
            </button>
          </div>
        </div>

        <Link to="/auth" className="btn btn-primary btn-large onboarding-cta">
          {t('home.getStarted')}
          <ArrowRight size={20} />
        </Link>

        <p className="onboarding-footnote">
          {t('home.terms')}
        </p>
      </section>

      <section className="home-quick-info">
        <h3>{t('home.quickTitle')}</h3>
        <p>{t('home.quickSubtitle')}</p>
        <Link to="/products" className="btn btn-outline">
          {t('home.browseProducts')}
        </Link>
      </section>
        </div>
  );
};

export default Home; 