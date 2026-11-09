'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import MobileAppShell from '../../../../components/layout/MobileAppShell';
import { useLanguage } from '../../../../context/LanguageContext';
import { useAuth } from '../../../../context/AuthContext';
import { saleApi } from '../../../../lib/api';
import ThermalReceipt from '../../../../components/receipt/ThermalReceipt';
import {
  Edit2,
  Trash2,
  Printer,
  Check,
  Plus,
  Minus,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';

export default function SaleDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const { profile } = useAuth();

  const isEditMode = searchParams.get('edit') === 'true';
  const autoPrint = searchParams.get('print') === 'true';

  const [sale, setSale] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(isEditMode);
  const [saveLoading, setSaveLoading] = useState(false);
  const [error, setError] = useState('');

  // Editable fields
  const [items, setItems] = useState([]);
  const [discount, setDiscount] = useState('0');
  const [paidAmount, setPaidAmount] = useState('0');
  const [customerName, setCustomerName] = useState('');
  const [notes, setNotes] = useState('');

  const fetchSale = async () => {
    try {
      setLoading(true);
      const res = await saleApi.getById(params.id);
      if (res.success && res.sale) {
        setSale(res.sale);
        setItems(res.sale.items || []);
        setDiscount(String(res.sale.discount || 0));
        setPaidAmount(String(res.sale.paidAmount || 0));
        setCustomerName(res.sale.customerName || '');
        setNotes(res.sale.notes || '');

        if (autoPrint) {
          setTimeout(() => window.print(), 300);
        }
      }
    } catch (err) {
      setError(err.message || 'Error loading sale receipt');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (params.id) {
      fetchSale();
    }
  }, [params.id]);

  const updateItemQty = (index, delta) => {
    setItems((prev) => {
      const copy = [...prev];
      const newQty = Math.max(0.1, parseFloat((copy[index].quantity + delta).toFixed(2)));
      copy[index].quantity = newQty;
      copy[index].lineTotal = parseFloat((newQty * copy[index].unitPrice).toFixed(2));
      return copy;
    });
  };

  const removeItem = (index) => {
    if (items.length === 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Recalculations
  const subtotal = items.reduce((sum, it) => sum + (it.lineTotal || 0), 0);
  const discountVal = parseFloat(discount) || 0;
  const grandTotal = Math.max(0, parseFloat((subtotal - discountVal).toFixed(2)));

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setSaveLoading(true);
    setError('');

    try {
      const payload = {
        items,
        discount: discountVal,
        paidAmount: parseFloat(paidAmount) || grandTotal,
        customerName,
        notes,
      };

      const res = await saleApi.update(params.id, payload);
      if (res.success) {
        setEditing(false);
        fetchSale();
      }
    } catch (err) {
      setError(err.message || 'Error updating sale');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleVoid = async () => {
    if (window.confirm(`Are you sure you want to void receipt #${sale?.receiptNumber}? Stock will be refunded.`)) {
      try {
        await saleApi.void(params.id);
        router.push('/dashboard/sales');
      } catch (err) {
        alert(err.message || 'Error voiding sale');
      }
    }
  };

  if (loading) {
    return (
      <MobileAppShell title="Receipt" showBack={true}>
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 rounded-full border-3 border-kiryana-freshGreen border-t-transparent animate-spin"></div>
        </div>
      </MobileAppShell>
    );
  }

  if (!sale) {
    return (
      <MobileAppShell title="Receipt" showBack={true}>
        <div className="p-4 bg-white rounded-2xl text-center text-xs text-red-600">
          Receipt not found
        </div>
      </MobileAppShell>
    );
  }

  return (
    <MobileAppShell title={sale.receiptNumber} showBack={true}>
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-start gap-2 mb-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Top Action Bar */}
      <div className="flex items-center justify-between mb-3 px-1">
        <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
          {editing ? 'Edit Receipt' : 'Cash Memo View'}
        </span>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setEditing(!editing)}
            className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors ${
              editing
                ? 'bg-gray-200 text-gray-800'
                : 'bg-kiryana-lightGreen text-kiryana-darkGreen hover:bg-emerald-200'
            }`}
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>{editing ? 'Cancel' : t('edit')}</span>
          </button>

          {!editing && sale.status !== 'voided' && (
            <button
              onClick={handleVoid}
              className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg"
              title={t('voidSale')}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {editing ? (
        /* Edit Form */
        <form onSubmit={handleSaveEdit} className="space-y-3.5">
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-card-soft space-y-3">
            <div>
              <label className="text-[10px] text-gray-500 block mb-1">Customer Name</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full bg-kiryana-softBg border border-gray-200 rounded-xl p-2 text-xs font-bold"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] text-gray-500 block">Edit Items & Quantities</label>
              {items.map((it, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 bg-kiryana-softBg rounded-xl border border-gray-200">
                  <div className="flex-1 pr-2">
                    <span className="text-xs font-bold text-gray-900 block">{it.productName}</span>
                    <span className="text-[10px] text-gray-500">{it.variationName} @ Rs. {it.unitPrice}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => updateItemQty(idx, -1)}
                      className="w-6 h-6 rounded-lg bg-white border border-gray-300 flex items-center justify-center text-gray-700"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-7 text-center text-xs font-mono font-bold">{it.quantity}</span>
                    <button
                      type="button"
                      onClick={() => updateItemQty(idx, 1)}
                      className="w-6 h-6 rounded-lg bg-white border border-gray-300 flex items-center justify-center text-gray-700"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="text-right pl-3 font-mono font-bold text-xs text-kiryana-darkGreen">
                    Rs. {it.lineTotal?.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-gray-100">
              <div>
                <label className="text-[10px] text-gray-500 block">Discount (Rs)</label>
                <input
                  type="number"
                  step="any"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  className="w-full bg-kiryana-softBg border border-gray-200 rounded-lg p-2 text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="text-[10px] text-gray-500 block">Paid Amount (Rs)</label>
                <input
                  type="number"
                  step="any"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  className="w-full bg-kiryana-softBg border border-gray-200 rounded-lg p-2 text-xs font-mono font-bold"
                />
              </div>
            </div>

            <div className="p-3 bg-kiryana-darkGreen text-white rounded-xl flex justify-between items-center text-xs font-bold">
              <span>Recalculated Total:</span>
              <span className="text-sm font-mono font-black">Rs. {grandTotal.toFixed(2)}</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={saveLoading}
            className="w-full py-3.5 bg-kiryana-freshGreen text-white font-bold rounded-xl shadow-md text-xs flex items-center justify-center gap-1.5"
          >
            {saveLoading ? 'Reconciling Inventory...' : (
              <>
                <Check className="w-4 h-4" />
                <span>Save Changes & Rebalance Stock</span>
              </>
            )}
          </button>
        </form>
      ) : (
        /* Thermal Receipt Layout */
        <ThermalReceipt sale={sale} profile={profile} />
      )}
    </MobileAppShell>
  );
}
