/**
 * Kiryana & Grocery Pricing Calculator
 * Handles accurate weight conversions, kiryana presets, and piece-based calculations.
 */

// Kiryana standard weight presets in grams
export const WEIGHT_PRESETS = [
  { label: '1 KG', grams: 1000, urdu: '1 کلو' },
  { label: '500g', grams: 500, urdu: 'آدھا کلو (500 گرام)' },
  { label: '250g', grams: 250, urdu: 'پاؤ (250 گرام)' },
  { label: '750g', grams: 750, urdu: 'تین پاؤ (750 گرام)' },
  { label: '100g', grams: 100, urdu: '100 گرام' },
  { label: '50g', grams: 50, urdu: '50 گرام' },
  { label: '25g', grams: 25, urdu: '25 گرام' },
  { label: '2 KG', grams: 2000, urdu: '2 کلو' },
  { label: '3 KG', grams: 3000, urdu: '3 کلو' },
  { label: '5 KG', grams: 5000, urdu: '5 کلو' },
];

/**
 * Determine if a product is weight-based or piece-based.
 * @param {Object} product
 * @returns {'weight' | 'piece'}
 */
export function getProductUnitType(product) {
  if (!product) return 'piece';
  if (product.unitType === 'weight' || product.unitType === 'piece') {
    return product.unitType;
  }
  const unit = (product.unit || product.sellingUnit || '').toLowerCase().trim();
  const weightUnits = ['kg', 'kilo', 'kilogram', 'gram', 'grams', 'gm', 'g', 'liter', 'litre', 'l', 'ml'];
  if (weightUnits.includes(unit)) {
    return 'weight';
  }
  return 'piece';
}

/**
 * Convert quantity and unit to total grams.
 * @param {number} quantity
 * @param {string} unit - 'KG', 'Gram', 'gm', 'g', 'kg'
 * @returns {number} grams
 */
export function convertToGrams(quantity, unit = 'KG') {
  const q = Number(quantity) || 0;
  const u = (unit || '').toLowerCase().trim();
  if (u === 'gram' || u === 'grams' || u === 'gm' || u === 'g') {
    return q;
  }
  // Default is KG
  return q * 1000;
}

/**
 * Calculate line item price based on unit type, quantity, and rate list price.
 * 
 * Weight Formula: Price = (Quantity in Grams / 1000) * PricePerKG
 * Piece Formula: Price = Quantity * PricePerPiece
 * 
 * @param {Object} params
 * @param {number} params.pricePerUnit - Price per KG (for weight) or per piece (for piece)
 * @param {number} params.quantity - Quantity amount
 * @param {string} params.unit - Unit string (e.g. 'KG', 'Gram', 'Piece', etc.)
 * @param {'weight'|'piece'} [params.unitType] - Unit classification
 * @returns {Object} { lineTotal, unitPrice, unitType, grams, formulaText, displayQuantity }
 */
export function calculateLinePrice({ pricePerUnit = 0, quantity = 1, unit = 'KG', unitType = null }) {
  const basePrice = Number(pricePerUnit) || 0;
  const qty = Number(quantity) || 0;
  const inferredUnitType = unitType || (['kg', 'gram', 'gm', 'g'].includes((unit || '').toLowerCase()) ? 'weight' : 'piece');

  if (inferredUnitType === 'weight') {
    const grams = convertToGrams(qty, unit);
    const lineTotalRaw = (grams / 1000) * basePrice;
    const lineTotal = Math.round((lineTotalRaw + Number.EPSILON) * 100) / 100;
    const kgQty = grams / 1000;

    return {
      lineTotal,
      unitPrice: basePrice,
      unitType: 'weight',
      grams,
      kgEquivalent: kgQty,
      displayQuantity: grams >= 1000 && grams % 1000 === 0 ? `${grams / 1000} KG` : `${grams} Gram`,
      displayUnit: 'KG',
      formulaText: `${grams}g / 1000 × Rs. ${basePrice} = Rs. ${lineTotal}`,
    };
  }

  // Piece-based (Piece, Packet, Box, Dozen, Bottle, etc.)
  // Strictly no division by 1000!
  const lineTotalRaw = qty * basePrice;
  const lineTotal = Math.round((lineTotalRaw + Number.EPSILON) * 100) / 100;

  return {
    lineTotal,
    unitPrice: basePrice,
    unitType: 'piece',
    grams: null,
    kgEquivalent: null,
    displayQuantity: `${qty} ${unit || 'Piece'}`,
    displayUnit: unit || 'Piece',
    formulaText: `${qty} × Rs. ${basePrice} = Rs. ${lineTotal}`,
  };
}

/**
 * Generate standard quick price breakdown table for weight-based items
 * Example: Rice @ Rs. 300/KG -> 1KG: 300, 500g: 150, 250g: 75, 100g: 30, 50g: 15, 25g: 7.50
 * @param {number} pricePerKg
 * @returns {Array<{label: string, grams: number, price: number, urdu: string}>}
 */
export function getWeightPriceBreakdown(pricePerKg = 0) {
  const p = Number(pricePerKg) || 0;
  return WEIGHT_PRESETS.map((preset) => {
    const price = Math.round(((preset.grams / 1000) * p + Number.EPSILON) * 100) / 100;
    return {
      label: preset.label,
      grams: preset.grams,
      price,
      urdu: preset.urdu,
    };
  });
}
