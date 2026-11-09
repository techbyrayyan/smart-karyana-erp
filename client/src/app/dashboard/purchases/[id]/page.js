'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import MobileAppShell from '../../../../components/layout/MobileAppShell';
import { useLanguage } from '../../../../context/LanguageContext';
import { purchaseApi } from '../../../../lib/api';
import { Package, Calendar, User, FileText, Image as ImageIcon } from 'lucide-react';

export default function PurchaseDetailPage() {
  const params = useParams();
  const { t } = useLanguage();

  const [purchase, setPurchase] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPurchase = async () => {
      try {
        setLoading(true);
        const res = await purchaseApi.getById(params.id);
        if (res.success && res.purchase) {
          setPurchase(res.purchase);
        }
      } catch (err) {
        setError(err.message || 'Error loading purchase invoice');
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchPurchase();
    }
  }, [params.id]);

  if (loading) {
    return (
      <MobileAppShell title="Purchase Invoice" showBack={true}>
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 rounded-full border-3 border-kiryana-freshGreen border-t-transparent animate-spin"></div>
        </div>
      </MobileAppShell>
    );
  }

  if (!purchase) {
    return (
      <MobileAppShell title="Purchase Invoice" showBack={true}>
        <div className="p-4 bg-white rounded-2xl text-center text-xs text-red-600">
          Purchase record not found
        </div>
      </MobileAppShell>
    );
  }

  return (
    <MobileAppShell title={`Invoice #${purchase.invoiceNumber}`} showBack={true}>
      <div className="space-y-4">
        {/* Header Summary Card */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-card-soft space-y-2">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-900">{purchase.supplierName}</h3>
              <p className="text-[10px] text-gray-500 font-mono mt-0.5">#{purchase.invoiceNumber}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">
                {new Date(purchase.purchaseDate).toLocaleDateString()}
              </p>
            </div>

            <div className="text-right">
              <span className="text-base font-black text-gray-900 font-mono">
                Rs. {purchase.total?.toFixed(2)}
              </span>
              <span className="block text-[9px] px-2 py-0.5 rounded font-bold uppercase mt-1 bg-emerald-100 text-emerald-800">
                {purchase.paymentStatus}
              </span>
            </div>
          </div>
        </div>

        {/* Invoice Image Thumbnail if present */}
        {purchase.invoiceImageUrl && (
          <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-card-soft">
            <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
              <ImageIcon className="w-3.5 h-3.5" /> Scanned Invoice Attachment
            </h4>
            <div className="rounded-xl overflow-hidden border border-gray-200">
              <img
                src={purchase.invoiceImageUrl}
                alt="Invoice Slip"
                className="w-full max-h-56 object-contain bg-gray-50"
              />
            </div>
          </div>
        )}

        {/* Itemized List */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-card-soft space-y-3">
          <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
            Purchased Products ({purchase.items?.length || 0})
          </h4>

          <div className="divide-y divide-gray-100">
            {purchase.items?.map((it, idx) => (
              <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-gray-900">{it.productName}</div>
                  <div className="text-[10px] text-gray-500">
                    {it.quantity} {it.unit} @ Rs. {it.unitPrice}
                  </div>
                </div>

                <div className="text-right font-mono font-bold text-gray-900">
                  Rs. {it.lineTotal?.toFixed(2)}
                </div>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-gray-100 flex justify-between font-bold text-xs">
            <span>Grand Total:</span>
            <span className="font-mono font-black text-sm text-kiryana-darkGreen">
              Rs. {purchase.total?.toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </MobileAppShell>
  );
}
