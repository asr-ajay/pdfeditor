import React, { useState, useEffect, useRef } from 'react';
import { X, FileText } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import { usePDF } from '../contexts/PDFContext';

interface CropModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type UnitType = 'Inches' | 'Points' | 'Millimeters' | 'Centimeters';

export default function CropModal({ isOpen, onClose }: CropModalProps) {
  const { activeFileId, sharedFiles, updateSharedFileData, totalPages, pages, currentPage } = usePDF();
  const previewRef = useRef<HTMLDivElement>(null);

  const [margins, setMargins] = useState({ top: 0, bottom: 0, left: 0, right: 0 });
  const [unit, setUnit] = useState<UnitType>('Inches');

  const [pageRangeType, setPageRangeType] = useState<'all' | 'range'>('range');
  const [pageRange, setPageRange] = useState(currentPage.toString());
  const [subset, setSubset] = useState('Even and odd pages');

  const [isProcessing, setIsProcessing] = useState(false);
  const [draggingHandle, setDraggingHandle] = useState<string | null>(null);

  const activeFile = sharedFiles.find(f => f.id === activeFileId);

  useEffect(() => {
    if (isOpen) {
      setPageRange(currentPage.toString());
      setMargins({ top: 0, bottom: 0, left: 0, right: 0 });
    }
  }, [isOpen, currentPage]);

  const handleReset = () => {
    setMargins({ top: 0, bottom: 0, left: 0, right: 0 });
  };

  const convertToPoints = (value: number, fromUnit: UnitType) => {
    switch (fromUnit) {
      case 'Inches': return value * 72;
      case 'Millimeters': return value * 2.83465;
      case 'Centimeters': return value * 28.3465;
      case 'Points': return value;
      default: return value;
    }
  };

  const handleMouseDown = (handle: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    setDraggingHandle(handle);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!draggingHandle || !previewRef.current) return;

      const rect = previewRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;

      // Ensure values are within [0, 1] relative units
      const clampedX = Math.max(0, Math.min(1, x));
      const clampedY = Math.max(0, Math.min(1, y));

      const newMargins = { ...margins };

      // Visual scale mapping [0,1] range to roughly 0-5 unit range for the sliders
      const scale = 5;

      if (draggingHandle === 'n') newMargins.top = clampedY * scale;
      if (draggingHandle === 's') newMargins.bottom = (1 - clampedY) * scale;
      if (draggingHandle === 'w') newMargins.left = clampedX * scale;
      if (draggingHandle === 'e') newMargins.right = (1 - clampedX) * scale;

      if (draggingHandle === 'nw') { newMargins.top = clampedY * scale; newMargins.left = clampedX * scale; }
      if (draggingHandle === 'ne') { newMargins.top = clampedY * scale; newMargins.right = (1 - clampedX) * scale; }
      if (draggingHandle === 'sw') { newMargins.bottom = (1 - clampedY) * scale; newMargins.left = clampedX * scale; }
      if (draggingHandle === 'se') { newMargins.bottom = (1 - clampedY) * scale; newMargins.right = (1 - clampedX) * scale; }

      setMargins(newMargins);
    };

    const handleMouseUp = () => {
      setDraggingHandle(null);
    };

    if (draggingHandle) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingHandle, margins]);

  const handleApply = async () => {
    if (!activeFile) return;
    setIsProcessing(true);
    try {
      const buffer = await activeFile.file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(buffer);
      const allPages = pdfDoc.getPages();

      let targetIndices: number[] = [];
      if (pageRangeType === 'all') {
        targetIndices = allPages.map((_, i) => i);
      } else {
        const ranges = pageRange.split(',').map(r => r.trim());
        ranges.forEach(r => {
          if (r.includes('-')) {
            const [start, end] = r.split('-').map(Number);
            for (let i = start; i <= end; i++) {
              if (i >= 1 && i <= totalPages) targetIndices.push(i - 1);
            }
          } else {
            const num = parseInt(r);
            if (!isNaN(num) && num >= 1 && num <= totalPages) {
              targetIndices.push(num - 1);
            }
          }
        });
      }

      targetIndices = [...new Set(targetIndices)].sort((a, b) => a - b);

      if (subset === 'Even pages only') {
        targetIndices = targetIndices.filter(idx => (idx + 1) % 2 === 0);
      } else if (subset === 'Odd pages only') {
        targetIndices = targetIndices.filter(idx => (idx + 1) % 2 !== 0);
      }

      const tPoints = convertToPoints(margins.top, unit);
      const bPoints = convertToPoints(margins.bottom, unit);
      const lPoints = convertToPoints(margins.left, unit);
      const rPoints = convertToPoints(margins.right, unit);

      targetIndices.forEach(idx => {
        const page = allPages[idx];
        const { width, height } = page.getSize();

        const boxX = lPoints;
        const boxY = bPoints;
        const boxW = Math.max(1, width - lPoints - rPoints);
        const boxH = Math.max(1, height - tPoints - bPoints);

        page.setCropBox(boxX, boxY, boxW, boxH);
      });

      const pdfBytes = await pdfDoc.save();
      const newFile = new File([pdfBytes as any], activeFile.file.name, { type: 'application/pdf' });
      updateSharedFileData(activeFile.id, { file: newFile, pages: undefined }, true);
      onClose();
    } catch (err) {
      console.error('Crop failed:', err);
      alert('An error occurred while cropping pages.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white shadow-2xl w-full max-w-[850px] max-h-[95vh] overflow-y-auto border border-slate-200">
        <div className="bg-[#2B3467] px-4 py-2 flex items-center justify-between sticky top-0 z-30">
          <h2 className="text-white text-md font-medium">Crop Settings</h2>
          <button onClick={onClose} className="text-white/80 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col md:flex-row p-4 gap-6">
          <div className="flex-1 flex flex-col items-center">
            <span className="text-slate-500 text-xs mb-2 self-start">Adjust the box size to crop an area of the page.</span>

            <div
              ref={previewRef}
              className="w-full aspect-[3/4] max-h-[350px] bg-slate-100 border border-slate-200 relative flex items-center justify-center shadow-inner select-none overflow-hidden"
            >
              {(() => {
                const currentPageData = pages[currentPage - 1];
                const origW = 595;
                const origH = 842;

                return (
                  <div
                    className="bg-white shadow-lg relative border border-slate-300 overflow-hidden"
                    style={{
                      width: 'auto',
                      height: '90%',
                      aspectRatio: `${origW}/${origH}`
                    }}
                  >
                    {/* Original Page Content */}
                    <div
                      className="absolute bg-slate-50 border border-slate-200 pointer-events-none"
                      style={{
                        left: '0%',
                        top: '0%',
                        width: '100%',
                        height: '100%',
                      }}
                    >
                      {currentPageData?.previewUrl ? (
                        <img
                          src={currentPageData.previewUrl}
                          alt="Preview"
                          className="w-full h-full object-fill opacity-40"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <FileText className="w-10 h-10 text-slate-100" />
                        </div>
                      )}

                      {/* The actual "Crop/Box" indicator relative to original page */}
                      <div
                        className="absolute border-[1.5px] border-blue-600 bg-transparent"
                        style={{
                          top: `${Math.min(95, (margins.top / 5) * 100)}%`,
                          bottom: `${Math.min(95, (margins.bottom / 5) * 100)}%`,
                          left: `${Math.min(95, (margins.left / 5) * 100)}%`,
                          right: `${Math.min(95, (margins.right / 5) * 100)}%`
                        }}
                      >
                      </div>
                    </div>

                    {/* Drag Handles relative to the CROP box */}
                    <div
                      className="absolute z-20 pointer-events-none"
                      style={{
                        left: `${(margins.left / 5) * 100}%`,
                        top: `${(margins.top / 5) * 100}%`,
                        right: `${(margins.right / 5) * 100}%`,
                        bottom: `${(margins.bottom / 5) * 100}%`,
                      }}
                    >
                      <div onMouseDown={handleMouseDown('nw')} className="absolute -top-[5px] -left-[5px] w-[10px] h-[10px] bg-blue-600 cursor-nw-resize pointer-events-auto" />
                      <div onMouseDown={handleMouseDown('n')} className="absolute -top-[5px] left-1/2 -translate-x-1/2 w-[10px] h-[10px] bg-blue-600 cursor-n-resize pointer-events-auto" />
                      <div onMouseDown={handleMouseDown('ne')} className="absolute -top-[5px] -right-[5px] w-[10px] h-[10px] bg-blue-600 cursor-ne-resize pointer-events-auto" />
                      <div onMouseDown={handleMouseDown('e')} className="absolute top-1/2 -right-[5px] -translate-y-1/2 w-[10px] h-[10px] bg-blue-600 cursor-e-resize pointer-events-auto" />
                      <div onMouseDown={handleMouseDown('se')} className="absolute -bottom-[5px] -right-[5px] w-[10px] h-[10px] bg-blue-600 cursor-se-resize pointer-events-auto" />
                      <div onMouseDown={handleMouseDown('s')} className="absolute -bottom-[5px] left-1/2 -translate-x-1/2 w-[10px] h-[10px] bg-blue-600 cursor-s-resize pointer-events-auto" />
                      <div onMouseDown={handleMouseDown('sw')} className="absolute -bottom-[5px] -left-[5px] w-[10px] h-[10px] bg-blue-600 cursor-sw-resize pointer-events-auto" />
                      <div onMouseDown={handleMouseDown('w')} className="absolute top-1/2 -left-[5px] -translate-y-1/2 w-[10px] h-[10px] bg-blue-600 cursor-w-resize pointer-events-auto" />
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="mt-4 text-sm text-slate-600">
              Cropped page size: {unit === 'Inches' ? '8.27 x 11.69 Inches' : '210 x 297 mm'}
            </div>
          </div>

          <div className="w-full md:w-[420px] space-y-4 text-[12px] border-l border-slate-200 border-dashed pl-6">
            <div className="space-y-4">
              <h3 className="text-slate-800 font-medium text-sm">Crop Margin</h3>

              <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                <div className="flex items-center gap-2">
                  <span className="w-12">Top:</span>
                  <input
                    type="number" step="0.01" value={margins.top.toFixed(2)}
                    onChange={(e) => setMargins({ ...margins, top: parseFloat(e.target.value) || 0 })}
                    className="w-20 border border-slate-300 px-2 py-1 outline-none text-center rounded-sm"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-12">Bottom:</span>
                  <input
                    type="number" step="0.01" value={margins.bottom.toFixed(2)}
                    onChange={(e) => setMargins({ ...margins, bottom: parseFloat(e.target.value) || 0 })}
                    className="w-20 border border-slate-300 px-2 py-1 outline-none text-center rounded-sm"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-12">Left:</span>
                  <input
                    type="number" step="0.01" value={margins.left.toFixed(2)}
                    onChange={(e) => setMargins({ ...margins, left: parseFloat(e.target.value) || 0 })}
                    className="w-20 border border-slate-300 px-2 py-1 outline-none text-center rounded-sm"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-12">Right:</span>
                  <input
                    type="number" step="0.01" value={margins.right.toFixed(2)}
                    onChange={(e) => setMargins({ ...margins, right: parseFloat(e.target.value) || 0 })}
                    className="w-20 border border-slate-300 px-2 py-1 outline-none text-center rounded-sm"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4 mt-2">
                <span className="w-12">Unit:</span>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value as UnitType)}
                  className="w-36 border border-slate-300 rounded-sm px-2 py-1 outline-none focus:border-blue-500 bg-white"
                >
                  <option value="Inches">Inches</option>
                  <option value="Points">Points</option>
                  <option value="Millimeters">Millimeters</option>
                  <option value="Centimeters">Centimeters</option>
                </select>
                <button onClick={handleReset} className="text-blue-600 underline hover:text-blue-800 tracking-wide font-medium">RESET</button>
              </div>
            </div>

            <div className="space-y-4 pt-4">
              <h3 className="text-slate-800 font-medium text-sm">Page Range</h3>
              <div className="space-y-3 pl-2">
                <label className="flex items-center gap-2">
                  <input
                    type="radio" name="cropPageRange" checked={pageRangeType === 'all'}
                    onChange={() => setPageRangeType('all')}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm">All</span>
                </label>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio" name="cropPageRange" checked={pageRangeType === 'range'}
                      onChange={() => setPageRangeType('range')}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm">Range:</span>
                  </label>
                  <input
                    type="text" value={pageRange} onChange={(e) => setPageRange(e.target.value)}
                    disabled={pageRangeType !== 'range'}
                    className="w-16 border-b border-slate-400 px-1 outline-none focus:border-blue-500 disabled:opacity-50 text-center text-sm"
                  />
                  <span className="text-slate-500 text-sm">of {totalPages} <span className="text-slate-400">e.g.(1,3,5,7-10)</span></span>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-4">
                <span className="w-16">Subset:</span>
                <select
                  value={subset} onChange={(e) => setSubset(e.target.value)}
                  className="flex-1 border border-slate-300 rounded-sm px-2 py-1 outline-none focus:border-blue-500 bg-white shadow-sm"
                >
                  <option>Even and odd pages</option>
                  <option>Even pages only</option>
                  <option>Odd pages only</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 pt-0 flex justify-end gap-3 font-medium mt-4">
          <button
            onClick={onClose}
            className="px-10 py-2 border border-blue-600 text-blue-600 hover:bg-blue-50 transition-colors uppercase text-sm min-w-[120px] rounded-sm bg-white"
          >
            CANCEL
          </button>
          <button
            onClick={handleApply}
            disabled={isProcessing}
            className="px-12 py-2 bg-[#4461FF] text-white hover:bg-blue-700 transition-colors uppercase text-sm disabled:bg-slate-300 disabled:cursor-not-allowed min-w-[120px] rounded-sm"
          >
            {isProcessing ? 'PROCESSING...' : 'OK'}
          </button>
        </div>
      </div>
    </div>
  );
}
