export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import connectDB from '../../../../lib/db';
import { verifyAuth } from '../../../../lib/authHelper';
import RateListUpload from '../../../../models/RateListUpload';

/**
 * GET /api/ratelist/history
 * Returns the history log of all past Rate List uploads and updates
 */
export async function GET(request) {
  try {
    const auth = await verifyAuth(request);
    if (auth.error) {
      return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });
    }

    await connectDB();

    const history = await RateListUpload.find()
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return NextResponse.json({
      success: true,
      history,
    });
  } catch (error) {
    console.error('Rate list history error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
