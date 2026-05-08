import React, { useState, useRef } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PDFDocument } from 'pdf-lib';

interface InsertFromFileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (updatedFile: File) => void;
  originalFile: File;
  targetTotalPages: number;
}

export default function InsertFromFileModal({
  isOpen,
  onClose,
  onInsert,
  originalFile,
  targetTotalPages
}: InsertFromFileModalProps) {
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [sourceTotalPages, setSourceTotalPages] = useState(0);

  const [rangeMode, setRangeMode] = useState<'all' | 'range'>('range');
  const [rangeInput, setRangeInput] = useState('1');
  const [subset, setSubset] = useState('Even and odd pages');

  const [placeMode, setPlaceMode] = useState<'first' | 'last' | 'page'>('page');
  const [atPage, setAtPage] = useState(1);
  const [location, setLocation] = useState<'Before' | 'After'>('After');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setSourceFile(file);
      try {
        const buffer = await file.arrayBuffer();
        const pdf = await PDFDocument.load(buffer, { updateMetadata: false });
        setSourceTotalPages(pdf.getPageCount());
        setRangeInput(`1-${pdf.getPageCount()}`);
      } catch (err) {
        console.error('Error loading source PDF:', err);
        setSourceFile(null);
        alert('Invalid PDF file.');
      }
    }
  };

  const handleOK = async () => {
    if (!sourceFile) {
      alert('Please select a file to insert.');
      return;
    }

    try {
      const targetBuffer = await originalFile.arrayBuffer();
      const sourceBuffer = await sourceFile.arrayBuffer();

      const targetPdf = await PDFDocument.load(targetBuffer);
      const sourcePdf = await PDFDocument.load(sourceBuffer);

      let pagesToCopy: number[] = [];

      if (rangeMode === 'all') {
        pagesToCopy = Array.from({ length: sourceTotalPages }, (_, i) => i);
      } else {
        const parts = rangeInput.split(',').map(p => p.trim());
        parts.forEach(part => {
          if (part.includes('-')) {
            const [start, end] = part.split('-').map(Number);
            if (!isNaN(start) && !isNaN(end)) {
              for (let i = Math.min(start, end); i <= Math.max(start, end); i++) {
                if (i >= 1 && i <= sourceTotalPages) pagesToCopy.push(i - 1);
              }
            }
          } else {
            const num = Number(part);
            if (!isNaN(num) && num >= 1 && num <= sourceTotalPages) {
              pagesToCopy.push(num - 1);
            }
          }
        });
      }

      pagesToCopy = Array.from(new Set(pagesToCopy)).sort((a, b) => a - b);

      if (subset === 'Odd pages only') {
        pagesToCopy = pagesToCopy.filter(p => (p + 1) % 2 !== 0);
      } else if (subset === 'Even pages only') {
        pagesToCopy = pagesToCopy.filter(p => (p + 1) % 2 === 0);
      }

      if (pagesToCopy.length === 0) {
        alert('No pages selected from source file.');
        return;
      }

      const copiedPages = await targetPdf.copyPages(sourcePdf, pagesToCopy);

      let insertIndex = 0;
      if (placeMode === 'first') {
        insertIndex = 0;
        if (location === 'After') insertIndex = 1;
      } else if (placeMode === 'last') {
        insertIndex = targetPdf.getPageCount();
        if (location === 'Before') insertIndex = targetPdf.getPageCount() - 1;
      } else {
        insertIndex = atPage - 1;
        if (location === 'After') insertIndex = atPage;
      }

      // Clamp insertIndex
      insertIndex = Math.max(0, Math.min(targetPdf.getPageCount(), insertIndex));

      copiedPages.forEach((page, i) => {
        targetPdf.insertPage(insertIndex + i, page);
      });

      const pdfBytes = await targetPdf.save();
      const newFile = new File([pdfBytes as any], originalFile.name, { type: 'application/pdf' });
      onInsert(newFile);
      onClose();
    } catch (err) {
      console.error('Insert from file failed:', err);
      alert('Failed to insert pages.');
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
            className="relative w-full max-w-[500px] bg-white rounded shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="bg-[#2B3467] text-white px-4 py-2 flex items-center justify-between">
              <span className="text-sm font-medium">Insert</span>
              <button onClick={onClose} className="hover:bg-white/10 p-1 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6 overflow-y-auto max-h-[85vh]">
              {/* File Section */}
              <div className="space-y-2">
                <h3 className="text-slate-600 text-sm font-medium">File</h3>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-1 border border-blue-600 text-blue-600 rounded text-sm hover:bg-blue-50 transition-colors"
                  >
                    Browse...
                  </button>
                  <span className="text-slate-600 text-xs truncate max-w-[280px]">
                    {sourceFile ? sourceFile.name : 'No file selected'}
                  </span>
                  <input ref={fileInputRef} type="file" className="hidden" accept="application/pdf" onChange={handleFileChange} />
                </div>
              </div>

              {/* Page Range Section */}
              <div className="space-y-3">
                <h3 className="text-slate-600 text-sm font-medium">Page Range</h3>
                <div className="pl-2 space-y-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="radio" checked={rangeMode === 'all'} onChange={() => setRangeMode('all')} className="accent-blue-600" />
                    <span className="text-sm text-slate-700">All</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="radio" checked={rangeMode === 'range'} onChange={() => setRangeMode('range')} className="accent-blue-600" />
                    <span className="text-sm text-slate-700">Range:</span>
                    <input
                      type="text"
                      className="border border-slate-300 rounded px-2 py-0.5 text-xs w-20 outline-blue-600"
                      value={rangeInput}
                      onChange={(e) => setRangeInput(e.target.value)}
                      disabled={rangeMode !== 'range'}
                    />
                    <span className="text-xs text-slate-500">of {sourceTotalPages} e.g.(1,3,5,7-10)</span>
                  </label>
                </div>
                <div className="flex items-center gap-3 pl-2">
                  <span className="text-sm text-slate-700">Subset:</span>
                  <select
                    className="border border-slate-300 rounded px-2 py-1 text-sm outline-none w-full max-w-[200px]"
                    value={subset}
                    onChange={(e) => setSubset(e.target.value)}
                  >
                    <option>Even and odd pages</option>
                    <option>Odd pages only</option>
                    <option>Even pages only</option>
                  </select>
                </div>
              </div>

              {/* Place At Section */}
              <div className="space-y-3">
                <h3 className="text-slate-600 text-sm font-medium">Place At</h3>
                <div className="pl-2 space-y-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="radio" checked={placeMode === 'first'} onChange={() => setPlaceMode('first')} className="accent-blue-600" />
                    <span className="text-sm text-slate-700">First Page</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="radio" checked={placeMode === 'last'} onChange={() => setPlaceMode('last')} className="accent-blue-600" />
                    <span className="text-sm text-slate-700">Last Page</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="radio" checked={placeMode === 'page'} onChange={() => setPlaceMode('page')} className="accent-blue-600" />
                    <span className="text-sm text-slate-700">Page:</span>
                    <input
                      type="number"
                      min="1"
                      max={targetTotalPages}
                      className="border border-slate-300 rounded px-2 py-0.5 text-xs w-20 outline-blue-600"
                      value={atPage}
                      onChange={(e) => setAtPage(parseInt(e.target.value) || 1)}
                      disabled={placeMode !== 'page'}
                    />
                    <span className="text-xs text-slate-500">/ {targetTotalPages}</span>
                  </label>
                </div>
                <div className="flex items-center gap-3 pl-2">
                  <span className="text-sm text-slate-700">Location:</span>
                  <select
                    className="border border-slate-300 rounded px-2 py-1 text-sm outline-none w-full max-w-[200px]"
                    value={location}
                    onChange={(e) => setLocation(e.target.value as any)}
                  >
                    <option>Before</option>
                    <option>After</option>
                  </select>
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-3 pt-6 border-t">
                <button
                  onClick={onClose}
                  className="px-6 py-1 border border-blue-600 text-blue-600 rounded text-sm hover:bg-blue-50 transition-colors"
                >
                  CANCEL
                </button>
                <button
                  onClick={handleOK}
                  className="px-8 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors shadow-md shadow-blue-200"
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
