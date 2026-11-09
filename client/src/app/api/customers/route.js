import { NextResponse } from 'next/server';
import { verifyAuth } from '../../../lib/authHelper';
import Customer from '../../../models/Customer';

export async function GET(request) {
  const auth = await verifyAuth(request);
  if (auth.error) {
    return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });
  }

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

  const customers = await Customer.find(query).sort({ updatedAt: -1 });
  return NextResponse.json({ success: true, count: customers.length, customers });
}

export async function POST(request) {
  const auth = await verifyAuth(request);
  if (auth.error) {
    return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });
  }

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
}
