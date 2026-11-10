export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import connectDB from '../../../lib/db';
import { verifyAuth } from '../../../lib/authHelper';
import Product from '../../../models/Product';
import StockMovement from '../../../models/StockMovement';
import Category from '../../../models/Category';
import Counter from '../../../models/Counter';

export async function GET(request) {
  try {
    const auth = await verifyAuth(request);
    if (auth.error) {
      return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });
    }

    await connectDB();
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

    const products = await Product.find(query).sort({ updatedAt: -1 }).lean();
    return NextResponse.json({ success: true, count: products.length, products });
  } catch (error) {
    console.error('Products GET error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const auth = await verifyAuth(request);
    if (auth.error) {
      return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });
    }

    await connectDB();
    const body = await request.json();
    const { name, nameUrdu, category, purchasePrice, sellingPrice, currentStock, unit, minStockAlert, variations, productImage } = body;

    let processedVariations = variations;
    if (!processedVariations || processedVariations.length === 0) {
      processedVariations = [
        {
          name: `1 ${unit || 'KG'}`,
          unit: unit || 'KG',
          multiplier: 1,
          price: Number(sellingPrice) || 0,
          isActive: true,
        },
      ];
    }

    const trimmedCategory = (category || 'General Kiryana').trim();

    // Auto-register category if not present
    if (trimmedCategory) {
      try {
        await Category.findOneAndUpdate(
          { name: { $regex: new RegExp(`^${trimmedCategory.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i') } },
          { $setOnInsert: { name: trimmedCategory } },
          { upsert: true }
        );
      } catch (catErr) {
        // non-blocking
      }
    }

    // Assign atomic sequential Product ID
    const nextProductId = await Counter.getNextSequenceValue('productId');
    const cleanSellPrice = Number(sellingPrice) || 0;
    const cleanUnit = unit || 'KG';
    const inferredUnitType = ['kg', 'gram', 'liter'].some(u => cleanUnit.toLowerCase().includes(u)) ? 'weight' : 'piece';

    const product = await Product.create({
      productId: nextProductId,
      name: name.trim(),
      nameUrdu: (nameUrdu || '').trim(),
      category: trimmedCategory,
      productImage: productImage || '',
      purchasePrice: Number(purchasePrice) || 0,
      sellingPrice: cleanSellPrice,
      salePrice: cleanSellPrice,
      pricePerUnit: cleanSellPrice,
      unitType: inferredUnitType,
      currentStock: Number(currentStock) || 0,
      unit: cleanUnit,
      minStockAlert: Number(minStockAlert) || 5,
      lastRateListUpdate: new Date(),
      priceHistory: [
        {
          previousPrice: 0,
          newPrice: cleanSellPrice,
          changedAt: new Date(),
          source: 'manual_edit',
          note: 'Initial product creation',
        },
      ],
      variations: processedVariations,
    });

    if (Number(currentStock) > 0) {
      await StockMovement.create({
        product: product._id,
        productName: product.name,
        type: 'purchase',
        quantityChange: Number(currentStock),
        baseUnit: product.unit,
        previousStock: 0,
        newStock: Number(currentStock),
        notes: 'Initial Product Stock',
      });
    }

    return NextResponse.json({ success: true, message: 'Product created successfully', product }, { status: 201 });
  } catch (error) {
    console.error('Products POST error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
