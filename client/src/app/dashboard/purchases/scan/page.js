'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import MobileAppShell from '../../../../components/layout/MobileAppShell';
import { useLanguage } from '../../../../context/LanguageContext';
import { aiInvoiceApi, productApi } from '../../../../lib/api';
import {
  Camera,
  Upload,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Plus,
  RefreshCw,
  Sparkles,
  Layers,
  ArrowRight,
  PackageCheck,
  FileText,
} from 'lucide-react';

export default function AiScanPage() {
  const router = useRouter();
  const { t, language } = useLanguage();

  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [scanStep, setScanStep] = useState('upload'); // 'upload' | 'review' | 'success'
  const [error, setError] = useState('');

  // AI Extracted Review State
  const [invoiceData, setInvoiceData] = useState(null);
  const [items, setItems] = useState([]);
  const [supplierName, setSupplierName] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [notes, setNotes] = useState('');
  const [confirming, setConfirming] = useState(false);

  // Handle file selection (camera or gallery)
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newFiles = [...selectedFiles, ...files].slice(0, 5); // up to 5 images
    setSelectedFiles(newFiles);

    const newPreviews = newFiles.map((file) => URL.createObjectURL(file));
    setPreviews(newPreviews);
    setError('');
  };

  const removeFile = (idx) => {
    const newFiles = selectedFiles.filter((_, i) => i !== idx);
    setSelectedFiles(newFiles);
    const newPreviews = previews.filter((_, i) => i !== idx);
    setPreviews(newPreviews);
  };

  // Perform AI Scan
  const handleStartScan = async () => {
    if (selectedFiles.length === 0) {
      setError('Please take a photo or select an invoice image first');
      return;
    }

    setScanning(true);
    setError('');

    try {
      const formData = new FormData();
      selectedFiles.forEach((file) => {
        formData.append('invoiceImages', file);
      });

      const res = await aiInvoiceApi.scanInvoice(formData);

      if (res.success && res.data) {
        setInvoiceData(res.data);
        setSupplierName(res.data.supplierName || 'General Supplier');
        setInvoiceNumber(res.data.invoiceNumber || `INV-${Date.now().toString().slice(-6)}`);
        setInvoiceDate(res.data.invoiceDate || new Date().toISOString().split('T')[0]);
        setNotes(res.data.notes || '');
        setItems(res.data.items || []);
        setScanStep('review');
      } else {
        throw new Error(res.message || 'Failed to parse invoice');
      }
    } catch (err) {
      console.error('Scan error:', err);
      setError(err.message || 'AI OCR could not process image. Please try again with clear lighting.');
    } finally {
      setScanning(false);
    }
  };

  // Item Editing Helpers in Review Table
  const updateItem = (index, field, value) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index][field] = value;
      // Auto recalculate line total if qty or unit price changes
      if (field === 'quantity' || field === 'unitPrice') {
        const q = Number(field === 'quantity' ? value : copy[index].quantity) || 0;
        const p = Number(field === 'unitPrice' ? value : copy[index].unitPrice) || 0;
        copy[index].lineTotal = parseFloat((q * p).toFixed(2));
      }
      return copy;
    });
  };

  const removeItem = (index) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const addNewItem = () => {
    setItems((prev) => [
      ...prev,
      {
        tempId: `custom-${Date.now()}`,
        productName: 'New Item',
        quantity: 1,
        unit: 'KG',
        unitPrice: 100,
        lineTotal: 100,
        multiplier: 1,
        isMatch: false,
        needsReview: false,
      },
    ]);
  };

  // Recalculate totals
  const subtotal = items.reduce((sum, item) => sum + (Number(item.lineTotal) || 0), 0);
  const grandTotal = subtotal;

  // Confirm Purchase & Update Stock in MongoDB
  const handleConfirmPurchase = async () => {
    if (items.length === 0) {
      setError('Please add at least one line item');
      return;
    }

    setConfirming(true);
    setError('');

    try {
      const payload = {
        supplierName,
        invoiceNumber,
        purchaseDate: invoiceDate,
        items,
        subtotal,
        total: grandTotal,
        paymentStatus: 'paid',
        paidAmount: grandTotal,
        invoiceImageUrl: invoiceData?.primaryImageUrl || '',
        notes,
      };

      const res = await aiInvoiceApi.confirmPurchase(payload);

      if (res.success) {
        setScanStep('success');
      } else {
        throw new Error(res.message || 'Failed to confirm purchase');
      }
    } catch (err) {
      setError(err.message || 'Error confirming purchase');
    } finally {
      setConfirming(false);
    }
  };

  return (
    <MobileAppShell title={t('scanTitle')} showBack={true}>
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-start gap-2 mb-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* STEP 1: UPLOAD / CAMERA CAPTURE */}
      {scanStep === 'upload' && (
        <div className="space-y-4">
          {/* Main Info Card */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-card-soft text-center">
            <div className="w-14 h-14 rounded-2xl bg-kiryana-lightGreen text-kiryana-darkGreen mx-auto flex items-center justify-center mb-3">
              <Camera className="w-7 h-7" />
            </div>
            <h3 className="text-sm font-bold text-gray-900">{t('scanTitle')}</h3>
            <p className="text-xs text-gray-500 mt-1">{t('scanSubtitle')}</p>

            {/* Hidden Inputs */}
            <input
              type="file"
              ref={cameraInputRef}
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
            />
            <input
              type="file"
              ref={galleryInputRef}
              accept="image/*,application/pdf"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />

            {/* Primary Action Buttons */}
            <div className="grid grid-cols-2 gap-2.5 mt-5">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="flex items-center justify-center gap-1.5 bg-kiryana-darkGreen hover:bg-neutral-800 active:scale-98 text-white font-bold py-3 px-3 rounded-xl text-xs transition-all shadow-sm"
              >
                <Camera className="w-4 h-4 text-emerald-400" />
                <span>{t('takePicture')}</span>
              </button>

              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                className="flex items-center justify-center gap-1.5 bg-white border border-gray-300 hover:bg-gray-50 active:scale-98 text-gray-800 font-bold py-3 px-3 rounded-xl text-xs transition-all shadow-sm"
              >
                <Upload className="w-4 h-4 text-gray-600" />
                <span>{t('uploadImage')}</span>
              </button>
            </div>
          </div>

          {/* Selected Previews */}
          {previews.length > 0 && (
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-card-soft space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-gray-700">
                <span>Selected Invoice Pages ({previews.length})</span>
                <span className="text-[10px] text-gray-400">Max 5 pages</span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {previews.map((src, idx) => (
                  <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-gray-200 group">
                    <img src={src} alt={`Page ${idx + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeFile(idx)}
                      className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Scan Now CTA */}
              <button
                type="button"
                disabled={scanning}
                onClick={handleStartScan}
                className="w-full py-3.5 bg-kiryana-freshGreen hover:bg-kiryana-darkGreen active:scale-98 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-xs"
              >
                {scanning ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{t('scanningInProgress')}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Scan with AI & Extract Products</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* STEP 2: AI REVIEW SCREEN (Detailed Editable Table) */}
      {scanStep === 'review' && (
        <div className="space-y-4">
          {/* Invoice Meta Card */}
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-card-soft space-y-2.5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-kiryana-freshGreen" />
                <span>Invoice Details</span>
              </h3>
              <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full">
                AI Parsed
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="text-[10px] text-gray-500 block">{t('supplierName')}</label>
                <input
                  type="text"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  className="w-full bg-kiryana-softBg border border-gray-200 rounded-lg p-2 text-xs font-bold"
                />
              </div>

              <div>
                <label className="text-[10px] text-gray-500 block">{t('invoiceNumber')}</label>
                <input
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="w-full bg-kiryana-softBg border border-gray-200 rounded-lg p-2 text-xs font-mono font-bold"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] text-gray-500 block">{t('invoiceDate')}</label>
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="w-full bg-kiryana-softBg border border-gray-200 rounded-lg p-2 text-xs"
              />
            </div>
          </div>

          {/* Extracted Line Items Review Header */}
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
              <PackageCheck className="w-4 h-4 text-kiryana-freshGreen" />
              <span>{t('reviewExtractedItems')} ({items.length})</span>
            </h3>

            <button
              type="button"
              onClick={addNewItem}
              className="text-[11px] font-bold text-kiryana-freshGreen bg-kiryana-lightGreen px-2.5 py-1 rounded-lg flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Add Missing
            </button>
          </div>

          {/* Editable Items Cards */}
          <div className="space-y-2.5">
            {items.map((item, idx) => (
              <div
                key={item.tempId || idx}
                className="bg-white p-3 rounded-2xl border border-gray-100 shadow-card-soft space-y-2 relative"
              >
                {/* Match indicator pill */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {item.isMatch ? (
                      <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5">
                        <CheckCircle2 className="w-3 h-3" /> Matched: {item.matchedProductName}
                      </span>
                    ) : (
                      <span className="text-[9px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5">
                        <Sparkles className="w-3 h-3" /> {t('createNew')}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => removeItem(idx)}
                    className="text-gray-400 hover:text-red-600 p-1 rounded-lg"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Product Name Input */}
                <div>
                  <input
                    type="text"
                    value={item.productName}
                    onChange={(e) => updateItem(idx, 'productName', e.target.value)}
                    placeholder="Product Name"
                    className="w-full bg-kiryana-softBg border border-gray-200 rounded-lg p-2 text-xs font-bold text-gray-900"
                  />
                </div>

                {/* Grid for Qty, Unit, Unit Price, Line Total */}
                <div className="grid grid-cols-4 gap-1.5 text-center">
                  <div>
                    <label className="text-[9px] text-gray-400 block">Qty</label>
                    <input
                      type="number"
                      step="any"
                      value={item.quantity}
                      onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                      className="w-full bg-kiryana-softBg border border-gray-200 rounded-lg p-1.5 text-xs font-mono font-bold text-center"
                    />
                  </div>

                  <div>
                    <label className="text-[9px] text-gray-400 block">Unit</label>
                    <input
                      type="text"
                      value={item.unit}
                      onChange={(e) => updateItem(idx, 'unit', e.target.value)}
                      className="w-full bg-kiryana-softBg border border-gray-200 rounded-lg p-1.5 text-xs text-center font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-[9px] text-gray-400 block">Rate (Rs)</label>
                    <input
                      type="number"
                      step="any"
                      value={item.unitPrice}
                      onChange={(e) => updateItem(idx, 'unitPrice', e.target.value)}
                      className="w-full bg-kiryana-softBg border border-gray-200 rounded-lg p-1.5 text-xs font-mono font-bold text-center"
                    />
                  </div>

                  <div>
                    <label className="text-[9px] text-gray-400 block">Total (Rs)</label>
                    <div className="bg-kiryana-lightGreen/50 border border-emerald-200 rounded-lg p-1.5 text-xs font-mono font-black text-emerald-800">
                      {item.lineTotal}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Grand Total Summary Box */}
          <div className="bg-kiryana-darkGreen text-white p-4 rounded-2xl shadow-md">
            <div className="flex justify-between items-center text-xs text-kiryana-lightGreen">
              <span>Total Items:</span>
              <span>{items.length} Products</span>
            </div>
            <div className="flex justify-between items-center text-base font-black mt-1">
              <span>Invoice Grand Total:</span>
              <span>Rs. {grandTotal.toFixed(2)}</span>
            </div>
          </div>

          {/* Confirm Button */}
          <button
            type="button"
            disabled={confirming}
            onClick={handleConfirmPurchase}
            className="w-full py-3.5 bg-kiryana-freshGreen hover:bg-emerald-600 active:scale-98 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 text-xs"
          >
            {confirming ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Saving to MongoDB & Updating Stock...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>{t('confirmPurchaseBtn')}</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* STEP 3: SUCCESS STATE */}
      {scanStep === 'success' && (
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-card-soft text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <div>
            <h3 className="text-base font-black text-gray-900">Purchase Confirmed!</h3>
            <p className="text-xs text-gray-500 mt-1">
              All {items.length} products have been saved to MongoDB Atlas, and stock quantities have been updated.
            </p>
          </div>

          <div className="p-3 bg-kiryana-softBg rounded-xl text-xs space-y-1 text-left font-mono">
            <div className="flex justify-between">
              <span className="text-gray-500">Invoice:</span>
              <span className="font-bold">{invoiceNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Supplier:</span>
              <span className="font-bold">{supplierName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Grand Total:</span>
              <span className="font-bold text-emerald-700">Rs. {grandTotal.toFixed(2)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2">
            <button
              onClick={() => {
                setScanStep('upload');
                setSelectedFiles([]);
                setPreviews([]);
                setItems([]);
              }}
              className="py-3 px-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-xl text-xs"
            >
              Scan Another
            </button>
            <button
              onClick={() => router.push('/dashboard/products')}
              className="py-3 px-3 bg-kiryana-freshGreen text-white font-bold rounded-xl text-xs"
            >
              View Inventory →
            </button>
          </div>
        </div>
      )}
    </MobileAppShell>
  );
}
