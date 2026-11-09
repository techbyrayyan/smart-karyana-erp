'use client';

import React from 'react';
import Link from 'next/link';
import MobileAppShell from '../../../components/layout/MobileAppShell';
import { useLanguage } from '../../../context/LanguageContext';
import { useAuth } from '../../../context/AuthContext';
import {
  Package,
  ShoppingCart,
  Camera,
  Receipt,
  Users,
  DollarSign,
  TrendingUp,
  Settings,
  LogOut,
  ChevronRight,
  ChevronLeft,
  Store,
} from 'lucide-react';

export default function MoreMenuPage() {
  const { t, isRTL } = useLanguage();
  const { logout, profile, user } = useAuth();

  const menuGroups = [
    {
      title: 'Operations & POS',
      items: [
        {
          title: t('newSale'),
          subtitle: 'Mobile POS Billing Terminal',
          href: '/dashboard/sales/new',
          icon: ShoppingCart,
          color: 'bg-emerald-50 text-kiryana-freshGreen',
        },
        {
          title: t('scanInvoice'),
          subtitle: 'AI Camera Receipt & Invoice OCR',
          href: '/dashboard/purchases/scan',
          icon: Camera,
          color: 'bg-teal-50 text-teal-600',
        },
        {
          title: t('products'),
          subtitle: 'Inventory, Prices & Variations',
          href: '/dashboard/products',
          icon: Package,
          color: 'bg-amber-50 text-amber-600',
        },
        {
          title: t('receipts'),
          subtitle: 'Sales History & Thermal Receipts',
          href: '/dashboard/sales',
          icon: Receipt,
          color: 'bg-blue-50 text-blue-600',
        },
      ],
    },
    {
      title: 'Accounts & Khata',
      items: [
        {
          title: t('customers'),
          subtitle: 'Customer Ledger & Udhaar Khata',
          href: '/dashboard/customers',
          icon: Users,
          color: 'bg-indigo-50 text-indigo-600',
        },
        {
          title: t('purchases'),
          subtitle: 'Supplier Invoices & Mandi Stock',
          href: '/dashboard/purchases',
          icon: Package,
          color: 'bg-purple-50 text-purple-600',
        },
        {
          title: t('expenses'),
          subtitle: 'Rent, Electricity, Salaries, Transport',
          href: '/dashboard/expenses',
          icon: DollarSign,
          color: 'bg-rose-50 text-rose-600',
        },
        {
          title: t('reports'),
          subtitle: 'True COGS Gross & Net Profit',
          href: '/dashboard/reports',
          icon: TrendingUp,
          color: 'bg-cyan-50 text-cyan-700',
        },
      ],
    },
    {
      title: 'Administration',
      items: [
        {
          title: t('settings'),
          subtitle: 'Shop Profile, Language, Printer Size',
          href: '/dashboard/settings',
          icon: Settings,
          color: 'bg-gray-100 text-gray-700',
        },
      ],
    },
  ];

  return (
    <MobileAppShell title={t('more')}>
      <div className="space-y-4">
        {/* Store Profile Card */}
        <div className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-card-soft flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-kiryana-darkGreen text-kiryana-lightGreen flex items-center justify-center font-black">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-gray-900 leading-snug">
                {profile?.storeName || 'Smart Khata Kiryana'}
              </h3>
              <p className="text-[10px] text-gray-500">
                Prop: {profile?.ownerName || user?.username || 'Owner'}
              </p>
            </div>
          </div>

          <Link
            href="/dashboard/settings"
            className="text-[11px] font-bold text-kiryana-freshGreen bg-kiryana-lightGreen px-2.5 py-1 rounded-xl"
          >
            Edit
          </Link>
        </div>

        {/* Menu Sections */}
        {menuGroups.map((group, gIdx) => (
          <div key={gIdx} className="space-y-1.5">
            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-2">
              {group.title}
            </h4>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-card-soft divide-y divide-gray-100 overflow-hidden">
              {group.items.map((item, iIdx) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={iIdx}
                    href={item.href}
                    className="flex items-center justify-between p-3.5 hover:bg-kiryana-softBg transition-colors active:scale-98"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${item.color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-gray-900 block">
                          {item.title}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {item.subtitle}
                        </span>
                      </div>
                    </div>

                    <div className="text-gray-400">
                      {isRTL ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}

        {/* Logout Button */}
        <button
          onClick={logout}
          className="w-full py-3 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 active:scale-98 transition-transform mt-2"
        >
          <LogOut className="w-4 h-4" />
          <span>{t('logout')} ({user?.username})</span>
        </button>
      </div>
    </MobileAppShell>
  );
}
