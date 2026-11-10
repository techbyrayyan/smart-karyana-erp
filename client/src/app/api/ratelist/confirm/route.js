export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import connectDB from '../../../../lib/db';
import { verifyAuth } from '../../../../lib/authHelper';
import Product from '../../../../models/Product';
import Counter, { getNextSequenceValue } from '../../../../models/Counter';
import RateListUpload from '../../../../models/RateListUpload';

/**
 * POST /api/ratelist/confirm
 * Atomically commits reviewed Rate List changes to the database.
 * - Assigns monotonically increasing, unique Product IDs to new items.
 * - Preserves existing Product IDs permanently.
 * - Records price history and upload audit trail.
 * - Leaves unmentioned inventory completely untouched.
 */
export async function POST(request) {
  try {
    const auth = await verifyAuth(request);
    if (auth.error) {
      return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });
    }

    await connectDB();

    const body = await request.json();
    const { items, title, notes, source } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No items provided for rate list confirmation' },
        { status: 400 }
      );
    }

    const uploadNumber = await getNextSequenceValue('rateListUpload');

    let updatedCount = 0;
    let newCount = 0;
    let unchangedCount = 0;
    const itemSnapshots = [];

    const now = new Date();

    for (const item of items) {
      const cleanName = (item.productName || '').trim();
      const cleanUrdu = (item.productNameUrdu || '').trim();
      const cleanVariant = (item.variant || '').trim();
      const rawPrice = Number(item.price) || 0;
      const cleanPrice = Math.round((rawPrice + Number.EPSILON) * 100) / 100;
      const unitType = item.unitType === 'weight' ? 'weight' : 'piece';
      const unit = item.unit || (unitType === 'weight' ? '1 KG' : '1 Piece');
      const category = item.category || 'General Kiryana';

      if (!cleanName && !cleanUrdu) {
        continue; // Skip invalid empty rows
      }

      // Check if existing product
      let existingProd = null;
      if (item.matchedProductId) {
        existingProd = await Product.findById(item.matchedProductId);
      } else if (item.isExisting && item.matchedDisplayId) {
        existingProd = await Product.findOne({ productId: item.matchedDisplayId });
      }

      if (existingProd) {
        // Ensure existing product has a permanent productId if it was created before counter system
        if (!existingProd.productId) {
          existingProd.productId = await getNextSequenceValue('productId');
        }

        const oldPrice = existingProd.pricePerUnit || existingProd.salePrice || 0;
        const priceChanged = cleanPrice > 0 && cleanPrice !== oldPrice;

        if (priceChanged) {
          existingProd.priceHistory = existingProd.priceHistory || [];
          existingProd.priceHistory.push({
            price: cleanPrice,
            previousPrice: oldPrice,
            newPrice: cleanPrice,
            changedAt: now,
            source: 'rate_list_upload',
            note: `Updated via Rate List Upload #${uploadNumber}`,
          });

          existingProd.salePrice = cleanPrice;
          existingProd.pricePerUnit = cleanPrice;
          existingProd.lastRateListUpdate = now;
          if (cleanUrdu && !existingProd.nameUrdu) existingProd.nameUrdu = cleanUrdu;
          if (cleanVariant && !existingProd.variant) existingProd.variant = cleanVariant;

          await existingProd.save();
          updatedCount++;

          itemSnapshots.push({
            productId: existingProd.productId,
            productName: existingProd.name,
            name: existingProd.name,
            productNameUrdu: existingProd.nameUrdu,
            nameUrdu: existingProd.nameUrdu,
            variant: existingProd.variant,
            unitType: existingProd.unitType,
            unit: existingProd.unit,
            oldPrice,
            newPrice: cleanPrice,
            status: 'updated',
            action: 'updated',
          });
        } else {
          // Price unchanged - touch lastRateListUpdate
          existingProd.lastRateListUpdate = now;
          await existingProd.save();
          unchangedCount++;

          itemSnapshots.push({
            productId: existingProd.productId,
            productName: existingProd.name,
            name: existingProd.name,
            productNameUrdu: existingProd.nameUrdu,
            nameUrdu: existingProd.nameUrdu,
            variant: existingProd.variant,
            unitType: existingProd.unitType,
            unit: existingProd.unit,
            oldPrice,
            newPrice: oldPrice,
            status: 'unchanged',
            action: 'unchanged',
          });
        }
      } else {
        // New Product: assign next atomic sequential Product ID
        const nextId = await getNextSequenceValue('productId');

        const newProd = await Product.create({
          productId: nextId,
          name: cleanName || cleanUrdu,
          nameUrdu: cleanUrdu,
          variant: cleanVariant,
          unit,
          unitType,
          salePrice: cleanPrice,
          pricePerUnit: cleanPrice,
          purchasePrice: 0,
          currentStock: 0,
          category,
          minStockAlert: 5,
          lastRateListUpdate: now,
          priceHistory: [
            {
              price: cleanPrice,
              previousPrice: 0,
              newPrice: cleanPrice,
              changedAt: now,
              source: 'rate_list_upload',
              note: `Initial rate list entry #${uploadNumber}`,
            },
          ],
        });

        newCount++;

        itemSnapshots.push({
          productId: nextId,
          productName: newProd.name,
          name: newProd.name,
          productNameUrdu: newProd.nameUrdu,
          nameUrdu: newProd.nameUrdu,
          variant: newProd.variant,
          unitType: newProd.unitType,
          unit: newProd.unit,
          oldPrice: 0,
          newPrice: cleanPrice,
          status: 'new',
          action: 'created',
        });
      }
    }

    // Save audit record
    await RateListUpload.create({
      uploadNumber,
      uploadedBy: auth.user?._id || null,
      source: source || 'ai_scan',
      title: title || `Rate List Update #${uploadNumber}`,
      notes: notes || '',
      itemsCount: itemSnapshots.length,
      newProductsCount: newCount,
      updatedPricesCount: updatedCount,
      unchangedPricesCount: unchangedCount,
      items: itemSnapshots,
    });

    return NextResponse.json({
      success: true,
      message: `Rate list saved: ${newCount} new products created, ${updatedCount} prices updated, ${unchangedCount} unchanged.`,
      uploadNumber,
      summary: {
        total: itemSnapshots.length,
        newCount,
        updatedCount,
        unchangedCount,
      },
    });
  } catch (error) {
    console.error('Rate list confirm error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
