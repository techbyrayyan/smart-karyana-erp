import { NextResponse } from 'next/server';
import connectDB from '../../../../lib/db';
import { verifyAuth } from '../../../../lib/authHelper';
import Sale from '../../../../models/Sale';
import Purchase from '../../../../models/Purchase';
import Expense from '../../../../models/Expense';
import Product from '../../../../models/Product';

export async function GET(request) {
  try {
    const auth = await verifyAuth(request);
    if (auth.error) return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });

    await connectDB();
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'month'; // today | week | month | custom
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let start, end;
    const now = new Date();

    if (period === 'today') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (period === 'week') {
      const dayOfWeek = now.getDay();
      start = new Date(now);
      start.setDate(now.getDate() - dayOfWeek);
      start.setHours(0, 0, 0, 0);
      end = new Date(now);
      end.setHours(23, 59, 59, 999);
    } else if (period === 'custom' && startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate + 'T23:59:59.999Z');
    } else {
      // Default: current month
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    const [salesData, purchasesData, expensesData, dailySales] = await Promise.all([
      Sale.aggregate([
        { $match: { saleDate: { $gte: start, $lte: end }, status: { $ne: 'void' } } },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$grandTotal' },
            totalCOGS: { $sum: '$totalCost' },
            count: { $sum: 1 },
            cashSales: { $sum: { $cond: [{ $eq: ['$paymentMethod', 'cash'] }, '$grandTotal', 0] } },
            udhaarSales: { $sum: { $cond: [{ $eq: ['$paymentMethod', 'udhaar'] }, '$grandTotal', 0] } },
          },
        },
      ]),
      Purchase.aggregate([
        { $match: { purchaseDate: { $gte: start, $lte: end } } },
        { $group: { _id: null, total: { $sum: '$grandTotal' }, count: { $sum: 1 } } },
      ]),
      Expense.aggregate([
        { $match: { expenseDate: { $gte: start, $lte: end } } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      // Daily sales breakdown for chart
      Sale.aggregate([
        { $match: { saleDate: { $gte: start, $lte: end }, status: { $ne: 'void' } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$saleDate' } },
            revenue: { $sum: '$grandTotal' },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    const totalRevenue = salesData[0]?.totalRevenue || 0;
    const totalCOGS = salesData[0]?.totalCOGS || (totalRevenue * 0.82); // fallback estimate
    const totalExpenses = expensesData[0]?.total || 0;
    const grossProfit = totalRevenue - totalCOGS;
    const netProfit = grossProfit - totalExpenses;

    return NextResponse.json({
      success: true,
      report: {
        period: { start, end, label: period },
        sales: {
          totalRevenue,
          count: salesData[0]?.count || 0,
          cashSales: salesData[0]?.cashSales || 0,
          udhaarSales: salesData[0]?.udhaarSales || 0,
        },
        purchases: {
          total: purchasesData[0]?.total || 0,
          count: purchasesData[0]?.count || 0,
        },
        expenses: {
          total: totalExpenses,
          count: expensesData[0]?.count || 0,
        },
        profit: {
          grossProfit,
          totalExpenses,
          netProfit,
          grossMargin: totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(1) : 0,
          netMargin: totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : 0,
        },
        dailySales,
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
