export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { verifyAuth } from '../../../../lib/authHelper';
import Sale from '../../../../models/Sale';
import Customer from '../../../../models/Customer';
import Product from '../../../../models/Product';
import { deductSaleStock, revertSaleStock } from '../../../../services/stockService';

export async function GET(request, { params }) {
  const auth = await verifyAuth(request);
  if (auth.error) {
    return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });
  }

  const sale = await Sale.findById(params.id).populate('customer');
  if (!sale) {
    return NextResponse.json({ success: false, message: 'Sale not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true, sale });
}

export async function PUT(request, { params }) {
  const auth = await verifyAuth(request);
  if (auth.error) {
    return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });
  }

  const sale = await Sale.findById(params.id);
  if (!sale) {
    return NextResponse.json({ success: false, message: 'Sale not found' }, { status: 404 });
  }

  const body = await request.json();
  const { items, discount, paidAmount, customerName, notes } = body;

  await revertSaleStock(sale.items, sale._id, `Reversal for edit on Receipt #${sale.receiptNumber}`);

  const processedItems = [];
  let subtotal = 0;

  for (const item of items) {
    const product = await Product.findById(item.product);
    if (!product) throw new Error(`Product not found: ${item.productName}`);

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

  const disc = parseFloat(Number(discount !== undefined ? discount : sale.discount).toFixed(2)) || 0;
  const grandTotal = Math.max(0, parseFloat((subtotal - disc).toFixed(2)));
  const paid = paidAmount !== undefined ? parseFloat(Number(paidAmount).toFixed(2)) : grandTotal;
  const remainingBalance = Math.max(0, parseFloat((grandTotal - paid).toFixed(2)));

  let paymentStatus = 'paid';
  if (paid <= 0) paymentStatus = 'unpaid';
  else if (paid < grandTotal) paymentStatus = 'partial';

  await deductSaleStock(processedItems, sale._id, `Updated items for Receipt #${sale.receiptNumber}`);

  sale.items = processedItems;
  sale.subtotal = subtotal;
  sale.discount = disc;
  sale.grandTotal = grandTotal;
  sale.paidAmount = paid;
  sale.remainingBalance = remainingBalance;
  sale.paymentStatus = paymentStatus;
  if (customerName) sale.customerName = customerName;
  if (notes !== undefined) sale.notes = notes;
  sale.status = 'edited';

  await sale.save();

  return NextResponse.json({ success: true, message: 'Sale updated', sale });
}
