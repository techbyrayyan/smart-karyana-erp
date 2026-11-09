export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import connectDB from '../../../../lib/db';
import { verifyAuth } from '../../../../lib/authHelper';
import User from '../../../../models/User';

export async function POST(request) {
  try {
    const auth = await verifyAuth(request);
    if (auth.error) return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });

    await connectDB();
    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ success: false, message: 'All fields required' }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { success: false, message: 'New password must be at least 6 characters' },
        { status: 400 }
      );
    }

    const user = await User.findById(auth.user._id);
    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return NextResponse.json(
        { success: false, message: 'Current password is incorrect' },
        { status: 400 }
      );
    }

    user.password = newPassword;
    await user.save();

    return NextResponse.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
