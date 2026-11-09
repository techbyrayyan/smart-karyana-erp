'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import MobileAppShell from '../../../../components/layout/MobileAppShell';
import { useLanguage } from '../../../../context/LanguageContext';
import { purchaseApi } from '../../../../lib/api';
import { Plus, Trash2, Check, ArrowLeft } from 'lucide-react';

export default function ManualPurchasePage() {
  const router = useRouter();
  const { t } = useLanguage();

  const [supplierName, setSupplierName] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [items, setItems] = useState([
    { productName: '', quantity: '1', unit: 'KG', unitPrice: '', lineTotal: 0 },
  ]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const updateItem = (idx, field, val) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[idx][field] = val;
      if (field === 'quantity' || field === 'unitPrice') {
        const q = Number(field === 'quantity' ? val : copy[idx].quantity) || 0;
        const p = Number(field === 'unitPrice' ? val : copy[idx].unitPrice) || 0;
        copy[idx].lineTotal = parseFloat((q * p).toFixed(2));
      }
      return copy;
    });
  };

  const addItemRow = () => {
    setItems((prev) => [
      ...prev,
      { productName: '', quantity: '1', unit: 'KG', unitPrice: '', lineTotal: 0 },
    ]);
  };

  const removeItemRow = (idx) => {
    if (items.length === 1) return;
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const subtotal = items.reduce((sum, it) => sum + (Number(it.lineTotal) || 0), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!supplierName.trim()) {
      setError('Supplier name is required');
      return;
    }

    if (items.some((it) => !it.productName.trim() || !it.unitPrice)) {
      setError('Please provide product names and prices for all items');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload = {
        supplierName: supplierName.trim(),
        invoiceNumber: invoiceNumber.trim() || `MAN-${Date.now().toString().slice(-6)}`,
        purchaseDate,
        items,
        subtotal,
        total: subtotal,
        notes,
      };

      const res = await purchaseApi.createManual(payload);
      if (res.success) {
        router.push('/dashboard/purchases');
      }
    } catch (err) {
      setError(err.message || 'Error saving purchase');
    } finally {
      setLoading(false);
    }
  };

  return (
    <MobileAppShell title="Manual Purchase" showBack={true}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
            {error}
          </div>
        )}

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-card-soft space-y-3">
          <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
            Supplier & Memo Details
          </h3>

          <div>
            <label className="text-[10px] text-gray-500 block mb-1">Supplier / Mandi Name *</label>
            <input
              type="text"
              required
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
              placeholder="e.g. Haji Yousaf Mandi Dealer"
              className="w-full bg-kiryana-softBg border border-gray-200 rounded-xl p-2.5 text-xs font-bold"
            />
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <label className="text-[10px] text-gray-500 block mb-1">Invoice / Memo #</label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="Optional"
                className="w-full bg-kiryana-softBg border border-gray-200 rounded-xl p-2.5 text-xs font-mono"
              />
            </div>

            <div>
              <label className="text-[10px] text-gray-500 block mb-1">Date</label>
              <input
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="w-full bg-kiryana-softBg border border-gray-200 rounded-xl p-2.5 text-xs"
              />
            </div>
          </div>
        </div>

        {/* Items List */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-card-soft space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
              Purchase Items ({items.length})
            </h3>
            <button
              type="button"
              onClick={addItemRow}
              className="text-[10px] font-bold text-kiryana-freshGreen bg-kiryana-lightGreen px-2.5 py-1 rounded-lg flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> Add Item
            </button>
          </div>

          <div className="space-y-2.5">
            {items.map((it, idx) => (
              <div key={idx} className="p-3 bg-kiryana-softBg rounded-xl border border-gray-200 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Product Name"
                    value={it.productName}
                    onChange={(e) => updateItem(idx, 'productName', e.target.value)}
                    className="flex-1 bg-white border border-gray-200 rounded-lg p-2 text-xs font-bold"
                  />
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItemRow(idx)}
                      className="p-1.5 text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-4 gap-1.5 text-center">
                  <div>
                    <label className="text-[9px] text-gray-400 block">Qty</label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={it.quantity}
                      onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-lg p-1.5 text-xs font-mono text-center"
                    />
                  </div>

                  <div>
                    <label className="text-[9px] text-gray-400 block">Unit</label>
                    <input
                      type="text"
                      value={it.unit}
                      onChange={(e) => updateItem(idx, 'unit', e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-lg p-1.5 text-xs text-center"
                    />
                  </div>

                  <div>
                    <label className="text-[9px] text-gray-400 block">Cost Rate</label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={it.unitPrice}
                      onChange={(e) => updateItem(idx, 'unitPrice', e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-lg p-1.5 text-xs font-mono text-center font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-[9px] text-gray-400 block">Total</label>
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-1.5 text-xs font-mono font-bold text-emerald-800">
                      {it.lineTotal}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 bg-kiryana-darkGreen text-white rounded-xl flex justify-between items-center text-xs font-bold">
            <span>Total Purchase Amount:</span>
            <span className="text-sm font-mono font-black">Rs. {subtotal.toFixed(2)}</span>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 bg-kiryana-freshGreen text-white font-bold rounded-xl shadow-md text-xs flex items-center justify-center gap-1.5"
        >
          {loading ? 'Saving to Database...' : (
            <>
              <Check className="w-4 h-4" />
              <span>Confirm Purchase & Update Stock</span>
            </>
          )}
        </button>
      </form>
    </MobileAppShell>
  );
}
