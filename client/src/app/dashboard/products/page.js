'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import MobileAppShell from '../../../components/layout/MobileAppShell';
import { useLanguage } from '../../../context/LanguageContext';
import { productApi } from '../../../lib/api';
import {
  Plus,
  Camera,
  Search,
  Eye,
  Edit2,
  Trash2,
  AlertTriangle,
  Package,
  Layers,
  Filter,
} from 'lucide-react';

const CATEGORIES = [
  'All',
  'Atta / Grains',
  'Daalen / Pulses',
  'Ghee / Cooking Oil',
  'Spices / Masalay',
  'Beverages / Chai',
  'Dairy',
  'Snacks & Biscuits',
  'Soaps & Detergents',
  'General Kiryana',
];

export default function ProductsPage() {
  const { t, language } = useLanguage();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params = {};
      if (search) params.search = search;
      if (selectedCategory && selectedCategory !== 'All') params.category = selectedCategory;
      if (showLowStockOnly) params.lowStock = 'true';

      const res = await productApi.getAll(params);
      if (res.success) {
        setProducts(res.products || []);
      }
    } catch (err) {
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchProducts();
    }, 250);
    return () => clearTimeout(delayDebounce);
  }, [search, selectedCategory, showLowStockOnly]);

  const handleDelete = async (id, name) => {
    if (window.confirm(`${t('deleteConfirm')}\n"${name}"`)) {
      try {
        await productApi.delete(id);
        fetchProducts();
      } catch (err) {
        alert(err.message || 'Error deleting product');
      }
    }
  };

  return (
    <MobileAppShell title={t('products')}>
      {/* Top 2 Main Action Buttons */}
      <div className="grid grid-cols-2 gap-2.5 mb-4">
        <Link
          href="/dashboard/products/add"
          className="flex items-center justify-center gap-2 bg-kiryana-freshGreen text-white font-bold py-3 px-3 rounded-2xl shadow-sm hover:bg-kiryana-darkGreen active:scale-98 transition-all text-xs"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>{t('addProduct')}</span>
        </Link>

        <Link
          href="/dashboard/purchases/scan"
          className="flex items-center justify-center gap-2 bg-kiryana-darkGreen text-white font-bold py-3 px-3 rounded-2xl shadow-sm hover:bg-neutral-800 active:scale-98 transition-all text-xs"
        >
          <Camera className="w-4 h-4 text-emerald-400 stroke-[2.5]" />
          <span>{t('scanInvoice')}</span>
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
          placeholder={language === 'ur' ? 'چیز کا نام تلاش کریں...' : language === 'roman_ur' ? 'Samaan ka naam talaash karein...' : 'Search product name or category...'}
          className="w-full bg-white border border-gray-200 rounded-xl py-2.5 pl-10 pr-3 rtl:pr-10 rtl:pl-3 text-xs focus:outline-none focus:border-kiryana-freshGreen shadow-sm"
        />
      </div>

      {/* Category Pills & Low Stock Toggle */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 mb-3">
        <button
          onClick={() => setShowLowStockOnly(!showLowStockOnly)}
          className={`px-3 py-1.5 rounded-full text-[11px] font-bold flex items-center gap-1 flex-shrink-0 transition-colors ${
            showLowStockOnly
              ? 'bg-red-600 text-white'
              : 'bg-white border border-gray-200 text-red-600 hover:bg-red-50'
          }`}
        >
          <AlertTriangle className="w-3 h-3" />
          <span>{t('lowStock')}</span>
        </button>

        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap flex-shrink-0 transition-colors ${
              selectedCategory === cat
                ? 'bg-kiryana-darkGreen text-white'
                : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Products Count Indicator */}
      <div className="flex items-center justify-between text-[11px] text-gray-500 mb-2 px-1">
        <span>{products.length} {t('products')}</span>
        {showLowStockOnly && (
          <span className="text-red-600 font-bold">Showing Low Stock Only</span>
        )}
      </div>

      {/* Product List Cards */}
      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-8 h-8 rounded-full border-3 border-kiryana-freshGreen border-t-transparent animate-spin"></div>
        </div>
      ) : products.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center border border-gray-100 shadow-card-soft">
          <Package className="w-12 h-12 mx-auto text-gray-300 mb-2" />
          <p className="text-xs font-semibold text-gray-600">No products found</p>
          <p className="text-[11px] text-gray-400 mt-1">Tap Add Product or Scan Invoice to add items</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {products.map((prod) => {
            const isLow = prod.currentStock <= prod.minStockAlert;
            const isOut = prod.currentStock <= 0;

            return (
              <div
                key={prod._id}
                className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-card-soft transition-all hover:border-gray-200"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-gray-900 leading-snug">
                        {prod.name}
                      </h4>
                      {prod.nameUrdu && (
                        <span className="text-xs text-emerald-800 font-urdu font-medium">
                          ({prod.nameUrdu})
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] text-gray-500 mt-0.5">
                      {prod.category}
                    </div>

                    {/* Pricing & Stock Details */}
                    <div className="flex items-center gap-4 mt-2 text-xs">
                      <div>
                        <span className="text-[10px] text-gray-400 block">Sell Rate</span>
                        <span className="font-bold text-kiryana-darkGreen">
                          Rs. {prod.sellingPrice} <span className="text-[10px] font-normal text-gray-500">/ {prod.unit}</span>
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] text-gray-400 block">Cost Rate</span>
                        <span className="font-medium text-gray-600">
                          Rs. {prod.purchasePrice}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] text-gray-400 block">Variations</span>
                        <span className="font-semibold text-gray-700 flex items-center gap-0.5">
                          <Layers className="w-3 h-3 text-gray-400" />
                          {prod.variations?.length || 1}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Stock Status Badge */}
                  <div className="text-right flex flex-col items-end">
                    <div
                      className={`text-xs font-black px-2 py-0.5 rounded-lg inline-block ${
                        isOut
                          ? 'bg-rose-100 text-rose-800'
                          : isLow
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {prod.currentStock} {prod.unit}
                    </div>
                    <span className="text-[9px] text-gray-400 mt-0.5 font-medium">
                      {isOut ? t('outOfStock') : isLow ? t('lowStock') : t('inStock')}
                    </span>
                  </div>
                </div>

                {/* Actions Row */}
                <div className="flex items-center justify-end gap-1 mt-3 pt-2 border-t border-gray-100">
                  <Link
                    href={`/dashboard/products/${prod._id}`}
                    className="p-1.5 rounded-lg text-gray-500 hover:text-kiryana-freshGreen hover:bg-kiryana-lightGreen/50 transition-colors"
                    title={t('view')}
                  >
                    <Eye className="w-4 h-4" />
                  </Link>
                  <Link
                    href={`/dashboard/products/${prod._id}?edit=true`}
                    className="p-1.5 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                    title={t('edit')}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Link>
                  <button
                    onClick={() => handleDelete(prod._id, prod.name)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    title={t('delete')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </MobileAppShell>
  );
}
