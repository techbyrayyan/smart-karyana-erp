export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
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
  const auth = await verifyAuth(request);
  if (auth.error) {
    return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const filter = searchParams.get('filter') || 'today';
  const search = searchParams.get('search');

  const query = { status: { $ne: 'voided' } };

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
  }

  const sales = await Sale.find(query).sort({ date: -1 }).limit(100);
  return NextResponse.json({ success: true, count: sales.length, sales });
}

export async function POST(request) {
  const auth = await verifyAuth(request);
  if (auth.error) {
    return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });
  }

  const body = await request.json();
  const { customerId, customerName, customerPhone, isWalkIn, items, discount = 0, paidAmount, paymentMethod = 'cash', notes = '' } = body;

  const processedItems = [];
  let subtotal = 0;

  for (const item of items) {
    const product = await Product.findById(item.product);
    if (!product) {
      return NextResponse.json({ success: false, message: `Product not found: ${item.productName}` }, { status: 404 });
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
      costPrice,
      lineTotal,
    });
  }

  subtotal = parseFloat(subtotal.toFixed(2));
  const disc = parseFloat(Number(discount).toFixed(2)) || 0;
  const grandTotal = Math.max(0, parseFloat((subtotal - disc).toFixed(2)));
  const paid = paidAmount !== undefined ? parseFloat(Number(paidAmount).toFixed(2)) : grandTotal;
  const remainingBalance = Math.max(0, parseFloat((grandTotal - paid).toFixed(2)));

  let paymentStatus = 'paid';
  if (paid <= 0) paymentStatus = 'unpaid';
  else if (paid < grandTotal) paymentStatus = 'partial';

  const receiptNumber = await generateReceiptNumber();

  const sale = new Sale({
    receiptNumber,
    customer: customerId || null,
    customerName: customerName || 'Walk-in Customer',
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

  await deductSaleStock(processedItems, sale._id, `Sale Receipt #${receiptNumber}`);
  await sale.save();

  if (customerId) {
    const cust = await Customer.findById(customerId);
    if (cust) {
      cust.totalPurchases += 1;
      cust.totalSpent = parseFloat((cust.totalSpent + grandTotal).toFixed(2));
      if (remainingBalance > 0) cust.balance = parseFloat((cust.balance + remainingBalance).toFixed(2));
      cust.lastPurchaseDate = new Date();
      await cust.save();
    }
  }

  return NextResponse.json({ success: true, message: 'Sale completed', sale }, { status: 201 });
}
