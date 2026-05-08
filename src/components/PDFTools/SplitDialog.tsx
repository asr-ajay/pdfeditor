import React, { useState } from 'react';
import { X, Scissors, Info } from 'lucide-react';
import { usePDF } from '../../contexts/PDFContext';
import { cn } from '../../lib/utils';

interface SplitDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SplitDialog({ isOpen, onClose }: SplitDialogProps) {
  const { splitPDF, totalPages } = usePDF();
  const [mode, setMode] = useState<'fixed' | 'range'>('fixed');
  const [fixedValue, setFixedValue] = useState('1');
  const [rangeValue, setRangeValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleSplit = async () => {
    setIsProcessing(true);
    const value = mode === 'fixed' ? fixedValue : rangeValue;
    await splitPDF(mode, value);
    setIsProcessing(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Scissors className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Split PDF</h3>
              <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Separate pages into new documents</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          <div className="flex p-1 bg-slate-100 rounded-lg">
            <button
              onClick={() => setMode('fixed')}
              className={cn(
                "flex-1 py-2 text-xs font-bold rounded-md transition-all",
                mode === 'fixed' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              Fixed Range
            </button>
            <button
              onClick={() => setMode('range')}
              className={cn(
                "flex-1 py-2 text-xs font-bold rounded-md transition-all",
                mode === 'range' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              Custom Range
            </button>
          </div>

          <div className="space-y-4">
            {mode === 'fixed' ? (
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Split every n pages</label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max={totalPages}
                    value={fixedValue}
                    onChange={(e) => setFixedValue(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 uppercase">Pages</span>
                </div>
                <p className="text-[10px] text-slate-400 italic">Example: Entering '2' will split a 10-page document into five 2-page documents.</p>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Enter custom ranges</label>
                <input
                  type="text"
                  placeholder="e.g. 1-3, 5-10"
                  value={rangeValue}
                  onChange={(e) => setRangeValue(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                />
                <div className="flex items-start gap-2 p-3 bg-blue-50/50 rounded-lg border border-blue-100">
                  <Info className="w-3 h-3 text-blue-500 mt-0.5 shrink-0" />
                  <p className="text-[10px] text-blue-700 leading-relaxed font-medium">
                    Use commas to separate different documents and hyphens for page ranges. Each range will be exported as a separate file.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700"
          >
            Cancel
          </button>
          <button
            onClick={handleSplit}
            disabled={isProcessing || (mode === 'range' && !rangeValue)}
            className={cn(
              "px-6 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2",
              isProcessing && "animate-pulse"
            )}
          >
            {isProcessing ? 'Processing...' : 'Split PDF'}
          </button>
        </div>
      </div>
    </div>
  );
}
