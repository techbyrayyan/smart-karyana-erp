'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import MobileAppShell from '../../components/layout/MobileAppShell';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { reportApi } from '../../lib/api';
import {
  Package,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  AlertTriangle,
  Boxes,
  Camera,
  ShoppingCart,
  Receipt,
  ArrowUpRight,
  ArrowDownLeft,
  RotateCcw,
  RefreshCw,
} from 'lucide-react';

export default function DashboardPage() {
  const { t, language } = useLanguage();
  const { profile } = useAuth();

  const [stats, setStats] = useState(null);
  const [stockActivity, setStockActivity] = useState(null);
  const [recentSales, setRecentSales] = useState([]);
  const [recentPurchases, setRecentPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = async () => {
    try {
      setRefreshing(true);
      const res = await reportApi.getDashboardStats();
      if (res.success) {
        setStats(res.stats);
        setStockActivity(res.stockActivity);
        setRecentSales(res.recentSales || []);
        setRecentPurchases(res.recentPurchases || []);
      }
    } catch (err) {
      console.error('Error loading dashboard stats:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return (
    <MobileAppShell title={profile?.storeName || t('appName')}>
      {/* Quick Action Banner */}
      <div className="grid grid-cols-2 gap-2.5 mb-4">
        <Link
          href="/dashboard/sales/new"
          className="flex items-center gap-2.5 bg-kiryana-freshGreen text-white p-3 rounded-2xl shadow-sm hover:bg-kiryana-darkGreen active:scale-98 transition-all"
        >
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <ShoppingCart className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold leading-tight">{t('newSale')}</div>
            <div className="text-[10px] text-kiryana-lightGreen opacity-90">POS Billing</div>
          </div>
        </Link>

        <Link
          href="/dashboard/purchases/scan"
          className="flex items-center gap-2.5 bg-kiryana-darkGreen text-white p-3 rounded-2xl shadow-sm hover:bg-neutral-800 active:scale-98 transition-all"
        >
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0 text-emerald-400">
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold leading-tight">{t('scanInvoice')}</div>
            <div className="text-[10px] text-kiryana-lightGreen opacity-90">AI Camera OCR</div>
          </div>
        </Link>
      </div>

      {/* Header with Refresh button */}
      <div className="flex items-center justify-between mb-3 px-1">
        <h2 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
          {t('dashboardTitle')}
        </h2>
        <button
          onClick={fetchDashboardData}
          disabled={refreshing}
          className="p-1 rounded-full text-gray-500 hover:text-kiryana-darkGreen active:rotate-180 transition-transform"
          title="Refresh Data"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-kiryana-freshGreen' : ''}`} />
        </button>
      </div>

      {/* 8 Primary Business KPI Cards */}
      <div className="grid grid-cols-2 gap-2.5 mb-4">
        {/* 1. Today's Sales */}
        <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-card-soft">
          <div className="flex items-center justify-between text-gray-400 mb-1">
            <span className="text-[11px] font-semibold text-gray-600">{t('todaySales')}</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-base font-black text-kiryana-darkText">
            Rs. {stats?.todaySales?.toLocaleString() || '0'}
          </div>
          <div className="text-[10px] text-emerald-600 font-medium mt-0.5 flex items-center gap-0.5">
            <ArrowUpRight className="w-3 h-3" /> Live Gross
          </div>
        </div>

        {/* 2. Today's Profit (COGS based) */}
        <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-card-soft">
          <div className="flex items-center justify-between text-gray-400 mb-1">
            <span className="text-[11px] font-semibold text-gray-600">{t('todayProfit')}</span>
            <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-base font-black ${stats?.todayEstimatedNetProfit >= 0 ? 'text-teal-700' : 'text-red-600'}`}>
            Rs. {stats?.todayEstimatedNetProfit?.toLocaleString() || '0'}
          </div>
          <div className="text-[10px] text-gray-500 mt-0.5">Net Bachat</div>
        </div>

        {/* 3. Today's Purchases */}
        <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-card-soft">
          <div className="flex items-center justify-between text-gray-400 mb-1">
            <span className="text-[11px] font-semibold text-gray-600">{t('todayPurchases')}</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="text-base font-black text-gray-900">
            Rs. {stats?.todayPurchases?.toLocaleString() || '0'}
          </div>
          <div className="text-[10px] text-blue-600 mt-0.5">Mandi / Supplier</div>
        </div>

        {/* 4. Today's Expenses */}
        <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-card-soft">
          <div className="flex items-center justify-between text-gray-400 mb-1">
            <span className="text-[11px] font-semibold text-gray-600">{t('todayExpenses')}</span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-base font-black text-rose-700">
            Rs. {stats?.todayExpenses?.toLocaleString() || '0'}
          </div>
          <div className="text-[10px] text-gray-500 mt-0.5">Rent / Bills / Salary</div>
        </div>

        {/* 5. Total Products */}
        <Link href="/dashboard/products" className="bg-white p-3 rounded-2xl border border-gray-100 shadow-card-soft block active:scale-98 transition-transform">
          <div className="flex items-center justify-between text-gray-400 mb-1">
            <span className="text-[11px] font-semibold text-gray-600">{t('totalProducts')}</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-base font-black text-gray-900">
            {stats?.totalProducts || 0}
          </div>
          <div className="text-[10px] text-kiryana-freshGreen font-medium mt-0.5">View Catalog →</div>
        </Link>

        {/* 6. Total Stock */}
        <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-card-soft">
          <div className="flex items-center justify-between text-gray-400 mb-1">
            <span className="text-[11px] font-semibold text-gray-600">{t('totalStock')}</span>
            <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="text-base font-black text-gray-900">
            {stats?.totalAvailableStock || 0}
          </div>
          <div className="text-[10px] text-gray-500 mt-0.5">Base Units Total</div>
        </div>

        {/* 7. Total Customers */}
        <Link href="/dashboard/customers" className="bg-white p-3 rounded-2xl border border-gray-100 shadow-card-soft block active:scale-98 transition-transform">
          <div className="flex items-center justify-between text-gray-400 mb-1">
            <span className="text-[11px] font-semibold text-gray-600">{t('totalCustomers')}</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-base font-black text-gray-900">
            {stats?.totalCustomers || 0}
          </div>
          <div className="text-[10px] text-indigo-600 font-medium mt-0.5">Khata Book →</div>
        </Link>

        {/* 8. Low Stock Alert */}
        <Link href="/dashboard/products?lowStock=true" className="bg-white p-3 rounded-2xl border border-gray-100 shadow-card-soft block active:scale-98 transition-transform">
          <div className="flex items-center justify-between text-gray-400 mb-1">
            <span className="text-[11px] font-semibold text-gray-600">{t('lowStockAlert')}</span>
            <div className="w-7 h-7 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-base font-black ${stats?.lowStockCount > 0 ? 'text-red-600' : 'text-gray-900'}`}>
            {stats?.lowStockCount || 0}
          </div>
          <div className="text-[10px] text-red-500 font-medium mt-0.5">
            {stats?.lowStockCount > 0 ? 'Urgent Reorder' : 'Healthy Stock'}
          </div>
        </Link>
      </div>

      {/* Daily Stock Activity Section */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-card-soft mb-4">
        <h3 className="text-xs font-bold text-gray-800 mb-3 flex items-center gap-1.5">
          <Boxes className="w-4 h-4 text-kiryana-freshGreen" />
          <span>{t('dailyStockActivity')}</span>
        </h3>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-100">
            <div className="text-[10px] text-emerald-800 font-medium">{t('stockAddedToday')}</div>
            <div className="text-sm font-black text-emerald-700 mt-0.5">
              +{stockActivity?.addedToday || 0}
            </div>
          </div>

          <div className="bg-amber-50/60 p-2.5 rounded-xl border border-amber-100">
            <div className="text-[10px] text-amber-800 font-medium">{t('stockSoldToday')}</div>
            <div className="text-sm font-black text-amber-700 mt-0.5">
              -{stockActivity?.soldToday || 0}
            </div>
          </div>

          <div className="bg-blue-50/60 p-2.5 rounded-xl border border-blue-100">
            <div className="text-[10px] text-blue-800 font-medium">{t('stockReturnedToday')}</div>
            <div className="text-sm font-black text-blue-700 mt-0.5">
              +{stockActivity?.returnedToday || 0}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Sales Section */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-card-soft mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
            <Receipt className="w-4 h-4 text-kiryana-freshGreen" />
            <span>{t('recentSales')}</span>
          </h3>
          <Link href="/dashboard/sales" className="text-[11px] font-bold text-kiryana-freshGreen hover:underline">
            {t('all')} →
          </Link>
        </div>

        {recentSales.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">{t('noRecentSales')}</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {recentSales.map((sale) => (
              <Link
                key={sale._id}
                href={`/dashboard/sales/${sale._id}`}
                className="flex items-center justify-between py-2.5 hover:bg-kiryana-softBg px-1 rounded-lg transition-colors"
              >
                <div>
                  <div className="text-xs font-bold text-gray-900">{sale.receiptNumber}</div>
                  <div className="text-[10px] text-gray-500 truncate max-w-[150px]">
                    {sale.customerName}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs font-bold text-gray-900">
                    Rs. {sale.grandTotal?.toFixed(2)}
                  </div>
                  <span
                    className={`inline-block text-[9px] px-1.5 py-0.2 rounded font-semibold uppercase ${
                      sale.paymentStatus === 'paid'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {sale.paymentStatus}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Recent Purchases Section */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-card-soft">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
            <Package className="w-4 h-4 text-blue-600" />
            <span>{t('recentPurchases')}</span>
          </h3>
          <Link href="/dashboard/purchases" className="text-[11px] font-bold text-kiryana-freshGreen hover:underline">
            {t('all')} →
          </Link>
        </div>

        {recentPurchases.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">{t('noRecentPurchases')}</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {recentPurchases.map((pur) => (
              <Link
                key={pur._id}
                href={`/dashboard/purchases/${pur._id}`}
                className="flex items-center justify-between py-2.5 hover:bg-kiryana-softBg px-1 rounded-lg transition-colors"
              >
                <div>
                  <div className="text-xs font-bold text-gray-900">{pur.supplierName}</div>
                  <div className="text-[10px] text-gray-500">#{pur.invoiceNumber}</div>
                </div>

                <div className="text-right">
                  <div className="text-xs font-bold text-gray-900">
                    Rs. {pur.total?.toFixed(2)}
                  </div>
                  <div className="text-[9px] text-gray-400">
                    {new Date(pur.purchaseDate).toLocaleDateString()}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </MobileAppShell>
  );
}
