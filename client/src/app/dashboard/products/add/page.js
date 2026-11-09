'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import MobileAppShell from '../../../../components/layout/MobileAppShell';
import { useLanguage } from '../../../../context/LanguageContext';
import { productApi } from '../../../../lib/api';
import { Plus, Trash2, Sparkles, Check, ArrowLeft } from 'lucide-react';

const CATEGORIES = [
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

const UNITS = ['KG', 'Gram', 'Liter', 'ML', 'Piece', 'Packet', 'Dozen', 'Box', 'Bori'];

export default function AddProductPage() {
  const router = useRouter();
  const { t, language } = useLanguage();

  const [name, setName] = useState('');
  const [nameUrdu, setNameUrdu] = useState('');
  const [category, setCategory] = useState('Atta / Grains');
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

    if (!name.trim()) {
      setError('Product name is required');
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
        category,
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

        {/* Basic Info Card */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-card-soft space-y-3">
          <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
            General Information
          </h3>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              {t('productName')} *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Super Basmati Rice"
              className="w-full bg-kiryana-softBg border border-gray-200 rounded-xl py-2.5 px-3 text-xs focus:outline-none focus:border-kiryana-freshGreen"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              {t('productNameUrdu')}
            </label>
            <input
              type="text"
              value={nameUrdu}
              onChange={(e) => setNameUrdu(e.target.value)}
              placeholder="مثلاً: سپر باسمتی چاول"
              dir="rtl"
              className="w-full bg-kiryana-softBg border border-gray-200 rounded-xl py-2.5 px-3 text-xs font-urdu focus:outline-none focus:border-kiryana-freshGreen text-right"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                {t('category')}
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-kiryana-softBg border border-gray-200 rounded-xl py-2.5 px-2 text-xs focus:outline-none focus:border-kiryana-freshGreen"
              >
                {CATEGORIES.filter((c) => c !== 'All').map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

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
          </div>
        </div>

        {/* Pricing & Stock Card */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-card-soft space-y-3">
          <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
            Pricing & Stock
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

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Current Stock ({unit})
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

        {/* Multiple Weight / Quantity Variations Card (Key Requirement!) */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-card-soft space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                {t('variations')}
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
                      placeholder="Multiplier (e.g. 0.5)"
                      value={v.multiplier}
                      onChange={(e) => updateVariation(idx, 'multiplier', e.target.value)}
                      className="w-24 bg-white border border-gray-200 rounded-lg py-1.5 px-2 text-xs font-mono"
                      title="Multiplier to base unit (e.g. 500g = 0.5 of KG)"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-gray-500">Price (Rs):</span>
                    <input
                      type="number"
                      step="any"
                      required
                      placeholder="Selling Price"
                      value={v.price}
                      onChange={(e) => updateVariation(idx, 'price', e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-lg py-1.5 px-2 text-xs font-mono font-bold text-kiryana-darkGreen"
                    />
                  </div>
                </div>

                {variations.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeVariationRow(idx)}
                    className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}

            <button
              type="button"
              onClick={addVariationRow}
              className="w-full py-2 bg-gray-50 hover:bg-gray-100 border border-dashed border-gray-300 rounded-xl text-xs font-bold text-gray-700 flex items-center justify-center gap-1 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t('addVariation')}</span>
            </button>
          </div>
        </div>

        {/* Submit / Cancel Buttons */}
        <div className="grid grid-cols-2 gap-2.5 pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="w-full py-3 px-4 rounded-xl border border-gray-300 text-gray-700 font-bold text-xs hover:bg-gray-50 active:scale-98 transition-all"
          >
            {t('cancel')}
          </button>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl bg-kiryana-freshGreen hover:bg-kiryana-darkGreen text-white font-bold text-xs shadow-md active:scale-98 transition-all flex items-center justify-center gap-1.5"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>{t('save')}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </MobileAppShell>
  );
}
