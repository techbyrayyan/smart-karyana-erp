export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import connectDB from '../../../../lib/db';
import { verifyAuth } from '../../../../lib/authHelper';
import { parseRateListImages } from '../../../../services/aiOcrService';

/**
 * POST /api/ratelist/scan
 * Receives rate list image(s) from camera capture or gallery upload,
 * runs Gemini Vision OCR, matches with existing inventory,
 * and returns proposed items for user review & editing.
 */
export async function POST(request) {
  try {
    const auth = await verifyAuth(request);
    if (auth.error) {
      return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });
    }

    await connectDB();

    const formData = await request.formData();
    const files = formData.getAll('images');

    if (!files || files.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Please provide at least one rate list image to scan' },
        { status: 400 }
      );
    }

    const imageFiles = [];
    for (const file of files) {
      if (typeof file === 'object' && typeof file.arrayBuffer === 'function') {
        const buffer = Buffer.from(await file.arrayBuffer());
        imageFiles.push({
          buffer,
          mimeType: file.type || 'image/jpeg',
          name: file.name,
        });
      }
    }

    if (imageFiles.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No valid image data received' },
        { status: 400 }
      );
    }

    const scanResult = await parseRateListImages(imageFiles);

    return NextResponse.json({
      success: true,
      message: `Extracted ${scanResult.totalExtracted} items from Rate List`,
      data: scanResult,
    });
  } catch (error) {
    console.error('Rate list scan API error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Error processing rate list image' },
      { status: 500 }
    );
  }
}
