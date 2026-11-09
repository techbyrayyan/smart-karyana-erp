'use client';

import React, { useState, useEffect } from 'react';
import MobileAppShell from '../../../components/layout/MobileAppShell';
import { useLanguage } from '../../../context/LanguageContext';
import { useAuth } from '../../../context/AuthContext';
import { authApi } from '../../../lib/api';
import {
  Store,
  Clock,
  Phone,
  MapPin,
  Globe,
  Printer,
  Lock,
  LogOut,
  Check,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';

export default function SettingsPage() {
  const { t, language, changeLanguage } = useLanguage();
  const { profile, refreshProfile, logout, user } = useAuth();

  // Profile Form State
  const [storeName, setStoreName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [openingTime, setOpeningTime] = useState('07:00 AM');
  const [closingTime, setClosingTime] = useState('11:00 PM');
  const [shopPhone, setShopPhone] = useState('');
  const [shopAddress, setShopAddress] = useState('');
  const [allowNegativeStock, setAllowNegativeStock] = useState(false);
  const [paperSize, setPaperSize] = useState('80mm');
  const [footerMessage, setFooterMessage] = useState('');

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (profile) {
      setStoreName(profile.storeName || '');
      setOwnerName(profile.ownerName || '');
      setOpeningTime(profile.openingTime || '07:00 AM');
      setClosingTime(profile.closingTime || '11:00 PM');
      setShopPhone(profile.shopPhone || '');
      setShopAddress(profile.shopAddress || '');
      setAllowNegativeStock(profile.allowNegativeStock || false);
      setPaperSize(profile.receiptSettings?.paperSize || '80mm');
      setFooterMessage(
        profile.receiptSettings?.footerMessageUrdu ||
        profile.receiptSettings?.footerMessageEnglish ||
        ''
      );
    }
  }, [profile]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');

    try {
      const payload = {
        storeName: storeName.trim(),
        ownerName: ownerName.trim(),
        openingTime,
        closingTime,
        shopPhone: shopPhone.trim(),
        shopAddress: shopAddress.trim(),
        allowNegativeStock,
        receiptSettings: {
          paperSize,
          footerMessageUrdu: footerMessage,
          footerMessageEnglish: footerMessage,
        },
      };

      const res = await authApi.updateProfile(payload);
      if (res.success) {
        setSuccessMsg('Settings saved successfully!');
        refreshProfile();
      }
    } catch (err) {
      alert(err.message || 'Error saving settings');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordMsg('');
    setPasswordError('');

    try {
      const res = await authApi.changePassword(currentPassword, newPassword);
      if (res.success) {
        setPasswordMsg('Password updated successfully');
        setCurrentPassword('');
        setNewPassword('');
      }
    } catch (err) {
      setPasswordError(err.message || 'Error changing password');
    }
  };

  return (
    <MobileAppShell title={t('settingsTitle')}>
      <div className="space-y-4">
        {successMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-1.5">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* 1. Shop Profile Details */}
        <form onSubmit={handleSaveProfile} className="space-y-3.5">
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-card-soft space-y-3">
            <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
              <Store className="w-4 h-4 text-kiryana-freshGreen" />
              <span>{t('profile')}</span>
            </h3>

            <div>
              <label className="text-[10px] text-gray-500 block mb-1">{t('storeName')} *</label>
              <input
                type="text"
                required
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="w-full bg-kiryana-softBg border border-gray-200 rounded-xl p-2.5 text-xs font-bold"
              />
            </div>

            <div>
              <label className="text-[10px] text-gray-500 block mb-1">{t('ownerName')} *</label>
              <input
                type="text"
                required
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                className="w-full bg-kiryana-softBg border border-gray-200 rounded-xl p-2.5 text-xs font-bold"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="text-[10px] text-gray-500 block mb-1">{t('openingTime')}</label>
                <input
                  type="text"
                  value={openingTime}
                  onChange={(e) => setOpeningTime(e.target.value)}
                  placeholder="07:00 AM"
                  className="w-full bg-kiryana-softBg border border-gray-200 rounded-xl p-2.5 text-xs"
                />
              </div>

              <div>
                <label className="text-[10px] text-gray-500 block mb-1">{t('closingTime')}</label>
                <input
                  type="text"
                  value={closingTime}
                  onChange={(e) => setClosingTime(e.target.value)}
                  placeholder="11:00 PM"
                  className="w-full bg-kiryana-softBg border border-gray-200 rounded-xl p-2.5 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] text-gray-500 block mb-1">Shop Mobile / Phone</label>
              <input
                type="text"
                value={shopPhone}
                onChange={(e) => setShopPhone(e.target.value)}
                placeholder="0300-1234567"
                className="w-full bg-kiryana-softBg border border-gray-200 rounded-xl p-2.5 text-xs font-mono"
              />
            </div>

            <div>
              <label className="text-[10px] text-gray-500 block mb-1">Shop Address</label>
              <input
                type="text"
                value={shopAddress}
                onChange={(e) => setShopAddress(e.target.value)}
                placeholder="e.g. Shop # 4, Main Bazar"
                className="w-full bg-kiryana-softBg border border-gray-200 rounded-xl p-2.5 text-xs"
              />
            </div>
          </div>

          {/* 2. Language Selection */}
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-card-soft space-y-3">
            <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-kiryana-freshGreen" />
              <span>{t('language')}</span>
            </h3>

            <div className="grid grid-cols-3 gap-2 text-xs">
              <button
                type="button"
                onClick={() => changeLanguage('en')}
                className={`py-2.5 rounded-xl font-bold transition-all ${
                  language === 'en'
                    ? 'bg-kiryana-darkGreen text-white shadow-sm'
                    : 'bg-kiryana-softBg text-gray-700 hover:bg-gray-200'
                }`}
              >
                English
              </button>
              <button
                type="button"
                onClick={() => changeLanguage('ur')}
                className={`py-2.5 rounded-xl font-bold font-urdu transition-all ${
                  language === 'ur'
                    ? 'bg-kiryana-darkGreen text-white shadow-sm'
                    : 'bg-kiryana-softBg text-gray-700 hover:bg-gray-200'
                }`}
              >
                اردو
              </button>
              <button
                type="button"
                onClick={() => changeLanguage('roman_ur')}
                className={`py-2.5 rounded-xl font-bold transition-all ${
                  language === 'roman_ur'
                    ? 'bg-kiryana-darkGreen text-white shadow-sm'
                    : 'bg-kiryana-softBg text-gray-700 hover:bg-gray-200'
                }`}
              >
                Roman Urdu
              </button>
            </div>
          </div>

          {/* 3. POS & Receipt Settings */}
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-card-soft space-y-3">
            <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
              <Printer className="w-4 h-4 text-kiryana-freshGreen" />
              <span>Thermal Receipt & POS Settings</span>
            </h3>

            <div className="flex items-center justify-between py-1">
              <div>
                <span className="text-xs font-bold text-gray-800 block">{t('paperSize')}</span>
                <span className="text-[10px] text-gray-400">Common POS thermal rolls</span>
              </div>
              <div className="flex bg-kiryana-softBg rounded-lg p-0.5 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setPaperSize('58mm')}
                  className={`px-3 py-1 rounded-md ${paperSize === '58mm' ? 'bg-kiryana-freshGreen text-white' : 'text-gray-600'}`}
                >
                  58mm
                </button>
                <button
                  type="button"
                  onClick={() => setPaperSize('80mm')}
                  className={`px-3 py-1 rounded-md ${paperSize === '80mm' ? 'bg-kiryana-freshGreen text-white' : 'text-gray-600'}`}
                >
                  80mm
                </button>
              </div>
            </div>

            <div>
              <label className="text-[10px] text-gray-500 block mb-1">{t('receiptFooter')}</label>
              <input
                type="text"
                value={footerMessage}
                onChange={(e) => setFooterMessage(e.target.value)}
                placeholder="Thank you message on receipt"
                className="w-full bg-kiryana-softBg border border-gray-200 rounded-xl p-2.5 text-xs"
              />
            </div>

            {/* Negative Stock Toggle */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <div className="pr-3">
                <span className="text-xs font-bold text-gray-800 block">{t('allowNegativeStock')}</span>
                <span className="text-[10px] text-gray-400">Allow selling items even when recorded stock is 0</span>
              </div>
              <button
                type="button"
                onClick={() => setAllowNegativeStock(!allowNegativeStock)}
                className="text-2xl text-kiryana-freshGreen"
              >
                {allowNegativeStock ? (
                  <ToggleRight className="w-8 h-8 text-kiryana-freshGreen" />
                ) : (
                  <ToggleLeft className="w-8 h-8 text-gray-300" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3.5 bg-kiryana-freshGreen hover:bg-kiryana-darkGreen active:scale-98 text-white font-bold rounded-xl shadow-md text-xs flex items-center justify-center gap-1.5"
          >
            {saving ? 'Saving...' : (
              <>
                <Check className="w-4 h-4" />
                <span>Save Store Settings</span>
              </>
            )}
          </button>
        </form>

        {/* 4. Password Change Card */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-card-soft space-y-3">
          <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
            <Lock className="w-4 h-4 text-gray-600" />
            <span>{t('changePassword')}</span>
          </h3>

          {passwordMsg && <p className="text-xs text-emerald-600 font-bold">{passwordMsg}</p>}
          {passwordError && <p className="text-xs text-red-600 font-bold">{passwordError}</p>}

          <form onSubmit={handleChangePassword} className="space-y-2.5">
            <div>
              <label className="text-[10px] text-gray-500 block mb-1">{t('currentPassword')}</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-kiryana-softBg border border-gray-200 rounded-xl p-2.5 text-xs"
              />
            </div>

            <div>
              <label className="text-[10px] text-gray-500 block mb-1">{t('newPassword')}</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-kiryana-softBg border border-gray-200 rounded-xl p-2.5 text-xs"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-gray-800 hover:bg-black text-white text-xs font-bold rounded-xl"
            >
              Update Password
            </button>
          </form>
        </div>

        {/* 5. Logout Button */}
        <button
          onClick={logout}
          className="w-full py-3 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 active:scale-98 transition-transform"
        >
          <LogOut className="w-4 h-4" />
          <span>{t('logout')} ({user?.username})</span>
        </button>
      </div>
    </MobileAppShell>
  );
}
