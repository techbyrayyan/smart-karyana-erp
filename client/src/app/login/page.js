'use client';

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { Store, Lock, User, Globe, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const { t, language, changeLanguage, isRTL } = useLanguage();

  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(username, password);
    } catch (err) {
      setError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-900 flex justify-center items-center p-3">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100 flex flex-col">
        {/* Top Header Card */}
        <div className="bg-kiryana-darkGreen text-white p-6 text-center relative">
          {/* Language Switcher in Login */}
          <div className="absolute top-4 right-4 rtl:right-auto rtl:left-4">
            <div className="flex bg-white/10 rounded-full p-0.5 text-xs">
              <button
                type="button"
                onClick={() => changeLanguage('en')}
                className={`px-2 py-0.5 rounded-full ${language === 'en' ? 'bg-kiryana-freshGreen font-bold text-white' : 'text-gray-300'}`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => changeLanguage('ur')}
                className={`px-2 py-0.5 rounded-full font-urdu ${language === 'ur' ? 'bg-kiryana-freshGreen font-bold text-white' : 'text-gray-300'}`}
              >
                اردو
              </button>
              <button
                type="button"
                onClick={() => changeLanguage('roman_ur')}
                className={`px-2 py-0.5 rounded-full ${language === 'roman_ur' ? 'bg-kiryana-freshGreen font-bold text-white' : 'text-gray-300'}`}
              >
                Roman
              </button>
            </div>
          </div>

          <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md mx-auto flex items-center justify-center mb-3 shadow-inner">
            <Store className="w-9 h-9 text-kiryana-lightGreen" />
          </div>
          <h1 className="text-xl font-black tracking-wide">{t('appName')}</h1>
          <p className="text-xs text-kiryana-lightGreen font-medium mt-0.5">{t('appSubtitle')}</p>
        </div>

        {/* Login Form */}
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-kiryana-darkText mb-1.5">
                {language === 'ur' ? 'صارف کا نام (یوزر نیم)' : language === 'roman_ur' ? 'Username / Dukandar' : 'Username'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 rtl:left-auto rtl:right-0 pl-3.5 rtl:pr-3.5 flex items-center pointer-events-none text-gray-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. admin"
                  className="w-full bg-kiryana-softBg border border-gray-200 rounded-xl py-3 pl-10 pr-3 rtl:pr-10 rtl:pl-3 text-sm focus:outline-none focus:border-kiryana-freshGreen focus:ring-1 focus:ring-kiryana-freshGreen transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-kiryana-darkText mb-1.5">
                {language === 'ur' ? 'پاس ورڈ' : 'Password'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 rtl:left-auto rtl:right-0 pl-3.5 rtl:pr-3.5 flex items-center pointer-events-none text-gray-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-kiryana-softBg border border-gray-200 rounded-xl py-3 pl-10 pr-3 rtl:pr-10 rtl:pl-3 text-sm focus:outline-none focus:border-kiryana-freshGreen focus:ring-1 focus:ring-kiryana-freshGreen transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-kiryana-freshGreen hover:bg-kiryana-darkGreen active:scale-98 text-white font-bold py-3 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <span>{t('login')}</span>
              )}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-gray-100 text-center">
            <p className="text-[11px] text-gray-500">
              {language === 'ur'
                ? 'پہلی بار لاگ ان کرنے پر خود بخود دکان کا اکاؤنٹ بن جائے گا۔'
                : language === 'roman_ur'
                ? 'Pehli baar login karne par naya account khud ba khud ban jaye ga.'
                : 'Default credentials: admin / admin123 (auto-provisions on first run)'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
