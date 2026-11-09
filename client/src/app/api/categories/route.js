import { NextResponse } from 'next/server';
import connectDB from '../../../lib/db';
import Category from '../../../models/Category';
import Product from '../../../models/Product';
import { verifyAuth } from '../../../lib/authHelper';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    await connectDB();
    const categoriesFromDb = await Category.find().sort({ name: 1 }).lean();
    
    // Also discover any distinct categories already used by existing products
    const productCategories = await Product.distinct('category', { isArchived: false });
    
    const existingNames = new Set(categoriesFromDb.map((c) => c.name.toLowerCase().trim()));
    const extraCategories = [];

    for (const catName of productCategories) {
      if (catName && !existingNames.has(catName.toLowerCase().trim())) {
        extraCategories.push({
          _id: `auto_${catName}`,
          name: catName,
          nameUrdu: '',
        });
        existingNames.add(catName.toLowerCase().trim());
      }
    }

    const allCategories = [...categoriesFromDb, ...extraCategories];

    return NextResponse.json({
      success: true,
      categories: allCategories,
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const body = await request.json();
    const { name, nameUrdu, icon } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, message: 'Category name is required' }, { status: 400 });
    }

    const trimmedName = name.trim();
    const existing = await Category.findOne({
      name: { $regex: new RegExp(`^${trimmedName.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i') },
    }).lean();

    if (existing) {
      return NextResponse.json({
        success: true,
        category: existing,
        message: 'Category already exists',
      });
    }

    const newCategory = await Category.create({
      name: trimmedName,
      nameUrdu: (nameUrdu || '').trim(),
      icon: (icon || '').trim(),
    });

    return NextResponse.json({
      success: true,
      category: newCategory,
    });
  } catch (error) {
    console.error('Error creating category:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, message: 'Category ID required' }, { status: 400 });
    }

    await Category.findByIdAndDelete(id);

    return NextResponse.json({ success: true, message: 'Category deleted' });
  } catch (error) {
    console.error('Error deleting category:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
