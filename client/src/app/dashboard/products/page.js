'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import MobileAppShell from '../../../components/layout/MobileAppShell';
import { useLanguage } from '../../../context/LanguageContext';
import { productApi, categoryApi } from '../../../lib/api';
import { getProductImage } from '../../../lib/productImages';
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
  FolderPlus,
  X,
  RefreshCw,
} from 'lucide-react';

export default function ProductsPage() {
  const { t, language } = useLanguage();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  // Category creation modal
  const [showCatModal, setShowCatModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatUrdu, setNewCatUrdu] = useState('');
  const [catError, setCatError] = useState('');

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState('');

  const fetchCategories = async () => {
    try {
      const res = await categoryApi.getAll();
      if (res.success && res.categories) {
        setCategories(res.categories);
      }
    } catch (e) {
      console.error('Error fetching categories:', e);
    }
  };

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
    fetchCategories();
  }, []);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchProducts();
    }, 250);
    return () => clearTimeout(delayDebounce);
  }, [search, selectedCategory, showLowStockOnly]);

  const handleCreateCategory = async (e) => {
    if (e) e.preventDefault();
    if (!newCatName.trim()) {
      setCatError('Category name is required');
      return;
    }
    setCatError('');

    try {
      const res = await categoryApi.create({
        name: newCatName.trim(),
        nameUrdu: newCatUrdu.trim(),
      });

      if (res.success && res.category) {
        setNewCatName('');
        setNewCatUrdu('');
        setShowCatModal(false);
        fetchCategories();
        setSelectedCategory(res.category.name);
      }
    } catch (err) {
      setCatError(err.message || 'Error creating category');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await productApi.delete(deleteTarget._id);
      setDeleteSuccess(`"${deleteTarget.name}" deleted successfully.`);
      setProducts((prev) => prev.filter((p) => p._id !== deleteTarget._id));
      setDeleteTarget(null);
      fetchCategories();
      setTimeout(() => setDeleteSuccess(''), 3000);
    } catch (err) {
      alert(err.message || 'Error deleting product');
    } finally {
      setDeleting(false);
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

      {/* Fast Live Search Bar */}
      <div className="relative mb-3">
        <div className="absolute inset-y-0 left-0 rtl:left-auto rtl:right-0 pl-3.5 rtl:pr-3.5 flex items-center pointer-events-none text-gray-400">
          <Search className="w-4 h-4" />
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('searchProducts')}
          className="w-full bg-white border border-gray-200 rounded-2xl py-2.5 pl-10 pr-4 rtl:pr-10 rtl:pl-4 text-xs focus:outline-none focus:border-kiryana-freshGreen shadow-card-soft"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 text-xs"
          >
            Clear
          </button>
        )}
      </div>

      {/* Category Creation Card Popup */}
      {showCatModal && (
        <div className="mb-3 p-3 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-2 animate-fadeIn">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-900">+ Add New Category (نئی کیٹیگری بنائیں)</span>
            <button
              onClick={() => setShowCatModal(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          {catError && <p className="text-[10px] text-red-600 font-bold">{catError}</p>}
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="e.g. Rice, Atta, Ghee"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs focus:outline-none focus:border-kiryana-freshGreen"
            />
            <input
              type="text"
              placeholder="اردو نام: مثلاً چاول"
              dir="rtl"
              value={newCatUrdu}
              onChange={(e) => setNewCatUrdu(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs font-urdu text-right focus:outline-none focus:border-kiryana-freshGreen"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={() => setShowCatModal(false)}
              className="px-2.5 py-1 text-xs text-gray-500 hover:bg-gray-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateCategory}
              className="px-3 py-1 text-xs bg-kiryana-freshGreen text-white font-bold rounded-lg shadow-sm"
            >
              Save Category
            </button>
          </div>
        </div>
      )}

      {/* Dynamic Categories Horizontal Scroll Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-3 scrollbar-none">
        {/* All Products Pill */}
        <button
          onClick={() => setSelectedCategory('All')}
          className={`px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap flex-shrink-0 transition-colors ${
            selectedCategory === 'All'
              ? 'bg-kiryana-darkGreen text-white shadow-sm'
              : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'
          }`}
        >
          All Items
        </button>

        {/* Low Stock Filter */}
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

        {/* Dynamic Categories List */}
        {categories.map((cat) => (
          <button
            key={cat._id || cat.name}
            onClick={() => setSelectedCategory(cat.name)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap flex-shrink-0 transition-colors ${
              selectedCategory === cat.name
                ? 'bg-kiryana-freshGreen text-white shadow-sm font-bold'
                : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'
            }`}
          >
            {cat.name} {cat.nameUrdu ? `(${cat.nameUrdu})` : ''}
          </button>
        ))}

        {/* Quick Add Category Pill */}
        <button
          onClick={() => setShowCatModal(true)}
          className="px-2.5 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap flex-shrink-0 bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 hover:bg-emerald-100"
        >
          <Plus className="w-3 h-3" />
          <span>Category</span>
        </button>
      </div>

      {/* Products Count Indicator */}
      <div className="flex items-center justify-between text-[11px] text-gray-500 mb-2 px-1">
        <span>
          Showing {products.length} {products.length === 1 ? 'item' : 'items'}
          {selectedCategory !== 'All' ? ` under "${selectedCategory}"` : ''}
        </span>
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
        <div className="bg-white rounded-2xl p-8 text-center border border-gray-100 shadow-card-soft space-y-2">
          <Package className="w-12 h-12 mx-auto text-gray-300" />
          <p className="text-xs font-semibold text-gray-700">No products found</p>
          <p className="text-[11px] text-gray-400">
            {selectedCategory !== 'All'
              ? `No items added under "${selectedCategory}" yet.`
              : 'Add your first product or scan an invoice.'}
          </p>
          <div className="pt-2">
            <Link
              href="/dashboard/products/add"
              className="inline-flex items-center gap-1.5 bg-kiryana-freshGreen text-white font-bold text-xs px-4 py-2 rounded-xl shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Product</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          {products.map((prod) => {
            const isLow = prod.currentStock <= prod.minStockAlert;
            const isOut = prod.currentStock <= 0;

            return (
              <div
                key={prod._id}
                className="bg-white rounded-2xl p-3 border border-gray-100 shadow-card-soft flex items-center justify-between gap-3 hover:border-gray-200 transition-colors"
              >
                {/* Product Image Thumbnail */}
                <div className="w-12 h-12 rounded-xl overflow-hidden bg-kiryana-softBg flex-shrink-0 border border-gray-100 flex items-center justify-center">
                  <img
                    src={prod.productImage || getProductImage(prod.name)}
                    alt={prod.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80';
                    }}
                  />
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-gray-900 truncate block">
                      {prod.name}
                    </span>
                    {prod.nameUrdu && (
                      <span className="text-[10px] text-gray-500 font-urdu truncate hidden sm:inline">
                        ({prod.nameUrdu})
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-medium">
                      {prod.category}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      Cost: Rs. {prod.purchasePrice}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-extrabold text-kiryana-darkGreen font-mono">
                      Rs. {prod.sellingPrice || prod.pricePerUnit || prod.salePrice || 0}
                      <span className="text-[10px] text-gray-500 font-normal"> / {prod.unit}</span>
                    </span>

                    {prod.variations && prod.variations.length > 1 && (
                      <span className="text-[9px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-semibold flex items-center gap-0.5">
                        <Layers className="w-2.5 h-2.5" />
                        {prod.variations.length} packs
                      </span>
                    )}
                  </div>
                </div>

                {/* Stock Status & Actions */}
                <div className="flex flex-col items-end gap-1.5">
                  <div
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isOut
                        ? 'bg-red-100 text-red-700'
                        : isLow
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {prod.currentStock} {prod.unit}
                  </div>

                  <div className="flex items-center gap-1">
                    <Link
                      href={`/dashboard/products/${prod._id}?edit=true`}
                      className="p-1.5 text-gray-400 hover:text-kiryana-freshGreen hover:bg-gray-50 rounded-lg transition-colors"
                      title={t('edit')}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </Link>

                    <button
                      onClick={() => setDeleteTarget(prod)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-gray-50 rounded-lg transition-colors"
                      title={t('delete')}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white w-full max-w-sm rounded-3xl p-5 shadow-2xl border border-gray-100 space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h4 className="text-sm font-bold text-gray-900">Delete Product?</h4>
              <p className="text-xs text-gray-500">
                Kya aap <strong className="text-gray-800">"{deleteTarget.name}"</strong> ko delete karna chahte hain?
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors flex items-center justify-center gap-1.5"
              >
                {deleting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteSuccess && (
        <div className="fixed bottom-20 left-4 right-4 z-50 bg-emerald-800 text-white p-3 rounded-2xl shadow-lg flex items-center justify-between text-xs animate-fade-in">
          <span>{deleteSuccess}</span>
          <button onClick={() => setDeleteSuccess('')}>✕</button>
        </div>
      )}
    </MobileAppShell>
  );
}
