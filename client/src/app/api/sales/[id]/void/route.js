import { NextResponse } from 'next/server';
import { verifyAuth } from '../../../../../lib/authHelper';
import Sale from '../../../../../models/Sale';
import Customer from '../../../../../models/Customer';
import { revertSaleStock } from '../../../../../services/stockService';

export async function POST(request, { params }) {
  const auth = await verifyAuth(request);
  if (auth.error) {
    return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });
  }

  const sale = await Sale.findById(params.id);
  if (!sale) {
    return NextResponse.json({ success: false, message: 'Sale not found' }, { status: 404 });
  }

  if (sale.status === 'voided') {
    return NextResponse.json({ success: false, message: 'Sale is already voided' }, { status: 400 });
  }

  await revertSaleStock(sale.items, sale._id, `Sale Voided: #${sale.receiptNumber}`);

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

  return NextResponse.json({ success: true, message: 'Sale voided', sale });
}
