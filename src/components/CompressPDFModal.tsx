import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Zap, Printer, Monitor, Settings, Check, Loader2, Download, FileType } from 'lucide-react';
import { cn } from '../lib/utils';
import { usePDF } from '../contexts/PDFContext';
import { PDFDocument } from 'pdf-lib';

interface CompressPDFModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type CompressionLevel = 'extreme' | 'recommended' | 'less' | 'custom';

export default function CompressPDFModal({ isOpen, onClose }: CompressPDFModalProps) {
  const { activeFileId, sharedFiles, addSharedFiles } = usePDF();
  const [selectedLevel, setSelectedLevel] = useState<CompressionLevel>('recommended');
  const [isCompressing, setIsCompressing] = useState(false);
  const [progress, setProgress] = useState(0);

  // Custom settings
  const [customDpi, setCustomDpi] = useState(150);
  const [customQuality, setCustomQuality] = useState(70);

  const activeFile = sharedFiles.find(f => f.id === activeFileId);

  const levels = [
    {
      id: 'extreme',
      title: 'EXTREME COMPRESSION',
      description: 'Less quality, high compression',
      icon: Zap,
      color: 'bg-red-500',
      textColor: 'text-[#E54D2E]', // Using a reddish-orange color like in image
      dpi: 72,
      quality: 0.4
    },
    {
      id: 'recommended',
      title: 'RECOMMENDED COMPRESSION',
      description: 'Good quality, good compression',
      icon: Monitor,
      color: 'bg-orange-500',
      textColor: 'text-[#E54D2E]',
      dpi: 144,
      quality: 0.6
    },
    {
      id: 'less',
      title: 'LESS COMPRESSION',
      description: 'High quality, less compression',
      icon: FileType,
      color: 'bg-blue-500',
      textColor: 'text-[#E54D2E]',
      dpi: 200,
      quality: 0.75
    },
    {
      id: 'custom',
      title: 'CUSTOM SETTINGS',
      description: 'Customize compression settings.',
      icon: Settings,
      color: 'bg-slate-500',
      textColor: 'text-[#E54D2E]',
      dpi: customDpi,
      quality: customQuality / 100
    }
  ];

  const handleCompress = async () => {
    if (!activeFile) return;

    setIsCompressing(true);
    setProgress(0);

    try {
      // Import pdfjs-dist
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

      const arrayBuffer = await activeFile.file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdfDoc = await loadingTask.promise;

      const outputPdf = await PDFDocument.create();

      // Determine settings
      const level = levels.find(l => l.id === selectedLevel) || levels[0];
      const dpi = selectedLevel === 'custom' ? customDpi : level.dpi;
      const quality = selectedLevel === 'custom' ? customQuality / 100 : level.quality;

      for (let i = 1; i <= pdfDoc.numPages; i++) {
        const page = await pdfDoc.getPage(i);
        const viewport = page.getViewport({ scale: dpi / 72 });

        // Safety check for absolute maximum canvas size to prevent toBlob failure
        const MAX_CANVAS_DIMENSION = 16384;
        let scale = dpi / 72;
        if (viewport.width > MAX_CANVAS_DIMENSION || viewport.height > MAX_CANVAS_DIMENSION) {
          scale = scale * (MAX_CANVAS_DIMENSION / Math.max(viewport.width, viewport.height));
        }

        const finalViewport = scale === (dpi / 72) ? viewport : page.getViewport({ scale });

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (!context) continue;

        canvas.height = Math.max(1, Math.floor(finalViewport.height));
        canvas.width = Math.max(1, Math.floor(finalViewport.width));

        await page.render({
          canvasContext: context,
          viewport: finalViewport
        }).promise;

        const imageBytes = await new Promise<ArrayBuffer>((resolve, reject) => {
          try {
            canvas.toBlob(async (blob) => {
              if (blob) {
                resolve(await blob.arrayBuffer());
              } else {
                reject(new Error(`Canvas to Blob conversion failed: width=${canvas.width}, height=${canvas.height}`));
              }
            }, 'image/jpeg', Math.max(0, Math.min(1, quality)));
          } catch (e) {
            reject(e);
          }
        });
        const image = await outputPdf.embedJpg(imageBytes);

        const newPage = outputPdf.addPage([finalViewport.width, finalViewport.height]);
        newPage.drawImage(image, {
          x: 0,
          y: 0,
          width: finalViewport.width,
          height: finalViewport.height,
        });

        // Update progress
        setProgress(Math.round((i / pdfDoc.numPages) * 100));
      }

      const pdfBytes = await outputPdf.save();
      const compressedName = activeFile.file.name.replace('.pdf', '_compressed.pdf');
      const compressedFile = new File([pdfBytes as any], compressedName, { type: 'application/pdf' });

      // Add result and close
      addSharedFiles([compressedFile]);

      // Trigger download
      const url = URL.createObjectURL(compressedFile);
      const link = document.createElement('a');
      link.href = url;
      link.download = compressedName;
      link.click();
      URL.revokeObjectURL(url);

      onClose();
    } catch (err) {
      console.error(err);
      alert('Compression failed. The file might be too large or complex for browser-side processing.');
    } finally {
      setIsCompressing(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100 shadow-sm">
                  <Zap className="w-6 h-6 fill-blue-600/20" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Compress PDF</h3>
                  <p className="text-xs text-slate-500 font-medium">Reduce file size while keeping quality</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-0 space-y-0 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div className="space-y-0 border-t border-slate-200">
                {levels.map((level) => {
                  const isSelected = selectedLevel === level.id;

                  return (
                    <div key={level.id} className="border-b border-slate-200">
                      <button
                        onClick={() => setSelectedLevel(level.id as CompressionLevel)}
                        className={cn(
                          "w-full flex items-center p-5 transition-all text-left",
                          isSelected
                            ? "bg-[#F0F0F7]" // Light lavender/gray background for selection
                            : "bg-white hover:bg-slate-50"
                        )}
                      >
                        <div className="flex-1">
                          <div className={cn(
                            "text-sm font-semibold tracking-wide mb-1",
                            "text-[#E54D2E]"
                          )}>
                            {level.title}
                          </div>
                          <div className="text-sm text-slate-600 font-normal">
                            {level.description}
                          </div>
                        </div>

                        {isSelected && (
                          <div className="w-5 h-5 bg-[#E54D2E] rounded-full flex items-center justify-center text-white shadow-sm">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        )}
                      </button>

                      {isSelected && level.id === 'custom' && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          className="mx-2 p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-5"
                        >
                          <div className="space-y-3">
                            <div className="flex justify-between items-center px-1">
                              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Image Quality</label>
                              <span className="font-mono text-xs font-bold text-blue-600">{customQuality}%</span>
                            </div>
                            <input
                              type="range"
                              min="10"
                              max="100"
                              value={customQuality}
                              onChange={(e) => setCustomQuality(parseInt(e.target.value))}
                              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                            />
                            <div className="flex justify-between text-[8px] text-slate-400 font-bold uppercase tracking-tighter">
                              <span>Low Size</span>
                              <span>High Quality</span>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <div className="flex justify-between items-center px-1">
                              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Resolution (DPI)</label>
                              <span className="font-mono text-xs font-bold text-blue-600">{customDpi} DPI</span>
                            </div>
                            <input
                              type="range"
                              min="72"
                              max="600"
                              step="1"
                              value={customDpi}
                              onChange={(e) => setCustomDpi(parseInt(e.target.value))}
                              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                            />
                            <div className="flex justify-between text-[8px] text-slate-400 font-bold uppercase tracking-tighter">
                              <span>72 DPI</span>
                              <span>600 DPI</span>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  );
                })}
              </div>

              {activeFile && (
                <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-white border border-slate-200 flex items-center justify-center text-red-500">
                      <FileType className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-700 truncate max-w-[200px]">{activeFile.file.name}</div>
                      <div className="text-[10px] text-slate-400">Current size: {(activeFile.file.size / (1024 * 1024)).toFixed(2)} MB</div>
                    </div>
                  </div>
                  <div className="text-xs font-bold text-slate-500">
                    {selectedLevel === 'extreme' && 'Est. ~75% reduction'}
                    {selectedLevel === 'recommended' && 'Est. ~50% reduction'}
                    {selectedLevel === 'less' && 'Est. ~25% reduction'}
                    {selectedLevel === 'custom' && 'Configurable'}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-800 transition-colors"
                disabled={isCompressing}
              >
                Cancel
              </button>

              <button
                onClick={handleCompress}
                disabled={isCompressing || !activeFile}
                className={cn(
                  "px-6 py-2.5 rounded-lg text-sm font-bold shadow-lg transition-all flex items-center gap-2",
                  isCompressing
                    ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                    : "bg-blue-600 text-white hover:bg-blue-700 active:scale-95"
                )}
              >
                {isCompressing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Compressing {progress}%
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Compress Now
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
