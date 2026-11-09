const Customer = require('../models/Customer');
const Sale = require('../models/Sale');
const AuditLog = require('../models/AuditLog');

exports.getCustomers = async (req, res) => {
  try {
    const { search, hasBalance } = req.query;
    const query = { isArchived: false };

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [{ name: regex }, { phone: regex }, { address: regex }];
    }

    if (hasBalance === 'true') {
      query.balance = { $gt: 0 };
    }

    const customers = await Customer.find(query).sort({ updatedAt: -1 });
    res.json({
      success: true,
      count: customers.length,
      customers,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getCustomerById = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found / گاہک نہیں ملا' });
    }

    // Fetch customer's receipts / sales history
    const sales = await Sale.find({ customer: customer._id })
      .sort({ date: -1 })
      .limit(50);

    res.json({
      success: true,
      customer,
      sales,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createCustomer = async (req, res) => {
  try {
    const { name, phone, address, initialBalance = 0, notes } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Customer name is required / گاہک کا نام لازمی ہے' });
    }

    const customer = await Customer.create({
      name: name.trim(),
      phone: (phone || '').trim(),
      address: (address || '').trim(),
      balance: Number(initialBalance) || 0,
      notes: notes || '',
    });

    await AuditLog.create({
      action: 'CREATE_CUSTOMER',
      entityType: 'Customer',
      entityId: String(customer._id),
      details: { name: customer.name, phone: customer.phone },
      performedBy: req.user?.username || 'Owner',
    });

    res.status(201).json({
      success: true,
      message: 'Customer added successfully / گاہک شامل ہو گیا ہے',
      customer,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateCustomer = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    const { name, phone, address, notes, balance } = req.body;
    if (name !== undefined) customer.name = name.trim();
    if (phone !== undefined) customer.phone = phone.trim();
    if (address !== undefined) customer.address = address.trim();
    if (notes !== undefined) customer.notes = notes;
    if (balance !== undefined) customer.balance = Number(balance);

    await customer.save();

    res.json({
      success: true,
      message: 'Customer updated / گاہک کی تفصیلات محفوظ ہو گئیں',
      customer,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Record payment from customer towards outstanding balance (Udhaar payment)
exports.recordCustomerPayment = async (req, res) => {
  try {
    const { amount, notes } = req.body;
    const paymentAmount = Number(amount);

    if (!paymentAmount || paymentAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid payment amount required' });
    }

    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    const previousBalance = customer.balance;
    const newBalance = Math.max(0, parseFloat((previousBalance - paymentAmount).toFixed(2)));
    customer.balance = newBalance;
    await customer.save();

    await AuditLog.create({
      action: 'CUSTOMER_PAYMENT',
      entityType: 'Customer',
      entityId: String(customer._id),
      details: {
        paymentAmount,
        previousBalance,
        newBalance,
        notes: notes || 'Udhaar clearance',
      },
      performedBy: req.user?.username || 'Owner',
    });

    res.json({
      success: true,
      message: `Payment of Rs. ${paymentAmount} recorded. Remaining balance: Rs. ${newBalance} / وصولی درج کر لی گئی`,
      customer,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    customer.isArchived = true;
    await customer.save();

    res.json({
      success: true,
      message: 'Customer archived safely / گاہک آرکائیو کر دیا گیا',
      customer,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
