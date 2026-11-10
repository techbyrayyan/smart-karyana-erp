export const dynamic = 'force-dynamic';
import mongoose from 'mongoose';
import { NextResponse } from 'next/server';
import connectDB from '../../../lib/db';
import { verifyAuth } from '../../../lib/authHelper';
import Sale from '../../../models/Sale';
import Customer from '../../../models/Customer';
import Product from '../../../models/Product';
import { deductSaleStock } from '../../../services/stockService';

const generateReceiptNumber = async () => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = `SK-${dateStr}`;

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

export async function GET(request) {
  try {
    const auth = await verifyAuth(request);
    if (auth.error) {
      return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });
    }

    await connectDB();
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'today';
    const search = searchParams.get('search');

    const query = { status: { $ne: 'voided' } };

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [{ receiptNumber: regex }, { customerName: regex }, { customerPhone: regex }];
    }

    const now = new Date();
    let dateRange = null;
    if (filter === 'today') {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      dateRange = { $gte: startOfDay, $lte: endOfDay };
    } else if (filter === 'yesterday') {
      const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0);
      const endOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
      dateRange = { $gte: startOfYesterday, $lte: endOfYesterday };
    } else if (filter === 'this_week') {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      dateRange = { $gte: startOfWeek };
    } else if (filter === 'this_month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      dateRange = { $gte: startOfMonth };
    }

    if (dateRange) {
      query.$or = query.$or
        ? [{ $and: [{ $or: [{ saleDate: dateRange }, { date: dateRange }, { createdAt: dateRange }] }, { $or: query.$or }] }]
        : [{ saleDate: dateRange }, { date: dateRange }, { createdAt: dateRange }];
    }

    const sales = await Sale.find(query).sort({ createdAt: -1, date: -1 }).limit(100).lean();
    return NextResponse.json({ success: true, count: sales.length, sales });
  } catch (error) {
    console.error('Sales GET error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const auth = await verifyAuth(request);
    if (auth.error) {
      return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });
    }

    await connectDB();
    const body = await request.json();
    const { customerId, customerName, customerPhone, isWalkIn, items, discount = 0, paidAmount, paymentMethod = 'cash', notes = '' } = body;

    const processedItems = [];
    let subtotal = 0;

    for (const item of items) {
      const prodId = item.product?._id || item.product;
      let product = null;
      if (prodId && mongoose.Types.ObjectId.isValid(String(prodId))) {
        product = await Product.findById(prodId);
      }
      if (!product && item.productId) {
        product = await Product.findOne({ productId: item.productId });
      }
      if (!product && item.productName) {
        product = await Product.findOne({
          name: { $regex: new RegExp(`^${item.productName.trim().replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i') },
          isArchived: false,
        });
      }

      const qty = Number(item.quantity) || 1;
      const price = Number(item.unitPrice) || (product ? (product.sellingPrice || product.pricePerUnit || product.salePrice || 0) : 0);
      const mult = Number(item.multiplier) || 1;
      const lineTotal = Number(item.lineTotal) || parseFloat((qty * price).toFixed(2));
      const costPrice = product ? parseFloat(((product.purchasePrice || 0) * mult).toFixed(2)) : 0;

      subtotal += lineTotal;
      processedItems.push({
        product: product ? product._id : undefined,
        productId: product ? product.productId : (item.productId || undefined),
        productName: item.productName || product?.name || 'Item',
        variationName: item.variationName || `${qty} ${item.unit || product?.unit || 'KG'}`,
        quantity: qty,
        unit: item.unit || product?.unit || 'KG',
        multiplier: mult,
        unitPrice: price,
        costPrice,
        lineTotal,
      });
    }

    const disc = parseFloat(Number(discount).toFixed(2)) || 0;
    const grandTotal = Math.max(0, parseFloat((subtotal - disc).toFixed(2)));
    const paid = paidAmount !== undefined ? parseFloat(Number(paidAmount).toFixed(2)) : grandTotal;
    const remainingBalance = Math.max(0, parseFloat((grandTotal - paid).toFixed(2)));

    let paymentStatus = 'paid';
    if (paymentMethod === 'credit_khata' || paid <= 0) {
      paymentStatus = 'unpaid';
    } else if (paid < grandTotal) {
      paymentStatus = 'partial';
    }

    const receiptNumber = await generateReceiptNumber();

    const sale = await Sale.create({
      receiptNumber,
      customer: customerId || undefined,
      customerName: isWalkIn ? 'Walk-in Customer' : (customerName || 'General Customer'),
      customerPhone: customerPhone || '',
      isWalkIn: !!isWalkIn,
      items: processedItems,
      subtotal,
      discount: disc,
      grandTotal,
      paidAmount: paid,
      remainingBalance,
      paymentMethod,
      paymentStatus,
      notes,
      date: new Date(),
      saleDate: new Date(),
    });

    // Stock deduction
    try {
      await deductSaleStock(processedItems, sale._id, `Customer Sale #${receiptNumber}`);
    } catch (stockErr) {
      console.warn('Stock deduction notice:', stockErr.message);
    }

    // Customer ledger update for Udhaar / partial payment
    if (customerId && remainingBalance > 0) {
      try {
        await Customer.findByIdAndUpdate(customerId, {
          $inc: {
            balance: remainingBalance,
            totalSpent: grandTotal,
            totalPurchases: 1,
          },
          $set: { lastPurchaseDate: new Date() },
        });
      } catch (custErr) {
        console.warn('Customer ledger update notice:', custErr.message);
      }
    }

    return NextResponse.json({ success: true, message: 'Sale completed', sale }, { status: 201 });
  } catch (error) {
    console.error('Sales POST error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
