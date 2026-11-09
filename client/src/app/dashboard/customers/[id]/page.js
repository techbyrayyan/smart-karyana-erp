'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import MobileAppShell from '../../../../components/layout/MobileAppShell';
import { useLanguage } from '../../../../context/LanguageContext';
import { customerApi } from '../../../../lib/api';
import {
  User,
  Phone,
  MapPin,
  Receipt,
  DollarSign,
  Plus,
  CheckCircle2,
  X,
  CreditCard,
} from 'lucide-react';

export default function CustomerDetailPage() {
  const params = useParams();
  const { t } = useLanguage();

  const [customer, setCustomer] = useState(null);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Record Payment Modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [recordingPayment, setRecordingPayment] = useState(false);

  const fetchCustomer = async () => {
    try {
      setLoading(true);
      const res = await customerApi.getById(params.id);
      if (res.success && res.customer) {
        setCustomer(res.customer);
        setSales(res.sales || []);
      }
    } catch (err) {
      setError(err.message || 'Error loading customer details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (params.id) {
      fetchCustomer();
    }
  }, [params.id]);

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    const amt = parseFloat(paymentAmount);
    if (!amt || amt <= 0) return;

    setRecordingPayment(true);
    try {
      const res = await customerApi.recordPayment(params.id, amt, paymentNotes);
      if (res.success) {
        setShowPaymentModal(false);
        setPaymentAmount('');
        setPaymentNotes('');
        fetchCustomer();
      }
    } catch (err) {
      alert(err.message || 'Error recording payment');
    } finally {
      setRecordingPayment(false);
    }
  };

  if (loading) {
    return (
      <MobileAppShell title="Customer Profile" showBack={true}>
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 rounded-full border-3 border-kiryana-freshGreen border-t-transparent animate-spin"></div>
        </div>
      </MobileAppShell>
    );
  }

  if (!customer) {
    return (
      <MobileAppShell title="Customer Profile" showBack={true}>
        <div className="p-4 bg-white rounded-2xl text-center text-xs text-red-600">
          Customer not found
        </div>
      </MobileAppShell>
    );
  }

  return (
    <MobileAppShell title={customer.name} showBack={true}>
      <div className="space-y-4">
        {/* Customer Profile Card */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-card-soft space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-base font-bold text-gray-900">{customer.name}</h3>
              {customer.phone && (
                <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5 font-mono">
                  <Phone className="w-3.5 h-3.5 text-gray-400" />
                  <span>{customer.phone}</span>
                </p>
              )}
              {customer.address && (
                <p className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-gray-400" />
                  <span>{customer.address}</span>
                </p>
              )}
            </div>

            <div className="text-right">
              <span className="text-[10px] text-gray-400 block font-bold uppercase">Khata Balance</span>
              <span
                className={`text-base font-black font-mono ${
                  customer.balance > 0 ? 'text-red-600' : 'text-emerald-700'
                }`}
              >
                Rs. {(customer.balance || 0).toFixed(2)}
              </span>
              {customer.balance > 0 && (
                <span className="block text-[10px] text-red-600 font-bold">Udhaar Payable</span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100 text-xs">
            <div className="bg-kiryana-softBg p-2.5 rounded-xl">
              <span className="text-[10px] text-gray-500 block">Total Purchases</span>
              <span className="font-black text-gray-900">{customer.totalPurchases || 0} Bills</span>
            </div>
            <div className="bg-kiryana-softBg p-2.5 rounded-xl">
              <span className="text-[10px] text-gray-500 block">Total Amount Spent</span>
              <span className="font-black text-kiryana-darkGreen font-mono">
                Rs. {(customer.totalSpent || 0).toFixed(2)}
              </span>
            </div>
          </div>

          {/* Receive Payment CTA button */}
          <button
            type="button"
            onClick={() => setShowPaymentModal(true)}
            className="w-full py-2.5 bg-kiryana-freshGreen text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-98 transition-transform"
          >
            <CreditCard className="w-4 h-4" />
            <span>Receive Khata Payment (وصولی)</span>
          </button>
        </div>

        {/* Purchase History Receipts */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-card-soft space-y-3">
          <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
            <Receipt className="w-4 h-4 text-kiryana-freshGreen" />
            <span>Purchase History ({sales.length})</span>
          </h4>

          {sales.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4">No purchases on record for this customer</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {sales.map((s) => (
                <Link
                  key={s._id}
                  href={`/dashboard/sales/${s._id}`}
                  className="py-2.5 flex items-center justify-between hover:bg-kiryana-softBg rounded-lg px-1 transition-colors"
                >
                  <div>
                    <span className="text-xs font-bold text-gray-900 block font-mono">
                      {s.receiptNumber}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      {new Date(s.date).toLocaleDateString()} • {s.items?.length || 0} items
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-black text-gray-900 font-mono block">
                      Rs. {s.grandTotal?.toFixed(2)}
                    </span>
                    <span
                      className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded ${
                        s.paymentStatus === 'paid'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {s.paymentStatus}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Receive Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-3">
          <div className="bg-white w-full max-w-sm rounded-3xl p-4 shadow-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                {t('receivePayment')}
              </h4>
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="p-1 rounded-full text-gray-400 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-3">
              <div className="p-3 bg-red-50 text-red-800 rounded-xl text-xs font-bold flex justify-between">
                <span>Current Udhaar Balance:</span>
                <span className="font-mono">Rs. {(customer.balance || 0).toFixed(2)}</span>
              </div>

              <div>
                <label className="text-[10px] text-gray-500 block mb-1">Received Amount (Rs) *</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="w-full bg-kiryana-softBg border border-gray-200 rounded-xl p-2.5 text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="text-[10px] text-gray-500 block mb-1">Payment Notes / Description</label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="e.g. Cash received by shopkeeper"
                  className="w-full bg-kiryana-softBg border border-gray-200 rounded-xl p-2.5 text-xs"
                />
              </div>

              <button
                type="submit"
                disabled={recordingPayment}
                className="w-full py-3 bg-kiryana-freshGreen text-white text-xs font-bold rounded-xl shadow-md flex items-center justify-center gap-1.5"
              >
                {recordingPayment ? 'Saving...' : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm Payment & Update Balance</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </MobileAppShell>
  );
}
