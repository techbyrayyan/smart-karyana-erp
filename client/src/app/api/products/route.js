export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { verifyAuth } from '../../../lib/authHelper';
import Product from '../../../models/Product';
import StockMovement from '../../../models/StockMovement';

export async function GET(request) {
  const auth = await verifyAuth(request);
  if (auth.error) {
    return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search');
  const category = searchParams.get('category');
  const lowStock = searchParams.get('lowStock');

  const query = { isArchived: false };

  if (search && search.trim()) {
    const regex = new RegExp(search.trim(), 'i');
    query.$or = [{ name: regex }, { nameUrdu: regex }, { category: regex }];
  }

  if (category && category !== 'all' && category !== 'All') {
    query.category = category;
  }

  if (lowStock === 'true') {
    query.$expr = { $lte: ['$currentStock', '$minStockAlert'] };
  }

  const products = await Product.find(query).sort({ updatedAt: -1 });
  return NextResponse.json({ success: true, count: products.length, products });
}

export async function POST(request) {
  const auth = await verifyAuth(request);
  if (auth.error) {
    return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });
  }

  const body = await request.json();
  const { name, nameUrdu, category, purchasePrice, sellingPrice, currentStock, unit, minStockAlert, variations } = body;

  let processedVariations = variations;
  if (!processedVariations || processedVariations.length === 0) {
    processedVariations = [
      {
        name: `1 ${unit || 'KG'}`,
        unit: unit || 'KG',
        multiplier: 1,
        price: Number(sellingPrice),
        isActive: true,
      },
    ];
  }

  const product = await Product.create({
    name: name.trim(),
    nameUrdu: (nameUrdu || '').trim(),
    category: category || 'General Kiryana',
    purchasePrice: Number(purchasePrice),
    sellingPrice: Number(sellingPrice),
    currentStock: Number(currentStock) || 0,
    unit: (unit || 'KG').trim(),
    minStockAlert: Number(minStockAlert) || 5,
    variations: processedVariations,
  });

  if (Number(currentStock) > 0) {
    await StockMovement.create({
      product: product._id,
      productName: product.name,
      type: 'adjustment',
      quantityChange: Number(currentStock),
      baseUnit: product.unit,
      previousStock: 0,
      newStock: Number(currentStock),
      notes: 'Initial Stock on Creation',
    });
  }

  return NextResponse.json({ success: true, message: 'Product created', product }, { status: 201 });
}
