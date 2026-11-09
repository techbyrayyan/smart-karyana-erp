'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import MobileAppShell from '../../../components/layout/MobileAppShell';
import { useLanguage } from '../../../context/LanguageContext';
import { saleApi } from '../../../lib/api';
import {
  Search,
  Receipt,
  Eye,
  Printer,
  Edit2,
  Trash2,
  Calendar,
  Filter,
  Plus,
} from 'lucide-react';

export default function SalesHistoryPage() {
  const { t, language } = useLanguage();

  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('today'); // 'today' | 'yesterday' | 'this_week' | 'this_month'
  const [search, setSearch] = useState('');

  const fetchSales = async () => {
    try {
      setLoading(true);
      const params = { filter };
      if (search) params.search = search;

      const res = await saleApi.getAll(params);
      if (res.success) {
        setSales(res.sales || []);
      }
    } catch (err) {
      console.error('Error fetching sales:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delay = setTimeout(fetchSales, 200);
    return () => clearTimeout(delay);
  }, [filter, search]);

  const handleVoid = async (id, receiptNo) => {
    if (window.confirm(`Are you sure you want to VOID receipt #${receiptNo}? Stock will be refunded automatically.`)) {
      try {
        await saleApi.void(id);
        fetchSales();
      } catch (err) {
        alert(err.message || 'Error voiding sale');
      }
    }
  };

  return (
    <MobileAppShell title={t('receiptsTitle')}>
      {/* Search Input */}
      <div className="relative mb-3">
        <div className="absolute inset-y-0 left-0 rtl:left-auto rtl:right-0 pl-3.5 rtl:pr-3.5 flex items-center pointer-events-none text-gray-400">
          <Search className="w-4 h-4" />
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search receipt # or customer name..."
          className="w-full bg-white border border-gray-200 rounded-xl py-2.5 pl-10 pr-3 rtl:pr-10 rtl:pl-3 text-xs focus:outline-none focus:border-kiryana-freshGreen shadow-sm"
        />
      </div>

      {/* Date Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-2 mb-3">
        {[
          { key: 'today', label: t('filterToday') },
          { key: 'yesterday', label: t('filterYesterday') },
          { key: 'this_week', label: t('filterWeek') },
          { key: 'this_month', label: t('filterMonth') },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
              filter === f.key
                ? 'bg-kiryana-darkGreen text-white shadow-sm'
                : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Sales Receipts List */}
      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-8 h-8 rounded-full border-3 border-kiryana-freshGreen border-t-transparent animate-spin"></div>
        </div>
      ) : sales.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center border border-gray-100 shadow-card-soft">
          <Receipt className="w-12 h-12 mx-auto text-gray-300 mb-2" />
          <p className="text-xs font-semibold text-gray-600">No sales records found</p>
          <p className="text-[11px] text-gray-400 mt-1">Tap New Sale to create a bill</p>
          <Link
            href="/dashboard/sales/new"
            className="inline-flex items-center gap-1 mt-4 px-4 py-2 bg-kiryana-freshGreen text-white rounded-xl text-xs font-bold shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t('newSale')}</span>
          </Link>
        </div>
      ) : (
        <div className="space-y-2.5">
          {sales.map((sale) => (
            <div
              key={sale._id}
              className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-card-soft hover:border-gray-200 transition-all"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-gray-900">{sale.receiptNumber}</span>
                    {sale.status === 'edited' && (
                      <span className="text-[9px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.2 rounded">
                        Edited
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] font-semibold text-gray-700 mt-0.5">
                    {sale.customerName}
                  </div>
                  <div className="text-[10px] text-gray-400">
                    {new Date(sale.date).toLocaleDateString()} {new Date(sale.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {sale.items?.length || 0} Items
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-sm font-black text-gray-900 font-mono">
                    Rs. {sale.grandTotal?.toFixed(2)}
                  </div>
                  <span
                    className={`inline-block text-[9px] px-2 py-0.5 rounded font-bold uppercase mt-0.5 ${
                      sale.paymentStatus === 'paid'
                        ? 'bg-emerald-100 text-emerald-800'
                        : sale.paymentStatus === 'partial'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {sale.paymentStatus}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-1 mt-3 pt-2 border-t border-gray-100">
                <Link
                  href={`/dashboard/sales/${sale._id}`}
                  className="p-1.5 text-gray-500 hover:text-kiryana-freshGreen hover:bg-kiryana-lightGreen/50 rounded-lg transition-colors"
                  title={t('view')}
                >
                  <Eye className="w-4 h-4" />
                </Link>
                <Link
                  href={`/dashboard/sales/${sale._id}?print=true`}
                  className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title={t('print')}
                >
                  <Printer className="w-4 h-4" />
                </Link>
                <Link
                  href={`/dashboard/sales/${sale._id}?edit=true`}
                  className="p-1.5 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                  title={t('edit')}
                >
                  <Edit2 className="w-4 h-4" />
                </Link>
                <button
                  onClick={() => handleVoid(sale._id, sale.receiptNumber)}
                  className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  title={t('voidSale')}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </MobileAppShell>
  );
}
