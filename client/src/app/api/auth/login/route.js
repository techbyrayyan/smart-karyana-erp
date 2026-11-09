import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '../../../../lib/db';
import User from '../../../../models/User';
import ShopProfile from '../../../../models/ShopProfile';
import AuditLog from '../../../../models/AuditLog';

export async function POST(request) {
  try {
    await connectDB();
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { success: false, message: 'Username and password required' },
        { status: 400 }
      );
    }

    const secret = process.env.JWT_SECRET || 'kiryana_smart_khata_secure_jwt_secret_2026_x9281';

    // Check if any owner user exists
    const userCount = await User.countDocuments({ role: 'owner' });

    if (userCount === 0) {
      const newUser = await User.create({
        username: username.toLowerCase().trim(),
        password: password,
        role: 'owner',
      });

      let profile = await ShopProfile.findOne();
      if (!profile) {
        profile = await ShopProfile.create({
          storeName: 'Smart Khata Kiryana Store',
          ownerName: username,
        });
      }

      const token = jwt.sign({ userId: newUser._id }, secret, { expiresIn: '30d' });

      return NextResponse.json({
        success: true,
        message: 'Account created',
        token,
        user: { id: newUser._id, username: newUser.username, role: newUser.role },
        profile,
      });
    }

    const user = await User.findOne({ username: username.toLowerCase().trim() });
    if (!user || !user.password) {
      return NextResponse.json(
        { success: false, message: 'Invalid username or password' },
        { status: 401 }
      );
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return NextResponse.json(
        { success: false, message: 'Invalid username or password' },
        { status: 401 }
      );
    }

    let profile = await ShopProfile.findOne();
    if (!profile) {
      profile = await ShopProfile.create({
        storeName: 'Smart Khata Kiryana Store',
        ownerName: user.username,
      });
    }

    const token = jwt.sign({ userId: user._id }, secret, { expiresIn: '30d' });

    return NextResponse.json({
      success: true,
      message: 'Login successful',
      token,
      user: { id: user._id, username: user.username, role: user.role },
      profile,
    });
  } catch (error) {
    console.error('API login error:', error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
