import React, { useState } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { PDFDocument } from 'pdf-lib';

interface ExtractPagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalPages: number;
  onExtract: (file: File) => void;
  originalFileName: string;
  originalFile: File;
  selectedPageIndices?: number[];
}

export default function ExtractPagesModal({
  isOpen,
  onClose,
  totalPages,
  onExtract,
  originalFileName,
  originalFile,
  selectedPageIndices = []
}: ExtractPagesModalProps) {
  const [mode, setMode] = useState<'all' | 'range'>('range');

  // Create a helper to format indices (0-based) into a range string (1-based)
  const formatRange = (indices: number[]) => {
    if (indices.length === 0) return `1-${Math.min(totalPages, 2)}`;

    const sorted = [...indices].sort((a, b) => a - b);
    const ranges: string[] = [];
    let start = sorted[0];
    let end = start;

    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] === end + 1) {
        end = sorted[i];
      } else {
        ranges.push(start === end ? `${start + 1}` : `${start + 1}-${end + 1}`);
        start = sorted[i];
        end = start;
      }
    }
    ranges.push(start === end ? `${start + 1}` : `${start + 1}-${end + 1}`);
    return ranges.join(', ');
  };

  const [rangeInput, setRangeInput] = useState(formatRange(selectedPageIndices));
  const [subset, setSubset] = useState('Even and odd pages');

  // Sync range input when selection or total pages change
  React.useEffect(() => {
    if (isOpen) {
      setRangeInput(formatRange(selectedPageIndices));
      setMode(selectedPageIndices.length > 0 ? 'range' : 'range');
    }
  }, [isOpen, selectedPageIndices, totalPages]);

  const handleOK = async () => {
    try {
      const existingPdfBytes = await originalFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      const newPdfDoc = await PDFDocument.create();

      let pagesToExtract: number[] = [];

      if (mode === 'all') {
        pagesToExtract = Array.from({ length: totalPages }, (_, i) => i);
      } else {
        // Parse range input e.g. "1, 3, 5-7"
        const parts = rangeInput.split(',').map(p => p.trim());
        parts.forEach(part => {
          if (part.includes('-')) {
            const [start, end] = part.split('-').map(Number);
            if (!isNaN(start) && !isNaN(end)) {
              for (let i = Math.min(start, end); i <= Math.max(start, end); i++) {
                if (i >= 1 && i <= totalPages) pagesToExtract.push(i - 1);
              }
            }
          } else {
            const num = Number(part);
            if (!isNaN(num) && num >= 1 && num <= totalPages) {
              pagesToExtract.push(num - 1);
            }
          }
        });
      }

      // Remove duplicates and sort
      pagesToExtract = Array.from(new Set(pagesToExtract)).sort((a, b) => a - b);

      // Apply subset filtering
      if (subset === 'Odd pages only') {
        pagesToExtract = pagesToExtract.filter(p => (p + 1) % 2 !== 0);
      } else if (subset === 'Even pages only') {
        pagesToExtract = pagesToExtract.filter(p => (p + 1) % 2 === 0);
      }

      if (pagesToExtract.length === 0) {
        alert('No valid pages to extract.');
        return;
      }

      // Copy pages
      const copiedPages = await newPdfDoc.copyPages(pdfDoc, pagesToExtract);
      copiedPages.forEach(page => newPdfDoc.addPage(page));

      const pdfBytes = await newPdfDoc.save();
      const baseName = originalFileName.replace('.pdf', '');
      const newFile = new File([pdfBytes as any], `${baseName}_extracted.pdf`, { type: 'application/pdf' });

      onExtract(newFile);
      onClose();
    } catch (err) {
      console.error('Extraction failed:', err);
      alert('Failed to extract pages.');
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
            className="relative w-full max-w-[450px] bg-white rounded shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="bg-[#2B3467] text-white px-4 py-2 flex items-center justify-between">
              <span className="text-sm font-medium">Extract Pages</span>
              <button onClick={onClose} className="hover:bg-white/10 p-1 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              <div className="space-y-4">
                <h3 className="text-[#2B3467] font-normal text-lg">Page Range</h3>

                <div className="space-y-3 pl-2">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="radio"
                      name="rangeType"
                      className="w-4 h-4 accent-[#4B59F7]"
                      checked={mode === 'all'}
                      onChange={() => setMode('all')}
                    />
                    <span className="text-slate-700 text-sm">All</span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="radio"
                      name="rangeType"
                      className="w-4 h-4 accent-[#4B59F7]"
                      checked={mode === 'range'}
                      onChange={() => setMode('range')}
                    />
                    <span className="text-slate-700 text-sm whitespace-nowrap">Range:</span>
                    <input
                      type="text"
                      className="h-7 border border-[#CED4DA] rounded px-2 text-sm w-24 outline-[#4B59F7]"
                      value={rangeInput}
                      onChange={(e) => setRangeInput(e.target.value)}
                      disabled={mode !== 'range'}
                    />
                    <span className="text-slate-500 text-sm">of {totalPages}</span>
                    <span className="text-slate-400 text-[11px] ml-2 italic">e.g.(1,3,5,7-10)</span>
                  </label>
                </div>

                <div className="flex items-center gap-4 pl-2 mt-4">
                  <span className="text-slate-500 text-sm w-12">Subset:</span>
                  <select
                    className="flex-1 h-8 border border-[#CED4DA] rounded px-2 text-sm text-slate-700 outline-[#4B59F7]"
                    value={subset}
                    onChange={(e) => setSubset(e.target.value)}
                  >
                    <option>Even and odd pages</option>
                    <option>Odd pages only</option>
                    <option>Even pages only</option>
                  </select>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  onClick={onClose}
                  className="px-6 py-1.5 border border-[#4B59F7] text-[#4B59F7] rounded text-sm font-medium hover:bg-slate-50 transition-colors"
                >
                  CANCEL
                </button>
                <button
                  onClick={handleOK}
                  className="px-8 py-1.5 bg-[#4B59F7] text-white rounded text-sm font-medium hover:brightness-110 transition-all shadow-md active:scale-95"
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
