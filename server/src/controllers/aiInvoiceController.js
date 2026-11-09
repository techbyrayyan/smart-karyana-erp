const path = require('path');
const { parseInvoiceImage } = require('../services/aiOcrService');
const { addPurchaseStock } = require('../services/stockService');
const Purchase = require('../models/Purchase');
const Supplier = require('../models/Supplier');
const AuditLog = require('../models/AuditLog');

// 1. Process uploaded image(s) with AI OCR and return review draft
exports.scanInvoice = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide at least one invoice image / برائے مہربانی رسید کی تصویر اپلوڈ کریں',
      });
    }

    const filePaths = req.files.map(file => file.path);
    const imageUrls = req.files.map(file => `/uploads/${file.filename}`);

    // Call Gemini OCR Vision service
    const extractedData = await parseInvoiceImage(filePaths);

    res.json({
      success: true,
      message: 'Invoice parsed successfully / رسید سے معلومات کامیابی سے حاصل ہو گئیں',
      data: {
        ...extractedData,
        imageUrls,
        primaryImageUrl: imageUrls[0] || '',
      },
    });
  } catch (error) {
    console.error('Invoice OCR error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to extract data from invoice image: ' + error.message,
      error: error.message,
    });
  }
};

// 2. Confirm reviewed purchase and update MongoDB stock atomically
exports.confirmPurchase = async (req, res) => {
  try {
    const {
      supplierName,
      supplierId,
      invoiceNumber,
      purchaseDate,
      items,
      subtotal,
      tax,
      discount,
      total,
      paymentStatus,
      paidAmount,
      invoiceImageUrl,
      notes,
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No purchase items provided / رسید میں کوئی آئٹم شامل نہیں ہے',
      });
    }

    // Ensure Supplier record exists or update supplier
    let supplierRef = supplierId;
    if (!supplierRef && supplierName && supplierName.trim()) {
      let supplier = await Supplier.findOne({ name: supplierName.trim() });
      if (!supplier) {
        supplier = await Supplier.create({
          name: supplierName.trim(),
          totalPurchases: 1,
          totalAmount: Number(total) || 0,
        });
      } else {
        supplier.totalPurchases += 1;
        supplier.totalAmount += Number(total) || 0;
        await supplier.save();
      }
      supplierRef = supplier._id;
    }

    // Create Purchase document
    const purchase = new Purchase({
      supplierName: supplierName || 'General Supplier',
      supplier: supplierRef,
      invoiceNumber: invoiceNumber || `INV-${Date.now().toString().slice(-6)}`,
      purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
      items: items.map(it => ({
        product: it.matchedProductId || it.product || null,
        productName: it.productName,
        quantity: Number(it.quantity) || 1,
        unit: it.unit || 'KG',
        unitPrice: Number(it.unitPrice) || 0,
        lineTotal: Number(it.lineTotal) || ((Number(it.quantity) || 1) * (Number(it.unitPrice) || 0)),
        multiplier: Number(it.multiplier) || 1,
        isNewProduct: !it.matchedProductId && !it.product,
      })),
      subtotal: Number(subtotal) || 0,
      tax: Number(tax) || 0,
      discount: Number(discount) || 0,
      total: Number(total) || 0,
      paymentStatus: paymentStatus || 'paid',
      paidAmount: Number(paidAmount) || Number(total) || 0,
      invoiceImageUrl: invoiceImageUrl || '',
      notes: notes || '',
      status: 'confirmed',
    });

    await purchase.save();

    // Increment inventory stock & update product purchase price
    const stockMovements = await addPurchaseStock(
      purchase.items,
      purchase._id,
      `Supplier Purchase Invoice #${purchase.invoiceNumber}`
    );

    // Update purchase document if any new products were created
    await purchase.save();

    await AuditLog.create({
      action: 'CONFIRM_PURCHASE_OCR',
      entityType: 'Purchase',
      entityId: String(purchase._id),
      details: {
        invoiceNumber: purchase.invoiceNumber,
        itemsCount: purchase.items.length,
        total: purchase.total,
      },
      performedBy: req.user?.username || 'Owner',
    });

    res.status(201).json({
      success: true,
      message: 'Purchase confirmed & stock updated successfully! / خریداری محفوظ ہو گئی اور سٹاک بڑھا دیا گیا',
      purchase,
      stockMovementsCount: stockMovements.length,
    });
  } catch (error) {
    console.error('Confirm purchase error:', error);
    res.status(500).json({
      success: false,
      message: 'Error confirming purchase: ' + error.message,
    });
  }
};
