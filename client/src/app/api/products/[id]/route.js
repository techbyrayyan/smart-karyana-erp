export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { verifyAuth } from '../../../../lib/authHelper';
import Product from '../../../../models/Product';
import StockMovement from '../../../../models/StockMovement';

export async function GET(request, { params }) {
  const auth = await verifyAuth(request);
  if (auth.error) {
    return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });
  }

  const product = await Product.findById(params.id);
  if (!product) {
    return NextResponse.json({ success: false, message: 'Product not found' }, { status: 404 });
  }

  const movements = await StockMovement.find({ product: product._id }).sort({ date: -1 }).limit(15);
  return NextResponse.json({ success: true, product, movements });
}

export async function PUT(request, { params }) {
  const auth = await verifyAuth(request);
  if (auth.error) {
    return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });
  }

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

  Object.assign(product, body);
  await product.save();

  return NextResponse.json({ success: true, message: 'Product updated', product });
}

export async function DELETE(request, { params }) {
  const auth = await verifyAuth(request);
  if (auth.error) {
    return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });
  }

  const product = await Product.findById(params.id);
  if (!product) {
    return NextResponse.json({ success: false, message: 'Product not found' }, { status: 404 });
  }

  product.isArchived = true;
  await product.save();

  return NextResponse.json({ success: true, message: 'Product archived', product });
}
