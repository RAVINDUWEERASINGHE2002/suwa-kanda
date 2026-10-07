import React, { useState } from 'react';
import { Printer, X, CheckCircle2, Ticket, ReceiptText } from 'lucide-react';

export default function ReceiptModal({ order, onClose }) {
  const [printMode, setPrintMode] = useState('full'); // 'full' | 'token_only'

  if (!order) return null;

  const handlePrint = (mode = printMode) => {
    setPrintMode(mode);
    // Allow state to flush before triggering browser print
    setTimeout(() => {
      window.print();
    }, 50);
  };

  const totalCups = order.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;
  const itemsList = order.items || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-4 sm:p-6 shadow-2xl flex flex-col gap-4 relative max-h-[95vh] overflow-y-auto">
        
        {/* Modal Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer no-print"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 no-print">
          <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white">Order Confirmed!</h3>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                56mm / 80mm POS
              </span>
            </div>
            <p className="text-xs text-slate-400">Sent to Kitchen KDS. Select receipt type to print:</p>
          </div>
        </div>

        {/* Print Mode Switcher (Full Bill vs Token Slip) */}
        <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 no-print">
          <button
            type="button"
            onClick={() => setPrintMode('full')}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              printMode === 'full'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ReceiptText className="w-4 h-4" />
            Full Customer Bill (සම්පූර්ණ බිල)
          </button>

          <button
            type="button"
            onClick={() => setPrintMode('token_only')}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              printMode === 'token_only'
                ? 'bg-amber-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Ticket className="w-4 h-4" />
            Token Only (ටෝකනය පමණි)
          </button>
        </div>

        {/* Printable Receipt Container (Shown on screen & rendered for print) */}
        <div 
          id="printable-receipt" 
          className="w-full max-w-[320px] mx-auto bg-white text-black p-4 rounded-xl font-mono text-xs shadow-md border border-slate-300 flex flex-col gap-2.5 select-text"
        >
          {/* Shop Header */}
          <div className="text-center border-b border-dashed border-black pb-2">
            <h2 className="text-base font-black tracking-wider uppercase">SUWA KANDA</h2>
            <p className="text-sm font-bold font-sinhala text-black">සුව කැඳ - තණමල්විල</p>
            <p className="text-[10px] text-gray-800">Authentic Herbal Congee</p>
            <p className="text-[10px] text-gray-700">Thanamalwila Junction, Sri Lanka</p>
            <p className="text-[10px] text-gray-700">Hotline: +94 77 123 4567</p>
          </div>

          {/* Token Banner */}
          <div className="text-center py-2 border-b border-dashed border-black">
            <span className="text-[10px] uppercase tracking-wider font-bold block text-gray-700">
              TOKEN NUMBER / ටෝකන් අංකය
            </span>
            <span className="text-4xl font-black text-black block tracking-tight my-1">
              {order.token_code || order.token_display || `#${order.token_number}`}
            </span>
            <div className="flex items-center justify-center gap-2 mt-1 text-[11px] font-bold">
              <span className="px-2 py-0.5 bg-gray-100 border border-black/40 rounded uppercase">
                {order.order_type === 'dine_in' ? 'DINE-IN (ශාලාවේදී)' : 'TAKEAWAY (පාර්සල්)'}
              </span>
              <span className="px-2 py-0.5 bg-gray-100 border border-black/40 rounded uppercase">
                {order.payment_method?.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Order Details & Line Items (Visible in Full Bill Mode) */}
          {printMode === 'full' ? (
            <>
              {/* Order Meta */}
              <div className="flex justify-between text-[10px] text-gray-800 py-1 border-b border-dashed border-black font-semibold">
                <span>Bill #{order.id}</span>
                <span>{order.created_at}</span>
              </div>

              {/* Line Items Table */}
              <div className="py-1 border-b border-dashed border-black flex flex-col gap-2">
                <div className="flex justify-between font-bold text-[10px] border-b border-black/30 pb-1 uppercase tracking-wide">
                  <span>ITEM / විස්තරය</span>
                  <span>AMOUNT</span>
                </div>

                {itemsList.length > 0 ? (
                  itemsList.map((item, idx) => (
                    <div key={idx} className="flex flex-col gap-0.5 text-[11px]">
                      <div className="flex justify-between font-bold text-black">
                        <span className="truncate pr-1">{item.name}</span>
                        <span className="font-mono whitespace-nowrap">
                          Rs. {(item.quantity * item.price_each).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between text-[10px] text-gray-700 font-medium">
                        <span className="font-sinhala">{item.sinhala_name}</span>
                        <span className="font-mono text-gray-600">
                          {item.quantity} x Rs. {Number(item.price_each).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-2 text-gray-500 italic text-[11px]">
                    No items listed
                  </div>
                )}
              </div>

              {/* Totals Section */}
              <div className="py-1.5 flex flex-col gap-1 border-b border-dashed border-black">
                <div className="flex justify-between items-center text-[11px] text-gray-700 font-semibold">
                  <span>Total Congee Cups (කෝප්ප ගණන):</span>
                  <span className="font-mono font-bold">{totalCups}</span>
                </div>
                <div className="flex justify-between items-center text-sm font-black text-black pt-1 border-t border-black/40">
                  <span>NET TOTAL:</span>
                  <span className="font-mono text-base">
                    Rs. {Number(order.total_amount).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Footer Blessing */}
              <div className="text-center pt-2 text-[10px] text-gray-700 flex flex-col gap-0.5">
                <p className="font-sinhala font-bold text-black text-xs">නිරෝගී සුවය පතමු!</p>
                <p className="text-[9px] text-gray-600">100% Fresh Ayurvedic Herbal Congee</p>
                <p className="text-[9px] text-gray-500">Thank you for visiting Suwa Kanda!</p>
              </div>
            </>
          ) : (
            /* Token Slip Only Mode (Compact ticket for kitchen/counter) */
            <div className="text-center py-2 flex flex-col gap-2">
              <div className="text-xs font-bold text-black border-b border-dashed border-black pb-1.5 flex justify-between">
                <span>Items: {totalCups} Cups</span>
                <span>Bill #{order.id}</span>
              </div>
              <div className="space-y-1 text-left text-xs font-semibold text-gray-800">
                {itemsList.map((item, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span>
                      {item.name} <span className="font-sinhala text-gray-600">({item.sinhala_name})</span>
                    </span>
                    <span className="font-mono font-bold text-black">{item.quantity}x</span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-gray-600 pt-1 border-t border-dashed border-black font-sinhala">
                කරුණාකර මෙම අංකය කැඳ ලබාගැනීමට ඉදිරිපත් කරන්න
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 no-print">
          <button
            onClick={() => handlePrint('full')}
            className="py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/60 active:scale-95 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            Print Full Bill (බිල)
          </button>

          <button
            onClick={() => handlePrint('token_only')}
            className="py-3 px-4 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-950/60 active:scale-95 cursor-pointer"
          >
            <Ticket className="w-4 h-4" />
            Print Token Slip
          </button>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold text-xs transition-all cursor-pointer no-print"
        >
          Done (New Order)
        </button>

      </div>
    </div>
  );
}
