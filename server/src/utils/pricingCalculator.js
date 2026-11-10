/**
 * Kiryana & Grocery Pricing Calculator (Server Utility)
 */
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

export function convertToGrams(quantity, unit = 'KG') {
  const q = Number(quantity) || 0;
  const u = (unit || '').toLowerCase().trim();
  if (u === 'gram' || u === 'grams' || u === 'gm' || u === 'g') {
    return q;
  }
  return q * 1000;
}

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
