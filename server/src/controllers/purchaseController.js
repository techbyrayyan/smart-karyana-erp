const Purchase = require('../models/Purchase');
const Supplier = require('../models/Supplier');
const AuditLog = require('../models/AuditLog');
const { addPurchaseStock } = require('../services/stockService');

exports.getPurchases = async (req, res) => {
  try {
    const { search, startDate, endDate, filter } = req.query;
    const query = { status: { $ne: 'cancelled' } };

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [{ invoiceNumber: regex }, { supplierName: regex }];
    }

    const now = new Date();
    if (filter === 'today') {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      query.purchaseDate = { $gte: startOfDay, $lte: endOfDay };
    } else if (filter === 'this_month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      query.purchaseDate = { $gte: startOfMonth };
    } else if (startDate && endDate) {
      query.purchaseDate = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    const purchases = await Purchase.find(query).sort({ purchaseDate: -1 }).limit(100);

    res.json({
      success: true,
      count: purchases.length,
      purchases,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getPurchaseById = async (req, res) => {
  try {
    const purchase = await Purchase.findById(req.params.id).populate('supplier');
    if (!purchase) {
      return res.status(404).json({ success: false, message: 'Purchase invoice not found' });
    }

    res.json({
      success: true,
      purchase,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createManualPurchase = async (req, res) => {
  try {
    const {
      supplierName,
      invoiceNumber,
      purchaseDate,
      items,
      subtotal,
      discount = 0,
      tax = 0,
      total,
      paymentStatus = 'paid',
      paidAmount,
      notes,
    } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one item is required' });
    }

    let supplierRef = null;
    if (supplierName && supplierName.trim()) {
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

    const purchase = new Purchase({
      supplierName: supplierName || 'General Supplier',
      supplier: supplierRef,
      invoiceNumber: invoiceNumber || `MAN-INV-${Date.now().toString().slice(-6)}`,
      purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
      items: items.map(it => ({
        product: it.product || null,
        productName: it.productName,
        quantity: Number(it.quantity),
        unit: it.unit || 'KG',
        unitPrice: Number(it.unitPrice),
        lineTotal: Number(it.lineTotal) || (Number(it.quantity) * Number(it.unitPrice)),
        multiplier: Number(it.multiplier) || 1,
        isNewProduct: !it.product,
      })),
      subtotal: Number(subtotal) || 0,
      discount: Number(discount) || 0,
      tax: Number(tax) || 0,
      total: Number(total) || 0,
      paymentStatus: paymentStatus || 'paid',
      paidAmount: Number(paidAmount) || Number(total) || 0,
      notes: notes || '',
      status: 'confirmed',
    });

    await purchase.save();

    // Increment inventory stock
    await addPurchaseStock(purchase.items, purchase._id, `Manual Purchase Invoice #${purchase.invoiceNumber}`);

    await purchase.save();

    await AuditLog.create({
      action: 'CREATE_MANUAL_PURCHASE',
      entityType: 'Purchase',
      entityId: String(purchase._id),
      details: { invoiceNumber: purchase.invoiceNumber, total: purchase.total },
      performedBy: req.user?.username || 'Owner',
    });

    res.status(201).json({
      success: true,
      message: 'Purchase recorded & stock updated! / خریداری محفوظ ہو گئی اور سٹاک بڑھ گیا',
      purchase,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
