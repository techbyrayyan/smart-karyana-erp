import Product from '../models/Product.js';

const PROMPT_TEXT = `
You are an expert Kiryana / Grocery Wholesale Invoice and Cash Memo parser for Pakistan/South Asian grocery businesses.
Analyze this supplier invoice or receipt image carefully.
It may be printed, typed, thermal slip, or handwritten (in English, Urdu, or mixed Roman Urdu from Akbari Mandi, Jodia Bazaar, wholesale grain distributors, or FMCG distributors like Unilever, Nestlé, National Foods, Shan, Tapal, etc.).

Extract EVERY single product line item. Do NOT truncate or limit to a small number of items. If there are 5, 20, or 50 items, extract all of them.

Return ONLY a strict JSON object with this exact structure:
{
  "supplierName": "Name of wholesale supplier / mandi shop or General Supplier",
  "invoiceNumber": "Invoice or memo number if visible, otherwise generate sensible memo id like INV-DATE",
  "invoiceDate": "YYYY-MM-DD formatted date, or current date if not visible",
  "items": [
    {
      "productName": "Product name in English (e.g. Super Basmati Rice, Sugar, Banaspati Ghee)",
      "productNameUrdu": "Urdu name if visible or applicable (e.g. چاول باسمتی, چینی, بناسپتی گھی)",
      "quantity": 10,
      "unit": "KG / Gram / Liter / ML / Packet / Piece / Dozen / Box / Bori / Peti",
      "unitPrice": 250,
      "lineTotal": 2500,
      "multiplier": 1.0,
      "category": "Daalen / Pulses | Atta / Grains | Ghee / Cooking Oil | Spices / Masalay | Beverages | Dairy | Snacks | Soaps & Detergents | General",
      "confidence": 0.95
    }
  ],
  "subtotal": 2500,
  "discount": 0,
  "tax": 0,
  "grandTotal": 2500,
  "notes": "Any payment terms, vehicle number, or mandi broker notes"
}

Important parsing rules:
1. Ensure quantity * unitPrice approximately equals lineTotal. If a line gives total and quantity, compute unitPrice = lineTotal / quantity.
2. For traditional wholesale units:
   - "Bori" (sack) of Sugar / Rice / Flour is typically 50 KG (multiplier: 50) or 40 KG (maund). Note this in multiplier if unit is KG.
   - "Peti" / Carton usually contains multiple packets or pieces.
   - Default standard base units: "KG", "Liter", "Packet", "Piece", "Dozen".
3. Numbers must be numeric, not strings.
`;

/**
 * Perform AI OCR on receipt/invoice image buffers using Google Gemini Vision API
 * @param {Array<{buffer: Buffer, mimeType: string}>} imageFiles
 * @returns {Promise<Object>} Parsed invoice structure with line items and product matches
 */
export async function parseInvoiceImages(imageFiles) {
  const apiKey = process.env.AI_OCR_API_KEY;
  if (!apiKey) {
    throw new Error('AI_OCR_API_KEY is not configured in environment.');
  }

  const model = process.env.AI_OCR_MODEL || 'gemini-2.5-flash';
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const parts = [{ text: PROMPT_TEXT }];

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
    },
  };

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Google AI OCR Vision API error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!rawText) {
    throw new Error('AI OCR API did not return readable text or candidates.');
  }

  let parsedInvoice;
  try {
    parsedInvoice = JSON.parse(rawText);
  } catch (err) {
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      parsedInvoice = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error('Failed to parse structured JSON from OCR response: ' + rawText.substring(0, 300));
    }
  }

  // Match with existing products
  const existingProducts = await Product.find({ isArchived: false }).lean();

  const enrichedItems = (parsedInvoice.items || []).map((item, index) => {
    const itemNameNorm = (item.productName || '').toLowerCase().trim();
    let bestMatch = null;
    let highestScore = 0;

    for (const prod of existingProducts) {
      const prodNameNorm = prod.name.toLowerCase().trim();
      const prodUrduNorm = (prod.nameUrdu || '').toLowerCase().trim();

      if (
        prodNameNorm === itemNameNorm ||
        (prodUrduNorm && prodUrduNorm === (item.productNameUrdu || '').toLowerCase().trim())
      ) {
        bestMatch = prod;
        highestScore = 1.0;
        break;
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
          if (score > 0.4 && score > highestScore) {
            highestScore = score;
            bestMatch = prod;
          }
        }
      }
    }

    return {
      tempId: `item-${index}-${Date.now()}`,
      productName: item.productName || `Item #${index + 1}`,
      productNameUrdu: item.productNameUrdu || '',
      quantity: Number(item.quantity) || 1,
      unit: item.unit || 'KG',
      unitPrice: Number(item.unitPrice) || 0,
      lineTotal:
        Number(item.lineTotal) || (Number(item.quantity) || 1) * (Number(item.unitPrice) || 0),
      multiplier: Number(item.multiplier) || 1.0,
      category: item.category || bestMatch?.category || 'General Kiryana',
      confidence: item.confidence || 0.9,
      matchedProductId: bestMatch ? bestMatch._id : null,
      matchedProductName: bestMatch ? bestMatch.name : null,
      matchedProductStock: bestMatch ? bestMatch.currentStock : null,
      isMatch: !!bestMatch,
      needsReview: !bestMatch || (item.confidence && item.confidence < 0.75),
    };
  });

  return {
    supplierName: parsedInvoice.supplierName || 'General Supplier',
    invoiceNumber:
      parsedInvoice.invoiceNumber || `INV-${Date.now().toString().slice(-6)}`,
    invoiceDate:
      parsedInvoice.invoiceDate || new Date().toISOString().split('T')[0],
    subtotal:
      Number(parsedInvoice.subtotal) ||
      enrichedItems.reduce((acc, it) => acc + it.lineTotal, 0),
    discount: Number(parsedInvoice.discount) || 0,
    tax: Number(parsedInvoice.tax) || 0,
    grandTotal:
      Number(parsedInvoice.grandTotal) ||
      enrichedItems.reduce((acc, it) => acc + it.lineTotal, 0),
    notes: parsedInvoice.notes || '',
    items: enrichedItems,
  };
}
