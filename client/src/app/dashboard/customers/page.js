'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import MobileAppShell from '../../../components/layout/MobileAppShell';
import { useLanguage } from '../../../context/LanguageContext';
import { customerApi } from '../../../lib/api';
import {
  Users,
  Search,
  Plus,
  Phone,
  DollarSign,
  AlertCircle,
  X,
  Check,
  Trash2,
  CheckCircle2,
} from 'lucide-react';

export default function CustomersPage() {
  const { t } = useLanguage();

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [hasBalanceFilter, setHasBalanceFilter] = useState(false);

  // Add Customer Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [initialBalance, setInitialBalance] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const params = {};
      if (search) params.search = search;
      if (hasBalanceFilter) params.hasBalance = 'true';

      const res = await customerApi.getAll(params);
      if (res.success) {
        setCustomers(res.customers || []);
      }
    } catch (err) {
      console.error('Error loading customers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delay = setTimeout(fetchCustomers, 200);
    return () => clearTimeout(delay);
  }, [search, hasBalanceFilter]);

  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    try {
      const res = await customerApi.create({
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
        initialBalance: parseFloat(initialBalance) || 0,
      });

      if (res.success) {
        setShowAddModal(false);
        setName('');
        setPhone('');
        setAddress('');
        setInitialBalance('');
        fetchCustomers();
      }
    } catch (err) {
      alert(err.message || 'Error creating customer');
    } finally {
      setSaving(false);
    }
  };

  // Total outstanding balance across all customers
  const totalUdhaar = customers.reduce((sum, c) => sum + (c.balance || 0), 0);

  const handleDeleteCustomer = async (e, id, name) => {
    e.stopPropagation();
    e.preventDefault();
    if (window.confirm(`Kya aap "${name}" ka khata mukammal delete karna chahtay hain?`)) {
      try {
        await customerApi.delete(id);
        fetchCustomers();
      } catch (err) {
        alert(err.message || 'Error deleting customer');
      }
    }
  };

  const handleClearUdhaar = async (e, id, name, balance) => {
    e.stopPropagation();
    e.preventDefault();
    if (window.confirm(`Kya "${name}" ne Rs. ${balance} ka sara udhaar ada kar diya hai?`)) {
      try {
        await customerApi.recordPayment(id, balance, 'Full udhaar paid and cleared');
        fetchCustomers();
      } catch (err) {
        alert(err.message || 'Error recording payment');
      }
    }
  };

  return (
    <MobileAppShell title={t('customersTitle')}>
      {/* Top Udhaar Summary Banner */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-card-soft mb-3 flex items-center justify-between">
        <div>
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
            Total Udhaar (Khata)
          </span>
          <span className="text-base font-black text-rose-700 font-mono">
            Rs. {totalUdhaar.toLocaleString()}
          </span>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1 bg-kiryana-freshGreen text-white font-bold py-2 px-3 rounded-xl text-xs shadow-sm hover:bg-kiryana-darkGreen active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>{t('addCustomer')}</span>
        </button>
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
          placeholder="Search customer name or phone..."
          className="w-full bg-white border border-gray-200 rounded-xl py-2.5 pl-10 pr-3 rtl:pr-10 rtl:pl-3 text-xs focus:outline-none focus:border-kiryana-freshGreen shadow-sm"
        />
      </div>

      {/* Filter Toggle */}
      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={() => setHasBalanceFilter(!hasBalanceFilter)}
          className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
            hasBalanceFilter
              ? 'bg-rose-600 text-white'
              : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
          }`}
        >
          Udhaar Only ({customers.filter((c) => c.balance > 0).length})
        </button>
      </div>

      {/* Customer Cards List */}
      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-8 h-8 rounded-full border-3 border-kiryana-freshGreen border-t-transparent animate-spin"></div>
        </div>
      ) : customers.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center border border-gray-100 shadow-card-soft">
          <Users className="w-12 h-12 mx-auto text-gray-300 mb-2" />
          <p className="text-xs font-semibold text-gray-600">No customers found</p>
          <p className="text-[11px] text-gray-400 mt-1">Tap Add Customer to create a Khata account</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {customers.map((c) => (
            <div
              key={c._id}
              className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-card-soft hover:border-gray-200 transition-all space-y-2.5"
            >
              <div className="flex items-start justify-between">
                <Link
                  href={`/dashboard/customers/${c._id}`}
                  className="flex-1 min-w-0 pr-2 hover:opacity-80"
                >
                  <h4 className="text-xs font-bold text-gray-900 truncate">{c.name}</h4>
                  {c.phone && (
                    <p className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5">
                      <Phone className="w-3 h-3 text-gray-400" />
                      <span>{c.phone}</span>
                    </p>
                  )}
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {c.totalPurchases || 0} Bills • Total Spent: Rs. {(c.totalSpent || 0).toLocaleString()}
                  </p>
                </Link>

                <div className="text-right flex-shrink-0">
                  <span className="text-[10px] text-gray-400 block">Balance</span>
                  <span
                    className={`text-xs font-mono font-black ${
                      c.balance > 0 ? 'text-red-600' : 'text-emerald-700'
                    }`}
                  >
                    Rs. {(c.balance || 0).toFixed(2)}
                  </span>
                  {c.balance > 0 && (
                    <span className="block text-[9px] text-red-500 font-bold">Udhaar</span>
                  )}
                </div>
              </div>

              {/* Action Buttons: Clear Udhaar & Delete Khata */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-100 gap-2">
                <Link
                  href={`/dashboard/customers/${c._id}`}
                  className="text-[11px] font-bold text-gray-600 hover:text-kiryana-darkGreen py-1"
                >
                  View Details →
                </Link>

                <div className="flex items-center gap-1.5">
                  {c.balance > 0 && (
                    <button
                      type="button"
                      onClick={(e) => handleClearUdhaar(e, c._id, c.name, c.balance)}
                      className="text-[10px] font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 px-2 py-1 rounded-lg flex items-center gap-1 transition-colors"
                      title="Clear Udhaar (Khata Zero)"
                    >
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>Wasool Ho Gaya</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={(e) => handleDeleteCustomer(e, c._id, c.name)}
                    className="text-[10px] font-bold bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 px-2 py-1 rounded-lg flex items-center gap-1 transition-colors"
                    title="Delete Khata Record"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-3">
          <div className="bg-white w-full max-w-sm rounded-3xl p-4 shadow-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                {t('addCustomer')}
              </h4>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-full text-gray-400 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="space-y-3">
              <div>
                <label className="text-[10px] text-gray-500 block mb-1">Customer Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Tariq Mehmood"
                  className="w-full bg-kiryana-softBg border border-gray-200 rounded-xl p-2.5 text-xs font-bold"
                />
              </div>

              <div>
                <label className="text-[10px] text-gray-500 block mb-1">Phone Number</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0300-1234567"
                  className="w-full bg-kiryana-softBg border border-gray-200 rounded-xl p-2.5 text-xs font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] text-gray-500 block mb-1">Shop / Home Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Street / Mohallah"
                  className="w-full bg-kiryana-softBg border border-gray-200 rounded-xl p-2.5 text-xs"
                />
              </div>

              <div>
                <label className="text-[10px] text-gray-500 block mb-1">Starting Balance / Old Udhaar (Rs)</label>
                <input
                  type="number"
                  step="any"
                  value={initialBalance}
                  onChange={(e) => setInitialBalance(e.target.value)}
                  placeholder="0"
                  className="w-full bg-kiryana-softBg border border-gray-200 rounded-xl p-2.5 text-xs font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full py-3 bg-kiryana-freshGreen text-white text-xs font-bold rounded-xl shadow-md flex items-center justify-center gap-1.5"
              >
                {saving ? 'Saving...' : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Save Customer</span>
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
