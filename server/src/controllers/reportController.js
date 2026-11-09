const Product = require('../models/Product');
const Sale = require('../models/Sale');
const Purchase = require('../models/Purchase');
const Expense = require('../models/Expense');
const Customer = require('../models/Customer');
const StockMovement = require('../models/StockMovement');

// Dashboard statistics
exports.getDashboardStats = async (req, res) => {
  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    // 1. Total Products
    const totalProducts = await Product.countDocuments({ isArchived: false });

    // 2. Total Available Stock
    const stockAgg = await Product.aggregate([
      { $match: { isArchived: false } },
      { $group: { _id: null, totalStock: { $sum: '$currentStock' } } },
    ]);
    const totalAvailableStock = stockAgg[0]?.totalStock || 0;

    // 3. Today's Sales
    const todaySales = await Sale.find({
      status: { $ne: 'voided' },
      date: { $gte: startOfToday, $lte: endOfToday },
    });
    const todaySalesTotal = todaySales.reduce((acc, s) => acc + (s.grandTotal || 0), 0);

    // 4. Today's Purchases
    const todayPurchases = await Purchase.find({
      status: 'confirmed',
      purchaseDate: { $gte: startOfToday, $lte: endOfToday },
    });
    const todayPurchasesTotal = todayPurchases.reduce((acc, p) => acc + (p.total || 0), 0);

    // 5. Today's Expenses
    const todayExpenses = await Expense.find({
      date: { $gte: startOfToday, $lte: endOfToday },
    });
    const todayExpensesTotal = todayExpenses.reduce((acc, e) => acc + (e.amount || 0), 0);

    // 6. Today's Estimated Profit (True COGS method)
    // Cost of goods sold:
    let todayCOGS = 0;
    for (const sale of todaySales) {
      for (const item of sale.items) {
        todayCOGS += (Number(item.costPrice) || 0) * (Number(item.quantity) || 1);
      }
    }
    const todayGrossProfit = Math.max(0, parseFloat((todaySalesTotal - todayCOGS).toFixed(2)));
    const todayEstimatedNetProfit = parseFloat((todayGrossProfit - todayExpensesTotal).toFixed(2));

    // 7. Total Customers
    const totalCustomers = await Customer.countDocuments({ isArchived: false });

    // 8. Low Stock Products Count
    const lowStockCount = await Product.countDocuments({
      isArchived: false,
      $expr: { $lte: ['$currentStock', '$minStockAlert'] },
    });

    // Daily Stock Activity
    const todayMovements = await StockMovement.find({
      date: { $gte: startOfToday, $lte: endOfToday },
    });

    let stockAddedToday = 0;
    let stockSoldToday = 0;
    let stockReturnedToday = 0;

    for (const mov of todayMovements) {
      if (mov.type === 'purchase') stockAddedToday += Math.abs(mov.quantityChange);
      else if (mov.type === 'sale') stockSoldToday += Math.abs(mov.quantityChange);
      else if (mov.type === 'return') stockReturnedToday += Math.abs(mov.quantityChange);
    }

    // Recent 5 Sales
    const recentSales = await Sale.find({ status: { $ne: 'voided' } })
      .sort({ date: -1 })
      .limit(5)
      .select('receiptNumber customerName grandTotal paymentStatus date');

    // Recent 5 Purchases
    const recentPurchases = await Purchase.find({ status: 'confirmed' })
      .sort({ purchaseDate: -1 })
      .limit(5)
      .select('supplierName invoiceNumber total paymentStatus purchaseDate');

    res.json({
      success: true,
      stats: {
        totalProducts,
        totalAvailableStock: parseFloat(totalAvailableStock.toFixed(2)),
        todaySales: parseFloat(todaySalesTotal.toFixed(2)),
        todayPurchases: parseFloat(todayPurchasesTotal.toFixed(2)),
        todayExpenses: parseFloat(todayExpensesTotal.toFixed(2)),
        todayGrossProfit: parseFloat(todayGrossProfit.toFixed(2)),
        todayEstimatedNetProfit: parseFloat(todayEstimatedNetProfit.toFixed(2)),
        totalCustomers,
        lowStockCount,
      },
      stockActivity: {
        addedToday: parseFloat(stockAddedToday.toFixed(2)),
        soldToday: parseFloat(stockSoldToday.toFixed(2)),
        returnedToday: parseFloat(stockReturnedToday.toFixed(2)),
        currentAvailableStock: parseFloat(totalAvailableStock.toFixed(2)),
      },
      recentSales,
      recentPurchases,
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Detailed Financial & Product Performance Reports
exports.getReports = async (req, res) => {
  try {
    const { period = 'today', startDate, endDate } = req.query;

    const now = new Date();
    let queryDateStart;
    let queryDateEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    if (period === 'today') {
      queryDateStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    } else if (period === 'yesterday') {
      queryDateStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0);
      queryDateEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59);
    } else if (period === 'week') {
      queryDateStart = new Date();
      queryDateStart.setDate(queryDateStart.getDate() - 7);
      queryDateStart.setHours(0, 0, 0, 0);
    } else if (period === 'month') {
      queryDateStart = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (startDate && endDate) {
      queryDateStart = new Date(startDate);
      queryDateEnd = new Date(endDate);
    } else {
      queryDateStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    }

    const sales = await Sale.find({
      status: { $ne: 'voided' },
      date: { $gte: queryDateStart, $lte: queryDateEnd },
    });

    const purchases = await Purchase.find({
      status: 'confirmed',
      purchaseDate: { $gte: queryDateStart, $lte: queryDateEnd },
    });

    const expenses = await Expense.find({
      date: { $gte: queryDateStart, $lte: queryDateEnd },
    });

    const totalSales = sales.reduce((sum, s) => sum + s.grandTotal, 0);
    const totalPurchases = purchases.reduce((sum, p) => sum + p.total, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

    let totalCOGS = 0;
    const itemSoldMap = {};

    for (const sale of sales) {
      for (const item of sale.items) {
        const itemCost = (Number(item.costPrice) || 0) * (Number(item.quantity) || 1);
        totalCOGS += itemCost;

        const pName = item.productName;
        if (!itemSoldMap[pName]) {
          itemSoldMap[pName] = {
            name: pName,
            quantity: 0,
            revenue: 0,
            unit: item.unit || 'KG',
          };
        }
        itemSoldMap[pName].quantity += Number(item.quantity) || 0;
        itemSoldMap[pName].revenue += Number(item.lineTotal) || 0;
      }
    }

    const grossProfit = Math.max(0, parseFloat((totalSales - totalCOGS).toFixed(2)));
    const netProfit = parseFloat((grossProfit - totalExpenses).toFixed(2));

    const bestSellingProducts = Object.values(itemSoldMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    res.json({
      success: true,
      period,
      summary: {
        totalSales: parseFloat(totalSales.toFixed(2)),
        totalPurchases: parseFloat(totalPurchases.toFixed(2)),
        totalExpenses: parseFloat(totalExpenses.toFixed(2)),
        costOfGoodsSold: parseFloat(totalCOGS.toFixed(2)),
        grossProfit,
        netProfit,
        salesCount: sales.length,
        purchasesCount: purchases.length,
      },
      bestSellingProducts,
      expensesBreakdown: expenses,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
