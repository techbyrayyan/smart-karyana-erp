const Product = require('../models/Product');
const StockMovement = require('../models/StockMovement');
const AuditLog = require('../models/AuditLog');

// Get all products with filters
exports.getProducts = async (req, res) => {
  try {
    const { search, category, lowStock, isArchived } = req.query;

    const query = {
      isArchived: isArchived === 'true' ? true : false,
    };

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [
        { name: regex },
        { nameUrdu: regex },
        { category: regex },
      ];
    }

    if (category && category !== 'all') {
      query.category = category;
    }

    if (lowStock === 'true') {
      query.$expr = { $lte: ['$currentStock', '$minStockAlert'] };
    }

    const products = await Product.find(query).sort({ updatedAt: -1 });
    res.json({
      success: true,
      count: products.length,
      products,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get single product
exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found / پروڈکٹ موجود نہیں ہے' });
    }

    // Also fetch recent stock movements for this product
    const movements = await StockMovement.find({ product: product._id })
      .sort({ date: -1 })
      .limit(15);

    res.json({
      success: true,
      product,
      movements,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create product manually
exports.createProduct = async (req, res) => {
  try {
    const {
      name,
      nameUrdu,
      category,
      purchasePrice,
      sellingPrice,
      currentStock,
      unit,
      minStockAlert,
      variations,
      productImage,
    } = req.body;

    if (!name || purchasePrice === undefined || sellingPrice === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Name, Purchase Price and Selling Price are required / نام، قیمت خرید اور فروخت لازمی ہیں',
      });
    }

    // Default base variation if none provided
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
      productImage: productImage || '',
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

    await AuditLog.create({
      action: 'CREATE_PRODUCT',
      entityType: 'Product',
      entityId: String(product._id),
      details: { name: product.name, currentStock: product.currentStock },
      performedBy: req.user?.username || 'Owner',
    });

    res.status(201).json({
      success: true,
      message: 'Product added successfully / پروڈکٹ کامیابی سے شامل ہو گئی',
      product,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update product
exports.updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found / پروڈکٹ موجود نہیں ہے' });
    }

    const {
      name,
      nameUrdu,
      category,
      purchasePrice,
      sellingPrice,
      currentStock,
      unit,
      minStockAlert,
      variations,
      productImage,
    } = req.body;

    // Track stock change if currentStock was manually adjusted
    if (currentStock !== undefined && Number(currentStock) !== product.currentStock) {
      const diff = Number(currentStock) - product.currentStock;
      await StockMovement.create({
        product: product._id,
        productName: name || product.name,
        type: 'adjustment',
        quantityChange: diff,
        baseUnit: unit || product.unit,
        previousStock: product.currentStock,
        newStock: Number(currentStock),
        notes: 'Manual Stock Correction',
      });
      product.currentStock = Number(currentStock);
    }

    if (name !== undefined) product.name = name.trim();
    if (nameUrdu !== undefined) product.nameUrdu = nameUrdu.trim();
    if (category !== undefined) product.category = category;
    if (purchasePrice !== undefined) product.purchasePrice = Number(purchasePrice);
    if (sellingPrice !== undefined) product.sellingPrice = Number(sellingPrice);
    if (unit !== undefined) product.unit = unit;
    if (minStockAlert !== undefined) product.minStockAlert = Number(minStockAlert);
    if (variations !== undefined) product.variations = variations;
    if (productImage !== undefined) product.productImage = productImage;

    await product.save();

    await AuditLog.create({
      action: 'UPDATE_PRODUCT',
      entityType: 'Product',
      entityId: String(product._id),
      details: req.body,
      performedBy: req.user?.username || 'Owner',
    });

    res.json({
      success: true,
      message: 'Product updated successfully / پروڈکٹ اپڈیٹ ہو گئی',
      product,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Archive / Soft Delete product
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    product.isArchived = true;
    await product.save();

    await AuditLog.create({
      action: 'ARCHIVE_PRODUCT',
      entityType: 'Product',
      entityId: String(product._id),
      details: { name: product.name },
      performedBy: req.user?.username || 'Owner',
    });

    res.json({
      success: true,
      message: 'Product archived safely / پروڈکٹ محفوظ طریقے سے آرکائیو کر دی گئی',
      product,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
