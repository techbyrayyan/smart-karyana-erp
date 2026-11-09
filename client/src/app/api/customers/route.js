export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import connectDB from '../../../lib/db';
import { verifyAuth } from '../../../lib/authHelper';
import Customer from '../../../models/Customer';

export async function GET(request) {
  try {
    const auth = await verifyAuth(request);
    if (auth.error) {
      return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });
    }

    await connectDB();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const hasBalance = searchParams.get('hasBalance');

    const query = { isArchived: false };

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [{ name: regex }, { phone: regex }, { address: regex }];
    }

    if (hasBalance === 'true') {
      query.balance = { $gt: 0 };
    }

    const customers = await Customer.find(query).sort({ updatedAt: -1 }).lean();
    return NextResponse.json({ success: true, count: customers.length, customers });
  } catch (error) {
    console.error('Customers GET error:', error);
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
    const { name, phone, address, initialBalance = 0, notes } = body;

    const customer = await Customer.create({
      name: name.trim(),
      phone: (phone || '').trim(),
      address: (address || '').trim(),
      balance: Number(initialBalance) || 0,
      notes: notes || '',
    });

    return NextResponse.json({ success: true, message: 'Customer created', customer }, { status: 201 });
  } catch (error) {
    console.error('Customers POST error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
