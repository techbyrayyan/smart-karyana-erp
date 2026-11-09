export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import connectDB from '../../../../lib/db';
import { verifyAuth } from '../../../../lib/authHelper';
import { parseInvoiceImages } from '../../../../services/aiOcrService';

// Next.js App Router: use route segment config for body size
export const maxDuration = 60; // 60s timeout for AI processing

export async function POST(request) {
  try {
    const auth = await verifyAuth(request);
    if (auth.error) return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });

    await connectDB();

    const formData = await request.formData();
    const files = formData.getAll('invoiceImages');

    if (!files || files.length === 0) {
      return NextResponse.json({ success: false, message: 'No invoice image provided' }, { status: 400 });
    }

    const imageFiles = [];
    for (const file of files) {
      if (!file || typeof file === 'string') continue;
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const mimeType = file.type || 'image/jpeg';
      imageFiles.push({ buffer, mimeType });
    }

    if (imageFiles.length === 0) {
      return NextResponse.json({ success: false, message: 'No valid image files found' }, { status: 400 });
    }

    const result = await parseInvoiceImages(imageFiles);

    return NextResponse.json({ success: true, data: result, invoice: result });
  } catch (error) {
    console.error('AI Invoice Scan error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
