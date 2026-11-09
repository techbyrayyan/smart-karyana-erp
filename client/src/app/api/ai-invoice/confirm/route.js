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
      invoiceDate,
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

    // Upsert supplier record
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
      invoiceNumber: invoiceNumber || `AI-${Date.now().toString().slice(-6)}`,
      purchaseDate: invoiceDate ? new Date(invoiceDate) : new Date(),
      items,
      subtotal: subtotal || grandTotal || 0,
      discount,
      tax,
      total: grandTotal || subtotal || 0,
      grandTotal: grandTotal || subtotal || 0,
      paymentMethod,
      paymentStatus,
      notes,
      createdBy: auth.user.username,
      source: 'ai_scan',
    });

    // Update stock for each item
    await addPurchaseStock(
      items,
      purchase._id,
      `AI Scanned Invoice from ${supplierName || 'General Supplier'}`
    );

    return NextResponse.json({
      success: true,
      message: 'Invoice confirmed and stock updated successfully',
      purchase,
    }, { status: 201 });
  } catch (error) {
    console.error('AI Invoice Confirm error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
