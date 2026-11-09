const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ShopProfile = require('../models/ShopProfile');
const AuditLog = require('../models/AuditLog');

const signToken = (userId) => {
  const secret = process.env.JWT_SECRET || 'kiryana_smart_khata_secure_jwt_secret_2026_x9281';
  return jwt.sign({ userId }, secret, { expiresIn: '30d' });
};

// Check if initial setup is needed, or login
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required / یوزر نیم اور پاس ورڈ ضروری ہے',
      });
    }

    // Check if any kiryana store owner user exists in database
    const userCount = await User.countDocuments({ role: 'owner' });

    if (userCount === 0) {
      // First-time automatic setup for Kiryana Store Owner
      const newUser = await User.create({
        username: username.toLowerCase().trim(),
        password: password,
        role: 'owner',
      });

      // Also ensure ShopProfile exists
      let profile = await ShopProfile.findOne();
      if (!profile) {
        profile = await ShopProfile.create({
          storeName: 'Smart Khata Kiryana Store',
          ownerName: username,
          openingTime: '07:00 AM',
          closingTime: '11:00 PM',
          shopPhone: '',
          shopAddress: 'Main Market',
          selectedLanguage: 'en',
        });
      }

      const token = signToken(newUser._id);

      await AuditLog.create({
        action: 'INITIAL_STORE_SETUP',
        entityType: 'Auth',
        entityId: String(newUser._id),
        details: { username: newUser.username },
        performedBy: newUser.username,
      });

      return res.status(201).json({
        success: true,
        message: 'Initial store account created successfully / دکان کا اکاؤنٹ بن گیا ہے',
        token,
        user: {
          id: newUser._id,
          username: newUser.username,
          role: newUser.role,
        },
        profile,
      });
    }

    // Existing user login
    const user = await User.findOne({ username: username.toLowerCase().trim() });
    if (!user || !user.password) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password / یوزر نیم یا پاس ورڈ غلط ہے',
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password / یوزر نیم یا پاس ورڈ غلط ہے',
      });
    }

    let profile = await ShopProfile.findOne();
    if (!profile) {
      profile = await ShopProfile.create({
        storeName: 'Smart Khata Kiryana Store',
        ownerName: user.username,
      });
    }

    const token = signToken(user._id);

    return res.json({
      success: true,
      message: 'Login successful / لاگ ان کامیاب',
      token,
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
      },
      profile,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getProfile = async (req, res) => {
  try {
    let profile = await ShopProfile.findOne();
    if (!profile) {
      profile = await ShopProfile.create({
        storeName: 'Smart Khata Kiryana Store',
        ownerName: req.user.username,
        openingTime: '07:00 AM',
        closingTime: '11:00 PM',
      });
    }

    res.json({
      success: true,
      profile,
      user: req.user,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const {
      storeName,
      ownerName,
      openingTime,
      closingTime,
      shopPhone,
      shopAddress,
      shopLogo,
      selectedLanguage,
      allowNegativeStock,
      receiptSettings,
    } = req.body;

    let profile = await ShopProfile.findOne();
    if (!profile) {
      profile = new ShopProfile();
    }

    if (storeName !== undefined) profile.storeName = storeName;
    if (ownerName !== undefined) profile.ownerName = ownerName;
    if (openingTime !== undefined) profile.openingTime = openingTime;
    if (closingTime !== undefined) profile.closingTime = closingTime;
    if (shopPhone !== undefined) profile.shopPhone = shopPhone;
    if (shopAddress !== undefined) profile.shopAddress = shopAddress;
    if (shopLogo !== undefined) profile.shopLogo = shopLogo;
    if (selectedLanguage !== undefined) profile.selectedLanguage = selectedLanguage;
    if (allowNegativeStock !== undefined) profile.allowNegativeStock = allowNegativeStock;
    if (receiptSettings !== undefined) profile.receiptSettings = { ...profile.receiptSettings, ...receiptSettings };

    await profile.save();

    await AuditLog.create({
      action: 'UPDATE_PROFILE',
      entityType: 'Profile',
      entityId: String(profile._id),
      details: req.body,
      performedBy: req.user.username,
    });

    res.json({
      success: true,
      message: 'Profile updated successfully / پروفائل محفوظ ہو گئی ہے',
      profile,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'All fields required' });
    }

    const user = await User.findById(req.user._id);
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect / پرانا پاس ورڈ غلط ہے',
      });
    }

    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully / پاس ورڈ تبدیل کر دیا گیا ہے',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
