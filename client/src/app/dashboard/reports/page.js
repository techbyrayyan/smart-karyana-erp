'use client';

import React, { useState, useEffect } from 'react';
import MobileAppShell from '../../../components/layout/MobileAppShell';
import { useLanguage } from '../../../context/LanguageContext';
import { reportApi } from '../../../lib/api';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  Calendar,
  Layers,
  Award,
} from 'lucide-react';

export default function ReportsPage() {
  const { t } = useLanguage();

  const [period, setPeriod] = useState('today'); // 'today' | 'yesterday' | 'week' | 'month'
  const [summary, setSummary] = useState(null);
  const [bestSellers, setBestSellers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await reportApi.getFinancialReports({ period });
      if (res.success) {
        setSummary(res.summary);
        setBestSellers(res.bestSellingProducts || []);
      }
    } catch (err) {
      console.error('Error loading reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [period]);

  return (
    <MobileAppShell title={t('reportsTitle')}>
      {/* Period Selector Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-2 mb-3">
        {[
          { key: 'today', label: t('filterToday') },
          { key: 'yesterday', label: t('filterYesterday') },
          { key: 'week', label: t('filterWeek') },
          { key: 'month', label: t('filterMonth') },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setPeriod(tab.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
              period === tab.key
                ? 'bg-kiryana-darkGreen text-white shadow-sm'
                : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 rounded-full border-3 border-kiryana-freshGreen border-t-transparent animate-spin"></div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Net Profit & Gross Profit Highlight Card */}
          <div className="bg-kiryana-darkGreen text-white p-4 rounded-2xl shadow-md space-y-3">
            <span className="text-[10px] text-kiryana-lightGreen uppercase tracking-wider block font-bold">
              Profit Analysis ({period.toUpperCase()})
            </span>

            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div>
                <span className="text-xs text-gray-300 block">{t('netProfit')} (Saaf Bachat)</span>
                <span className={`text-xl font-black font-mono ${(summary?.netProfit || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  Rs. {(summary?.netProfit || 0).toLocaleString()}
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs text-gray-300 block">{t('grossProfit')}</span>
                <span className="text-sm font-bold text-gray-200 font-mono">
                  Rs. {(summary?.grossProfit || 0).toLocaleString()}
                </span>
              </div>
            </div>

            <p className="text-[10px] text-gray-300 italic">
              * Computed using exact Cost of Goods Sold (COGS) for products sold minus all shop expenses.
            </p>
          </div>

          {/* Revenue vs Cost Breakdown */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-card-soft">
              <span className="text-[10px] text-gray-500 font-bold block">Total Sales</span>
              <span className="text-sm font-black text-emerald-700 font-mono">
                Rs. {(summary?.totalSales || 0).toLocaleString()}
              </span>
              <span className="text-[9px] text-gray-400 block mt-0.5">
                {summary?.salesCount || 0} Bills Generated
              </span>
            </div>

            <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-card-soft">
              <span className="text-[10px] text-gray-500 font-bold block">{t('costOfGoods')}</span>
              <span className="text-sm font-black text-gray-800 font-mono">
                Rs. {(summary?.costOfGoodsSold || 0).toLocaleString()}
              </span>
              <span className="text-[9px] text-gray-400 block mt-0.5">Stock Cost</span>
            </div>

            <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-card-soft">
              <span className="text-[10px] text-gray-500 font-bold block">Purchases</span>
              <span className="text-sm font-black text-blue-700 font-mono">
                Rs. {(summary?.totalPurchases || 0).toLocaleString()}
              </span>
              <span className="text-[9px] text-gray-400 block mt-0.5">
                {summary?.purchasesCount || 0} Invoices
              </span>
            </div>

            <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-card-soft">
              <span className="text-[10px] text-gray-500 font-bold block">Shop Expenses</span>
              <span className="text-sm font-black text-rose-700 font-mono">
                Rs. {(summary?.totalExpenses || 0).toLocaleString()}
              </span>
              <span className="text-[9px] text-gray-400 block mt-0.5">Rent / Electricity</span>
            </div>
          </div>

          {/* Best Selling Products */}
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-card-soft space-y-3">
            <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-500" />
              <span>{t('bestSellers')}</span>
            </h4>

            {bestSellers.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">No sales recorded in this period</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {bestSellers.map((item, idx) => (
                  <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-kiryana-lightGreen text-kiryana-darkGreen font-bold flex items-center justify-center text-[10px]">
                        {idx + 1}
                      </span>
                      <div>
                        <span className="font-bold text-gray-900 block">{item.name}</span>
                        <span className="text-[10px] text-gray-400">
                          Qty: {item.quantity} {item.unit}
                        </span>
                      </div>
                    </div>

                    <div className="text-right font-mono font-bold text-gray-900">
                      Rs. {item.revenue?.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </MobileAppShell>
  );
}
