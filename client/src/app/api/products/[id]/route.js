export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import connectDB from '../../../../lib/db';
import { verifyAuth } from '../../../../lib/authHelper';
import Product from '../../../../models/Product';
import StockMovement from '../../../../models/StockMovement';
import Category from '../../../../models/Category';

export async function GET(request, { params }) {
  try {
    const auth = await verifyAuth(request);
    if (auth.error) {
      return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });
    }

    await connectDB();
    const product = await Product.findById(params.id).lean();
    if (!product) {
      return NextResponse.json({ success: false, message: 'Product not found' }, { status: 404 });
    }

    const movements = await StockMovement.find({ product: product._id }).sort({ createdAt: -1 }).limit(15).lean();
    return NextResponse.json({ success: true, product, movements });
  } catch (error) {
    console.error('Product GET error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const auth = await verifyAuth(request);
    if (auth.error) {
      return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });
    }

    await connectDB();
    const product = await Product.findById(params.id);
    if (!product) {
      return NextResponse.json({ success: false, message: 'Product not found' }, { status: 404 });
    }

    const body = await request.json();
    if (body.currentStock !== undefined && Number(body.currentStock) !== product.currentStock) {
      const diff = Number(body.currentStock) - product.currentStock;
      await StockMovement.create({
        product: product._id,
        productName: body.name || product.name,
        type: 'adjustment',
        quantityChange: diff,
        baseUnit: body.unit || product.unit,
        previousStock: product.currentStock,
        newStock: Number(body.currentStock),
        notes: 'Manual Stock Correction',
      });
    }

    if (body.category && typeof body.category === 'string') {
      const catTrim = body.category.trim();
      try {
        await Category.findOneAndUpdate(
          { name: { $regex: new RegExp(`^${catTrim.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i') } },
          { $setOnInsert: { name: catTrim } },
          { upsert: true }
        );
      } catch (e) {}
    }

    Object.assign(product, body);
    await product.save();

    return NextResponse.json({ success: true, message: 'Product updated successfully', product });
  } catch (error) {
    console.error('Product PUT error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const auth = await verifyAuth(request);
    if (auth.error) {
      return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });
    }

    await connectDB();
    const product = await Product.findById(params.id);
    if (!product) {
      return NextResponse.json({ success: false, message: 'Product not found' }, { status: 404 });
    }

    product.isArchived = true;
    await product.save();

    return NextResponse.json({ success: true, message: 'Product archived successfully', product });
  } catch (error) {
    console.error('Product DELETE error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
