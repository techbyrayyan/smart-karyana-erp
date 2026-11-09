'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '../../context/LanguageContext';
import { LayoutDashboard, Package, ShoppingCart, ReceiptText, Grid } from 'lucide-react';

export default function BottomNav() {
  const pathname = usePathname();
  const { t } = useLanguage();

  const navItems = [
    {
      name: t('home'),
      href: '/dashboard',
      icon: LayoutDashboard,
      active: pathname === '/dashboard',
    },
    {
      name: t('products'),
      href: '/dashboard/products',
      icon: Package,
      active: pathname.startsWith('/dashboard/products'),
    },
    {
      name: t('newSale'),
      href: '/dashboard/sales/new',
      icon: ShoppingCart,
      isSpecial: true,
      active: pathname === '/dashboard/sales/new',
    },
    {
      name: t('receipts'),
      href: '/dashboard/sales',
      icon: ReceiptText,
      active: pathname === '/dashboard/sales' || (pathname.startsWith('/dashboard/sales/') && pathname !== '/dashboard/sales/new'),
    },
    {
      name: t('more'),
      href: '/dashboard/more',
      icon: Grid,
      active: ['/dashboard/more', '/dashboard/customers', '/dashboard/purchases', '/dashboard/expenses', '/dashboard/reports', '/dashboard/settings'].some(p => pathname.startsWith(p)),
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-kiryana-border shadow-mobile-nav max-w-md mx-auto">
      <div className="flex items-center justify-around px-2 py-1.5 h-16">
        {navItems.map((item) => {
          const Icon = item.icon;

          if (item.isSpecial) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center justify-center -mt-6 group"
              >
                <div className="w-13 h-13 rounded-full bg-kiryana-freshGreen text-white flex items-center justify-center shadow-lg shadow-kiryana-freshGreen/30 border-4 border-white transform transition-transform active:scale-95 group-hover:scale-105">
                  <Icon className="w-6 h-6 stroke-[2.2]" />
                </div>
                <span className="text-[10px] font-bold text-kiryana-darkGreen mt-1">
                  {item.name}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 py-1 px-1 transition-colors ${
                item.active
                  ? 'text-kiryana-freshGreen font-bold'
                  : 'text-gray-500 hover:text-kiryana-darkGreen'
              }`}
            >
              <Icon className={`w-5 h-5 mb-0.5 ${item.active ? 'stroke-[2.4]' : 'stroke-[1.8]'}`} />
              <span className="text-[10px] truncate max-w-[64px] text-center">
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
