import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import { usePDF } from '../contexts/PDFContext';

interface ReplacePagesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ReplacePagesModal({ isOpen, onClose }: ReplacePagesModalProps) {
  const { activeFileId, sharedFiles, updateSharedFileData, totalPages } = usePDF();

  const [replaceFrom, setReplaceFrom] = useState(1);
  const [replaceTo, setReplaceTo] = useState(1);
  const [replacementFile, setReplacementFile] = useState<File | null>(null);
  const [replacementTotalPages, setReplacementTotalPages] = useState(0);
  const [replaceWithFrom, setReplaceWithFrom] = useState(1);
  const [replaceWithTo, setReplaceWithTo] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);

  const activeFile = sharedFiles.find(f => f.id === activeFileId);

  useEffect(() => {
    if (isOpen) {
      setReplaceFrom(1);
      setReplaceTo(1);
      setReplacementFile(null);
      setReplacementTotalPages(0);
      setReplaceWithFrom(1);
      setReplaceWithTo(1);
    }
  }, [isOpen]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      try {
        const buffer = await file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(buffer);
        const count = pdfDoc.getPageCount();
        setReplacementFile(file);
        setReplacementTotalPages(count);
        setReplaceWithFrom(1);
        setReplaceWithTo(count);
      } catch (err) {
        console.error('Error loading replacement PDF:', err);
        alert('Failed to load replacement PDF.');
      }
    }
  };

  const handleReplace = async () => {
    if (!activeFile || !replacementFile) return;

    setIsProcessing(true);
    try {
      const originalBuffer = await activeFile.file.arrayBuffer();
      const replacementBuffer = await replacementFile.arrayBuffer();

      const originalPdf = await PDFDocument.load(originalBuffer);
      const replacementPdf = await PDFDocument.load(replacementBuffer);

      const resultPdf = await PDFDocument.create();

      // 1. Copy pages from original BEFORE the replaced range
      if (replaceFrom > 1) {
        const preIndices = Array.from({ length: replaceFrom - 1 }, (_, i) => i);
        const prePages = await resultPdf.copyPages(originalPdf, preIndices);
        prePages.forEach(p => resultPdf.addPage(p));
      }

      // 2. Copy pages from replacement PDF
      const replacementIndices = Array.from(
        { length: replaceWithTo - replaceWithFrom + 1 },
        (_, i) => replaceWithFrom - 1 + i
      );
      const newPages = await resultPdf.copyPages(replacementPdf, replacementIndices);
      newPages.forEach(p => resultPdf.addPage(p));

      // 3. Copy pages from original AFTER the replaced range
      const originalTotalCount = originalPdf.getPageCount();
      if (replaceTo < originalTotalCount) {
        const postIndices = Array.from(
          { length: originalTotalCount - replaceTo },
          (_, i) => replaceTo + i
        );
        const postPages = await resultPdf.copyPages(originalPdf, postIndices);
        postPages.forEach(p => resultPdf.addPage(p));
      }

      const pdfBytes = await resultPdf.save();
      const newFile = new File([pdfBytes as any], activeFile.file.name, { type: 'application/pdf' });

      updateSharedFileData(activeFile.id, { file: newFile, pages: undefined }, true);
      onClose();
    } catch (err) {
      console.error('Replace pages failed:', err);
      alert('An error occurred while replacing pages.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white shadow-2xl w-full max-w-[500px] overflow-hidden border border-slate-200">
        {/* Header - Navy Blue */}
        <div className="bg-[#2B3467] px-4 py-2 flex items-center justify-between">
          <h2 className="text-white text-lg font-medium">Replace Pages</h2>
          <button onClick={onClose} className="text-white/80 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 text-[14px]">
          {/* Section 1: Select Page to replace */}
          <div className="space-y-4">
            <h3 className="text-slate-600 font-medium pb-1 border-b border-slate-100">Select Page to replace</h3>

            <div className="flex items-center gap-2">
              <span className="w-24 text-slate-500">Replace page:</span>
              <input
                type="number"
                value={replaceFrom}
                min={1}
                max={totalPages}
                onChange={(e) => setReplaceFrom(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-16 border border-slate-300 px-2 py-1 outline-none focus:border-blue-500 text-center"
              />
              <span className="text-slate-500 mx-2">To:</span>
              <input
                type="number"
                value={replaceTo}
                min={replaceFrom}
                max={totalPages}
                onChange={(e) => setReplaceTo(Math.max(replaceFrom, parseInt(e.target.value) || replaceFrom))}
                className="w-16 border border-slate-300 px-2 py-1 outline-none focus:border-blue-500 text-center"
              />
              <span className="text-slate-500 ml-2">of {totalPages}</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="w-24 text-slate-500">In:</span>
              <span className="text-slate-600 truncate flex-1 font-medium italic">
                {activeFile?.file.name || 'No file selected'}
              </span>
            </div>
          </div>

          {/* Section 2: Select replacement pages */}
          <div className="space-y-4 pt-2">
            <h3 className="text-slate-600 font-medium pb-1 border-b border-slate-100">Select replacement pages</h3>

            <div className="flex items-center gap-4">
              <span className="w-24 text-slate-500">Select file:</span>
              <label className="border border-blue-600 text-blue-600 px-6 py-1 cursor-pointer hover:bg-blue-50 transition-colors">
                Browse...
                <input
                  type="file"
                  className="hidden"
                  accept="application/pdf"
                  onChange={handleFileChange}
                />
              </label>
              <span className="text-slate-600 truncate flex-1 font-medium italic">
                {replacementFile?.name || 'No file chosen'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="w-24 text-slate-500">Replace with page:</span>
              <input
                type="number"
                value={replaceWithFrom}
                min={1}
                max={replacementTotalPages || 1}
                disabled={!replacementFile}
                onChange={(e) => setReplaceWithFrom(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-16 border border-slate-300 px-2 py-1 outline-none focus:border-blue-500 text-center disabled:bg-slate-50 disabled:text-slate-400"
              />
              <span className="text-slate-500 mx-2">To:</span>
              <input
                type="number"
                value={replaceWithTo}
                min={replaceWithFrom}
                max={replacementTotalPages || 1}
                disabled={!replacementFile}
                onChange={(e) => setReplaceWithTo(Math.max(replaceWithFrom, parseInt(e.target.value) || replaceWithFrom))}
                className="w-16 border border-slate-300 px-2 py-1 outline-none focus:border-blue-500 text-center disabled:bg-slate-50 disabled:text-slate-400"
              />
              <span className="text-slate-500 ml-2">of {replacementTotalPages || 0}</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 pt-0 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-8 py-2 border border-blue-600 text-blue-600 font-medium hover:bg-blue-50 transition-colors uppercase text-sm min-w-[120px]"
          >
            CANCEL
          </button>
          <button
            onClick={handleReplace}
            disabled={!replacementFile || isProcessing}
            className="px-10 py-2 bg-[#4461FF] text-white font-medium hover:bg-blue-700 transition-colors uppercase text-sm disabled:bg-slate-300 disabled:cursor-not-allowed min-w-[120px]"
          >
            {isProcessing ? 'PROCESSING...' : 'OK'}
          </button>
        </div>
      </div>
    </div>
  );
}
