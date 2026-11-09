export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import connectDB from '../../../../../lib/db';
import { verifyAuth } from '../../../../../lib/authHelper';
import Customer from '../../../../../models/Customer';
import Sale from '../../../../../models/Sale';

export async function POST(request, { params }) {
  try {
    const auth = await verifyAuth(request);
    if (auth.error) return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });

    await connectDB();
    const { amount, method, notes } = await request.json();

    if (!amount || amount <= 0) {
      return NextResponse.json({ success: false, message: 'Valid payment amount is required' }, { status: 400 });
    }

    const customer = await Customer.findById(params.id);
    if (!customer) {
      return NextResponse.json({ success: false, message: 'Customer not found' }, { status: 404 });
    }

    // Deduct from outstanding balance
    const previousBalance = customer.balance || 0;
    const newBalance = Math.max(0, previousBalance - amount);

    customer.balance = newBalance;
    customer.totalPaid = (customer.totalPaid || 0) + amount;

    // Record payment in khataPayments array
    if (!customer.khataPayments) customer.khataPayments = [];
    customer.khataPayments.push({
      amount,
      method: method || 'cash',
      notes: notes || '',
      date: new Date(),
      previousBalance,
      newBalance,
      recordedBy: auth.user.username,
    });

    await customer.save();

    return NextResponse.json({
      success: true,
      message: `Payment of Rs. ${amount} recorded successfully`,
      customer,
      previousBalance,
      newBalance,
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
