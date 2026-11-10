export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import connectDB from '../../../lib/db';
import { verifyAuth } from '../../../lib/authHelper';
import Product from '../../../models/Product';
import Counter from '../../../models/Counter';

/**
 * GET /api/ratelist
 * Fetches all products in the active rate list with search, filter & metadata
 */
export async function GET(request) {
  try {
    const auth = await verifyAuth(request);
    if (auth.error) {
      return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';
    const category = searchParams.get('category') || '';
    const unitType = searchParams.get('unitType') || '';

    const filter = { isArchived: false };

    if (category && category !== 'all') {
      filter.category = category;
    }

    if (unitType && unitType !== 'all') {
      filter.unitType = unitType;
    }

    if (q) {
      const qTrim = q.trim();
      const numQ = Number(qTrim);
      const orClauses = [
        { name: { $regex: qTrim, $options: 'i' } },
        { nameUrdu: { $regex: qTrim, $options: 'i' } },
        { barcode: { $regex: qTrim, $options: 'i' } },
        { variant: { $regex: qTrim, $options: 'i' } },
      ];
      if (!isNaN(numQ) && numQ > 0) {
        orClauses.push({ productId: numQ });
      }
      filter.$or = orClauses;
    }

    // Sort by productId ascending (1, 2, 3...) or name
    const products = await Product.find(filter)
      .sort({ productId: 1, createdAt: -1 })
      .lean();

    // Compute stats
    const totalItems = products.length;
    const weightItems = products.filter(p => p.unitType === 'weight').length;
    const pieceItems = products.filter(p => p.unitType !== 'weight').length;

    // Find most recent rate list update date
    let lastUploadDate = null;
    for (const p of products) {
      if (p.lastRateListUpdate && (!lastUploadDate || new Date(p.lastRateListUpdate) > new Date(lastUploadDate))) {
        lastUploadDate = p.lastRateListUpdate;
      }
    }

    return NextResponse.json({
      success: true,
      stats: {
        totalItems,
        weightItems,
        pieceItems,
        lastUploadDate,
      },
      products,
    });
  } catch (error) {
    console.error('Rate list GET error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

/**
 * PUT /api/ratelist
 * Manual quick price update for an individual product in the rate list
 */
export async function PUT(request) {
  try {
    const auth = await verifyAuth(request);
    if (auth.error) {
      return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });
    }

    await connectDB();
    const body = await request.json();
    const { id, price, unit, unitType, reason } = body;

    if (!id) {
      return NextResponse.json({ success: false, message: 'Product ID is required' }, { status: 400 });
    }

    const newPrice = Number(price);
    if (isNaN(newPrice) || newPrice < 0) {
      return NextResponse.json({ success: false, message: 'Valid price is required' }, { status: 400 });
    }

    const product = await Product.findById(id);
    if (!product) {
      return NextResponse.json({ success: false, message: 'Product not found' }, { status: 404 });
    }

    const previousPrice = product.pricePerUnit || product.salePrice || 0;

    // Record price history
    if (newPrice !== previousPrice) {
      product.priceHistory = product.priceHistory || [];
      product.priceHistory.push({
        previousPrice,
        newPrice,
        changedAt: new Date(),
        source: 'manual_edit',
        note: reason || 'Manual price update from Rate List screen',
      });
    }

    product.pricePerUnit = newPrice;
    product.salePrice = newPrice;
    product.lastRateListUpdate = new Date();
    if (unit) product.unit = unit;
    if (unitType) product.unitType = unitType;

    await product.save();

    return NextResponse.json({
      success: true,
      message: 'Rate list price updated successfully',
      product,
    });
  } catch (error) {
    console.error('Rate list PUT error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

/**
 * POST /api/ratelist
 * Add single new product to rate list with automatically generated unique sequential Product ID
 */
export async function POST(request) {
  try {
    const auth = await verifyAuth(request);
    if (auth.error) {
      return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });
    }

    await connectDB();
    const body = await request.json();
    const { name, nameUrdu, variant, unit, unitType, price, purchasePrice, category, minStockAlert } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, message: 'Product name is required' }, { status: 400 });
    }

    const cleanPrice = Number(price) || 0;
    const cleanPurchasePrice = Number(purchasePrice) || 0;
    const inferredUnitType = unitType || (['kg', 'gram', 'liter'].some(u => (unit || '').toLowerCase().includes(u)) ? 'weight' : 'piece');

    // Get atomic sequential Product ID
    const nextId = await Counter.getNextSequenceValue('productId');

    const product = await Product.create({
      productId: nextId,
      name: name.trim(),
      nameUrdu: nameUrdu?.trim() || '',
      variant: variant?.trim() || '',
      unit: unit || (inferredUnitType === 'weight' ? 'KG' : 'Piece'),
      unitType: inferredUnitType,
      salePrice: cleanPrice,
      pricePerUnit: cleanPrice,
      purchasePrice: cleanPurchasePrice,
      category: category || 'General Kiryana',
      minStockAlert: Number(minStockAlert) || 5,
      lastRateListUpdate: new Date(),
      priceHistory: [
        {
          previousPrice: 0,
          newPrice: cleanPrice,
          changedAt: new Date(),
          source: 'manual_edit',
          note: 'Initial rate list creation',
        },
      ],
    });

    return NextResponse.json({
      success: true,
      message: `Product added with ID #${nextId}`,
      product,
    });
  } catch (error) {
    console.error('Rate list POST error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
