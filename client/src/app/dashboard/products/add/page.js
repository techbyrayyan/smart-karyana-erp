'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MobileAppShell from '../../../../components/layout/MobileAppShell';
import { useLanguage } from '../../../../context/LanguageContext';
import { productApi, categoryApi } from '../../../../lib/api';
import { Plus, Trash2, Sparkles, Check, ArrowLeft, FolderPlus, X } from 'lucide-react';

const UNITS = ['KG', 'Gram', 'Liter', 'ML', 'Piece', 'Packet', 'Dozen', 'Box', 'Bori'];

export default function AddProductPage() {
  const router = useRouter();
  const { t, language } = useLanguage();

  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [showNewCategoryModal, setShowNewCategoryModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatUrdu, setNewCatUrdu] = useState('');
  const [categoryError, setCategoryError] = useState('');

  const [name, setName] = useState('');
  const [nameUrdu, setNameUrdu] = useState('');
  const [category, setCategory] = useState('');
  const [unit, setUnit] = useState('KG');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [currentStock, setCurrentStock] = useState('');
  const [minStockAlert, setMinStockAlert] = useState('5');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Variations list
  const [variations, setVariations] = useState([
    { name: '1 KG', unit: 'KG', multiplier: 1, price: '' },
  ]);

  // Load existing categories from backend
  const loadCategories = async () => {
    try {
      setCategoriesLoading(true);
      const res = await categoryApi.getAll();
      if (res.success && res.categories) {
        setCategories(res.categories);
        if (res.categories.length > 0 && !category) {
          setCategory(res.categories[0].name);
        }
      }
    } catch (e) {
      console.error('Error loading categories:', e);
    } finally {
      setCategoriesLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  // Handle creating a new category on the fly
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
        const createdCat = res.category;
        setCategories((prev) => {
          const exists = prev.some((c) => c.name.toLowerCase() === createdCat.name.toLowerCase());
          return exists ? prev : [...prev, createdCat];
        });
        setCategory(createdCat.name);
        setNewCatName('');
        setNewCatUrdu('');
        setShowNewCategoryModal(false);
      }
    } catch (err) {
      setCategoryError(err.message || 'Error creating category');
    }
  };

  // When base selling price changes, sync default variation price
  const handleBasePriceChange = (val) => {
    setSellingPrice(val);
    setVariations((prev) => {
      const copy = [...prev];
      if (copy.length > 0 && copy[0].multiplier === 1) {
        copy[0].price = val;
      }
      return copy;
    });
  };

  // When base unit changes, update first variation name
  const handleBaseUnitChange = (newUnit) => {
    setUnit(newUnit);
    setVariations((prev) => {
      const copy = [...prev];
      if (copy.length > 0) {
        copy[0].name = `1 ${newUnit}`;
        copy[0].unit = newUnit;
      }
      return copy;
    });
  };

  // Helper to auto-generate standard grocery fractions (500g, 250g, 100g)
  const autoGenerateWeightVariations = () => {
    const baseP = parseFloat(sellingPrice) || 0;
    if (unit === 'KG') {
      setVariations([
        { name: '1 KG', unit: 'KG', multiplier: 1, price: baseP },
        { name: '500 Gram', unit: 'Gram', multiplier: 0.5, price: Math.round(baseP * 0.5) },
        { name: '250 Gram', unit: 'Gram', multiplier: 0.25, price: Math.round(baseP * 0.25) },
        { name: '100 Gram', unit: 'Gram', multiplier: 0.1, price: Math.round(baseP * 0.1) },
      ]);
    } else if (unit === 'Liter') {
      setVariations([
        { name: '1 Liter', unit: 'Liter', multiplier: 1, price: baseP },
        { name: '500 ML', unit: 'ML', multiplier: 0.5, price: Math.round(baseP * 0.5) },
        { name: '250 ML', unit: 'ML', multiplier: 0.25, price: Math.round(baseP * 0.25) },
      ]);
    } else if (unit === 'Dozen') {
      setVariations([
        { name: '1 Dozen', unit: 'Dozen', multiplier: 1, price: baseP },
        { name: 'Half Dozen (6 Pcs)', unit: 'Piece', multiplier: 0.5, price: Math.round(baseP * 0.5) },
      ]);
    }
  };

  const addVariationRow = () => {
    setVariations((prev) => [
      ...prev,
      { name: '', unit: unit, multiplier: 1, price: '' },
    ]);
  };

  const removeVariationRow = (index) => {
    if (variations.length === 1) return;
    setVariations((prev) => prev.filter((_, idx) => idx !== index));
  };

  const updateVariation = (index, field, value) => {
    setVariations((prev) => {
      const copy = [...prev];
      copy[index][field] = value;
      return copy;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!category.trim()) {
      setError('Please select or create a Category (e.g. Rice, Atta, Ghee)');
      return;
    }

    if (!name.trim()) {
      setError('Product item name is required (e.g. Rice Tota, Super Karnal)');
      return;
    }

    if (!purchasePrice || !sellingPrice) {
      setError('Purchase and selling prices are required');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        name: name.trim(),
        nameUrdu: nameUrdu.trim(),
        category: category.trim(),
        purchasePrice: Number(purchasePrice),
        sellingPrice: Number(sellingPrice),
        currentStock: Number(currentStock) || 0,
        unit,
        minStockAlert: Number(minStockAlert) || 5,
        variations: variations.map((v) => ({
          name: v.name || `${v.multiplier} ${v.unit}`,
          unit: v.unit || unit,
          multiplier: Number(v.multiplier) || 1,
          price: Number(v.price) || Number(sellingPrice),
          isActive: true,
        })),
      };

      const res = await productApi.create(payload);
      if (res.success) {
        router.push('/dashboard/products');
      }
    } catch (err) {
      setError(err.message || 'Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <MobileAppShell title={t('addProduct')} showBack={true}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
            {error}
          </div>
        )}

        {/* Category Selection & Fast Creation */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-card-soft space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
              <span>Category (کیٹیگری)</span>
            </h3>
            <button
              type="button"
              onClick={() => setShowNewCategoryModal(true)}
              className="text-[11px] font-bold text-kiryana-freshGreen bg-kiryana-lightGreen hover:bg-emerald-100 px-2.5 py-1 rounded-xl flex items-center gap-1 transition-colors"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span>+ Nayi Category</span>
            </button>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Select Category *
            </label>
            <div className="flex gap-2">
              <select
                value={category}
                onChange={(e) => {
                  if (e.target.value === '__NEW__') {
                    setShowNewCategoryModal(true);
                  } else {
                    setCategory(e.target.value);
                  }
                }}
                className="flex-1 bg-kiryana-softBg border border-gray-200 rounded-xl py-2.5 px-3 text-xs focus:outline-none focus:border-kiryana-freshGreen font-medium text-gray-900"
              >
                {categories.length === 0 && (
                  <option value="">No categories yet - Add below</option>
                )}
                {categories.map((c) => (
                  <option key={c._id || c.name} value={c.name}>
                    {c.name} {c.nameUrdu ? `(${c.nameUrdu})` : ''}
                  </option>
                ))}
                <option value="__NEW__">+ Add New Category / Other...</option>
              </select>

              <button
                type="button"
                onClick={() => setShowNewCategoryModal(true)}
                className="p-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl text-gray-700"
                title="Add New Category"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {category && (
              <p className="text-[11px] text-emerald-700 mt-1 font-medium">
                Active Category: <strong className="text-emerald-800">{category}</strong>
              </p>
            )}
          </div>

          {/* Inline Add Category Card */}
          {showNewCategoryModal && (
            <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2.5 animate-fadeIn">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-900">
                  + Create New Category
                </span>
                <button
                  type="button"
                  onClick={() => setShowNewCategoryModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {categoryError && (
                <p className="text-[10px] text-red-600 font-semibold">{categoryError}</p>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-gray-700 block mb-0.5">
                    Category Name *
                  </label>
                  <input
                    type="text"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    placeholder="e.g. Rice, Atta, Ghee"
                    className="w-full bg-white border border-gray-200 rounded-lg py-1.5 px-2.5 text-xs focus:outline-none focus:border-kiryana-freshGreen"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-700 block mb-0.5">
                    Urdu Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={newCatUrdu}
                    onChange={(e) => setNewCatUrdu(e.target.value)}
                    placeholder="مثلاً: چاول، آٹا"
                    dir="rtl"
                    className="w-full bg-white border border-gray-200 rounded-lg py-1.5 px-2.5 text-xs font-urdu text-right focus:outline-none focus:border-kiryana-freshGreen"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowNewCategoryModal(false)}
                  className="px-3 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateCategory}
                  className="px-3 py-1 text-xs bg-kiryana-freshGreen text-white font-bold rounded-lg shadow-sm"
                >
                  Save Category
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Product Item Info Card */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-card-soft space-y-3">
          <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
            Product Item Details (پروڈکٹ کی تفصیل)
          </h3>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Item Name * (e.g. Rice Tota, Super Karnal Basmati)
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Super Karnal Basmati / Rice Tota"
              className="w-full bg-kiryana-softBg border border-gray-200 rounded-xl py-2.5 px-3 text-xs focus:outline-none focus:border-kiryana-freshGreen"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              {t('productNameUrdu')} (اردو نام)
            </label>
            <input
              type="text"
              value={nameUrdu}
              onChange={(e) => setNameUrdu(e.target.value)}
              placeholder="مثلاً: ٹوٹا چاول / سپر کرنل باسمتی"
              dir="rtl"
              className="w-full bg-kiryana-softBg border border-gray-200 rounded-xl py-2.5 px-3 text-xs font-urdu focus:outline-none focus:border-kiryana-freshGreen text-right"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                {t('unit')}
              </label>
              <select
                value={unit}
                onChange={(e) => handleBaseUnitChange(e.target.value)}
                className="w-full bg-kiryana-softBg border border-gray-200 rounded-xl py-2.5 px-2 text-xs focus:outline-none focus:border-kiryana-freshGreen"
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                {t('minStockAlertQty')}
              </label>
              <input
                type="number"
                step="any"
                value={minStockAlert}
                onChange={(e) => setMinStockAlert(e.target.value)}
                placeholder="5"
                className="w-full bg-kiryana-softBg border border-gray-200 rounded-xl py-2.5 px-3 text-xs focus:outline-none focus:border-kiryana-freshGreen font-mono"
              />
            </div>
          </div>
        </div>

        {/* Pricing & Stock Card */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-card-soft space-y-3">
          <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
            Pricing & Stock (قیمت اور اسٹاک)
          </h3>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                {t('purchasePrice')} *
              </label>
              <input
                type="number"
                step="any"
                required
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                placeholder="Rs. 250"
                className="w-full bg-kiryana-softBg border border-gray-200 rounded-xl py-2.5 px-3 text-xs focus:outline-none focus:border-kiryana-freshGreen font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                {t('sellingPrice')} *
              </label>
              <input
                type="number"
                step="any"
                required
                value={sellingPrice}
                onChange={(e) => handleBasePriceChange(e.target.value)}
                placeholder="Rs. 300"
                className="w-full bg-kiryana-softBg border border-gray-200 rounded-xl py-2.5 px-3 text-xs focus:outline-none focus:border-kiryana-freshGreen font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Opening Stock ({unit})
            </label>
            <input
              type="number"
              step="any"
              value={currentStock}
              onChange={(e) => setCurrentStock(e.target.value)}
              placeholder="e.g. 50"
              className="w-full bg-kiryana-softBg border border-gray-200 rounded-xl py-2.5 px-3 text-xs focus:outline-none focus:border-kiryana-freshGreen font-mono"
            />
          </div>
        </div>

        {/* Multiple Weight / Quantity Variations Card */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-card-soft space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                {t('variations')} (وزن اور پیکنگ کی مختلف قیمتیں)
              </h3>
              <p className="text-[10px] text-gray-500">
                Example: 1 KG, 500g, 250g with independent prices
              </p>
            </div>

            {['KG', 'Liter', 'Dozen'].includes(unit) && sellingPrice && (
              <button
                type="button"
                onClick={autoGenerateWeightVariations}
                className="text-[10px] font-bold text-kiryana-freshGreen bg-kiryana-lightGreen px-2.5 py-1 rounded-lg flex items-center gap-1 active:scale-95 transition-transform"
              >
                <Sparkles className="w-3 h-3" /> Auto
              </button>
            )}
          </div>

          <div className="space-y-2 pt-1">
            {variations.map((v, idx) => (
              <div
                key={idx}
                className="p-2.5 bg-kiryana-softBg rounded-xl border border-gray-200 flex items-center gap-2"
              >
                <div className="flex-1 space-y-1">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      placeholder="e.g. 500 Gram"
                      value={v.name}
                      onChange={(e) => updateVariation(idx, 'name', e.target.value)}
                      className="flex-1 bg-white border border-gray-200 rounded-lg py-1.5 px-2 text-xs"
                    />

                    <input
                      type="number"
                      step="any"
                      required
                      placeholder="Price (Rs.)"
                      value={v.price}
                      onChange={(e) => updateVariation(idx, 'price', e.target.value)}
                      className="w-24 bg-white border border-gray-200 rounded-lg py-1.5 px-2 text-xs font-mono font-bold text-gray-900"
                    />
                  </div>

                  <div className="flex items-center gap-2 text-[10px] text-gray-500">
                    <span>Base fraction:</span>
                    <input
                      type="number"
                      step="any"
                      value={v.multiplier}
                      onChange={(e) => updateVariation(idx, 'multiplier', e.target.value)}
                      className="w-16 bg-white border border-gray-200 rounded px-1 text-[10px]"
                    />
                    <span>{unit}</span>
                  </div>
                </div>

                {variations.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeVariationRow(idx)}
                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addVariationRow}
            className="w-full py-2 bg-gray-50 border border-dashed border-gray-300 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 flex items-center justify-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Add Another Packing / Weight Variation</span>
          </button>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 bg-kiryana-freshGreen text-white font-bold rounded-2xl shadow-lg hover:bg-kiryana-darkGreen active:scale-98 transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-60"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Save Product Under "{category || 'Category'}"</span>
            </>
          )}
        </button>
      </form>
    </MobileAppShell>
  );
}
