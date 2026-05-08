import React, { useState } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PDFDocument } from 'pdf-lib';

interface InsertBlankPageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (updatedFile: File) => void;
  originalFile: File;
  currentPage: number;
  totalPages: number;
}

export default function InsertBlankPageModal({
  isOpen,
  onClose,
  onInsert,
  originalFile,
  currentPage,
  totalPages
}: InsertBlankPageModalProps) {
  const [pageAmount, setPageAmount] = useState(1);

  const handleOK = async () => {
    try {
      const existingPdfBytes = await originalFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(existingPdfBytes);

      // We'll insert after current page by default or at current location
      // For simplicity in this "Blank Page" quick modal, we could follow the pattern in the screenshot
      // which just shows "Page Amount". Usually this inserts at the current position.

      for (let i = 0; i < pageAmount; i++) {
        pdfDoc.insertPage(currentPage); // 0-indexed, if currentPage is 1 (1st page), pdfDoc.insertPage(1) inserts AFTER page 1.
      }

      const pdfBytes = await pdfDoc.save();
      const newFile = new File([pdfBytes as any], originalFile.name, { type: 'application/pdf' });
      onInsert(newFile);
      onClose();
    } catch (err) {
      console.error('Insert blank pages failed:', err);
      alert('Failed to insert blank pages.');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/20 backdrop-blur-[2px]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 10 }}
            className="relative w-full max-w-[400px] bg-white rounded shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="bg-[#2B3467] text-white px-4 py-2 flex items-center justify-between">
              <span className="text-sm font-medium">Insert</span>
              <button onClick={onClose} className="hover:bg-white/10 p-1 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-10 space-y-8">
              <div className="flex items-center gap-4">
                <span className="text-slate-700 text-sm">Page Amount:</span>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    className="w-20 h-8 border border-[#2B3467] rounded px-2 text-sm outline-none"
                    value={pageAmount}
                    onChange={(e) => setPageAmount(Math.max(1, parseInt(e.target.value) || 1))}
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleOK}
                  className="px-10 py-1.5 bg-[#4B59F7] text-white rounded text-sm font-medium hover:brightness-110 transition-all shadow-md active:scale-95"
                >
                  OK
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
