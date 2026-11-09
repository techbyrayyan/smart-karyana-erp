'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import MobileAppShell from '../../../../components/layout/MobileAppShell';
import { useLanguage } from '../../../../context/LanguageContext';
import { productApi, categoryApi } from '../../../../lib/api';
import {
  Edit2,
  Trash2,
  Package,
  Layers,
  Check,
  Plus,
  History,
  TrendingDown,
  TrendingUp,
  RotateCcw,
  FolderPlus,
  X,
} from 'lucide-react';

const UNITS = ['KG', 'Gram', 'Liter', 'ML', 'Piece', 'Packet', 'Dozen', 'Box', 'Bori'];

export default function ProductDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { t } = useLanguage();

  const isEditDefault = searchParams.get('edit') === 'true';

  const [product, setProduct] = useState(null);
  const [movements, setMovements] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showNewCategoryModal, setShowNewCategoryModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatUrdu, setNewCatUrdu] = useState('');
  const [categoryError, setCategoryError] = useState('');

  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(isEditDefault);
  const [saveLoading, setSaveLoading] = useState(false);
  const [error, setError] = useState('');

  // Editable Form State
  const [name, setName] = useState('');
  const [nameUrdu, setNameUrdu] = useState('');
  const [category, setCategory] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [currentStock, setCurrentStock] = useState('');
  const [unit, setUnit] = useState('KG');
  const [minStockAlert, setMinStockAlert] = useState('5');
  const [variations, setVariations] = useState([]);

  const loadCategories = async () => {
    try {
      const res = await categoryApi.getAll();
      if (res.success && res.categories) {
        setCategories(res.categories);
      }
    } catch (e) {
      console.error('Error fetching categories:', e);
    }
  };

  const handleCreateCategory = async (e) => {
    if (e) e.preventDefault();
    if (!newCatName.trim()) {
      setCategoryError('Category name is required');
      return;
    }
    setCategoryError('');

    try {
      const res = await categoryApi.create({
        name: newCatName.trim(),
        nameUrdu: newCatUrdu.trim(),
      });

      if (res.success && res.category) {
        const created = res.category;
        setCategories((prev) => {
          const exists = prev.some((c) => c.name.toLowerCase() === created.name.toLowerCase());
          return exists ? prev : [...prev, created];
        });
        setCategory(created.name);
        setNewCatName('');
        setNewCatUrdu('');
        setShowNewCategoryModal(false);
      }
    } catch (err) {
      setCategoryError(err.message || 'Error creating category');
    }
  };

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const res = await productApi.getById(params.id);
      if (res.success && res.product) {
        const p = res.product;
        setProduct(p);
        setMovements(res.movements || []);
        setName(p.name);
        setNameUrdu(p.nameUrdu || '');
        setCategory(p.category || 'General Kiryana');
        setPurchasePrice(p.purchasePrice);
        setSellingPrice(p.sellingPrice);
        setCurrentStock(p.currentStock);
        setUnit(p.unit || 'KG');
        setMinStockAlert(p.minStockAlert || 5);
        setVariations(p.variations || []);
      }
    } catch (err) {
      setError(err.message || 'Error loading product details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
    if (params.id) {
      fetchProduct();
    }
  }, [params.id]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSaveLoading(true);
    setError('');

    try {
      const payload = {
        name: name.trim(),
        nameUrdu: nameUrdu.trim(),
        category,
        purchasePrice: Number(purchasePrice),
        sellingPrice: Number(sellingPrice),
        currentStock: Number(currentStock),
        unit,
        minStockAlert: Number(minStockAlert),
        variations: variations.map((v) => ({
          name: v.name,
          unit: v.unit || unit,
          multiplier: Number(v.multiplier) || 1,
          price: Number(v.price),
          isActive: true,
        })),
      };

      const res = await productApi.update(params.id, payload);
      if (res.success) {
        setIsEditing(false);
        fetchProduct();
      }
    } catch (err) {
      setError(err.message || 'Failed to update product');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm(`${t('deleteConfirm')}\n"${product?.name}"`)) {
      try {
        await productApi.delete(params.id);
        router.push('/dashboard/products');
      } catch (err) {
        alert(err.message || 'Error deleting product');
      }
    }
  };

  const addVariationRow = () => {
    setVariations((prev) => [
      ...prev,
      { name: '', unit: unit, multiplier: 1, price: sellingPrice },
    ]);
  };

  const removeVariationRow = (idx) => {
    if (variations.length === 1) return;
    setVariations((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateVariation = (idx, field, val) => {
    setVariations((prev) => {
      const copy = [...prev];
      copy[idx][field] = val;
      return copy;
    });
  };

  if (loading) {
    return (
      <MobileAppShell title={t('productDetails')} showBack={true}>
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 rounded-full border-3 border-kiryana-freshGreen border-t-transparent animate-spin"></div>
        </div>
      </MobileAppShell>
    );
  }

  if (!product) {
    return (
      <MobileAppShell title={t('productDetails')} showBack={true}>
        <div className="p-4 text-center bg-white rounded-2xl">
          <p className="text-xs text-red-600">Product not found</p>
        </div>
      </MobileAppShell>
    );
  }

  return (
    <MobileAppShell title={product.name} showBack={true}>
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl mb-3">
          {error}
        </div>
      )}

      {/* View vs Edit Toggle Bar */}
      <div className="flex items-center justify-between mb-3 px-1">
        <h2 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
          {isEditing ? 'Editing Product' : 'Product Information'}
        </h2>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors ${
              isEditing
                ? 'bg-gray-200 text-gray-800'
                : 'bg-kiryana-lightGreen text-kiryana-darkGreen hover:bg-emerald-200'
            }`}
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>{isEditing ? 'Cancel Edit' : t('edit')}</span>
          </button>
          {!isEditing && (
            <button
              onClick={handleDelete}
              className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg"
              title={t('delete')}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {isEditing ? (
        /* Edit Form */
        <form onSubmit={handleUpdate} className="space-y-3.5">
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-card-soft space-y-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">{t('productName')}</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-kiryana-softBg border border-gray-200 rounded-xl py-2 px-3 text-xs font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">{t('productNameUrdu')}</label>
              <input
                type="text"
                value={nameUrdu}
                onChange={(e) => setNameUrdu(e.target.value)}
                dir="rtl"
                className="w-full bg-kiryana-softBg border border-gray-200 rounded-xl py-2 px-3 text-xs font-urdu text-right"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-gray-700">{t('category')}</label>
                <button
                  type="button"
                  onClick={() => setShowNewCategoryModal(true)}
                  className="text-[10px] text-kiryana-freshGreen font-bold flex items-center gap-0.5 hover:underline"
                >
                  <Plus className="w-3 h-3" /> + Nayi Category
                </button>
              </div>
              <select
                value={category}
                onChange={(e) => {
                  if (e.target.value === '__NEW__') {
                    setShowNewCategoryModal(true);
                  } else {
                    setCategory(e.target.value);
                  }
                }}
                className="w-full bg-kiryana-softBg border border-gray-200 rounded-xl py-2 px-2 text-xs font-medium text-gray-900"
              >
                {category && !categories.some((c) => c.name === category) && (
                  <option value={category}>{category}</option>
                )}
                {categories.map((c) => (
                  <option key={c._id || c.name} value={c.name}>
                    {c.name} {c.nameUrdu ? `(${c.nameUrdu})` : ''}
                  </option>
                ))}
                <option value="__NEW__">+ Add New Category / Other...</option>
              </select>

              {showNewCategoryModal && (
                <div className="mt-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-emerald-900">+ Create Category</span>
                    <button
                      type="button"
                      onClick={() => setShowNewCategoryModal(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {categoryError && (
                    <p className="text-[10px] text-red-600">{categoryError}</p>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Category (e.g. Rice)"
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded px-2 py-1 text-xs"
                    />
                    <input
                      type="text"
                      placeholder="Urdu (چاول)"
                      dir="rtl"
                      value={newCatUrdu}
                      onChange={(e) => setNewCatUrdu(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded px-2 py-1 text-xs font-urdu text-right"
                    />
                  </div>
                  <div className="flex justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => setShowNewCategoryModal(false)}
                      className="text-[10px] px-2 py-1 text-gray-500"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleCreateCategory}
                      className="text-[10px] bg-kiryana-freshGreen text-white font-bold px-2.5 py-1 rounded-md"
                    >
                      Save
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">{t('unit')}</label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full bg-kiryana-softBg border border-gray-200 rounded-xl py-2 px-2 text-xs"
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">{t('purchasePrice')}</label>
                <input
                  type="number"
                  step="any"
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(e.target.value)}
                  className="w-full bg-kiryana-softBg border border-gray-200 rounded-xl py-2 px-3 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">{t('sellingPrice')}</label>
                <input
                  type="number"
                  step="any"
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(e.target.value)}
                  className="w-full bg-kiryana-softBg border border-gray-200 rounded-xl py-2 px-3 text-xs font-mono font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Adjust Stock</label>
                <input
                  type="number"
                  step="any"
                  value={currentStock}
                  onChange={(e) => setCurrentStock(e.target.value)}
                  className="w-full bg-kiryana-softBg border border-gray-200 rounded-xl py-2 px-3 text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">{t('minStockAlertQty')}</label>
                <input
                  type="number"
                  step="any"
                  value={minStockAlert}
                  onChange={(e) => setMinStockAlert(e.target.value)}
                  className="w-full bg-kiryana-softBg border border-gray-200 rounded-xl py-2 px-3 text-xs font-mono"
                />
              </div>
            </div>
          </div>

          {/* Editable Variations */}
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-card-soft space-y-3">
            <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">{t('variations')}</h3>
            <div className="space-y-2">
              {variations.map((v, idx) => (
                <div key={idx} className="p-2.5 bg-kiryana-softBg rounded-xl border border-gray-200 space-y-1.5">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Variation Name"
                      value={v.name}
                      onChange={(e) => updateVariation(idx, 'name', e.target.value)}
                      className="flex-1 bg-white border border-gray-200 rounded-lg py-1.5 px-2 text-xs"
                    />
                    <input
                      type="number"
                      step="any"
                      placeholder="Multiplier"
                      value={v.multiplier}
                      onChange={(e) => updateVariation(idx, 'multiplier', e.target.value)}
                      className="w-20 bg-white border border-gray-200 rounded-lg py-1.5 px-2 text-xs font-mono"
                    />
                    {variations.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeVariationRow(idx)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-gray-500">Price (Rs):</span>
                    <input
                      type="number"
                      step="any"
                      value={v.price}
                      onChange={(e) => updateVariation(idx, 'price', e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-lg py-1.5 px-2 text-xs font-mono font-bold text-kiryana-darkGreen"
                    />
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={addVariationRow}
                className="w-full py-2 bg-gray-50 hover:bg-gray-100 border border-dashed border-gray-300 rounded-xl text-xs font-bold text-gray-700 flex items-center justify-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t('addVariation')}</span>
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={saveLoading}
            className="w-full py-3 bg-kiryana-freshGreen text-white font-bold rounded-xl shadow-md active:scale-98 transition-all flex items-center justify-center gap-2 text-xs"
          >
            {saveLoading ? 'Saving...' : (
              <>
                <Check className="w-4 h-4" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </form>
      ) : (
        /* View Card */
        <div className="space-y-3.5">
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-card-soft">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-black text-gray-900">{product.name}</h3>
                {product.nameUrdu && (
                  <p className="text-sm font-bold text-emerald-800 font-urdu mt-0.5">{product.nameUrdu}</p>
                )}
                <span className="inline-block bg-gray-100 text-gray-700 text-[10px] font-semibold px-2 py-0.5 rounded-full mt-1.5">
                  {product.category}
                </span>
              </div>

              <div className="text-right">
                <div
                  className={`text-sm font-black px-2.5 py-1 rounded-xl inline-block ${
                    product.currentStock <= product.minStockAlert
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {product.currentStock} {product.unit}
                </div>
                <p className="text-[10px] text-gray-400 mt-0.5">Min Alert: {product.minStockAlert} {product.unit}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-gray-100">
              <div className="bg-kiryana-softBg p-2.5 rounded-xl">
                <span className="text-[10px] text-gray-500 block">Base Selling Rate</span>
                <span className="text-sm font-black text-kiryana-darkGreen">
                  Rs. {product.sellingPrice} <span className="text-[10px] font-normal text-gray-500">/ {product.unit}</span>
                </span>
              </div>

              <div className="bg-kiryana-softBg p-2.5 rounded-xl">
                <span className="text-[10px] text-gray-500 block">Base Purchase Cost</span>
                <span className="text-sm font-black text-gray-700">
                  Rs. {product.purchasePrice} <span className="text-[10px] font-normal text-gray-500">/ {product.unit}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Variations List Card */}
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-card-soft">
            <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-kiryana-freshGreen" />
              <span>{t('variations')} ({product.variations?.length || 1})</span>
            </h4>

            <div className="divide-y divide-gray-100">
              {(product.variations || []).map((v, idx) => (
                <div key={idx} className="flex items-center justify-between py-2.5">
                  <div>
                    <span className="text-xs font-bold text-gray-900">{v.name}</span>
                    <span className="text-[10px] text-gray-400 block">
                      Factor: {v.multiplier}x {product.unit}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-black text-kiryana-darkGreen">
                      Rs. {v.price}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Stock Movements Log */}
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-card-soft">
            <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <History className="w-4 h-4 text-blue-600" />
              <span>Recent Stock Movements</span>
            </h4>

            {movements.length === 0 ? (
              <p className="text-xs text-gray-400 py-3 text-center">No stock movements recorded yet</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {movements.map((m) => (
                  <div key={m._id} className="flex items-center justify-between py-2 text-xs">
                    <div>
                      <div className="font-semibold text-gray-800 capitalize flex items-center gap-1">
                        {m.quantityChange > 0 ? (
                          <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <TrendingDown className="w-3.5 h-3.5 text-amber-600" />
                        )}
                        <span>{m.type}</span>
                      </div>
                      <div className="text-[10px] text-gray-400 truncate max-w-[180px]">
                        {m.notes || new Date(m.date).toLocaleDateString()}
                      </div>
                    </div>

                    <div className="text-right">
                      <span className={`font-mono font-bold ${m.quantityChange > 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
                        {m.quantityChange > 0 ? `+${m.quantityChange}` : m.quantityChange} {m.baseUnit}
                      </span>
                      <div className="text-[9px] text-gray-400">
                        Balance: {m.newStock} {m.baseUnit}
                      </div>
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
