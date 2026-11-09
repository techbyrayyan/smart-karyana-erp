'use client';

import React, { useState, useEffect } from 'react';
import MobileAppShell from '../../../components/layout/MobileAppShell';
import { useLanguage } from '../../../context/LanguageContext';
import { expenseApi } from '../../../lib/api';
import { Plus, Trash2, DollarSign, Calendar, Check, X } from 'lucide-react';

const CATEGORIES = [
  'Shop Rent',
  'Electricity',
  'Employee Salaries',
  'Transport',
  'Maintenance',
  'Other',
];

export default function ExpensesPage() {
  const { t } = useLanguage();

  const [expenses, setExpenses] = useState([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('this_month'); // 'today' | 'this_month' | 'all'

  // Add Expense Modal
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Electricity');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const res = await expenseApi.getAll({ filter });
      if (res.success) {
        setExpenses(res.expenses || []);
        setTotalAmount(res.totalAmount || 0);
      }
    } catch (err) {
      console.error('Error loading expenses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [filter]);

  const handleCreateExpense = async (e) => {
    e.preventDefault();
    if (!title.trim() || !amount) return;

    setSaving(true);
    try {
      const res = await expenseApi.create({
        title: title.trim(),
        category,
        amount: parseFloat(amount),
        description: description.trim(),
      });

      if (res.success) {
        setShowModal(false);
        setTitle('');
        setAmount('');
        setDescription('');
        fetchExpenses();
      }
    } catch (err) {
      alert(err.message || 'Error saving expense');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteExpense = async (id) => {
    if (window.confirm('Delete this expense?')) {
      try {
        await expenseApi.delete(id);
        fetchExpenses();
      } catch (err) {
        alert(err.message || 'Error deleting expense');
      }
    }
  };

  return (
    <MobileAppShell title={t('expensesTitle')}>
      {/* Top Total Expense Card */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-card-soft mb-3 flex items-center justify-between">
        <div>
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
            {filter === 'today' ? "Today's Expenses" : "Month's Expenses"}
          </span>
          <span className="text-base font-black text-rose-700 font-mono">
            Rs. {totalAmount.toLocaleString()}
          </span>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1 bg-rose-600 text-white font-bold py-2 px-3 rounded-xl text-xs shadow-sm hover:bg-rose-700 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>{t('addExpense')}</span>
        </button>
      </div>

      {/* Filter Pills */}
      <div className="flex items-center gap-2 mb-3">
        {[
          { key: 'today', label: 'Today' },
          { key: 'this_month', label: 'This Month' },
          { key: 'all', label: 'All' },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              filter === f.key
                ? 'bg-kiryana-darkGreen text-white'
                : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Expense Items List */}
      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-8 h-8 rounded-full border-3 border-kiryana-freshGreen border-t-transparent animate-spin"></div>
        </div>
      ) : expenses.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center border border-gray-100 shadow-card-soft">
          <DollarSign className="w-12 h-12 mx-auto text-gray-300 mb-2" />
          <p className="text-xs font-semibold text-gray-600">No expenses recorded for this period</p>
          <p className="text-[11px] text-gray-400 mt-1">Tap Add Expense to log bills or rent</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {expenses.map((e) => (
            <div
              key={e._id}
              className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-card-soft flex items-center justify-between"
            >
              <div>
                <span className="text-xs font-bold text-gray-900 block">{e.title}</span>
                <span className="text-[10px] text-gray-500 font-medium">{e.category}</span>
                <span className="text-[10px] text-gray-400 block mt-0.5">
                  {new Date(e.date).toLocaleDateString()} {e.description ? `• ${e.description}` : ''}
                </span>
              </div>

              <div className="text-right flex items-center gap-2">
                <span className="text-xs font-black font-mono text-rose-700">
                  Rs. {e.amount?.toFixed(2)}
                </span>
                <button
                  onClick={() => handleDeleteExpense(e._id)}
                  className="text-gray-400 hover:text-rose-600 p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Expense Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-3">
          <div className="bg-white w-full max-w-sm rounded-3xl p-4 shadow-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                {t('addExpense')}
              </h4>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1 rounded-full text-gray-400 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateExpense} className="space-y-3">
              <div>
                <label className="text-[10px] text-gray-500 block mb-1">Purpose / Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Shop Electricity Bill"
                  className="w-full bg-kiryana-softBg border border-gray-200 rounded-xl p-2.5 text-xs font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-gray-500 block mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-kiryana-softBg border border-gray-200 rounded-xl p-2 text-xs"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-gray-500 block mb-1">Amount (Rs) *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="e.g. 4500"
                    className="w-full bg-kiryana-softBg border border-gray-200 rounded-xl p-2 text-xs font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-gray-500 block mb-1">Description (Optional)</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Details..."
                  className="w-full bg-kiryana-softBg border border-gray-200 rounded-xl p-2.5 text-xs"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center justify-center gap-1.5"
              >
                {saving ? 'Saving...' : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Save Expense</span>
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
