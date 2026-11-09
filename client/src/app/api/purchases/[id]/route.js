import { NextResponse } from 'next/server';
import connectDB from '../../../../lib/db';
import { verifyAuth } from '../../../../lib/authHelper';
import Purchase from '../../../../models/Purchase';

export async function GET(request, { params }) {
  try {
    const auth = await verifyAuth(request);
    if (auth.error) return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });

    await connectDB();
    const purchase = await Purchase.findById(params.id);
    if (!purchase) {
      return NextResponse.json({ success: false, message: 'Purchase not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, purchase });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
