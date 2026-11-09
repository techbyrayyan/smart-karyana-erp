export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import connectDB from '../../../lib/db';
import { verifyAuth } from '../../../lib/authHelper';
import Expense from '../../../models/Expense';

export async function GET(request) {
  try {
    const auth = await verifyAuth(request);
    if (auth.error) return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });

    await connectDB();
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 30;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const category = searchParams.get('category');

    const filter = {};
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate + 'T23:59:59.999Z');
    }
    if (category) filter.category = category;

    const total = await Expense.countDocuments(filter);
    const expenses = await Expense.find(filter)
      .sort({ expenseDate: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // Calculate total amount for filtered period
    const totalAmountAgg = await Expense.aggregate([
      { $match: filter },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const totalAmount = totalAmountAgg[0]?.total || 0;

    return NextResponse.json({
      success: true,
      expenses,
      totalAmount,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const auth = await verifyAuth(request);
    if (auth.error) return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });

    await connectDB();
    const { title, description, amount, category, expenseDate, date, paymentMethod, notes } = await request.json();
    const expenseTitle = title || description;

    if (!expenseTitle || !amount || amount <= 0) {
      return NextResponse.json(
        { success: false, message: 'Title/Description and valid amount are required' },
        { status: 400 }
      );
    }

    const expense = await Expense.create({
      title: expenseTitle,
      description: description || '',
      amount,
      category: category || 'Other',
      date: (expenseDate || date) ? new Date(expenseDate || date) : new Date(),
      notes: notes || '',
    });

    return NextResponse.json(
      { success: true, message: 'Expense recorded successfully', expense },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
