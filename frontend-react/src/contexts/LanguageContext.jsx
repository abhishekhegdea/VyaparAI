/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const LANGUAGE_STORAGE_KEY = 'dukaansaathi-language';

const messages = {
  en: {
    common: {
      english: 'English',
      hindi: 'Hindi',
    },
    nav: {
      back: 'Back',
      home: 'Home',
      dashboard: 'Dashboard',
      greeting: 'Hi, {name}',
      logout: 'Logout',
      login: 'Login',
      goBack: 'Go back',
      toggleMenu: 'Toggle navigation menu',
      languageLabel: 'Language',
    },
    home: {
      title: 'Run Your Shop Smarter with AI',
      languagePrompt: 'Select your preferred language',
      getStarted: 'Get Started',
      terms: "By continuing, you agree to DukaanSaathi's Terms of Service and Privacy Policy.",
      quickTitle: 'Built for modern retailers',
      quickSubtitle: 'Inventory, billing, and AI recommendations in one workflow.',
      browseProducts: 'Browse Products',
    },
    auth: {
      createAccountTab: 'Create Account',
      signInTab: 'Sign In',
      createRetailerAccount: 'Create Retailer Account',
      createRetailerSubtitle: 'Register with your email to manage your shop with DukaanSaathi.',
      fullName: 'Full Name',
      fullNamePlaceholder: 'Your full name',
      email: 'Email',
      emailPlaceholder: 'you@gmail.com',
      password: 'Password',
      passwordPlaceholder: 'Min. 6 characters',
      createAccountLoading: 'Creating account...',
      createAccount: 'Create Account',
      alreadyHaveAccount: 'Already have an account?',
      signInLink: 'Sign In',
      retailerSignIn: 'Retailer Sign In',
      retailerSignInSubtitle: 'Sign in to manage your retail shop.',
      loginEmailPlaceholder: 'Enter your email',
      loginPasswordPlaceholder: 'Enter your password',
      signInLoading: 'Signing in...',
      newHere: 'New here?',
      createAccountLink: 'Create an account',
      toasts: {
        welcomeBack: 'Welcome back!',
        loginFailed: 'Login failed. Please try again.',
        accountCreated: 'Account created! Welcome to DukaanSaathi.',
        registerFailed: 'Registration failed. Please try again.',
      },
    },
    toasts: {
      loggedOut: 'Logged out successfully',
    },
  },
  hi: {
    common: {
      english: 'अंग्रेज़ी',
      hindi: 'हिंदी',
    },
    nav: {
      back: 'वापस',
      home: 'होम',
      dashboard: 'डैशबोर्ड',
      greeting: 'नमस्ते, {name}',
      logout: 'लॉग आउट',
      login: 'लॉग इन',
      goBack: 'पिछले पेज पर जाएं',
      toggleMenu: 'नेविगेशन मेनू टॉगल करें',
      languageLabel: 'भाषा',
    },
    home: {
      title: 'AI के साथ अपनी दुकान और स्मार्ट चलाएं',
      languagePrompt: 'अपनी पसंदीदा भाषा चुनें',
      getStarted: 'शुरू करें',
      terms: 'आगे बढ़ने पर, आप DukaanSaathi की सेवा शर्तों और गोपनीयता नीति से सहमत होते हैं।',
      quickTitle: 'आधुनिक रिटेलर्स के लिए बनाया गया',
      quickSubtitle: 'इन्वेंट्री, बिलिंग और AI सुझाव एक ही वर्कफ़्लो में।',
      browseProducts: 'प्रोडक्ट्स देखें',
    },
    auth: {
      createAccountTab: 'अकाउंट बनाएं',
      signInTab: 'साइन इन',
      createRetailerAccount: 'रिटेलर अकाउंट बनाएं',
      createRetailerSubtitle: 'DukaanSaathi के साथ अपनी दुकान संभालने के लिए ईमेल से रजिस्टर करें।',
      fullName: 'पूरा नाम',
      fullNamePlaceholder: 'अपना पूरा नाम',
      email: 'ईमेल',
      emailPlaceholder: 'you@gmail.com',
      password: 'पासवर्ड',
      passwordPlaceholder: 'कम से कम 6 अक्षर',
      createAccountLoading: 'अकाउंट बनाया जा रहा है...',
      createAccount: 'अकाउंट बनाएं',
      alreadyHaveAccount: 'पहले से अकाउंट है?',
      signInLink: 'साइन इन',
      retailerSignIn: 'रिटेलर साइन इन',
      retailerSignInSubtitle: 'अपनी रिटेल दुकान संभालने के लिए साइन इन करें।',
      loginEmailPlaceholder: 'अपना ईमेल दर्ज करें',
      loginPasswordPlaceholder: 'अपना पासवर्ड दर्ज करें',
      signInLoading: 'साइन इन हो रहा है...',
      newHere: 'नए हैं?',
      createAccountLink: 'अकाउंट बनाएं',
      toasts: {
        welcomeBack: 'वापसी पर स्वागत है!',
        loginFailed: 'लॉगिन असफल रहा। कृपया दोबारा प्रयास करें।',
        accountCreated: 'अकाउंट बन गया! DukaanSaathi में आपका स्वागत है।',
        registerFailed: 'रजिस्ट्रेशन असफल रहा। कृपया दोबारा प्रयास करें।',
      },
    },
    toasts: {
      loggedOut: 'सफलतापूर्वक लॉग आउट हो गया',
    },
  },
};

const LanguageContext = createContext(null);

function getNestedMessage(language, key) {
  return key.split('.').reduce((acc, part) => {
    if (!acc || typeof acc !== 'object') return undefined;
    return acc[part];
  }, messages[language]);
}

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    if (typeof window === 'undefined') return 'en';
    const savedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return savedLanguage === 'hi' ? 'hi' : 'en';
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    document.documentElement.lang = language;
  }, [language]);

  const value = useMemo(() => {
    const t = (key, vars) => {
      const template = getNestedMessage(language, key) ?? getNestedMessage('en', key) ?? key;
      if (!vars) {
        return template;
      }

      return Object.entries(vars).reduce((result, [name, variable]) => {
        return result.replaceAll(`{${name}}`, String(variable));
      }, template);
    };

    return {
      language,
      setLanguage,
      t,
    };
  }, [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }

  return context;
};
