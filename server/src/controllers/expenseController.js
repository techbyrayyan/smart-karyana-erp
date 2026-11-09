const Expense = require('../models/Expense');
const AuditLog = require('../models/AuditLog');

exports.getExpenses = async (req, res) => {
  try {
    const { category, filter, startDate, endDate } = req.query;
    const query = {};

    if (category && category !== 'all') {
      query.category = category;
    }

    const now = new Date();
    if (filter === 'today') {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      query.date = { $gte: startOfDay, $lte: endOfDay };
    } else if (filter === 'this_month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      query.date = { $gte: startOfMonth };
    } else if (startDate && endDate) {
      query.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    const expenses = await Expense.find(query).sort({ date: -1 });
    const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);

    res.json({
      success: true,
      count: expenses.length,
      totalAmount,
      expenses,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createExpense = async (req, res) => {
  try {
    const { title, category, amount, date, description } = req.body;

    if (!title || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Expense title and amount are required / خرچے کا نام اور رقم ضروری ہے',
      });
    }

    const expense = await Expense.create({
      title: title.trim(),
      category: category || 'Other',
      amount: Number(amount),
      date: date ? new Date(date) : new Date(),
      description: description || '',
    });

    await AuditLog.create({
      action: 'CREATE_EXPENSE',
      entityType: 'Expense',
      entityId: String(expense._id),
      details: { title: expense.title, amount: expense.amount },
      performedBy: req.user?.username || 'Owner',
    });

    res.status(201).json({
      success: true,
      message: 'Expense recorded successfully / خرچہ درج کر لیا گیا',
      expense,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteExpense = async (req, res) => {
  try {
    const expense = await Expense.findByIdAndDelete(req.params.id);
    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }

    res.json({
      success: true,
      message: 'Expense deleted / خرچہ حذف کر دیا گیا',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
