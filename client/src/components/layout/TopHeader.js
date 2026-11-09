'use client';

import React, { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { Store, Globe, ArrowLeft, ArrowRight, ShieldCheck } from 'lucide-react';

export default function TopHeader({ title, showBack = false }) {
  const router = useRouter();
  const pathname = usePathname();
  const { language, changeLanguage, isRTL, t } = useLanguage();
  const { profile } = useAuth();
  const [showLangMenu, setShowLangMenu] = useState(false);

  const isHome = pathname === '/dashboard';

  return (
    <header className="sticky top-0 z-40 bg-kiryana-darkGreen text-white px-4 py-3 shadow-md">
      <div className="flex items-center justify-between">
        {/* Left: Back button or Store Logo/Icon */}
        <div className="flex items-center space-x-2 rtl:space-x-reverse">
          {showBack && !isHome ? (
            <button
              onClick={() => router.back()}
              className="p-1.5 rounded-full hover:bg-white/10 active:scale-95 transition-transform"
              aria-label="Go Back"
            >
              {isRTL ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
            </button>
          ) : (
            <div className="w-8 h-8 rounded-lg bg-kiryana-freshGreen/30 flex items-center justify-center text-kiryana-lightGreen">
              <Store className="w-5 h-5" />
            </div>
          )}

          <div>
            <h1 className="text-sm font-bold tracking-tight truncate max-w-[170px]">
              {title || profile?.storeName || t('appName')}
            </h1>
            <p className="text-[10px] text-kiryana-lightGreen/80 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              {profile?.ownerName || 'Kiryana POS'}
            </p>
          </div>
        </div>

        {/* Right: Language Switcher & Security Status */}
        <div className="flex items-center space-x-2 rtl:space-x-reverse relative">
          <button
            onClick={() => setShowLangMenu(!showLangMenu)}
            className="flex items-center gap-1 bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded-full text-xs font-medium text-white transition-colors"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{language === 'en' ? 'ENG' : language === 'ur' ? 'اردو' : 'Roman'}</span>
          </button>

          {/* Language Dropdown Modal */}
          {showLangMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowLangMenu(false)}
              ></div>
              <div className="absolute right-0 top-10 z-50 bg-white text-kiryana-darkText rounded-xl shadow-xl border border-gray-100 py-1.5 w-36 overflow-hidden">
                <button
                  onClick={() => {
                    changeLanguage('en');
                    setShowLangMenu(false);
                  }}
                  className={`w-full text-left rtl:text-right px-3 py-2 text-xs flex items-center justify-between hover:bg-kiryana-lightGreen ${
                    language === 'en' ? 'font-bold text-kiryana-freshGreen bg-kiryana-lightGreen/50' : ''
                  }`}
                >
                  <span>English</span>
                  {language === 'en' && <span className="text-xs">✓</span>}
                </button>
                <button
                  onClick={() => {
                    changeLanguage('ur');
                    setShowLangMenu(false);
                  }}
                  className={`w-full text-left rtl:text-right px-3 py-2 text-xs flex items-center justify-between hover:bg-kiryana-lightGreen font-urdu ${
                    language === 'ur' ? 'font-bold text-kiryana-freshGreen bg-kiryana-lightGreen/50' : ''
                  }`}
                >
                  <span>اردو</span>
                  {language === 'ur' && <span className="text-xs">✓</span>}
                </button>
                <button
                  onClick={() => {
                    changeLanguage('roman_ur');
                    setShowLangMenu(false);
                  }}
                  className={`w-full text-left rtl:text-right px-3 py-2 text-xs flex items-center justify-between hover:bg-kiryana-lightGreen ${
                    language === 'roman_ur' ? 'font-bold text-kiryana-freshGreen bg-kiryana-lightGreen/50' : ''
                  }`}
                >
                  <span>Roman Urdu</span>
                  {language === 'roman_ur' && <span className="text-xs">✓</span>}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
