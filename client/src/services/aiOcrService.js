import Product from '../models/Product.js';

const PROMPT_TEXT = `
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

  // Discard any deprecated model name (especially gemini-2.5-*)
  let configuredModel = process.env.AI_OCR_MODEL;
  if (!configuredModel || configuredModel.includes('2.5') || configuredModel.includes('3.8')) {
    configuredModel = 'gemini-3.5-flash-lite';
  }

  // gemini-3.5-flash-lite is the fastest (~1.5s) and most resilient model for multimodal vision OCR
  const candidateModels = [
    'gemini-3.5-flash-lite',
    configuredModel,
    'gemini-3.5-flash',
    'gemini-3.6-flash',
  ].filter((v, i, a) => a.indexOf(v) === i && !v.includes('2.5'));

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

  let data = null;
  let lastError = null;

  for (const model of candidateModels) {
    try {
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 35000); // Generous 35s timeout for complex handwriting

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
          break; // Successfully got parsed response!
        }
      } else {
        const errText = await response.text();
        lastError = new Error(`Google AI OCR Vision API error (${response.status}): ${errText}`);
      }
    } catch (err) {
      if (err.name === 'AbortError' || err.message?.includes('aborted')) {
        lastError = new Error('AI Vision OCR request timed out while analyzing handwriting. Please try again with a clearer picture.');
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
