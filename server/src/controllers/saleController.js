const Sale = require('../models/Sale');
const Customer = require('../models/Customer');
const Product = require('../models/Product');
const AuditLog = require('../models/AuditLog');
const { deductSaleStock, revertSaleStock } = require('../services/stockService');

// Helper to generate sequential receipt numbers
const generateReceiptNumber = async () => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = `SK-${dateStr}`;

  // Find latest receipt for today
  const lastSale = await Sale.findOne({
    receiptNumber: new RegExp(`^${prefix}`),
  }).sort({ receiptNumber: -1 });

  let sequence = 1;
  if (lastSale && lastSale.receiptNumber) {
    const parts = lastSale.receiptNumber.split('-');
    const lastSeq = parseInt(parts[2], 10);
    if (!isNaN(lastSeq)) {
      sequence = lastSeq + 1;
    }
  }

  return `${prefix}-${String(sequence).padStart(4, '0')}`;
};

// Create new sale / billing
exports.createSale = async (req, res) => {
  try {
    const {
      customerId,
      customerName,
      customerPhone,
      isWalkIn,
      items,
      discount = 0,
      paidAmount,
      paymentMethod = 'cash',
      notes = '',
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No items in cart / بل میں کوئی سامان شامل نہیں ہے',
      });
    }

    // Validate and enrich items with current costPrice for profit tracking
    const processedItems = [];
    let subtotal = 0;

    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Product not found: ${item.productName || item.product}`,
        });
      }

      const qty = Number(item.quantity);
      const price = Number(item.unitPrice);
      const mult = Number(item.multiplier) || 1;
      const lineTotal = Number(item.lineTotal) || parseFloat((qty * price).toFixed(2));
      const costPrice = parseFloat(((product.purchasePrice || 0) * mult).toFixed(2));

      subtotal += lineTotal;

      processedItems.push({
        product: product._id,
        productName: item.productName || product.name,
        variationName: item.variationName || `${item.quantity} ${item.unit || product.unit}`,
        quantity: qty,
        unit: item.unit || product.unit,
        multiplier: mult,
        unitPrice: price,
        costPrice: costPrice,
        lineTotal: lineTotal,
      });
    }

    subtotal = parseFloat(subtotal.toFixed(2));
    const disc = parseFloat(Number(discount).toFixed(2)) || 0;
    const grandTotal = Math.max(0, parseFloat((subtotal - disc).toFixed(2)));
    const paid = paidAmount !== undefined ? parseFloat(Number(paidAmount).toFixed(2)) : grandTotal;
    const remainingBalance = Math.max(0, parseFloat((grandTotal - paid).toFixed(2)));

    let paymentStatus = 'paid';
    if (paid <= 0) {
      paymentStatus = 'unpaid';
    } else if (paid < grandTotal) {
      paymentStatus = 'partial';
    }

    const receiptNumber = await generateReceiptNumber();

    const sale = new Sale({
      receiptNumber,
      customer: customerId || null,
      customerName: customerName || 'Walk-in Customer (عام گاہک)',
      customerPhone: customerPhone || '',
      isWalkIn: isWalkIn ?? (!customerId),
      items: processedItems,
      subtotal,
      discount: disc,
      grandTotal,
      paidAmount: paid,
      remainingBalance,
      paymentStatus,
      paymentMethod,
      date: new Date(),
      status: 'completed',
      notes,
    });

    // 1. Deduct stock atomically
    await deductSaleStock(processedItems, sale._id, `Sale Receipt #${receiptNumber}`);

    // 2. Save sale
    await sale.save();

    // 3. Update customer stats & Khata balance if linked to registered customer
    if (customerId) {
      const customer = await Customer.findById(customerId);
      if (customer) {
        customer.totalPurchases += 1;
        customer.totalSpent = parseFloat((customer.totalSpent + grandTotal).toFixed(2));
        if (remainingBalance > 0) {
          customer.balance = parseFloat((customer.balance + remainingBalance).toFixed(2));
        }
        customer.lastPurchaseDate = new Date();
        await customer.save();
      }
    }

    await AuditLog.create({
      action: 'CREATE_SALE',
      entityType: 'Sale',
      entityId: String(sale._id),
      details: {
        receiptNumber: sale.receiptNumber,
        grandTotal: sale.grandTotal,
        paymentStatus: sale.paymentStatus,
      },
      performedBy: req.user?.username || 'Owner',
    });

    res.status(201).json({
      success: true,
      message: 'Sale completed & stock updated! / فروخت مکمل ہو گئی اور سٹاک منہا کر دیا گیا',
      sale,
    });
  } catch (error) {
    console.error('Create sale error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// List sales with filters
exports.getSales = async (req, res) => {
  try {
    const { filter = 'today', search, customerId, startDate, endDate, status } = req.query;

    const query = {};

    if (status) {
      query.status = status;
    } else {
      query.status = { $ne: 'voided' };
    }

    if (customerId) {
      query.customer = customerId;
    }

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [{ receiptNumber: regex }, { customerName: regex }, { customerPhone: regex }];
    }

    const now = new Date();
    if (filter === 'today') {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      query.date = { $gte: startOfDay, $lte: endOfDay };
    } else if (filter === 'yesterday') {
      const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0);
      const endOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59);
      query.date = { $gte: startOfYesterday, $lte: endOfYesterday };
    } else if (filter === 'this_week') {
      const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
      startOfWeek.setHours(0, 0, 0, 0);
      query.date = { $gte: startOfWeek };
    } else if (filter === 'this_month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      query.date = { $gte: startOfMonth };
    } else if (startDate && endDate) {
      query.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    const sales = await Sale.find(query).sort({ date: -1 }).limit(100);

    res.json({
      success: true,
      count: sales.length,
      sales,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get single sale by ID / Receipt View
exports.getSaleById = async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id).populate('customer');
    if (!sale) {
      return res.status(404).json({ success: false, message: 'Sale receipt not found / رسید نہیں ملی' });
    }

    res.json({
      success: true,
      sale,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update existing sale (with stock re-balance and audit trail)
exports.updateSale = async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id);
    if (!sale) {
      return res.status(404).json({ success: false, message: 'Sale not found' });
    }

    if (sale.status === 'voided') {
      return res.status(400).json({ success: false, message: 'Cannot edit voided sale' });
    }

    const { items, discount, paidAmount, paymentMethod, notes, customerName } = req.body;

    // 1. Revert previous stock movements
    await revertSaleStock(sale.items, sale._id, `Reversal for edit on Receipt #${sale.receiptNumber}`);

    // 2. Adjust customer balance for old sale
    if (sale.customer && sale.remainingBalance > 0) {
      const oldCust = await Customer.findById(sale.customer);
      if (oldCust) {
        oldCust.balance = Math.max(0, parseFloat((oldCust.balance - sale.remainingBalance).toFixed(2)));
        oldCust.totalSpent = Math.max(0, parseFloat((oldCust.totalSpent - sale.grandTotal).toFixed(2)));
        await oldCust.save();
      }
    }

    // 3. Process new items
    const processedItems = [];
    let subtotal = 0;

    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        throw new Error(`Product not found: ${item.productName}`);
      }
      const qty = Number(item.quantity);
      const price = Number(item.unitPrice);
      const mult = Number(item.multiplier) || 1;
      const lineTotal = Number(item.lineTotal) || parseFloat((qty * price).toFixed(2));
      const costPrice = parseFloat(((product.purchasePrice || 0) * mult).toFixed(2));

      subtotal += lineTotal;

      processedItems.push({
        product: product._id,
        productName: item.productName || product.name,
        variationName: item.variationName || `${item.quantity} ${item.unit || product.unit}`,
        quantity: qty,
        unit: item.unit || product.unit,
        multiplier: mult,
        unitPrice: price,
        costPrice: costPrice,
        lineTotal: lineTotal,
      });
    }

    subtotal = parseFloat(subtotal.toFixed(2));
    const disc = parseFloat(Number(discount !== undefined ? discount : sale.discount).toFixed(2)) || 0;
    const grandTotal = Math.max(0, parseFloat((subtotal - disc).toFixed(2)));
    const paid = paidAmount !== undefined ? parseFloat(Number(paidAmount).toFixed(2)) : grandTotal;
    const remainingBalance = Math.max(0, parseFloat((grandTotal - paid).toFixed(2)));

    let paymentStatus = 'paid';
    if (paid <= 0) {
      paymentStatus = 'unpaid';
    } else if (paid < grandTotal) {
      paymentStatus = 'partial';
    }

    // 4. Deduct new items stock
    await deductSaleStock(processedItems, sale._id, `Updated items for Receipt #${sale.receiptNumber}`);

    // 5. Update Sale record
    sale.items = processedItems;
    sale.subtotal = subtotal;
    sale.discount = disc;
    sale.grandTotal = grandTotal;
    sale.paidAmount = paid;
    sale.remainingBalance = remainingBalance;
    sale.paymentStatus = paymentStatus;
    if (paymentMethod) sale.paymentMethod = paymentMethod;
    if (notes !== undefined) sale.notes = notes;
    if (customerName) sale.customerName = customerName;
    sale.status = 'edited';

    await sale.save();

    // 6. Update customer balance with new amount
    if (sale.customer) {
      const cust = await Customer.findById(sale.customer);
      if (cust) {
        cust.totalSpent = parseFloat((cust.totalSpent + grandTotal).toFixed(2));
        if (remainingBalance > 0) {
          cust.balance = parseFloat((cust.balance + remainingBalance).toFixed(2));
        }
        await cust.save();
      }
    }

    await AuditLog.create({
      action: 'UPDATE_SALE',
      entityType: 'Sale',
      entityId: String(sale._id),
      details: {
        receiptNumber: sale.receiptNumber,
        newGrandTotal: grandTotal,
      },
      performedBy: req.user?.username || 'Owner',
    });

    res.json({
      success: true,
      message: 'Sale receipt updated and inventory reconciled / رسید تبدیل کر دی گئی اور سٹاک درست کر دیا گیا',
      sale,
    });
  } catch (error) {
    console.error('Update sale error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Void / Cancel sale
exports.voidSale = async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id);
    if (!sale) {
      return res.status(404).json({ success: false, message: 'Sale not found' });
    }

    if (sale.status === 'voided') {
      return res.status(400).json({ success: false, message: 'Sale is already voided' });
    }

    // 1. Revert stock
    await revertSaleStock(sale.items, sale._id, `Sale Voided: #${sale.receiptNumber}`);

    // 2. Adjust customer balance
    if (sale.customer) {
      const cust = await Customer.findById(sale.customer);
      if (cust) {
        if (sale.remainingBalance > 0) {
          cust.balance = Math.max(0, parseFloat((cust.balance - sale.remainingBalance).toFixed(2)));
        }
        cust.totalSpent = Math.max(0, parseFloat((cust.totalSpent - sale.grandTotal).toFixed(2)));
        cust.totalPurchases = Math.max(0, cust.totalPurchases - 1);
        await cust.save();
      }
    }

    sale.status = 'voided';
    await sale.save();

    await AuditLog.create({
      action: 'VOID_SALE',
      entityType: 'Sale',
      entityId: String(sale._id),
      details: { receiptNumber: sale.receiptNumber },
      performedBy: req.user?.username || 'Owner',
    });

    res.json({
      success: true,
      message: 'Sale voided and stock returned / بل منسوخ کر دیا گیا اور مال سٹاک میں واپس آ گیا',
      sale,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
