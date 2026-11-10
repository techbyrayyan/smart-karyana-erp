'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MobileAppShell from '../../../../components/layout/MobileAppShell';
import { useLanguage } from '../../../../context/LanguageContext';
import { useAuth } from '../../../../context/AuthContext';
import { productApi, customerApi, saleApi, categoryApi } from '../../../../lib/api';
import ThermalReceipt from '../../../../components/receipt/ThermalReceipt';
import { getProductImage } from '../../../../lib/productImages';
import { calculateLinePrice, WEIGHT_PRESETS, getProductUnitType } from '../../../../lib/pricingCalculator';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  User,
  CheckCircle2,
  AlertCircle,
  Receipt,
  Layers,
  ChevronDown,
  Printer,
  X,
  Package,
  Scale,
  Calculator,
} from 'lucide-react';

export default function NewSalePage() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const { profile } = useAuth();

  // Search & Products
  const [productSearch, setProductSearch] = useState('');
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedProduct, setSelectedProduct] = useState(null); // for variation selection modal
  const [cart, setCart] = useState([]);

  // Customers
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isWalkIn, setIsWalkIn] = useState(true);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');

  // Weight & Quantity Calculator State
  const [weightCalcProduct, setWeightCalcProduct] = useState(null);
  const [weightCalcCustomGrams, setWeightCalcCustomGrams] = useState('1000');
  const [weightCalcUnitMode, setWeightCalcUnitMode] = useState('gram'); // 'gram' | 'kg'
  const [weightCalcEditingIndex, setWeightCalcEditingIndex] = useState(null);

  const openWeightCalculator = (product, editingIndex = null, initialGrams = 1000) => {
    setWeightCalcProduct(product);
    setWeightCalcEditingIndex(editingIndex);
    setWeightCalcCustomGrams(String(initialGrams));
    setWeightCalcUnitMode('gram');
  };

  const handleApplyWeightCalculator = () => {
    if (!weightCalcProduct) return;
    const rawVal = Number(weightCalcCustomGrams) || 0;
    const grams = weightCalcUnitMode === 'kg' ? rawVal * 1000 : rawVal;
    if (grams <= 0) return;

    const basePrice = Number(weightCalcProduct.pricePerUnit || weightCalcProduct.sellingPrice || 0);
    const calc = calculateLinePrice({
      pricePerUnit: basePrice,
      quantity: grams,
      unit: 'Gram',
      unitType: 'weight',
    });

    const kgQty = grams / 1000;
    const displayName = grams >= 1000 && grams % 1000 === 0 ? `${grams / 1000} KG` : `${grams} Gram`;

    if (weightCalcEditingIndex !== null) {
      setCart((prev) => {
        const copy = [...prev];
        copy[weightCalcEditingIndex] = {
          ...copy[weightCalcEditingIndex],
          variationName: displayName,
          quantity: kgQty,
          grams: grams,
          unit: 'KG',
          unitPrice: basePrice,
          lineTotal: calc.lineTotal,
        };
        return copy;
      });
    } else {
      setCart((prev) => [
        ...prev,
        {
          product: weightCalcProduct._id,
          productId: weightCalcProduct.productId || null,
          productName: weightCalcProduct.name,
          variationName: displayName,
          quantity: kgQty,
          grams: grams,
          unit: 'KG',
          multiplier: kgQty,
          unitPrice: basePrice,
          lineTotal: calc.lineTotal,
          productImage: weightCalcProduct.productImage || '',
        },
      ]);
    }

    setWeightCalcProduct(null);
    setWeightCalcEditingIndex(null);
  };

  // Bill Calculations
  const [discount, setDiscount] = useState('');
  const [paidAmount, setPaidAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash'); // 'cash' | 'online' | 'credit_khata'
  const [notes, setNotes] = useState('');

  // UI Flow States
  const [submitting, setSubmitting] = useState(false);
  const [completedSale, setCompletedSale] = useState(null);
  const [error, setError] = useState('');

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await categoryApi.getAll();
        if (res.success && res.categories) {
          setCategories(res.categories || []);
        }
      } catch (e) {}
    };
    fetchCategories();
  }, []);

  // Fetch products matching search & category
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const params = {};
        if (productSearch) params.search = productSearch;
        if (selectedCategory && selectedCategory !== 'All') params.category = selectedCategory;

        const res = await productApi.getAll(params);
        if (res.success) {
          setProducts(res.products || []);
        }
      } catch (e) {}
    };

    const delay = setTimeout(fetchProducts, 150);
    return () => clearTimeout(delay);
  }, [productSearch, selectedCategory]);

  // Fetch customers
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const res = await customerApi.getAll({ search: customerSearch });
        if (res.success) {
          setCustomers(res.customers || []);
        }
      } catch (e) {}
    };
    fetchCustomers();
  }, [customerSearch]);

  // Add Item to Cart with chosen variation
  const addItemToCart = (product, variation) => {
    const existingIndex = cart.findIndex(
      (c) => c.product === product._id && c.variationName === variation.name
    );

    if (existingIndex >= 0) {
      // Increase qty
      const copy = [...cart];
      copy[existingIndex].quantity += 1;
      copy[existingIndex].lineTotal = parseFloat(
        (copy[existingIndex].quantity * copy[existingIndex].unitPrice).toFixed(2)
      );
      setCart(copy);
    } else {
      // Add new cart line
      setCart([
        ...cart,
        {
          product: product._id,
          productName: product.name,
          variationName: variation.name,
          quantity: 1,
          unit: variation.unit || product.unit,
          multiplier: variation.multiplier || 1,
          unitPrice: variation.price,
          lineTotal: variation.price,
        },
      ]);
    }
    setSelectedProduct(null);
  };

  const updateCartQty = (index, delta) => {
    setCart((prev) => {
      const copy = [...prev];
      const newQty = Math.max(0.1, parseFloat((copy[index].quantity + delta).toFixed(2)));
      copy[index].quantity = newQty;
      copy[index].lineTotal = parseFloat((newQty * copy[index].unitPrice).toFixed(2));
      return copy;
    });
  };

  const removeCartItem = (index) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  // Math Calculations
  const subtotal = cart.reduce((sum, item) => sum + (item.lineTotal || 0), 0);
  const discountVal = parseFloat(discount) || 0;
  const grandTotal = Math.max(0, parseFloat((subtotal - discountVal).toFixed(2)));

  // Auto sync paid amount if cash
  useEffect(() => {
    if (paymentMethod === 'cash') {
      setPaidAmount(grandTotal > 0 ? String(grandTotal) : '');
    } else if (paymentMethod === 'credit_khata') {
      setPaidAmount('0');
    }
  }, [grandTotal, paymentMethod]);

  const paidAmountVal = parseFloat(paidAmount) || 0;
  const remainingBalance = Math.max(0, parseFloat((grandTotal - paidAmountVal).toFixed(2)));

  // Fast Add Quick Customer
  const handleCreateQuickCustomer = async (e) => {
    e.preventDefault();
    if (!newCustomerName.trim()) return;

    try {
      const res = await customerApi.create({
        name: newCustomerName.trim(),
        phone: newCustomerPhone.trim(),
      });
      if (res.success && res.customer) {
        setSelectedCustomer(res.customer);
        setIsWalkIn(false);
        setShowCustomerModal(false);
        setNewCustomerName('');
        setNewCustomerPhone('');
      }
    } catch (err) {
      alert(err.message || 'Error creating customer');
    }
  };

  // Submit Sale to Backend
  const handleCompleteSale = async () => {
    if (cart.length === 0) {
      setError('Please add items to cart before completing sale');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const payload = {
        customerId: isWalkIn ? null : selectedCustomer?._id,
        customerName: isWalkIn
          ? 'Walk-in Customer (عام گاہک)'
          : selectedCustomer?.name || 'Customer',
        customerPhone: isWalkIn ? '' : selectedCustomer?.phone || '',
        isWalkIn,
        items: cart,
        discount: discountVal,
        paidAmount: paidAmountVal,
        paymentMethod,
        notes,
      };

      const res = await saleApi.create(payload);
      if (res.success && res.sale) {
        setCompletedSale(res.sale);
      } else {
        throw new Error(res.message || 'Failed to complete sale');
      }
    } catch (err) {
      setError(err.message || 'Transaction failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <MobileAppShell title={t('newSaleTitle')} showBack={true}>
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-start gap-2 mb-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* SUCCESS / RECEIPT MODAL */}
      {completedSale ? (
        <div className="space-y-4">
          <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-800">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <div>
                <span className="text-xs font-bold block">{t('saleCompleted')}</span>
                <span className="text-[10px] text-emerald-700">Stock updated atomically</span>
              </div>
            </div>

            <button
              onClick={() => {
                setCompletedSale(null);
                setCart([]);
                setDiscount('');
                setPaidAmount('');
                setNotes('');
                setSelectedCustomer(null);
                setIsWalkIn(true);
              }}
              className="text-xs bg-kiryana-freshGreen text-white font-bold py-1.5 px-3 rounded-xl shadow-sm"
            >
              + Next Bill
            </button>
          </div>

          {/* Thermal Receipt Print Preview */}
          <ThermalReceipt sale={completedSale} profile={profile} />
        </div>
      ) : (
        <div className="space-y-3.5">
          {/* Customer Selection Bar */}
          <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-card-soft">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-kiryana-lightGreen text-kiryana-darkGreen flex items-center justify-center">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-gray-900 block truncate max-w-[150px]">
                    {isWalkIn ? t('walkInCustomer') : selectedCustomer?.name}
                  </span>
                  {!isWalkIn && selectedCustomer?.balance > 0 && (
                    <span className="text-[10px] font-bold text-red-600">
                      Udhaar Khata: Rs. {selectedCustomer.balance}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowCustomerModal(true)}
                  className="text-[11px] font-bold text-kiryana-freshGreen bg-kiryana-lightGreen px-2.5 py-1.5 rounded-xl"
                >
                  Change / Khata
                </button>
              </div>
            </div>
          </div>

          {/* Dynamic Category Selector Bar (Pehle Category Select Karein: e.g. Rice, Atta) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-bold text-gray-700">1. Select Category (کیٹیگری چنیں)</span>
              {selectedCategory !== 'All' && (
                <button
                  type="button"
                  onClick={() => setSelectedCategory('All')}
                  className="text-[10px] text-kiryana-freshGreen font-bold hover:underline"
                >
                  View All
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <button
                type="button"
                onClick={() => setSelectedCategory('All')}
                className={`px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap flex-shrink-0 transition-colors ${
                  selectedCategory === 'All'
                    ? 'bg-kiryana-darkGreen text-white shadow-sm'
                    : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'
                }`}
              >
                All Items
              </button>

              {categories.map((cat) => (
                <button
                  key={cat._id || cat.name}
                  type="button"
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
            </div>
          </div>

          {/* Product Fast Search Input */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 rtl:left-auto rtl:right-0 pl-3.5 rtl:pr-3.5 flex items-center pointer-events-none text-gray-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              placeholder={selectedCategory === 'All' ? t('searchProducts') : `Search inside "${selectedCategory}"...`}
              className="w-full bg-white border border-gray-200 rounded-xl py-2.5 pl-10 pr-3 rtl:pr-10 rtl:pl-3 text-xs focus:outline-none focus:border-kiryana-freshGreen shadow-sm"
            />
            {productSearch && (
              <button
                type="button"
                onClick={() => setProductSearch('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 text-xs"
              >
                Clear
              </button>
            )}
          </div>

          {/* Fast Category Item Grid / Quick Tapper */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-card-soft p-3 space-y-2">
            <div className="flex items-center justify-between border-b border-gray-100 pb-1.5">
              <span className="text-[11px] font-bold text-gray-800">
                2. Tap Item to Add (
                {selectedCategory === 'All' ? 'All Products' : `${selectedCategory} کی آئٹمز`}
                )
              </span>
              <span className="text-[10px] text-gray-400 font-medium">
                {products.length} {products.length === 1 ? 'item' : 'items'}
              </span>
            </div>

            {products.length === 0 ? (
              <div className="py-5 text-center text-gray-400 text-xs">
                No products found {selectedCategory !== 'All' ? `under "${selectedCategory}"` : ''}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-0.5">
                {products.map((p) => (
                  <div
                    key={p._id}
                    onClick={() => {
                      const isWeight = getProductUnitType(p) === 'weight';
                      if (isWeight) {
                        openWeightCalculator(p);
                      } else if (p.variations && p.variations.length > 1) {
                        setSelectedProduct(p);
                      } else {
                        const defaultVar = p.variations?.[0] || {
                          name: `1 ${p.unit}`,
                          unit: p.unit,
                          multiplier: 1,
                          price: p.sellingPrice || p.pricePerUnit || p.salePrice || 0,
                        };
                        addItemToCart(p, defaultVar);
                      }
                    }}
                    className="p-2 bg-kiryana-softBg hover:bg-emerald-50 border border-gray-200 hover:border-emerald-300 rounded-xl cursor-pointer transition-all active:scale-98 flex items-center gap-2"
                  >
                    <div className="w-9 h-9 rounded-lg overflow-hidden bg-white flex-shrink-0 border border-gray-200">
                      <img
                        src={p.productImage || getProductImage(p.name, p.category)}
                        alt={p.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80';
                        }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-bold text-gray-900 block truncate leading-tight">
                        {p.name}
                      </span>
                      <div className="flex items-center justify-between mt-0.5">
                        <span className="text-[11px] font-extrabold text-kiryana-darkGreen font-mono">
                          Rs. {p.sellingPrice || p.pricePerUnit || p.salePrice || 0}
                        </span>
                        <span className="text-[9px] text-gray-500 font-medium">
                          {p.currentStock} {p.unit}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cart Table / Items */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-card-soft p-3.5 space-y-3">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                <ShoppingCart className="w-4 h-4 text-kiryana-freshGreen" />
                <span>{t('cart')} ({cart.length})</span>
              </h3>
              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={() => setCart([])}
                  className="text-[10px] text-red-500 font-semibold hover:underline"
                >
                  Clear All
                </button>
              )}
            </div>

            {cart.length === 0 ? (
              <div className="py-6 text-center text-gray-400 text-xs">
                {t('emptyCart')}
              </div>
            ) : (
              <div className="space-y-2.5">
                {cart.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 bg-kiryana-softBg rounded-xl border border-gray-200 gap-2"
                  >
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-200">
                      <img
                        src={item.productImage || getProductImage(item.productName)}
                        alt={item.productName}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80';
                        }}
                      />
                    </div>

                    <div className="flex-1 min-w-0 pr-1">
                      <div className="text-xs font-bold text-gray-900 truncate">{item.productName}</div>
                      <div className="text-[10px] text-gray-500 flex items-center gap-1.5 flex-wrap">
                        <span>{item.variationName} @ Rs. {item.unitPrice}</span>
                        {(item.unit === 'KG' || item.grams || item.unitType === 'weight') && (
                          <button
                            type="button"
                            onClick={() => {
                              const matchingProd = products.find((p) => p._id === item.product) || {
                                _id: item.product,
                                name: item.productName,
                                pricePerUnit: item.unitPrice,
                                sellingPrice: item.unitPrice,
                                unitType: 'weight',
                              };
                              openWeightCalculator(
                                matchingProd,
                                idx,
                                item.grams || Math.round((item.quantity || 1) * 1000)
                              );
                            }}
                            className="p-0.5 px-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded font-bold text-[9px] flex items-center gap-1"
                            title="Open Weight Calculator"
                          >
                            <Scale className="w-2.5 h-2.5" />
                            <span>Weight Calc</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Qty Controls */}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => updateCartQty(idx, -1)}
                        className="w-6 h-6 rounded-lg bg-white border border-gray-300 flex items-center justify-center text-gray-700 active:scale-95"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-8 text-center text-xs font-mono font-bold">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateCartQty(idx, 1)}
                        className="w-6 h-6 rounded-lg bg-white border border-gray-300 flex items-center justify-center text-gray-700 active:scale-95"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Line Total & Remove */}
                    <div className="text-right pl-3 flex items-center gap-2">
                      <span className="text-xs font-mono font-black text-kiryana-darkGreen">
                        Rs. {item.lineTotal?.toFixed(2)}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeCartItem(idx)}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bill Summary & Payment Details */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-card-soft p-4 space-y-3">
            <div className="flex justify-between text-xs text-gray-600">
              <span>{t('subtotal')}:</span>
              <span className="font-mono font-bold">Rs. {subtotal.toFixed(2)}</span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-xs text-gray-600">{t('discount')} (Rs):</span>
              <input
                type="number"
                step="any"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                placeholder="0"
                className="w-24 bg-kiryana-softBg border border-gray-200 rounded-lg p-1.5 text-xs text-right font-mono font-bold"
              />
            </div>

            <div className="flex justify-between items-center text-sm font-black text-kiryana-darkGreen border-t border-b border-gray-100 py-2">
              <span>{t('grandTotal')}:</span>
              <span className="font-mono text-base">Rs. {grandTotal.toFixed(2)}</span>
            </div>

            {/* Payment Method Selector */}
            <div>
              <label className="text-[10px] font-bold text-gray-500 block mb-1">Payment Method</label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cash')}
                  className={`py-2 rounded-xl text-xs font-bold transition-all ${
                    paymentMethod === 'cash'
                      ? 'bg-kiryana-darkGreen text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {t('cash')}
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('online')}
                  className={`py-2 rounded-xl text-xs font-bold transition-all ${
                    paymentMethod === 'online'
                      ? 'bg-kiryana-darkGreen text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {t('online')}
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('credit_khata')}
                  className={`py-2 rounded-xl text-xs font-bold transition-all ${
                    paymentMethod === 'credit_khata'
                      ? 'bg-red-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {t('creditKhata')}
                </button>
              </div>
            </div>

            {/* Paid Amount & Remaining Balance */}
            <div className="grid grid-cols-2 gap-2 text-xs pt-1">
              <div>
                <label className="text-[10px] text-gray-500 block">{t('paidAmount')}</label>
                <input
                  type="number"
                  step="any"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  placeholder="Rs. 0"
                  className="w-full bg-kiryana-softBg border border-gray-200 rounded-lg p-2 text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="text-[10px] text-gray-500 block">{t('remainingBalance')}</label>
                <div className={`p-2 rounded-lg font-mono font-bold text-xs ${remainingBalance > 0 ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-800'}`}>
                  Rs. {remainingBalance.toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          {/* Confirm Button */}
          <button
            type="button"
            disabled={submitting || cart.length === 0}
            onClick={handleCompleteSale}
            className="w-full py-4 bg-kiryana-freshGreen hover:bg-kiryana-darkGreen active:scale-98 text-white font-black text-sm rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2"
          >
            {submitting ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <Receipt className="w-5 h-5" />
                <span>{t('completeSale')} • Rs. {grandTotal.toFixed(2)}</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* MODAL 1: VARIATION SELECTION MODAL */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-3">
          <div className="bg-white w-full max-w-sm rounded-3xl p-4 shadow-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <div>
                <h4 className="text-sm font-bold text-gray-900">{selectedProduct.name}</h4>
                <p className="text-[10px] text-gray-500">{t('selectVariation')}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProduct(null)}
                className="p-1 rounded-full text-gray-400 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {(selectedProduct.variations || []).map((v, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    addItemToCart(selectedProduct, v);
                    setProductSearch('');
                  }}
                  className="w-full flex items-center justify-between p-3 bg-kiryana-softBg hover:bg-kiryana-lightGreen/50 rounded-xl border border-gray-200 transition-colors text-left"
                >
                  <span className="text-xs font-bold text-gray-900">{v.name}</span>
                  <span className="text-xs font-black text-kiryana-darkGreen font-mono">
                    Rs. {v.price}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CUSTOMER SELECTOR / ADD MODAL */}
      {showCustomerModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-3">
          <div className="bg-white w-full max-w-sm rounded-3xl p-4 shadow-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                {t('selectCustomer')}
              </h4>
              <button
                type="button"
                onClick={() => setShowCustomerModal(false)}
                className="p-1 rounded-full text-gray-400 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Walk-in Button */}
            <button
              type="button"
              onClick={() => {
                setIsWalkIn(true);
                setSelectedCustomer(null);
                setShowCustomerModal(false);
              }}
              className="w-full py-2.5 px-3 bg-gray-100 hover:bg-gray-200 rounded-xl text-xs font-bold text-gray-800 text-left flex items-center justify-between"
            >
              <span>{t('walkInCustomer')}</span>
              {isWalkIn && <span className="text-xs text-kiryana-freshGreen">✓</span>}
            </button>

            {/* Customer Search & List */}
            <input
              type="text"
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              placeholder="Search customer name or phone..."
              className="w-full bg-kiryana-softBg border border-gray-200 rounded-xl p-2 text-xs"
            />

            <div className="max-h-44 overflow-y-auto divide-y divide-gray-100 space-y-1">
              {customers.map((c) => (
                <div
                  key={c._id}
                  onClick={() => {
                    setSelectedCustomer(c);
                    setIsWalkIn(false);
                    setShowCustomerModal(false);
                  }}
                  className="p-2 flex items-center justify-between hover:bg-kiryana-lightGreen/30 rounded-lg cursor-pointer"
                >
                  <div>
                    <span className="text-xs font-bold text-gray-900 block">{c.name}</span>
                    <span className="text-[10px] text-gray-500">{c.phone || 'No phone'}</span>
                  </div>
                  {c.balance > 0 && (
                    <span className="text-[10px] font-bold text-red-600">
                      Rs. {c.balance} (Udhaar)
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Quick Add Customer Sub-form */}
            <div className="border-t border-gray-100 pt-2 space-y-2">
              <span className="text-[10px] font-bold text-gray-500 block uppercase">
                + Quick Add Customer
              </span>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Customer Name"
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  className="bg-kiryana-softBg border border-gray-200 rounded-lg p-2 text-xs"
                />
                <input
                  type="text"
                  placeholder="Phone"
                  value={newCustomerPhone}
                  onChange={(e) => setNewCustomerPhone(e.target.value)}
                  className="bg-kiryana-softBg border border-gray-200 rounded-lg p-2 text-xs"
                />
              </div>
              <button
                type="button"
                onClick={handleCreateQuickCustomer}
                className="w-full py-2 bg-kiryana-freshGreen text-white text-xs font-bold rounded-xl"
              >
                Save & Select Customer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: INTEGRATED WEIGHT & QUANTITY CALCULATOR */}
      {weightCalcProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3 animate-fade-in">
          <div className="bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl border border-gray-100">
            {/* Header */}
            <div className="bg-kiryana-darkGreen text-white p-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-emerald-200 font-bold uppercase block">
                  Weight & Quantity Calculator (وزن اور قیمت)
                </span>
                <h4 className="text-sm font-bold truncate">{weightCalcProduct.name}</h4>
                {weightCalcProduct.nameUrdu && (
                  <p className="text-xs text-emerald-100 font-urdu">{weightCalcProduct.nameUrdu}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setWeightCalcProduct(null);
                  setWeightCalcEditingIndex(null);
                }}
                className="p-1 rounded-full text-white/80 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-3.5">
              {/* Rate List Base Price Display */}
              <div className="bg-emerald-50 border border-emerald-100 p-2.5 rounded-xl flex items-center justify-between text-xs">
                <span className="font-bold text-emerald-900">Rate List Price:</span>
                <span className="font-black font-mono text-emerald-950 text-sm">
                  Rs. {(weightCalcProduct.pricePerUnit || weightCalcProduct.sellingPrice || 0).toFixed(2)} / KG
                </span>
              </div>

              {/* Quick Preset Buttons */}
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
                  Quick Weight Presets (چٹکی ریٹ)
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {WEIGHT_PRESETS.map((preset, idx) => {
                    const isSelected =
                      (weightCalcUnitMode === 'gram'
                        ? Number(weightCalcCustomGrams)
                        : Number(weightCalcCustomGrams) * 1000) === preset.grams;
                    const price =
                      Math.round(
                        ((preset.grams / 1000) *
                          (weightCalcProduct.pricePerUnit || weightCalcProduct.sellingPrice || 0) +
                          Number.EPSILON) *
                          100
                      ) / 100;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setWeightCalcUnitMode('gram');
                          setWeightCalcCustomGrams(String(preset.grams));
                        }}
                        className={`p-2 rounded-xl border text-center transition-all ${
                          isSelected
                            ? 'bg-kiryana-freshGreen text-white border-kiryana-darkGreen shadow-sm scale-102'
                            : 'bg-kiryana-softBg border-gray-200 hover:border-emerald-300 text-gray-800'
                        }`}
                      >
                        <span className="text-xs font-bold block">{preset.label}</span>
                        <span
                          className={`text-[10px] font-mono block ${
                            isSelected ? 'text-white' : 'text-kiryana-darkGreen font-extrabold'
                          }`}
                        >
                          Rs. {price}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Weight Input */}
              <div className="bg-gray-50 p-3 rounded-2xl border border-gray-200 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-gray-700">Custom Weight:</span>
                  <div className="flex bg-gray-200 rounded-lg p-0.5 text-[10px]">
                    <button
                      type="button"
                      onClick={() => {
                        if (weightCalcUnitMode === 'kg') {
                          setWeightCalcCustomGrams(String((Number(weightCalcCustomGrams) || 0) * 1000));
                        }
                        setWeightCalcUnitMode('gram');
                      }}
                      className={`px-2 py-0.5 rounded-md font-bold ${
                        weightCalcUnitMode === 'gram'
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-600'
                      }`}
                    >
                      Gram (گرام)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (weightCalcUnitMode === 'gram') {
                          setWeightCalcCustomGrams(String((Number(weightCalcCustomGrams) || 0) / 1000));
                        }
                        setWeightCalcUnitMode('kg');
                      }}
                      className={`px-2 py-0.5 rounded-md font-bold ${
                        weightCalcUnitMode === 'kg'
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-600'
                      }`}
                    >
                      KG (کلو)
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    value={weightCalcCustomGrams}
                    onChange={(e) => setWeightCalcCustomGrams(e.target.value)}
                    placeholder={weightCalcUnitMode === 'gram' ? 'e.g. 750' : 'e.g. 0.75'}
                    className="w-full px-3 py-2 text-sm font-black font-mono bg-white border border-gray-300 rounded-xl outline-none focus:border-kiryana-freshGreen"
                    autoFocus
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-gray-400 font-bold uppercase">
                    {weightCalcUnitMode}
                  </span>
                </div>

                {/* Live Formula & Price */}
                {(() => {
                  const rawVal = Number(weightCalcCustomGrams) || 0;
                  const currentGrams = weightCalcUnitMode === 'kg' ? rawVal * 1000 : rawVal;
                  const baseP = Number(
                    weightCalcProduct.pricePerUnit || weightCalcProduct.sellingPrice || 0
                  );
                  const calc = calculateLinePrice({
                    pricePerUnit: baseP,
                    quantity: currentGrams,
                    unit: 'Gram',
                    unitType: 'weight',
                  });

                  return (
                    <div className="pt-1 border-t border-gray-200 flex items-center justify-between">
                      <span className="text-[10px] text-gray-500 font-mono">{calc.formulaText}</span>
                      <span className="text-base font-black font-mono text-kiryana-darkGreen">
                        Rs. {calc.lineTotal.toFixed(2)}
                      </span>
                    </div>
                  );
                })()}
              </div>

              {/* Action Button */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setWeightCalcProduct(null);
                    setWeightCalcEditingIndex(null);
                  }}
                  className="py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApplyWeightCalculator}
                  className="flex-1 py-2.5 px-4 bg-kiryana-freshGreen hover:bg-kiryana-darkGreen text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md active:scale-98 transition-all"
                >
                  <Check className="w-4 h-4" />
                  <span>{weightCalcEditingIndex !== null ? 'Update Cart Item' : 'Add to Cart'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </MobileAppShell>
  );
}
