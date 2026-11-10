export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import connectDB from '../../../../lib/db';
import { verifyAuth } from '../../../../lib/authHelper';
import Sale from '../../../../models/Sale';
import Purchase from '../../../../models/Purchase';
import Expense from '../../../../models/Expense';
import Product from '../../../../models/Product';
import Customer from '../../../../models/Customer';
import StockMovement from '../../../../models/StockMovement';

export async function GET(request) {
  try {
    const auth = await verifyAuth(request);
    if (auth.error) return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });

    await connectDB();

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    // Run all aggregations concurrently
    const [
      totalProducts,
      lowStockProducts,
      totalCustomers,
      todaySalesAgg,
      todayPurchasesAgg,
      todayExpensesAgg,
      recentSales,
      recentPurchases,
      todayStockMovements,
    ] = await Promise.all([
      Product.countDocuments({ isArchived: false }),
      Product.countDocuments({ isArchived: false, $expr: { $lte: ['$currentStock', '$minStockAlert'] } }),
      Customer.countDocuments({ isArchived: false }),
      Sale.aggregate([
        { $match: { saleDate: { $gte: todayStart, $lte: todayEnd }, status: { $ne: 'void' } } },
        { $group: { _id: null, total: { $sum: '$grandTotal' }, count: { $sum: 1 } } },
      ]),
      Purchase.aggregate([
        { $match: { purchaseDate: { $gte: todayStart, $lte: todayEnd } } },
        { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } },
      ]),
      Expense.aggregate([
        { $match: { date: { $gte: todayStart, $lte: todayEnd } } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      Sale.find({ status: { $ne: 'void' } })
        .sort({ saleDate: -1 })
        .limit(8)
        .select('receiptNumber customerName grandTotal paymentStatus saleDate')
        .lean(),
      Purchase.find({})
        .sort({ purchaseDate: -1 })
        .limit(5)
        .select('supplierName invoiceNumber grandTotal purchaseDate')
        .lean(),
      StockMovement.find({ createdAt: { $gte: todayStart, $lte: todayEnd } })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean(),
    ]);

    // Calculate total stock value
    const stockValueAgg = await Product.aggregate([
      { $match: { isArchived: false } },
      { $group: { _id: null, totalStock: { $sum: '$currentStock' }, totalValue: { $sum: { $multiply: ['$currentStock', '$purchasePrice'] } } } },
    ]);

    const todaySalesTotal = todaySalesAgg[0]?.total || 0;
    const todaySalesCount = todaySalesAgg[0]?.count || 0;
    const todayPurchasesTotal = todayPurchasesAgg[0]?.total || 0;
    const todayExpensesTotal = todayExpensesAgg[0]?.total || 0;

    // Estimate profit: Sales - (COGS estimate + Expenses)
    // COGS estimate based on avg margin of 15%
    const estimatedCOGS = todaySalesTotal * 0.85;
    const estimatedProfit = Math.max(0, todaySalesTotal - estimatedCOGS - todayExpensesTotal);

    // Stock activity breakdown
    const stockAdded = todayStockMovements.filter((m) => m.type === 'purchase').reduce((sum, m) => sum + m.quantityChange, 0);
    const stockSold = todayStockMovements.filter((m) => m.type === 'sale').reduce((sum, m) => sum + Math.abs(m.quantityChange), 0);
    const stockReturned = todayStockMovements.filter((m) => m.type === 'return').reduce((sum, m) => sum + m.quantityChange, 0);

    const statsData = {
      totalProducts,
      lowStockProducts,
      totalCustomers,
      totalStockValue: stockValueAgg[0]?.totalValue || 0,
      availableStock: stockValueAgg[0]?.totalStock || 0,
      todaySales: todaySalesTotal,
      todaySalesCount,
      todayPurchases: todayPurchasesTotal,
      todayExpenses: todayExpensesTotal,
      todayEstimatedNetProfit: estimatedProfit,
      today: {
        sales: todaySalesTotal,
        salesCount: todaySalesCount,
        purchases: todayPurchasesTotal,
        expenses: todayExpensesTotal,
        estimatedProfit,
        stockAdded,
        stockSold,
        stockReturned,
      },
    };

    return NextResponse.json({
      success: true,
      stats: statsData,
      dashboard: statsData,
      recentSales,
      recentPurchases,
      stockActivity: {
        stockAdded,
        stockSold,
        stockReturned,
      },
    });
  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
