'use client';

import React from 'react';
import TopHeader from './TopHeader';
import BottomNav from './BottomNav';

export default function MobileAppShell({ children, title, showBack = false, hideNav = false }) {
  return (
    <div className="min-h-screen bg-neutral-900 flex justify-center">
      {/* Mobile Screen Container - strictly mobile optimized */}
      <div className="w-full max-w-md min-h-screen bg-kiryana-softBg text-kiryana-darkText flex flex-col relative shadow-2xl overflow-x-hidden">
        <TopHeader title={title} showBack={showBack} />

        <main className={`flex-1 overflow-y-auto px-3.5 py-4 ${hideNav ? 'pb-8' : 'pb-24'}`}>
          {children}
        </main>

        {!hideNav && <BottomNav />}
      </div>
    </div>
  );
}
