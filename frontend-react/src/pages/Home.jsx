import { Link } from 'react-router-dom';
import { ShoppingBag, ArrowRight } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import './Home.css';

const Home = () => {
  const { language, setLanguage, languageOptions, t } = useLanguage();

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
          <h1>{t('Run Your Shop Smarter with AI')}</h1>
          <p className="lang-caption">{t('Select your preferred language')}</p>

          <div className="language-pills" role="tablist" aria-label={t('Language selector')}>
            {languageOptions.map((opt) => (
              <button
                key={opt.code}
                type="button"
                className={`pill${language === opt.code ? ' active' : ''}`}
                onClick={() => setLanguage(opt.code)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <Link to="/auth" className="btn btn-primary btn-large onboarding-cta">
          {t('Get Started')}
          <ArrowRight size={20} />
        </Link>

        <p className="onboarding-footnote">
          {t("By continuing, you agree to DukaanSaathi's Terms of Service and Privacy Policy.")}
        </p>
      </section>

      <section className="home-quick-info">
        <h3>{t('Built for modern retailers')}</h3>
        <p>{t('Inventory, billing, and AI recommendations in one workflow.')}</p>
        <Link to="/products" className="btn btn-outline">
          {t('Browse Products')}
        </Link>
      </section>
    </div>
  );
};

export default Home; 