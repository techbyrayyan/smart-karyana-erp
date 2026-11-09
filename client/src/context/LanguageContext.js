'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../lib/translations';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState('en');
  const [isRTL, setIsRTL] = useState(false);

  useEffect(() => {
    // Read saved language from localStorage
    const saved = localStorage.getItem('smart_khata_lang');
    if (saved && ['en', 'ur', 'roman_ur'].includes(saved)) {
      setLanguageState(saved);
      setIsRTL(saved === 'ur');
    }
  }, []);

  const changeLanguage = (newLang) => {
    if (['en', 'ur', 'roman_ur'].includes(newLang)) {
      setLanguageState(newLang);
      const isUrdu = newLang === 'ur';
      setIsRTL(isUrdu);
      localStorage.setItem('smart_khata_lang', newLang);

      // Set document dir & lang attribute
      if (typeof document !== 'undefined') {
        document.documentElement.dir = isUrdu ? 'rtl' : 'ltr';
        document.documentElement.lang = isUrdu ? 'ur' : 'en';
      }
    }
  };

  const t = (key) => {
    const langDict = translations[language] || translations.en;
    return langDict[key] || translations.en[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, isRTL, changeLanguage, t }}>
      <div dir={isRTL ? 'rtl' : 'ltr'} className={isRTL ? 'font-urdu' : 'font-sans'}>
        {children}
      </div>
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
