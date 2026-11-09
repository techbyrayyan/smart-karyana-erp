import Product from '../models/Product.js';
import StockMovement from '../models/StockMovement.js';
import ShopProfile from '../models/ShopProfile.js';

/**
 * Decrement stock for sold items with unit variation conversion
 */
export async function deductSaleStock(saleItems, saleId, notes = 'Customer Sale') {
  const profile = await ShopProfile.findOne();
  const allowNegative = profile?.allowNegativeStock ?? false;

  const movements = [];

  for (const item of saleItems) {
    const product = await Product.findById(item.product);
    if (!product) {
      throw new Error(`Product not found: ${item.productName}`);
    }

    const multiplier = Number(item.multiplier) || 1;
    const baseQuantityDeduction = Number(item.quantity) * multiplier;

    if (!allowNegative && product.currentStock < baseQuantityDeduction) {
      throw new Error(
        `Insufficient stock for "${product.name}". Available: ${product.currentStock} ${product.unit}, Requested: ${baseQuantityDeduction} ${product.unit}.`
      );
    }

    const previousStock = product.currentStock;
    const newStock = Math.max(0, parseFloat((previousStock - baseQuantityDeduction).toFixed(3)));

    product.currentStock = newStock;
    await product.save();

    const movement = await StockMovement.create({
      product: product._id,
      productName: product.name,
      type: 'sale',
      quantityChange: -baseQuantityDeduction,
      baseUnit: product.unit,
      previousStock,
      newStock,
      referenceId: String(saleId),
      referenceModel: 'Sale',
      notes: `${notes} (${item.variationName || item.unit}: ${item.quantity})`,
    });

    movements.push(movement);
  }

  return movements;
}

/**
 * Add stock for verified supplier purchases
 */
export async function addPurchaseStock(purchaseItems, purchaseId, notes = 'Supplier Purchase') {
  const movements = [];

  for (const item of purchaseItems) {
    let product;

    if (item.product) {
      product = await Product.findById(item.product);
    }

    if (product) {
      const multiplier = Number(item.multiplier) || 1;
      const baseQuantityAddition = Number(item.quantity) * multiplier;
      const previousStock = product.currentStock;
      const newStock = parseFloat((previousStock + baseQuantityAddition).toFixed(3));

      product.currentStock = newStock;
      if (item.unitPrice && item.unitPrice > 0) {
        product.purchasePrice = parseFloat((Number(item.unitPrice) / multiplier).toFixed(2));
      }
      await product.save();

      const movement = await StockMovement.create({
        product: product._id,
        productName: product.name,
        type: 'purchase',
        quantityChange: baseQuantityAddition,
        baseUnit: product.unit,
        previousStock,
        newStock,
        referenceId: String(purchaseId),
        referenceModel: 'Purchase',
        notes: `${notes} (${item.quantity} ${item.unit})`,
      });

      movements.push(movement);
    } else {
      const multiplier = Number(item.multiplier) || 1;
      const baseStock = Number(item.quantity) * multiplier;
      const purchasePricePerBase = parseFloat((Number(item.unitPrice) / multiplier).toFixed(2));
      const defaultSellingPrice = Math.round(purchasePricePerBase * 1.15);

      const newProduct = await Product.create({
        name: item.productName,
        nameUrdu: item.productNameUrdu || '',
        category: item.category || 'General Kiryana',
        productImage: item.productImage || '',
        purchasePrice: purchasePricePerBase,
        sellingPrice: defaultSellingPrice,
        currentStock: baseStock,
        unit: item.unit || 'KG',
        minStockAlert: 5,
        variations: [
          {
            name: `1 ${item.unit || 'KG'}`,
            unit: item.unit || 'KG',
            multiplier: 1,
            price: defaultSellingPrice,
            isActive: true,
          },
        ],
      });

      item.product = newProduct._id;

      const movement = await StockMovement.create({
        product: newProduct._id,
        productName: newProduct.name,
        type: 'purchase',
        quantityChange: baseStock,
        baseUnit: newProduct.unit,
        previousStock: 0,
        newStock: baseStock,
        referenceId: String(purchaseId),
        referenceModel: 'Purchase',
        notes: `New Product created from Purchase: ${item.productName}`,
      });

      movements.push(movement);
    }
  }

  return movements;
}

/**
 * Rebalance stock when a sale is updated or voided
 */
export async function revertSaleStock(oldSaleItems, saleId, notes = 'Sale Reversal / Void') {
  for (const item of oldSaleItems) {
    const product = await Product.findById(item.product);
    if (product) {
      const multiplier = Number(item.multiplier) || 1;
      const baseQuantityRefund = Number(item.quantity) * multiplier;
      const previousStock = product.currentStock;
      const newStock = parseFloat((previousStock + baseQuantityRefund).toFixed(3));

      product.currentStock = newStock;
      await product.save();

      await StockMovement.create({
        product: product._id,
        productName: product.name,
        type: 'return',
        quantityChange: baseQuantityRefund,
        baseUnit: product.unit,
        previousStock,
        newStock,
        referenceId: String(saleId),
        referenceModel: 'Sale',
        notes,
      });
    }
  }
}
