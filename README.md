# SMART KHATA – KIRYANA POS (اسمارٹ کھاتہ)

Production-ready, mobile-only Grocery Shop Management Application built specifically for kiryana / grocery shop owners.

---

## 🌟 Key Capabilities

1. **Mobile-Only Application Experience**
   - Strictly optimized for mobile phone screens (no bloated desktop layouts).
   - Bottom app bar navigation (Home, Products, POS New Sale, Receipts, Menu).
   - Touch-friendly cards, high-contrast buttons, fast UI revalidation.
   - PWA support for instant installation on Android.

2. **AI Receipt & Supplier Invoice Scanner (Google Vision OCR)**
   - Upload or snap camera photos of wholesale supplier receipts (Mandi invoices, Akbari Mandi, Jodia Bazaar, FMCG slips).
   - Powered by **Google Gemini 2.5 Flash Vision** (`gemini-2.5-flash`).
   - Extracts: supplier name, invoice #, invoice date, individual products (even 50+ lines), quantities, units, purchase rates, and line totals.
   - **AI Review Screen**: Editable review table to correct prices, units, match with existing inventory, create new products, and confirm purchase to atomically increase stock.

3. **Multiple Weight & Quantity Variations**
   - Create flexible weight variations per product (e.g. Rice: 1 KG @ Rs. 300, 500g @ Rs. 150, 250g @ Rs. 75, 100g @ Rs. 30).
   - Base unit conversion multiplier: selling 500 Grams automatically decrements 0.5 KG from base stock.
   - Supports KG, Gram, Liter, Milliliter, Piece, Packet, Dozen, Box, Bori (sack), or custom units.

4. **Mobile POS Billing & Cash Memos**
   - Fast item selection with instant variation picker.
   - Walk-in Customer support or registered customer Khata selection.
   - Accurate decimal arithmetic for weight and currency.
   - Cash, Bank / Online, and Udhaar (Credit Khata) payment tracking.
   - Atomic stock decrement with negative stock prevention check.

5. **Thermal Receipt Printing**
   - Clean kiryana cash memo layout formatted for standard **58mm and 80mm thermal printers** (and optional A4).
   - Instant `@media print` thermal styling hiding all UI chrome.
   - **Zero QR codes and zero barcodes** as strictly mandated.

6. **Receipt History & Safe Reversals**
   - Filter receipts by Today, Yesterday, This Week, This Month, or custom date range.
   - Edit existing receipts: recalculates stock differences, updates customer balance, and creates an audit trail without duplicating records.
   - Void / cancel receipts with automatic stock return.

7. **Customer Khata Book (Ledger)**
   - Track outstanding Udhaar balances per customer.
   - Record partial or full payments.
   - Complete itemized purchase history per customer.

8. **Live MongoDB Atlas Integration**
   - Live MongoDB Atlas database cluster is the single source of truth.
   - No mock data or localStorage primary databases.

9. **3-Language Translation System**
   - **English**
   - **اردو (Urdu)** with true RTL layout and Urdu typography
   - **Roman Urdu**
   - Centralized dictionary covering all UI labels, dashboard stats, POS cart, receipts, errors, and settings. Persists across sessions.

---

## 🛠️ Technology Stack

- **Frontend**: Next.js 14 (App Router), React 18, Tailwind CSS, Lucide React icons, PWA Manifest.
- **Backend**: Node.js, Express.js REST API, Mongoose ODM, JWT, bcryptjs password hashing, Multer file upload.
- **Database**: MongoDB Atlas.
- **AI OCR**: Google Gemini 2.5 Flash Vision API (`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`).

---

## 🚀 How to Run the Application

### 1. Start Both Backend & Frontend Simultaneously
From the project root directory:
```bash
npm run dev
```
- **Backend API**: `http://localhost:5001`
- **Frontend App**: `http://localhost:3000`

### 2. Run Independently (Optional)
**Backend API Server**:
```bash
cd server
npm run dev
```

**Frontend Next.js App**:
```bash
cd client
npm run dev
```

---

## 🔑 Environment Variables

The server configuration is located at `server/.env`:

```env
PORT=5001
MONGO_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<dbname>
JWT_SECRET=<your_strong_jwt_secret_here>
AI_OCR_API_KEY=<your_gemini_api_key_here>
AI_OCR_MODEL=gemini-2.5-flash
AI_OCR_API_URL=https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent
UPLOAD_DIR=./uploads
```

---

## 📱 Default Login Credentials

On first run, the system automatically provisions the shop owner account:
- **Username**: `admin`
- **Password**: `admin123`
- *Password can be updated anytime from Dashboard -> Settings.*
