'use client';

import React, { useRef } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { Printer, CheckCircle } from 'lucide-react';

export default function ThermalReceipt({ sale, profile, onPrint }) {
  const { t, language } = useLanguage();
  const printRef = useRef(null);

  if (!sale) return null;

  const handlePrint = () => {
    if (onPrint) {
      onPrint();
    } else {
      window.print();
    }
  };

  const paperSize = profile?.receiptSettings?.paperSize || '80mm';
  const footerNote = language === 'ur'
    ? (profile?.receiptSettings?.footerMessageUrdu || 'آپ کی تشریف آوری کا شکریہ!')
    : language === 'roman_ur'
    ? (profile?.receiptSettings?.footerMessageRoman || 'Tashreef laane ka shukriya!')
    : (profile?.receiptSettings?.footerMessageEnglish || 'Thank you for your visit!');

  return (
    <div className="w-full">
      {/* Print Action Button */}
      <div className="mb-4 flex items-center justify-between no-print">
        <button
          onClick={handlePrint}
          className="w-full flex items-center justify-center gap-2 bg-kiryana-freshGreen text-white font-bold py-3 px-4 rounded-xl shadow-md hover:bg-kiryana-darkGreen active:scale-98 transition-all"
        >
          <Printer className="w-5 h-5" />
          <span>{t('print')} ({paperSize})</span>
        </button>
      </div>

      {/* Actual Thermal Receipt Paper Layout */}
      <div
        ref={printRef}
        id="thermal-receipt-print"
        className={`bg-white text-black p-4 rounded-xl border border-gray-200 shadow-sm mx-auto font-mono text-xs leading-tight ${
          paperSize === '58mm' ? 'max-w-[280px]' : 'max-w-[340px]'
        }`}
      >
        {/* Header */}
        <div className="text-center border-b border-dashed border-gray-400 pb-2 mb-2">
          <h2 className="text-base font-black uppercase tracking-wider">
            {profile?.storeName || 'KIRYANA STORE'}
          </h2>
          <p className="text-[11px] font-semibold text-gray-700">
            {profile?.ownerName ? `Prop: ${profile.ownerName}` : 'Cash Memo'}
          </p>
          {profile?.shopPhone && (
            <p className="text-[10px] text-gray-600">Mob: {profile.shopPhone}</p>
          )}
          {profile?.shopAddress && (
            <p className="text-[10px] text-gray-500 truncate">{profile.shopAddress}</p>
          )}
        </div>

        {/* Receipt Meta */}
        <div className="text-[10px] space-y-0.5 border-b border-dashed border-gray-400 pb-2 mb-2">
          <div className="flex justify-between">
            <span className="font-bold">Memo #:</span>
            <span>{sale.receiptNumber}</span>
          </div>
          <div className="flex justify-between">
            <span>Date:</span>
            <span>{new Date(sale.date || sale.createdAt).toLocaleDateString()} {new Date(sale.date || sale.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <div className="flex justify-between">
            <span>Customer:</span>
            <span className="font-bold truncate max-w-[170px]">{sale.customerName || 'Walk-in'}</span>
          </div>
          {sale.customerPhone && (
            <div className="flex justify-between">
              <span>Phone:</span>
              <span>{sale.customerPhone}</span>
            </div>
          )}
        </div>

        {/* Itemized Table */}
        <table className="w-full text-left text-[11px] mb-2">
          <thead>
            <tr className="border-b border-gray-400 font-bold">
              <th className="py-1">Item</th>
              <th className="py-1 text-center">Qty</th>
              <th className="py-1 text-right">Rate</th>
              <th className="py-1 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dotted divide-gray-300">
            {sale.items.map((item, idx) => (
              <tr key={idx} className="py-1">
                <td className="py-1 pr-1">
                  <div className="font-medium truncate max-w-[120px]">{item.productName}</div>
                  {item.variationName && (
                    <div className="text-[9px] text-gray-500">{item.variationName}</div>
                  )}
                </td>
                <td className="py-1 text-center font-medium">
                  {item.quantity} {item.unit}
                </td>
                <td className="py-1 text-right">{item.unitPrice}</td>
                <td className="py-1 text-right font-bold">{item.lineTotal}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Calculations / Totals */}
        <div className="border-t border-dashed border-gray-400 pt-2 space-y-1 text-xs">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>Rs. {sale.subtotal?.toFixed(2)}</span>
          </div>

          {sale.discount > 0 && (
            <div className="flex justify-between text-red-600 font-medium">
              <span>Discount (-):</span>
              <span>Rs. {sale.discount?.toFixed(2)}</span>
            </div>
          )}

          <div className="flex justify-between text-sm font-black border-t border-b border-gray-400 py-1 my-1">
            <span>GRAND TOTAL:</span>
            <span>Rs. {sale.grandTotal?.toFixed(2)}</span>
          </div>

          <div className="flex justify-between font-medium">
            <span>Paid Amount:</span>
            <span>Rs. {sale.paidAmount?.toFixed(2)}</span>
          </div>

          {sale.remainingBalance > 0 && (
            <div className="flex justify-between font-bold text-red-600">
              <span>Remaining (Udhaar):</span>
              <span>Rs. {sale.remainingBalance?.toFixed(2)}</span>
            </div>
          )}

          <div className="flex justify-between text-[10px] text-gray-600 pt-1">
            <span>Payment Mode:</span>
            <span className="uppercase font-bold">{sale.paymentMethod || 'CASH'}</span>
          </div>
          <div className="flex justify-between text-[10px] text-gray-600">
            <span>Status:</span>
            <span className={`uppercase font-bold ${sale.paymentStatus === 'paid' ? 'text-green-700' : 'text-red-600'}`}>
              {sale.paymentStatus}
            </span>
          </div>
        </div>

        {/* Footer Note */}
        <div className="text-center border-t border-dashed border-gray-400 mt-3 pt-2 text-[10px] text-gray-700">
          <p>{footerNote}</p>
          <p className="text-[8px] text-gray-400 mt-1">Smart Khata – Kiryana POS</p>
        </div>
      </div>
    </div>
  );
}
