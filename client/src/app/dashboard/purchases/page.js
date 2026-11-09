'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import MobileAppShell from '../../../components/layout/MobileAppShell';
import { useLanguage } from '../../../context/LanguageContext';
import { purchaseApi } from '../../../lib/api';
import {
  Camera,
  Plus,
  Search,
  Package,
  Eye,
  Calendar,
  Layers,
} from 'lucide-react';

export default function PurchasesPage() {
  const { t } = useLanguage();

  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const fetchPurchases = async () => {
    try {
      setLoading(true);
      const params = {};
      if (search) params.search = search;
      if (filter && filter !== 'all') params.filter = filter;

      const res = await purchaseApi.getAll(params);
      if (res.success) {
        setPurchases(res.purchases || []);
      }
    } catch (err) {
      console.error('Error loading purchases:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delay = setTimeout(fetchPurchases, 200);
    return () => clearTimeout(delay);
  }, [search, filter]);

  return (
    <MobileAppShell title={t('purchases')}>
      {/* Top Action Buttons */}
      <div className="grid grid-cols-2 gap-2.5 mb-4">
        <Link
          href="/dashboard/purchases/scan"
          className="flex items-center justify-center gap-2 bg-kiryana-darkGreen text-white font-bold py-3 px-3 rounded-2xl shadow-sm hover:bg-neutral-800 active:scale-98 transition-all text-xs"
        >
          <Camera className="w-4 h-4 text-emerald-400 stroke-[2.5]" />
          <span>{t('scanInvoice')}</span>
        </Link>

        <Link
          href="/dashboard/purchases/manual"
          className="flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-800 font-bold py-3 px-3 rounded-2xl shadow-sm hover:bg-gray-50 active:scale-98 transition-all text-xs"
        >
          <Plus className="w-4 h-4 text-gray-600 stroke-[2.5]" />
          <span>Manual Entry</span>
        </Link>
      </div>

      {/* Search Input */}
      <div className="relative mb-3">
        <div className="absolute inset-y-0 left-0 rtl:left-auto rtl:right-0 pl-3.5 rtl:pr-3.5 flex items-center pointer-events-none text-gray-400">
          <Search className="w-4 h-4" />
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search supplier or invoice #..."
          className="w-full bg-white border border-gray-200 rounded-xl py-2.5 pl-10 pr-3 rtl:pr-10 rtl:pl-3 text-xs focus:outline-none focus:border-kiryana-freshGreen shadow-sm"
        />
      </div>

      {/* Purchases List */}
      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-8 h-8 rounded-full border-3 border-kiryana-freshGreen border-t-transparent animate-spin"></div>
        </div>
      ) : purchases.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center border border-gray-100 shadow-card-soft">
          <Package className="w-12 h-12 mx-auto text-gray-300 mb-2" />
          <p className="text-xs font-semibold text-gray-600">No purchase invoices recorded</p>
          <p className="text-[11px] text-gray-400 mt-1">Tap Scan Invoice to read from camera</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {purchases.map((pur) => (
            <Link
              key={pur._id}
              href={`/dashboard/purchases/${pur._id}`}
              className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-card-soft hover:border-gray-200 block transition-all active:scale-98"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-xs font-bold text-gray-900">{pur.supplierName}</h4>
                  <p className="text-[10px] text-gray-500 font-mono mt-0.5">#{pur.invoiceNumber}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {new Date(pur.purchaseDate).toLocaleDateString()} • {pur.items?.length || 0} Products
                  </p>
                </div>

                <div className="text-right">
                  <div className="text-sm font-black text-gray-900 font-mono">
                    Rs. {pur.total?.toFixed(2)}
                  </div>
                  <span className="inline-block text-[9px] px-2 py-0.5 rounded font-bold uppercase mt-1 bg-emerald-100 text-emerald-800">
                    {pur.paymentStatus || 'paid'}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </MobileAppShell>
  );
}
