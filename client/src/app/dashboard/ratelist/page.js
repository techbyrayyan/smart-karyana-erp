'use client';

import React, { useState, useEffect, useRef } from 'react';
import MobileAppShell from '../../../components/layout/MobileAppShell';
import { useLanguage } from '../../../context/LanguageContext';
import { rateListApi } from '../../../lib/api';
import LiveCameraCapture from '../../../components/camera/LiveCameraCapture';
import { WEIGHT_PRESETS, getWeightPriceBreakdown, calculateLinePrice } from '../../../lib/pricingCalculator';
import {
  Camera,
  Upload,
  FileText,
  Search,
  Filter,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  Clock,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  Scale,
  Package,
  History,
  Calculator,
  RefreshCw,
  Eye,
  Info,
} from 'lucide-react';

export default function RateListManagementPage() {
  const { t, language } = useLanguage();

  // Active top tab: 'view' | 'upload'
  const [activeTab, setActiveTab] = useState('view');

  // Products & Stats State
  const [products, setProducts] = useState([]);
  const [stats, setStats] = useState({ totalItems: 0, weightItems: 0, pieceItems: 0, lastUploadDate: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [unitTypeFilter, setUnitTypeFilter] = useState('all'); // 'all' | 'weight' | 'piece'

  // Image Upload & Scanning State
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [extractedItems, setExtractedItems] = useState([]);
  const [savingBatch, setSavingBatch] = useState(false);
  const fileInputRef = useRef(null);

  // Manual Inline Edit & Weight Modal
  const [editingProdId, setEditingProdId] = useState(null);
  const [editPriceVal, setEditPriceVal] = useState('');
  const [weightBreakdownProd, setWeightBreakdownProd] = useState(null);

  // Price History Modal
  const [historyProd, setHistoryProd] = useState(null);

  // Batch Upload History Modal
  const [showBatchHistory, setShowBatchHistory] = useState(false);
  const [batchHistory, setBatchHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Add Single Product Modal
  const [showAddSingleModal, setShowAddSingleModal] = useState(false);
  const [singleForm, setSingleForm] = useState({
    name: '',
    nameUrdu: '',
    variant: '',
    unit: '1 KG',
    unitType: 'weight',
    price: '',
    category: 'General Kiryana',
  });
  const [savingSingle, setSavingSingle] = useState(false);

  // Delete Product State
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deletingProduct, setDeletingProduct] = useState(false);

  // Fetch Rate List
  const fetchRateList = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await rateListApi.get({
        q: searchTerm,
        unitType: unitTypeFilter,
      });
      if (res.success) {
        setProducts(res.products || []);
        if (res.stats) setStats(res.stats);
      }
    } catch (err) {
      setError(err.message || 'Error fetching rate list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRateList();
  }, [unitTypeFilter]);

  // Debounced search
  useEffect(() => {
    const handler = setTimeout(() => {
      fetchRateList();
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Fetch Upload Batch History
  const fetchBatchHistory = async () => {
    try {
      setLoadingHistory(true);
      const res = await rateListApi.getHistory();
      if (res.success) {
        setBatchHistory(res.history || []);
      }
    } catch (err) {
      console.warn('Error fetching batch history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Image Compression helper
  const compressImage = async (file, maxWidth = 1600, quality = 0.85) => {
    if (!file.type || !file.type.startsWith('image/')) return file;
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new window.Image();
        img.onload = () => {
          let width = img.width;
          let height = img.height;
          if (width > maxWidth || height > maxWidth) {
            if (width > height) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            } else {
              width = Math.round((width * maxWidth) / height);
              height = maxWidth;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name || 'image.jpg', {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              } else {
                resolve(file);
              }
            },
            'image/jpeg',
            quality
          );
        };
        img.onerror = () => resolve(file);
        img.src = e.target.result;
      };
      reader.onerror = () => resolve(file);
      reader.readAsDataURL(file);
    });
  };

  // Handle Gallery / File selection
  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const compressed = await Promise.all(files.map((f) => compressImage(f)));
    const newFiles = [...selectedFiles, ...compressed].slice(0, 3);
    setSelectedFiles(newFiles);
    setPreviews(newFiles.map((f) => URL.createObjectURL(f)));
    setError('');
  };

  // Handle Live Camera Snapshot
  const handleLiveCapture = async (file) => {
    const compressed = await compressImage(file);
    const newFiles = [...selectedFiles, compressed].slice(0, 3);
    setSelectedFiles(newFiles);
    setPreviews(newFiles.map((f) => URL.createObjectURL(f)));
    setError('');
  };

  const removeFile = (idx) => {
    const newFiles = selectedFiles.filter((_, i) => i !== idx);
    setSelectedFiles(newFiles);
    setPreviews(newFiles.map((f) => URL.createObjectURL(f)));
  };

  // Perform AI Scan
  const handleScanRateList = async () => {
    if (selectedFiles.length === 0) {
      setError('Please capture or select a rate list image first.');
      return;
    }

    setScanning(true);
    setError('');
    setSuccessMsg('');

    try {
      const formData = new FormData();
      selectedFiles.forEach((file) => {
        formData.append('images', file);
      });

      const res = await rateListApi.scan(formData);
      if (res.success && res.data) {
        setScanResult(res.data);
        setExtractedItems(res.data.items || []);
        setSuccessMsg(`Extracted ${res.data.totalExtracted || 0} items from Rate List. Please review and confirm.`);
      }
    } catch (err) {
      setError(err.message || 'Error scanning rate list with AI. Please try again.');
    } finally {
      setScanning(false);
    }
  };

  // Update an extracted item in the review table
  const updateExtractedItem = (index, field, value) => {
    setExtractedItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // Remove an item from the review table
  const removeExtractedItem = (index) => {
    setExtractedItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Add a manual row to the review table
  const addExtractedItemRow = () => {
    setExtractedItems((prev) => [
      ...prev,
      {
        tempId: `manual-row-${Date.now()}`,
        productName: '',
        productNameUrdu: '',
        variant: '',
        unit: '1 KG',
        unitType: 'weight',
        price: 0,
        category: 'General Kiryana',
        isExisting: false,
        status: 'new',
        needsReview: false,
      },
    ]);
  };

  // Confirm and Save Rate List to DB
  const handleConfirmRateList = async () => {
    if (extractedItems.length === 0) {
      setError('No items to save.');
      return;
    }

    const validItems = extractedItems.filter((it) => it.productName?.trim() || it.productNameUrdu?.trim());
    if (validItems.length === 0) {
      setError('Please enter at least one valid product name.');
      return;
    }

    const newCount = validItems.filter((it) => !it.isExisting).length;
    const updateCount = validItems.filter((it) => it.isExisting && it.priceChanged).length;

    const confirmMsg = `Are you sure you want to save this Rate List?\n• ${newCount} new products will be assigned unique sequential IDs.\n• ${updateCount} existing product prices will be updated.\n• Unmentioned products will remain unchanged.`;
    if (!window.confirm(confirmMsg)) return;

    setSavingBatch(true);
    setError('');
    setSuccessMsg('');

    try {
      const payload = {
        title: scanResult?.title || 'Kiryana Rate List Update',
        source: 'ai_scan',
        items: validItems,
      };

      const res = await rateListApi.confirm(payload);
      if (res.success) {
        setSuccessMsg(res.message);
        // Reset upload state
        setSelectedFiles([]);
        setPreviews([]);
        setScanResult(null);
        setExtractedItems([]);
        setActiveTab('view');
        fetchRateList();
      }
    } catch (err) {
      setError(err.message || 'Error saving rate list changes.');
    } finally {
      setSavingBatch(false);
    }
  };

  // Inline Quick Price Edit
  const handleStartEdit = (prod) => {
    setEditingProdId(prod._id);
    setEditPriceVal(String(prod.pricePerUnit || prod.salePrice || 0));
  };

  const handleSaveInlineEdit = async (prod) => {
    const numPrice = Number(editPriceVal);
    if (isNaN(numPrice) || numPrice < 0) {
      alert('Please enter a valid price.');
      return;
    }

    try {
      const res = await rateListApi.updatePrice(prod._id, numPrice);
      if (res.success) {
        setEditingProdId(null);
        fetchRateList();
      }
    } catch (err) {
      alert(err.message || 'Error updating price');
    }
  };

  // Add Single Product Submit
  const handleAddSingleProduct = async (e) => {
    e.preventDefault();
    if (!singleForm.name.trim()) {
      alert('Product name is required.');
      return;
    }

    setSavingSingle(true);
    try {
      const res = await rateListApi.createProduct(singleForm);
      if (res.success) {
        setShowAddSingleModal(false);
        setSingleForm({
          name: '',
          nameUrdu: '',
          variant: '',
          unit: '1 KG',
          unitType: 'weight',
          price: '',
          category: 'General Kiryana',
        });
        fetchRateList();
        setSuccessMsg(res.message);
      }
    } catch (err) {
      alert(err.message || 'Error adding product');
    } finally {
      setSavingSingle(false);
    }
  };

  // Delete Product from Rate List
  const handleDeleteProduct = async () => {
    if (!deleteTarget) return;
    setDeletingProduct(true);
    setError('');
    try {
      const res = await rateListApi.deleteProduct(deleteTarget._id);
      if (res.success) {
        setSuccessMsg(`"${deleteTarget.name}" deleted from rate list successfully.`);
        setProducts((prev) => prev.filter((p) => p._id !== deleteTarget._id));
        setStats((prev) => ({
          ...prev,
          totalItems: Math.max(0, prev.totalItems - 1),
          weightItems: deleteTarget.unitType === 'weight' ? Math.max(0, prev.weightItems - 1) : prev.weightItems,
          pieceItems: deleteTarget.unitType !== 'weight' ? Math.max(0, prev.pieceItems - 1) : prev.pieceItems,
        }));
        setDeleteTarget(null);
      } else {
        setError(res.message || 'Failed to delete product');
      }
    } catch (err) {
      setError(err.message || 'Error deleting product');
    } finally {
      setDeletingProduct(false);
    }
  };

  return (
    <MobileAppShell title="Rate List Management">
      {/* Top Tabs */}
      <div className="bg-white rounded-2xl p-1.5 shadow-card-soft border border-gray-100 flex gap-1 mb-3">
        <button
          type="button"
          onClick={() => setActiveTab('view')}
          className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'view'
              ? 'bg-kiryana-darkGreen text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Eye className="w-4 h-4" />
          <span>View / Update Rate List</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('upload')}
          className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'upload'
              ? 'bg-kiryana-darkGreen text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Upload className="w-4 h-4" />
          <span>Upload Rate List</span>
        </button>
      </div>

      {/* Global Alerts */}
      {error && (
        <div className="mb-3 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-start gap-2 shadow-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{error}</div>
          <button onClick={() => setError('')} className="text-red-500 hover:text-red-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="mb-3 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-start gap-2 shadow-sm">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-600" />
          <div className="flex-1 font-bold">{successMsg}</div>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-500 hover:text-emerald-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 1: VIEW & UPDATE RATE LIST                                 */}
      {/* ============================================================== */}
      {activeTab === 'view' && (
        <div className="space-y-3">
          {/* Summary Stats Card */}
          <div className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-card-soft">
            <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-100">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                  Active Products in Rate List
                </span>
                <span className="text-lg font-black text-kiryana-darkGreen font-mono">
                  {stats.totalItems} Products
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    fetchBatchHistory();
                    setShowBatchHistory(true);
                  }}
                  className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-[11px] font-bold flex items-center gap-1 transition-colors"
                  title="Upload History"
                >
                  <History className="w-3.5 h-3.5 text-gray-500" />
                  <span>History</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowAddSingleModal(true)}
                  className="px-2.5 py-1.5 bg-kiryana-freshGreen hover:bg-kiryana-darkGreen text-white rounded-xl text-[11px] font-bold flex items-center gap-1 transition-colors shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Product</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-emerald-50/70 p-2 rounded-xl">
                <span className="text-[10px] text-emerald-800 block font-medium">Weight-Based</span>
                <span className="font-black text-emerald-900 font-mono">{stats.weightItems} (KG/Gram)</span>
              </div>
              <div className="bg-blue-50/70 p-2 rounded-xl">
                <span className="text-[10px] text-blue-800 block font-medium">Piece-Based</span>
                <span className="font-black text-blue-900 font-mono">{stats.pieceItems} (Pieces)</span>
              </div>
              <div className="bg-amber-50/70 p-2 rounded-xl">
                <span className="text-[10px] text-amber-800 block font-medium">Last Updated</span>
                <span className="font-bold text-amber-900 text-[10px] truncate block">
                  {stats.lastUploadDate ? new Date(stats.lastUploadDate).toLocaleDateString() : 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* Search & Unit Filter */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3 rtl:left-auto rtl:right-3" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by Product ID (#1), Name, or Urdu..."
                className="w-full pl-9 pr-3 py-2.5 bg-white border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-kiryana-freshGreen focus:border-transparent outline-none shadow-sm rtl:pl-3 rtl:pr-9"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 rtl:right-auto rtl:left-3"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs">
              <button
                type="button"
                onClick={() => setUnitTypeFilter('all')}
                className={`px-3 py-1.5 rounded-full font-bold whitespace-nowrap transition-all ${
                  unitTypeFilter === 'all'
                    ? 'bg-kiryana-darkGreen text-white shadow-sm'
                    : 'bg-white text-gray-600 border border-gray-200'
                }`}
              >
                All ({stats.totalItems})
              </button>
              <button
                type="button"
                onClick={() => setUnitTypeFilter('weight')}
                className={`px-3 py-1.5 rounded-full font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
                  unitTypeFilter === 'weight'
                    ? 'bg-emerald-700 text-white shadow-sm'
                    : 'bg-white text-gray-600 border border-gray-200'
                }`}
              >
                <Scale className="w-3 h-3" />
                <span>Weight-Based ({stats.weightItems})</span>
              </button>
              <button
                type="button"
                onClick={() => setUnitTypeFilter('piece')}
                className={`px-3 py-1.5 rounded-full font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
                  unitTypeFilter === 'piece'
                    ? 'bg-blue-700 text-white shadow-sm'
                    : 'bg-white text-gray-600 border border-gray-200'
                }`}
              >
                <Package className="w-3 h-3" />
                <span>Piece-Based ({stats.pieceItems})</span>
              </button>
            </div>
          </div>

          {/* Product Cards List */}
          {loading ? (
            <div className="py-12 text-center text-gray-400 text-xs">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-kiryana-freshGreen" />
              <span>Loading Rate List products...</span>
            </div>
          ) : products.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border border-gray-100 text-center space-y-3">
              <Scale className="w-10 h-10 text-gray-300 mx-auto" />
              <p className="text-xs font-bold text-gray-600">No products found in Rate List</p>
              <p className="text-[11px] text-gray-400 max-w-xs mx-auto">
                Upload your rate list photo using Camera or Gallery, or add products manually.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('upload')}
                className="py-2 px-4 bg-kiryana-freshGreen text-white font-bold text-xs rounded-xl shadow-sm hover:bg-kiryana-darkGreen transition-colors"
              >
                Upload Rate List Now
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {products.map((prod) => {
                const isWeight = prod.unitType === 'weight';
                const currentPrice = prod.pricePerUnit || prod.salePrice || 0;
                const isEditing = editingProdId === prod._id;

                return (
                  <div
                    key={prod._id}
                    className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-card-soft transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      {/* Left: Product ID badge, Name, Urdu & Unit */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          {/* Permanent Monotonic Product ID */}
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-700 font-mono font-black text-[10px] rounded-md border border-gray-200">
                            ID #{prod.productId || '—'}
                          </span>

                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                              isWeight ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {isWeight ? 'Weight' : 'Piece'}
                          </span>

                          <span className="text-[10px] text-gray-400 truncate">
                            {prod.category || 'General'}
                          </span>
                        </div>

                        <h4 className="text-xs font-bold text-gray-900 truncate">
                          {prod.name}
                          {prod.variant ? ` (${prod.variant})` : ''}
                        </h4>

                        {prod.nameUrdu && (
                          <p className="text-xs text-gray-600 font-urdu mt-0.5 truncate">{prod.nameUrdu}</p>
                        )}

                        <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-400">
                          <span>Unit: {prod.unit || (isWeight ? 'KG' : 'Piece')}</span>
                          {prod.lastRateListUpdate && (
                            <span>• Updated: {new Date(prod.lastRateListUpdate).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>

                      {/* Right: Price & Inline Edit */}
                      <div className="text-right flex-shrink-0">
                        <span className="text-[9px] text-gray-400 uppercase font-bold block">Rate List Price</span>

                        {isEditing ? (
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="text-xs font-bold text-gray-500">Rs.</span>
                            <input
                              type="number"
                              value={editPriceVal}
                              onChange={(e) => setEditPriceVal(e.target.value)}
                              className="w-20 px-2 py-1 text-xs font-mono font-black border border-kiryana-freshGreen rounded-lg outline-none"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveInlineEdit(prod)}
                              className="p-1 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                              title="Save"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingProdId(null)}
                              className="p-1 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                              title="Cancel"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 justify-end">
                            <span className="text-sm font-black font-mono text-kiryana-darkGreen">
                              Rs. {currentPrice.toFixed(2)}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleStartEdit(prod)}
                              className="p-1 text-gray-400 hover:text-kiryana-darkGreen rounded-md hover:bg-gray-100 transition-colors"
                              title="Quick Edit Price"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(prod)}
                              className="p-1 text-gray-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors"
                              title="Delete from Rate List"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}

                        <span className="text-[10px] text-gray-500 block mt-0.5">
                          per {isWeight ? 'KG' : prod.unit || 'Piece'}
                        </span>
                      </div>
                    </div>

                    {/* Bottom Actions: Weight Calculator Breakdown & History */}
                    <div className="mt-2.5 pt-2 border-t border-gray-100 flex items-center justify-between text-[11px]">
                      {isWeight ? (
                        <button
                          type="button"
                          onClick={() => setWeightBreakdownProd(prod)}
                          className="font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg transition-colors"
                        >
                          <Calculator className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Weight Rates (500g, 250g...)</span>
                        </button>
                      ) : (
                        <span className="text-[10px] text-gray-400">Sold per unit piece</span>
                      )}

                      <button
                        type="button"
                        onClick={() => setHistoryProd(prod)}
                        className="text-gray-500 hover:text-gray-900 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors font-medium text-[10px]"
                      >
                        <Clock className="w-3 h-3 text-gray-400" />
                        <span>Price History ({prod.priceHistory?.length || 1})</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: UPLOAD & AI RATE LIST EXTRACTION                        */}
      {/* ============================================================== */}
      {activeTab === 'upload' && (
        <div className="space-y-4">
          {/* Header Instruction Card */}
          <div className="bg-gradient-to-br from-emerald-900 to-kiryana-darkGreen text-white p-4 rounded-2xl shadow-md">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-5 h-5 text-kiryana-lightGreen" />
              <h3 className="text-sm font-bold tracking-wide">AI Rate List Scanner</h3>
            </div>
            <p className="text-xs text-emerald-100 leading-relaxed">
              Upload or snap a photo of your rate list (Urdu, English, handwritten, or official bulletin). AI will
              read products, units, and prices, and assign unique IDs automatically.
            </p>
          </div>

          {/* Upload Method Buttons */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setIsCameraOpen(true)}
              className="p-4 bg-white border border-gray-200 rounded-2xl flex flex-col items-center justify-center gap-2 shadow-card-soft active:scale-98 transition-all hover:border-kiryana-freshGreen group"
            >
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <Camera className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold text-gray-800">Take Picture</span>
              <span className="text-[10px] text-gray-400">Live Mobile Camera</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-4 bg-white border border-gray-200 rounded-2xl flex flex-col items-center justify-center gap-2 shadow-card-soft active:scale-98 transition-all hover:border-kiryana-freshGreen group"
            >
              <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <Upload className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold text-gray-800">Upload Photo / Doc</span>
              <span className="text-[10px] text-gray-400">Mobile Gallery / Files</span>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* Previews & Scan CTA */}
          {previews.length > 0 && (
            <div className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-card-soft space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-700">Selected Rate List Pages ({previews.length})</span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFiles([]);
                    setPreviews([]);
                    setScanResult(null);
                    setExtractedItems([]);
                  }}
                  className="text-[11px] text-red-500 hover:text-red-700 font-bold"
                >
                  Clear All
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {previews.map((src, idx) => (
                  <div key={idx} className="relative rounded-xl overflow-hidden border border-gray-200 aspect-square">
                    <img src={src} alt={`Page ${idx + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeFile(idx)}
                      className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full shadow-sm hover:bg-red-700"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Scan Trigger Button */}
              <button
                type="button"
                onClick={handleScanRateList}
                disabled={scanning}
                className="w-full py-3 bg-kiryana-freshGreen hover:bg-kiryana-darkGreen text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-md active:scale-98 transition-all disabled:opacity-50"
              >
                {scanning ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>AI Analyzing Rate List... (2-4s)</span>
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

          {/* Extracted Review & Correction Table */}
          {extractedItems.length > 0 && (
            <div className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-card-soft space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                <div>
                  <h4 className="text-xs font-bold text-gray-900">Review & Verify Rate List Items</h4>
                  <p className="text-[10px] text-gray-400">
                    Verify and correct product names and prices before saving to the database.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={addExtractedItemRow}
                  className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-[10px] font-bold flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Row</span>
                </button>
              </div>

              {/* Extraction Badges Summary */}
              <div className="flex gap-2 text-[10px]">
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md font-bold">
                  {extractedItems.filter((it) => !it.isExisting).length} New Products (Unique IDs)
                </span>
                <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-md font-bold">
                  {extractedItems.filter((it) => it.isExisting && it.priceChanged).length} Price Updates
                </span>
                <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-md font-bold">
                  {extractedItems.filter((it) => it.isExisting && !it.priceChanged).length} Unchanged
                </span>
              </div>

              {/* Editable Items List */}
              <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
                {extractedItems.map((item, index) => {
                  return (
                    <div
                      key={item.tempId || index}
                      className={`p-2.5 rounded-xl border transition-all ${
                        item.needsReview
                          ? 'border-amber-300 bg-amber-50/50'
                          : item.isExisting
                          ? 'border-blue-200 bg-blue-50/30'
                          : 'border-emerald-200 bg-emerald-50/30'
                      }`}
                    >
                      {/* Top Row: Match Status Badge & Delete Row */}
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5">
                          {item.isExisting ? (
                            <span className="px-2 py-0.5 bg-blue-600 text-white text-[9px] font-bold rounded-md font-mono">
                              Existing ID #{item.matchedDisplayId || '—'}
                              {item.priceChanged ? ' (Price Changed)' : ''}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-emerald-600 text-white text-[9px] font-bold rounded-md">
                              New Product (Auto ID)
                            </span>
                          )}

                          {item.needsReview && (
                            <span className="px-1.5 py-0.5 bg-amber-500 text-white text-[8px] font-bold rounded">
                              Check Price
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => removeExtractedItem(index)}
                          className="text-red-400 hover:text-red-600 p-0.5"
                          title="Remove item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Inputs Row 1: Product Name & Urdu Name */}
                      <div className="grid grid-cols-2 gap-1.5 mb-1.5">
                        <div>
                          <label className="text-[9px] font-bold text-gray-500 block">Name (English/Roman)</label>
                          <input
                            type="text"
                            value={item.productName || ''}
                            onChange={(e) => updateExtractedItem(index, 'productName', e.target.value)}
                            placeholder="e.g. Super Karnal Rice"
                            className="w-full px-2 py-1 text-xs bg-white border border-gray-200 rounded-lg outline-none font-medium"
                          />
                        </div>

                        <div>
                          <label className="text-[9px] font-bold text-gray-500 block">Urdu Name</label>
                          <input
                            type="text"
                            value={item.productNameUrdu || ''}
                            onChange={(e) => updateExtractedItem(index, 'productNameUrdu', e.target.value)}
                            placeholder="اردو نام"
                            className="w-full px-2 py-1 text-xs bg-white border border-gray-200 rounded-lg outline-none font-urdu"
                          />
                        </div>
                      </div>

                      {/* Inputs Row 2: Unit Type Toggle, Unit & Price */}
                      <div className="grid grid-cols-3 gap-1.5">
                        {/* Unit Type */}
                        <div>
                          <label className="text-[9px] font-bold text-gray-500 block">Pricing Type</label>
                          <select
                            value={item.unitType || 'weight'}
                            onChange={(e) => {
                              const newType = e.target.value;
                              updateExtractedItem(index, 'unitType', newType);
                              if (newType === 'weight' && !item.unit.includes('KG')) {
                                updateExtractedItem(index, 'unit', '1 KG');
                              } else if (newType === 'piece' && item.unit.includes('KG')) {
                                updateExtractedItem(index, 'unit', '1 Piece');
                              }
                            }}
                            className="w-full px-1.5 py-1 text-xs bg-white border border-gray-200 rounded-lg outline-none font-bold"
                          >
                            <option value="weight">Weight (وزن)</option>
                            <option value="piece">Piece (پیس)</option>
                          </select>
                        </div>

                        {/* Unit label */}
                        <div>
                          <label className="text-[9px] font-bold text-gray-500 block">Selling Unit</label>
                          <input
                            type="text"
                            value={item.unit || ''}
                            onChange={(e) => updateExtractedItem(index, 'unit', e.target.value)}
                            placeholder="1 KG / 1 Piece"
                            className="w-full px-2 py-1 text-xs bg-white border border-gray-200 rounded-lg outline-none font-medium"
                          />
                        </div>

                        {/* Price */}
                        <div>
                          <label className="text-[9px] font-bold text-gray-500 block">Price (Rs.)</label>
                          <div className="relative">
                            <input
                              type="number"
                              value={item.price !== undefined ? item.price : ''}
                              onChange={(e) => updateExtractedItem(index, 'price', Number(e.target.value) || 0)}
                              placeholder="0"
                              className={`w-full px-2 py-1 text-xs bg-white border rounded-lg outline-none font-mono font-black ${
                                item.price <= 0 ? 'border-red-400 bg-red-50/50' : 'border-gray-200'
                              }`}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Previous Price note if existing */}
                      {item.isExisting && item.currentPrice !== null && (
                        <div className="mt-1 text-[10px] text-gray-500 flex items-center justify-between">
                          <span>
                            Current DB Price: <b className="font-mono">Rs. {item.currentPrice.toFixed(2)}</b>
                          </span>
                          {item.priceChanged && (
                            <span className="text-emerald-700 font-bold flex items-center gap-0.5">
                              <TrendingUp className="w-3 h-3" />
                              Will update to Rs. {item.price}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Confirm & Save Button */}
              <div className="pt-2 border-t border-gray-100 flex gap-2">
                <button
                  type="button"
                  onClick={() => setExtractedItems([])}
                  className="py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition-colors"
                >
                  Discard
                </button>

                <button
                  type="button"
                  onClick={handleConfirmRateList}
                  disabled={savingBatch}
                  className="flex-1 py-2.5 px-4 bg-kiryana-freshGreen hover:bg-kiryana-darkGreen text-white font-bold text-xs rounded-xl shadow-md active:scale-98 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {savingBatch ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Saving to Database...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 stroke-[2.5]" />
                      <span>Confirm & Save Rate List ({extractedItems.length} Items)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 1: WEIGHT BREAKDOWN CALCULATOR POPUP                     */}
      {/* ============================================================== */}
      {weightBreakdownProd && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl border border-gray-100">
            {/* Modal Header */}
            <div className="bg-kiryana-darkGreen text-white p-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-emerald-200 font-bold uppercase block">
                  Product ID #{weightBreakdownProd.productId} • Weight Pricing
                </span>
                <h3 className="text-sm font-bold truncate">{weightBreakdownProd.name}</h3>
                {weightBreakdownProd.nameUrdu && (
                  <p className="text-xs text-emerald-100 font-urdu">{weightBreakdownProd.nameUrdu}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setWeightBreakdownProd(null)}
                className="p-1 rounded-full text-white/80 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Base Rate */}
            <div className="p-3 bg-emerald-50 border-b border-emerald-100 flex items-center justify-between text-xs">
              <span className="font-bold text-emerald-900">Base Price (1 KG):</span>
              <span className="font-black font-mono text-emerald-950 text-sm">
                Rs. {(weightBreakdownProd.pricePerUnit || weightBreakdownProd.salePrice || 0).toFixed(2)}
              </span>
            </div>

            {/* Presets Table */}
            <div className="p-3 divide-y divide-gray-100 max-h-72 overflow-y-auto text-xs">
              {getWeightPriceBreakdown(weightBreakdownProd.pricePerUnit || weightBreakdownProd.salePrice || 0).map(
                (preset, i) => (
                  <div key={i} className="py-2 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-gray-800">{preset.label}</span>
                      <span className="text-[10px] text-gray-500 font-urdu block">{preset.urdu}</span>
                    </div>
                    <span className="font-black font-mono text-kiryana-darkGreen text-xs">
                      Rs. {preset.price.toFixed(2)}
                    </span>
                  </div>
                )
              )}
            </div>

            <div className="p-3 bg-gray-50 text-center">
              <button
                type="button"
                onClick={() => setWeightBreakdownProd(null)}
                className="w-full py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold text-xs rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: PRODUCT PRICE HISTORY POPUP                           */}
      {/* ============================================================== */}
      {historyProd && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl border border-gray-100">
            <div className="bg-kiryana-darkGreen text-white p-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-emerald-200 font-bold uppercase block">
                  Product ID #{historyProd.productId} • Price History
                </span>
                <h3 className="text-sm font-bold truncate">{historyProd.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setHistoryProd(null)}
                className="p-1 rounded-full text-white/80 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 divide-y divide-gray-100 max-h-72 overflow-y-auto text-xs">
              {!historyProd.priceHistory || historyProd.priceHistory.length === 0 ? (
                <p className="text-center text-gray-400 py-4">No price history recorded yet.</p>
              ) : (
                historyProd.priceHistory
                  .slice()
                  .reverse()
                  .map((rec, i) => (
                    <div key={i} className="py-2.5">
                      <div className="flex items-center justify-between">
                        <span className="font-black font-mono text-xs text-kiryana-darkGreen">
                          Rs. {rec.newPrice}
                        </span>
                        <span className="text-[10px] text-gray-400 font-mono">
                          {rec.changedAt ? new Date(rec.changedAt).toLocaleString() : 'N/A'}
                        </span>
                      </div>
                      <div className="text-[10px] text-gray-500 mt-0.5 flex items-center justify-between">
                        <span>Previous: Rs. {rec.previousPrice}</span>
                        <span className="capitalize">{rec.source || 'update'}</span>
                      </div>
                      {rec.note && <p className="text-[9px] text-gray-400 italic mt-0.5">{rec.note}</p>}
                    </div>
                  ))
              )}
            </div>

            <div className="p-3 bg-gray-50 text-center">
              <button
                type="button"
                onClick={() => setHistoryProd(null)}
                className="w-full py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold text-xs rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 3: UPLOAD BATCH HISTORY POPUP                            */}
      {/* ============================================================== */}
      {showBatchHistory && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-gray-100">
            <div className="bg-kiryana-darkGreen text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-emerald-200" />
                <h3 className="text-sm font-bold">Rate List Upload History</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowBatchHistory(false)}
                className="p-1 rounded-full text-white/80 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 divide-y divide-gray-100 max-h-80 overflow-y-auto text-xs">
              {loadingHistory ? (
                <div className="py-6 text-center text-gray-400">Loading history...</div>
              ) : batchHistory.length === 0 ? (
                <div className="py-6 text-center text-gray-400">No rate list uploads recorded yet.</div>
              ) : (
                batchHistory.map((batch) => (
                  <div key={batch._id} className="py-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-gray-900">Upload #{batch.uploadNumber}</span>
                      <span className="text-[10px] text-gray-400 font-mono">
                        {new Date(batch.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-[10px]">
                      <span className="text-emerald-700 font-bold">+{batch.newProductsCount} New</span>
                      <span className="text-amber-700 font-bold">{batch.updatedPricesCount} Updated</span>
                      <span className="text-gray-500">{batch.unchangedPricesCount} Unchanged</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-3 bg-gray-50 text-center">
              <button
                type="button"
                onClick={() => setShowBatchHistory(false)}
                className="w-full py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold text-xs rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 4: ADD SINGLE PRODUCT MODAL                              */}
      {/* ============================================================== */}
      {showAddSingleModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl border border-gray-100">
            <div className="bg-kiryana-darkGreen text-white p-4 flex items-center justify-between">
              <h3 className="text-sm font-bold">Add Product to Rate List</h3>
              <button
                type="button"
                onClick={() => setShowAddSingleModal(false)}
                className="p-1 rounded-full text-white/80 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSingleProduct} className="p-4 space-y-3">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Product Name (English / Roman) *</label>
                <input
                  type="text"
                  required
                  value={singleForm.name}
                  onChange={(e) => setSingleForm({ ...singleForm, name: e.target.value })}
                  placeholder="e.g. Super Karnal Basmati Rice"
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl outline-none focus:border-kiryana-freshGreen"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Urdu Name</label>
                <input
                  type="text"
                  value={singleForm.nameUrdu}
                  onChange={(e) => setSingleForm({ ...singleForm, nameUrdu: e.target.value })}
                  placeholder="اردو نام"
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl outline-none font-urdu"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Variant</label>
                  <input
                    type="text"
                    value={singleForm.variant}
                    onChange={(e) => setSingleForm({ ...singleForm, variant: e.target.value })}
                    placeholder="e.g. Tota, Sella"
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Pricing Type</label>
                  <select
                    value={singleForm.unitType}
                    onChange={(e) => {
                      const uType = e.target.value;
                      setSingleForm({
                        ...singleForm,
                        unitType: uType,
                        unit: uType === 'weight' ? '1 KG' : '1 Piece',
                      });
                    }}
                    className="w-full px-2 py-2 text-xs border border-gray-200 rounded-xl outline-none font-bold"
                  >
                    <option value="weight">Weight (وزن)</option>
                    <option value="piece">Piece (پیس)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Selling Unit</label>
                  <input
                    type="text"
                    value={singleForm.unit}
                    onChange={(e) => setSingleForm({ ...singleForm, unit: e.target.value })}
                    placeholder="1 KG / 1 Piece"
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Price (Rs.) *</label>
                  <input
                    type="number"
                    required
                    value={singleForm.price}
                    onChange={(e) => setSingleForm({ ...singleForm, price: e.target.value })}
                    placeholder="0"
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl outline-none font-mono font-bold"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddSingleModal(false)}
                  className="py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingSingle}
                  className="flex-1 py-2.5 px-4 bg-kiryana-freshGreen hover:bg-kiryana-darkGreen text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1"
                >
                  {savingSingle ? 'Saving...' : 'Save Product (Auto ID)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white w-full max-w-sm rounded-3xl p-5 shadow-2xl border border-gray-100 space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h4 className="text-sm font-bold text-gray-900">Delete Product from Rate List?</h4>
              <p className="text-xs text-gray-500">
                Kya aap <strong className="text-gray-800">"{deleteTarget.name}"</strong>{' '}
                {deleteTarget.productId ? `(ID #${deleteTarget.productId})` : ''} ko Rate List se delete karna chahte hain?
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                disabled={deletingProduct}
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingProduct}
                onClick={handleDeleteProduct}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors flex items-center justify-center gap-1.5"
              >
                {deletingProduct ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Product</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Live Camera Modal */}
      <LiveCameraCapture
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={handleLiveCapture}
      />
    </MobileAppShell>
  );
}
