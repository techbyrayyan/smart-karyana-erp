export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { verifyAuth } from '../../../../lib/authHelper';
import ShopProfile from '../../../../models/ShopProfile';

export async function GET(request) {
  const auth = await verifyAuth(request);
  if (auth.error) {
    return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });
  }

  let profile = await ShopProfile.findOne();
  if (!profile) {
    profile = await ShopProfile.create({
      storeName: 'Smart Khata Kiryana Store',
      ownerName: auth.user.username,
    });
  }

  return NextResponse.json({ success: true, profile, user: auth.user });
}

export async function PUT(request) {
  const auth = await verifyAuth(request);
  if (auth.error) {
    return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });
  }

  const body = await request.json();
  let profile = await ShopProfile.findOne();
  if (!profile) profile = new ShopProfile();

  Object.assign(profile, body);
  await profile.save();

  return NextResponse.json({ success: true, message: 'Profile updated', profile });
}
