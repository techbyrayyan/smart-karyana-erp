export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '../../../../lib/db';
import { verifyAuth } from '../../../../lib/authHelper';
import Sale from '../../../../models/Sale';
import Customer from '../../../../models/Customer';
import Product from '../../../../models/Product';
import { deductSaleStock, revertSaleStock } from '../../../../services/stockService';

export async function GET(request, { params }) {
  try {
    const auth = await verifyAuth(request);
    if (auth.error) {
      return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });
    }

    await connectDB();
    const sale = await Sale.findById(params.id).populate('customer').lean();
    if (!sale) {
      return NextResponse.json({ success: false, message: 'Sale not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, sale });
  } catch (error) {
    console.error('Error fetching sale:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const auth = await verifyAuth(request);
    if (auth.error) {
      return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });
    }

    await connectDB();
    const sale = await Sale.findById(params.id);
    if (!sale) {
      return NextResponse.json({ success: false, message: 'Sale not found' }, { status: 404 });
    }

    const body = await request.json();
    const { items, discount, paidAmount, customerName, notes } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, message: 'Items array cannot be empty' }, { status: 400 });
    }

    // Safely revert previous sale stock
    if (sale.items && sale.items.length > 0) {
      try {
        await revertSaleStock(sale.items, sale._id, `Reversal for edit on Receipt #${sale.receiptNumber}`);
      } catch (revErr) {
        console.warn('Warning during revertSaleStock:', revErr.message);
      }
    }

    const processedItems = [];
    let subtotal = 0;

    for (const item of items) {
      const rawProdId = item.product?._id || item.product;
      let product = null;
      let validProdId = null;
      if (rawProdId && mongoose.Types.ObjectId.isValid(rawProdId)) {
        try {
          product = await Product.findById(rawProdId);
          validProdId = product?._id || rawProdId;
        } catch (e) {}
      }

      const qty = Number(item.quantity) || 1;
      const price = Number(item.unitPrice) || 0;
      const mult = Number(item.multiplier) || 1;
      const lineTotal = Number(item.lineTotal) || parseFloat((qty * price).toFixed(2));
      const costPrice = product ? parseFloat(((product.purchasePrice || 0) * mult).toFixed(2)) : (item.costPrice || 0);

      subtotal += lineTotal;
      processedItems.push({
        product: validProdId,
        productId: product?.productId || item.productId || null,
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

    const disc = parseFloat(Number(discount !== undefined ? discount : sale.discount).toFixed(2)) || 0;
    const grandTotal = Math.max(0, parseFloat((subtotal - disc).toFixed(2)));
    const paid = paidAmount !== undefined ? parseFloat(Number(paidAmount).toFixed(2)) : grandTotal;
    const remainingBalance = Math.max(0, parseFloat((grandTotal - paid).toFixed(2)));

    let paymentStatus = 'paid';
    if (paid <= 0) paymentStatus = 'unpaid';
    else if (paid < grandTotal) paymentStatus = 'partial';

    // Deduct stock for new processed items
    try {
      await deductSaleStock(processedItems, sale._id, `Updated items for Receipt #${sale.receiptNumber}`);
    } catch (dedErr) {
      console.warn('Warning during deductSaleStock:', dedErr.message);
    }

    // Adjust customer balance if udhaar changed
    if (sale.customer) {
      try {
        const customer = await Customer.findById(sale.customer);
        if (customer) {
          const balanceDiff = remainingBalance - (sale.remainingBalance || 0);
          customer.currentBalance = Math.max(0, parseFloat(((customer.currentBalance || 0) + balanceDiff).toFixed(2)));
          await customer.save();
        }
      } catch (cErr) {
        console.warn('Customer balance adjustment warning:', cErr.message);
      }
    }

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

    return NextResponse.json({ success: true, message: 'Sale updated successfully', sale });
  } catch (error) {
    console.error('Error updating sale:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
