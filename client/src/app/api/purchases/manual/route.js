import { NextResponse } from 'next/server';
import connectDB from '../../../../lib/db';
import { verifyAuth } from '../../../../lib/authHelper';
import Purchase from '../../../../models/Purchase';
import Supplier from '../../../../models/Supplier';
import { addPurchaseStock } from '../../../../services/stockService';

export async function POST(request) {
  try {
    const auth = await verifyAuth(request);
    if (auth.error) return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });

    await connectDB();
    const body = await request.json();
    const {
      supplierName,
      invoiceNumber,
      purchaseDate,
      items,
      subtotal,
      discount = 0,
      tax = 0,
      grandTotal,
      paymentMethod = 'cash',
      paymentStatus = 'paid',
      notes = '',
    } = body;

    if (!items || items.length === 0) {
      return NextResponse.json({ success: false, message: 'At least one item is required' }, { status: 400 });
    }

    // Upsert supplier
    let supplier = null;
    if (supplierName && supplierName.trim()) {
      supplier = await Supplier.findOneAndUpdate(
        { name: { $regex: new RegExp(`^${supplierName.trim()}$`, 'i') } },
        {
          $set: { name: supplierName.trim() },
          $inc: { totalPurchases: grandTotal || 0 },
        },
        { upsert: true, new: true }
      );
    }

    const purchase = await Purchase.create({
      supplierName: supplierName || 'General Supplier',
      supplier: supplier?._id,
      invoiceNumber: invoiceNumber || `MAN-${Date.now().toString().slice(-6)}`,
      purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
      items,
      subtotal: subtotal || grandTotal || 0,
      discount,
      tax,
      total: grandTotal || subtotal || 0,
      grandTotal: grandTotal || subtotal || 0,
      paymentMethod: paymentMethod || 'cash',
      paymentStatus,
      notes,
      createdBy: auth.user.username,
      source: 'manual',
    });

    // Update stock
    await addPurchaseStock(items, purchase._id, `Manual Purchase from ${supplierName || 'General Supplier'}`);

    return NextResponse.json({
      success: true,
      message: 'Purchase recorded and stock updated successfully',
      purchase,
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
