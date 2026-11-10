import Product from '../models/Product.js';
import { calculateLinePrice, getProductUnitType } from '../lib/pricingCalculator.js';

const INVOICE_PROMPT = `
You are an expert Kiryana / Grocery Wholesale Invoice and Cash Memo parser for Pakistan/South Asian grocery businesses.
Analyze this supplier invoice, cash receipt, or handwritten grocery slip / parchi carefully.
It may be:
- Printed / typed wholesale invoice (from Akbari Mandi, Jodia Bazaar, wholesale grain distributors, FMCG distributors like Unilever, Nestlé, National Foods, Shan, Tapal, etc.)
- Thermal receipt slip
- Handwritten note / parchi in Urdu script (e.g. چینی, آٹا, چاول, ٹوٹا چاول, دال چنا, دال مسور, گھی, کوکنگ آئل, صابن, لکس, شیمپو, مصالحہ جات)
- Mixed English, Roman Urdu, or Urdu.

Extract EVERY single item from the slip/invoice without omitting any line.

Return ONLY a strict JSON object with this exact structure:
{
  "supplierName": "Name of wholesale supplier / mandi shop or General Kiryana Supplier",
  "invoiceNumber": "Invoice or memo number if visible, otherwise generate sensible memo id like INV-DATE",
  "invoiceDate": "YYYY-MM-DD formatted date, or current date if not visible",
  "items": [
    {
      "productName": "Product name in English or common Roman name (e.g. Sugar, Super Basmati Rice, Atta, Chana Daal, Banaspati Ghee, Lux Soap)",
      "productNameUrdu": "Exact Urdu script name (e.g. چینی, چاول, آٹا, دال چنا, بناسپتی گھی, لکس صابن)",
      "quantity": 1,
      "unit": "KG / Gram / Liter / ML / Packet / Piece / Dozen / Box / Bori / Peti",
      "unitPrice": 0,
      "lineTotal": 0,
      "multiplier": 1.0,
      "category": "Atta / Grains | Daalen / Pulses | Ghee / Cooking Oil | Spices / Masalay | Beverages | Dairy | Snacks | Soaps & Detergents | General Kiryana",
      "confidence": 0.95
    }
  ],
  "subtotal": 0,
  "discount": 0,
  "tax": 0,
  "grandTotal": 0,
  "notes": "Any notes or payment terms"
}

Important parsing rules for Urdu & Kiryana items:
1. Handwritten Urdu Slips & Missing Prices:
   - On grocery shopping lists, customer slips, or parchis, prices are often NOT written (only items and quantities are written, e.g. "چاول 1 کلو", "آٹا 2 کلو", "چنے کی دال 1 کلو", "لکس صابن 2").
   - If unit price or line total is NOT explicitly written on the slip, set unitPrice: 0 and lineTotal: 0. Do NOT drop, skip, or fail the item!
2. Urdu Numerals & Fractional Quantities:
   - Convert Urdu numerals (۱, ۲, ۳, ۴, ۵, ۶, ۷, ۸, ۹, ۰) or written numbers (ایک, دو, تین, آدھا = 0.5, پاؤ = 0.25) to standard numeric quantities.
3. Quantities & Units:
   - If quantity is omitted or just a count like "لکس صابن 2", set quantity: 2, unit: "Piece".
   - Default base units: "KG", "Liter", "Piece", "Packet", "Dozen", "Bori".
4. Numbers must be numeric (not strings).
`;

const RATE_LIST_PROMPT = `
You are an expert South Asian / Pakistan Kiryana Store Rate List and Price Bulletin parser.
Carefully analyze this Grocery / Kiryana Rate List image (which may be a printed wholesale rate sheet, official government price control list (سرکاری ریٹ لسٹ), market bulletin, distributor price list, or handwritten rate sheet in Urdu, Roman Urdu, or English).

Extract EVERY product and its price accurately.

CRITICAL PRODUCT IDENTIFICATION RULES:
1. Distinguish between product variants!
   - "Rice" and "Rice Tota" (ٹوٹا چاول) are TWO DIFFERENT products with different prices.
   - "Super Karnal Basmati Rice" vs "Kainat Sella Rice" are distinct products.
   - "Daal Chana Special" vs "Daal Chana Barik" are distinct.
   - Keep variant details in "variant" and include it in "productName".
2. Accurate Pricing Matching:
   - Every price MUST strictly correspond to its own product name and unit.
   - Never guess or fabricate prices. If an item has an unclear or obscured price, set price: 0 and flag confidence: 0.5.
3. Units & Unit Types:
   - Identify whether product is weight-based (KG, Gram, Liter) or piece-based (Piece, Packet, Box, Dozen, Peti, Bottle).
   - "unitType": "weight" (for items sold by weight like Rice, Sugar, Flour, Daal, Oil) OR "piece" (for items sold per unit/piece like Soap, Toothpaste, Biscuit pack, Matchbox).
   - Normalize "unit" to standard names: "1 KG", "1 Piece", "1 Dozen", "1 Packet", "1 Liter", "1 Box".

Return ONLY a strict JSON object with this exact structure:
{
  "title": "Title of the rate list (e.g. Official Kiryana Rate List / سرکاری ریٹ لسٹ)",
  "effectiveDate": "YYYY-MM-DD date if present or null",
  "items": [
    {
      "productName": "English or Roman Urdu name (e.g. Super Karnal Basmati Rice, Rice Tota, Lux Soap 100g, Chana Daal)",
      "productNameUrdu": "Urdu script name (e.g. سپر کرنل باسمتی چاول, ٹوٹا چاول, لکس صابن, دال چنا)",
      "variant": "Variant if any (e.g. Tota, Super, Sella, Special, 100g, Regular, or null)",
      "unit": "1 KG / 1 Piece / 1 Packet / 1 Dozen / 1 Liter / 1 Box",
      "unitType": "weight" or "piece",
      "price": 300,
      "category": "Atta / Grains | Daalen / Pulses | Ghee / Cooking Oil | Spices / Masalay | Soaps & Detergents | Dairy | Beverages | Snacks | General Kiryana",
      "confidence": 0.95
    }
  ]
}

Ensure all prices are pure numbers (no "Rs.", "PKR", or commas).
`;

/**
 * Common helper to invoke Google Gemini Vision models with automatic fallback
 */
async function callGeminiVision(promptText, imageFiles) {
  const apiKey = process.env.AI_OCR_API_KEY;
  if (!apiKey) {
    throw new Error('AI_OCR_API_KEY is not configured in environment.');
  }

  let configuredModel = process.env.AI_OCR_MODEL;
  if (!configuredModel || configuredModel.includes('2.5') || configuredModel.includes('3.8')) {
    configuredModel = 'gemini-3.5-flash-lite';
  }

  const candidateModels = [
    'gemini-3.5-flash-lite',
    configuredModel,
    'gemini-3.5-flash',
    'gemini-3.6-flash',
  ].filter((v, i, a) => a.indexOf(v) === i && !v.includes('2.5'));

  const parts = [{ text: promptText }];

  for (const file of imageFiles) {
    parts.push({
      inline_data: {
        mime_type: file.mimeType || 'image/jpeg',
        data: Buffer.isBuffer(file.buffer)
          ? file.buffer.toString('base64')
          : Buffer.from(file.buffer).toString('base64'),
      },
    });
  }

  const payload = {
    contents: [{ parts }],
    generationConfig: {
      response_mime_type: 'application/json',
      temperature: 0.1,
      maxOutputTokens: 2500,
    },
  };

  let data = null;
  let lastError = null;

  for (const model of candidateModels) {
    try {
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 35000);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const json = await response.json();
        if (json?.candidates?.[0]?.content?.parts?.[0]?.text) {
          data = json;
          break;
        }
      } else {
        const errText = await response.text();
        lastError = new Error(`Google AI OCR Vision API error (${response.status}): ${errText}`);
      }
    } catch (err) {
      if (err.name === 'AbortError' || err.message?.includes('aborted')) {
        lastError = new Error('AI Vision OCR request timed out while processing image. Please try again with a clearer picture.');
      } else {
        lastError = err;
      }
    }
  }

  if (!data) {
    throw lastError || new Error('AI OCR API did not return readable candidates from any model.');
  }

  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) {
    throw new Error('AI OCR API did not return readable text.');
  }

  try {
    return JSON.parse(rawText);
  } catch (err) {
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('Failed to parse structured JSON from OCR response: ' + rawText.substring(0, 300));
  }
}

/**
 * Match a raw item name against an array of existing Product documents
 * Strictly distinguishes variants (e.g. Rice vs Rice Tota)
 */
function findBestProductMatch(item, existingProducts) {
  const itemNameNorm = (item.productName || '').toLowerCase().trim();
  const itemUrduNorm = (item.productNameUrdu || '').toLowerCase().trim();
  const itemVariantNorm = (item.variant || '').toLowerCase().trim();

  let bestMatch = null;
  let highestScore = 0;

  for (const prod of existingProducts) {
    const prodNameNorm = (prod.name || '').toLowerCase().trim();
    const prodUrduNorm = (prod.nameUrdu || '').toLowerCase().trim();
    const prodVariantNorm = (prod.variant || '').toLowerCase().trim();

    // 1. Exact English or Urdu match with variant matching
    const nameMatches = prodNameNorm === itemNameNorm || (prodUrduNorm && prodUrduNorm === itemUrduNorm);
    const variantMatches = !itemVariantNorm || prodVariantNorm === itemVariantNorm;

    if (nameMatches && variantMatches) {
      return { product: prod, score: 1.0 };
    }

    // 2. High-confidence variant protection: If one has "tota" and the other doesn't, do NOT match!
    const itemHasTota = itemNameNorm.includes('tota') || itemUrduNorm.includes('ٹوٹا');
    const prodHasTota = prodNameNorm.includes('tota') || prodUrduNorm.includes('ٹوٹا');
    if (itemHasTota !== prodHasTota) {
      continue;
    }

    // 3. Substring matching
    if (prodNameNorm === itemNameNorm) {
      return { product: prod, score: 0.95 };
    }

    if (prodNameNorm.includes(itemNameNorm) || itemNameNorm.includes(prodNameNorm)) {
      const score = 0.8;
      if (score > highestScore) {
        highestScore = score;
        bestMatch = prod;
      }
    } else {
      const itemWords = itemNameNorm.split(/\s+/).filter((w) => w.length > 2);
      const prodWords = prodNameNorm.split(/\s+/).filter((w) => w.length > 2);
      const matches = itemWords.filter((w) => prodWords.includes(w));
      if (matches.length > 0) {
        const score = (matches.length * 2) / (itemWords.length + prodWords.length);
        if (score > 0.5 && score > highestScore) {
          highestScore = score;
          bestMatch = prod;
        }
      }
    }
  }

  return { product: bestMatch, score: highestScore };
}

/**
 * Perform AI OCR on Rate List image buffers
 * Extracts products, units, prices, and matches against existing inventory.
 * @param {Array<{buffer: Buffer, mimeType: string}>} imageFiles
 * @returns {Promise<Object>}
 */
export async function parseRateListImages(imageFiles) {
  const parsed = await callGeminiVision(RATE_LIST_PROMPT, imageFiles);

  const existingProducts = await Product.find({ isArchived: false }).lean();

  const items = (parsed.items || []).map((item, index) => {
    const rawPrice = Number(item.price) || 0;
    const cleanPrice = Math.round((rawPrice + Number.EPSILON) * 100) / 100;
    const unitType = item.unitType === 'weight' || item.unitType === 'piece'
      ? item.unitType
      : (['kg', 'gram', 'liter'].some(u => (item.unit || '').toLowerCase().includes(u)) ? 'weight' : 'piece');

    const { product: matchedProd, score } = findBestProductMatch(item, existingProducts);

    const isExisting = !!matchedProd && score >= 0.8;
    const currentPrice = isExisting ? (matchedProd.sellingPrice || matchedProd.pricePerUnit || matchedProd.salePrice || matchedProd.variations?.[0]?.price || 0) : null;
    const priceChanged = isExisting && cleanPrice > 0 && cleanPrice !== currentPrice;

    return {
      tempId: `ratelist-item-${index}-${Date.now()}`,
      productName: item.productName || `Product #${index + 1}`,
      productNameUrdu: item.productNameUrdu || '',
      variant: item.variant || '',
      unit: item.unit || (unitType === 'weight' ? '1 KG' : '1 Piece'),
      unitType,
      price: cleanPrice,
      category: item.category || matchedProd?.category || 'General Kiryana',
      confidence: item.confidence || 0.9,
      isExisting,
      matchedProductId: isExisting ? matchedProd._id : null,
      matchedDisplayId: isExisting ? (matchedProd.productId || null) : null,
      matchedProductName: isExisting ? matchedProd.name : null,
      currentPrice,
      priceChanged,
      status: !isExisting ? 'new' : (priceChanged ? 'price_update' : 'unchanged'),
      needsReview: cleanPrice <= 0 || !item.productName || (item.confidence && item.confidence < 0.7),
    };
  });

  return {
    title: parsed.title || 'Kiryana Rate List',
    effectiveDate: parsed.effectiveDate || new Date().toISOString().split('T')[0],
    scannedAt: new Date().toISOString(),
    totalExtracted: items.length,
    newCount: items.filter(it => it.status === 'new').length,
    updateCount: items.filter(it => it.status === 'price_update').length,
    unchangedCount: items.filter(it => it.status === 'unchanged').length,
    items,
  };
}

/**
 * Perform AI OCR on receipt/invoice image buffers and automatically apply Rate List pricing
 * @param {Array<{buffer: Buffer, mimeType: string}>} imageFiles
 * @returns {Promise<Object>}
 */
export async function parseInvoiceImages(imageFiles) {
  const parsedInvoice = await callGeminiVision(INVOICE_PROMPT, imageFiles);

  const existingProducts = await Product.find({ isArchived: false }).lean();

  const enrichedItems = (parsedInvoice.items || []).map((item, index) => {
    const { product: bestMatch } = findBestProductMatch(item, existingProducts);
    const quantity = Number(item.quantity) || 1;
    const unit = item.unit || bestMatch?.unit || 'KG';
    const rateListPrice = bestMatch ? (bestMatch.sellingPrice || bestMatch.pricePerUnit || bestMatch.salePrice || bestMatch.variations?.[0]?.price || 0) : 0;

    let unitPrice = Number(item.unitPrice) || 0;
    let isRateListPriceApplied = false;

    if (unitPrice <= 0 && rateListPrice > 0) {
      unitPrice = rateListPrice;
      isRateListPriceApplied = true;
    }

    const unitType = bestMatch ? getProductUnitType(bestMatch) : null;
    const calculated = calculateLinePrice({
      pricePerUnit: unitPrice > 0 ? unitPrice : rateListPrice,
      quantity,
      unit,
      unitType,
    });

    const lineTotal = Number(item.lineTotal) > 0 && !isRateListPriceApplied
      ? Number(item.lineTotal)
      : calculated.lineTotal;

    return {
      tempId: `item-${index}-${Date.now()}`,
      productName: item.productName || `Item #${index + 1}`,
      productNameUrdu: item.productNameUrdu || '',
      quantity,
      unit,
      unitPrice: unitPrice > 0 ? unitPrice : rateListPrice,
      rateListPrice,
      isRateListPriceApplied,
      lineTotal,
      multiplier: Number(item.multiplier) || 1.0,
      category: item.category || bestMatch?.category || 'General Kiryana',
      confidence: item.confidence || 0.9,
      matchedProductId: bestMatch ? bestMatch._id : null,
      matchedDisplayId: bestMatch ? bestMatch.productId : null,
      matchedProductName: bestMatch ? bestMatch.name : null,
      matchedProductStock: bestMatch ? bestMatch.currentStock : null,
      isMatch: !!bestMatch,
      needsReview: !bestMatch || (item.confidence && item.confidence < 0.75),
    };
  });

  return {
    supplierName: parsedInvoice.supplierName || 'General Supplier',
    invoiceNumber: parsedInvoice.invoiceNumber || `INV-${Date.now().toString().slice(-6)}`,
    invoiceDate: parsedInvoice.invoiceDate || new Date().toISOString().split('T')[0],
    subtotal: enrichedItems.reduce((acc, it) => acc + (it.lineTotal || 0), 0),
    discount: Number(parsedInvoice.discount) || 0,
    tax: Number(parsedInvoice.tax) || 0,
    grandTotal: enrichedItems.reduce((acc, it) => acc + (it.lineTotal || 0), 0),
    notes: parsedInvoice.notes || '',
    items: enrichedItems,
  };
}
