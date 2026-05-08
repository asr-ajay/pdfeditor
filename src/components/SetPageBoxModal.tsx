import React, { useState, useEffect, useRef } from 'react';
import { X, Scissors, FileText } from 'lucide-react';
import { PDFDocument, PDFPage } from 'pdf-lib';
import { usePDF } from '../contexts/PDFContext';

interface SetPageBoxModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type BoxType = 'CropBox' | 'ArtBox' | 'TrimBox' | 'BleedBox' | 'MediaBox';
type UnitType = 'Inches' | 'Points' | 'Millimeters' | 'Centimeters';

const PAGE_SIZES: Record<string, { width: number; height: number }> = {
  'A0': { width: 2383.94, height: 3370.39 },
  'A1': { width: 1683.78, height: 2383.94 },
  'A2': { width: 1190.55, height: 1683.78 },
  'A3': { width: 841.89, height: 1190.55 },
  'A4': { width: 595.28, height: 841.89 },
  'A5': { width: 419.53, height: 595.28 },
  'A6': { width: 297.64, height: 419.53 },
  'B0': { width: 2834.65, height: 4008.19 },
  'B1': { width: 2004.09, height: 2834.65 },
  'B2': { width: 1417.32, height: 2004.09 },
  'B3': { width: 1000.63, height: 1417.32 },
  'B4': { width: 708.66, height: 1000.63 },
  'B5': { width: 498.9, height: 708.66 },
  'Letter': { width: 612, height: 792 },
  'Legal': { width: 612, height: 1008 },
  'Ledger': { width: 1224, height: 792 },
  'Tabloid': { width: 792, height: 1224 },
  'Executive': { width: 522, height: 756 },
  'Folio': { width: 612, height: 936 },
};

export default function SetPageBoxModal({ isOpen, onClose }: SetPageBoxModalProps) {
  const { activeFileId, sharedFiles, updateSharedFileData, totalPages, pages, currentPage } = usePDF();
  const previewRef = useRef<HTMLDivElement>(null);

  const [applyTo, setApplyTo] = useState<BoxType>('CropBox');
  const [margins, setMargins] = useState({ top: 0, bottom: 0, left: 0, right: 0 });
  const [unit, setUnit] = useState<UnitType>('Inches');

  const [pageSizeType, setPageSizeType] = useState<'fixed' | 'custom' | 'none'>('none');
  const [fixedSize, setFixedSize] = useState('A3');
  const [customSize, setCustomSize] = useState({ width: 0, height: 0 });
  const [isCentered, setIsCentered] = useState(true);
  const [offsets, setOffsets] = useState({ x: 0, y: 0 });

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
      setPageSizeType('none');
    }
  }, [isOpen, currentPage]);

  useEffect(() => {
    if (pageSizeType !== 'none') {
      const origW = 595.28; // Standard A4 for calculation
      const origH = 841.89;
      let targetW = origW;
      let targetH = origH;

      if (pageSizeType === 'fixed') {
        const size = PAGE_SIZES[fixedSize];
        if (size) { targetW = size.width; targetH = size.height; }
      } else if (pageSizeType === 'custom') {
        targetW = convertToPoints(customSize.width, unit) || origW;
        targetH = convertToPoints(customSize.height, unit) || origH;
      }

      if (isCentered) {
        let x = (targetW - origW) / 2;
        let y = (targetH - origH) / 2;

        // Convert back to current unit for display
        const displayX = unit === 'Inches' ? x / 72 : unit === 'Millimeters' ? x / 2.83465 : unit === 'Centimeters' ? x / 28.3465 : x;
        const displayY = unit === 'Inches' ? y / 72 : unit === 'Millimeters' ? y / 2.83465 : unit === 'Centimeters' ? y / 28.3465 : y;

        setOffsets({ x: Number(displayX.toFixed(2)), y: Number(displayY.toFixed(2)) });
      }
    }
  }, [pageSizeType, fixedSize, customSize, isCentered, unit]);

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

        // 1. Handle Boxes
        const boxX = lPoints;
        const boxY = bPoints;
        const boxW = Math.max(1, width - lPoints - rPoints);
        const boxH = Math.max(1, height - tPoints - bPoints);

        switch (applyTo) {
          case 'CropBox': page.setCropBox(boxX, boxY, boxW, boxH); break;
          case 'ArtBox': page.setArtBox(boxX, boxY, boxW, boxH); break;
          case 'TrimBox': page.setTrimBox(boxX, boxY, boxW, boxH); break;
          case 'BleedBox': page.setBleedBox(boxX, boxY, boxW, boxH); break;
          case 'MediaBox': page.setMediaBox(boxX, boxY, boxW, boxH); break;
        }

        // 2. Handle Page Resize
        if (pageSizeType !== 'none') {
          let newW = width;
          let newH = height;

          if (pageSizeType === 'fixed') {
            const size = PAGE_SIZES[fixedSize];
            if (size) { newW = size.width; newH = size.height; }
          } else if (pageSizeType === 'custom') {
            newW = convertToPoints(customSize.width, unit);
            newH = convertToPoints(customSize.height, unit);
          }

          if (newW > 0 && newH > 0) {
            const offX = convertToPoints(offsets.x, unit);
            const offY = convertToPoints(offsets.y, unit);

            let finalX = offX;
            let finalY = offY;

            if (isCentered) {
              finalX = (newW - width) / 2;
              finalY = (newH - height) / 2;
            }

            page.setSize(newW, newH);
            page.translateContent(finalX, finalY);
          }
        }
      });

      const pdfBytes = await pdfDoc.save();
      const newFile = new File([pdfBytes as any], activeFile.file.name, { type: 'application/pdf' });
      updateSharedFileData(activeFile.id, { file: newFile, pages: undefined }, true);
      onClose();
    } catch (err) {
      console.error('Set page box failed:', err);
      alert('An error occurred while setting page boxes.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white shadow-2xl w-full max-w-[850px] max-h-[95vh] overflow-y-auto border border-slate-200">
        <div className="bg-[#2B3467] px-4 py-2 flex items-center justify-between sticky top-0 z-30">
          <h2 className="text-white text-md font-medium">Set Page Box</h2>
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
                const origW = 595; // Default A4 if unknown
                const origH = 842;

                let targetW = origW;
                let targetH = origH;

                if (pageSizeType === 'fixed') {
                  const size = PAGE_SIZES[fixedSize];
                  if (size) { targetW = size.width; targetH = size.height; }
                } else if (pageSizeType === 'custom') {
                  targetW = convertToPoints(customSize.width, unit) || origW;
                  targetH = convertToPoints(customSize.height, unit) || origH;
                }

                const containerAspect = targetW / targetH;
                const previewW = containerAspect > (3 / 4) ? '90%' : 'auto';
                const previewH = containerAspect > (3 / 4) ? 'auto' : '90%';

                let contentLeft = 0;
                let contentTop = 0;
                let contentW = 100;
                let contentH = 100;

                if (pageSizeType !== 'none') {
                  // How much larger/smaller is the target compared to original
                  const scaleX = origW / targetW;
                  const scaleY = origH / targetH;

                  contentW = scaleX * 100;
                  contentH = scaleY * 100;

                  if (isCentered) {
                    contentLeft = (100 - contentW) / 2;
                    contentTop = (100 - contentH) / 2;
                  } else {
                    // Bottom left in PDF is (0,0). In HTML (0,0) is TOP left.
                    // So offsets from bottom left.
                    contentLeft = (convertToPoints(offsets.x, unit) / targetW) * 100;
                    contentTop = 100 - contentH - (convertToPoints(offsets.y, unit) / targetH) * 100;
                  }
                }

                return (
                  <div
                    className="bg-white shadow-lg relative border border-slate-300 overflow-hidden"
                    style={{
                      width: previewW,
                      height: previewH,
                      aspectRatio: `${targetW}/${targetH}`
                    }}
                  >
                    {/* Original Page Content */}
                    <div
                      className="absolute bg-slate-50 border border-slate-200 pointer-events-none"
                      style={{
                        left: `${contentLeft}%`,
                        top: `${contentTop}%`,
                        width: `${contentW}%`,
                        height: `${contentH}%`,
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
                        className="absolute border-2 border-purple-500 bg-white/20"
                        style={{
                          top: `${Math.min(95, (margins.top / 5) * 100)}%`,
                          bottom: `${Math.min(95, (margins.bottom / 5) * 100)}%`,
                          left: `${Math.min(95, (margins.left / 5) * 100)}%`,
                          right: `${Math.min(95, (margins.right / 5) * 100)}%`
                        }}
                      />
                    </div>

                    {/* Drag Handles relative to the CROP box, which is inside the CONTENT box */}
                    <div
                      className="absolute z-20 pointer-events-none"
                      style={{
                        left: `${contentLeft + (margins.left / 5) * contentW}%`,
                        top: `${contentTop + (margins.top / 5) * contentH}%`,
                        right: `${100 - (contentLeft + contentW) + (margins.right / 5) * contentW}%`,
                        bottom: `${100 - (contentTop + contentH) + (margins.bottom / 5) * contentH}%`,
                      }}
                    >
                      <div onMouseDown={handleMouseDown('nw')} className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-blue-600 border border-white cursor-nw-resize pointer-events-auto" />
                      <div onMouseDown={handleMouseDown('n')} className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-blue-600 border border-white cursor-n-resize pointer-events-auto" />
                      <div onMouseDown={handleMouseDown('ne')} className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-blue-600 border border-white cursor-ne-resize pointer-events-auto" />
                      <div onMouseDown={handleMouseDown('e')} className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-3 h-3 bg-blue-600 border border-white cursor-e-resize pointer-events-auto" />
                      <div onMouseDown={handleMouseDown('se')} className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-blue-600 border border-white cursor-se-resize pointer-events-auto" />
                      <div onMouseDown={handleMouseDown('s')} className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-blue-600 border border-white cursor-s-resize pointer-events-auto" />
                      <div onMouseDown={handleMouseDown('sw')} className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-blue-600 border border-white cursor-sw-resize pointer-events-auto" />
                      <div onMouseDown={handleMouseDown('w')} className="absolute top-1/2 -left-1.5 -translate-y-1/2 w-3 h-3 bg-blue-600 border border-white cursor-w-resize pointer-events-auto" />
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="mt-4 text-sm text-slate-600">
              Expanded page size: {unit === 'Inches' ? '11.694 x 16.542 Inches' : '297 x 420 mm'}
            </div>
          </div>

          <div className="w-full md:w-[420px] space-y-4 text-[12px]">
            <div className="space-y-2">
              <h3 className="text-slate-800 font-semibold text-xs border-b border-slate-200 pb-1">Margin Setting</h3>
              <div className="flex items-center gap-4">
                <span className="w-16">Apply to:</span>
                <select
                  value={applyTo}
                  onChange={(e) => setApplyTo(e.target.value as BoxType)}
                  className="flex-1 border border-slate-300 rounded px-2 py-1 outline-none focus:border-blue-500 bg-white"
                >
                  <option value="CropBox">CropBox</option>
                  <option value="ArtBox">ArtBox</option>
                  <option value="TrimBox">TrimBox</option>
                  <option value="BleedBox">BleedBox</option>
                  <option value="MediaBox">MediaBox</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-16">Top:</span>
                  <input
                    type="number" step="0.01" value={margins.top.toFixed(2)}
                    onChange={(e) => setMargins({ ...margins, top: parseFloat(e.target.value) || 0 })}
                    className="w-20 border border-slate-300 px-2 py-1 outline-none text-center"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-16">Bottom:</span>
                  <input
                    type="number" step="0.01" value={margins.bottom.toFixed(2)}
                    onChange={(e) => setMargins({ ...margins, bottom: parseFloat(e.target.value) || 0 })}
                    className="w-20 border border-slate-300 px-2 py-1 outline-none text-center"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-16">Left:</span>
                  <input
                    type="number" step="0.01" value={margins.left.toFixed(2)}
                    onChange={(e) => setMargins({ ...margins, left: parseFloat(e.target.value) || 0 })}
                    className="w-20 border border-slate-300 px-2 py-1 outline-none text-center"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-16">Right:</span>
                  <input
                    type="number" step="0.01" value={margins.right.toFixed(2)}
                    onChange={(e) => setMargins({ ...margins, right: parseFloat(e.target.value) || 0 })}
                    className="w-20 border border-slate-300 px-2 py-1 outline-none text-center"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4">
                <span className="w-16">Unit:</span>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value as UnitType)}
                  className="w-36 border border-slate-300 rounded px-2 py-1 outline-none focus:border-blue-500 bg-white"
                >
                  <option value="Inches">Inches</option>
                  <option value="Points">Points</option>
                  <option value="Millimeters">Millimeters</option>
                  <option value="Centimeters">Centimeters</option>
                </select>
                <button onClick={handleReset} className="text-blue-600 underline hover:text-blue-800">Reset</button>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-slate-800 font-semibold text-sm border-b border-slate-200 pb-1">Change Page Size</h3>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 w-28">
                  <input
                    type="radio" name="pageSize" checked={pageSizeType === 'none'}
                    onChange={() => setPageSizeType('none')}
                  />
                  None
                </label>
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 w-28">
                  <input
                    type="radio" name="pageSize" checked={pageSizeType === 'fixed'}
                    onChange={() => setPageSizeType('fixed')}
                  />
                  Fixed Sizes
                </label>
                <span className="text-slate-500">Page Sizes:</span>
                <select
                  disabled={pageSizeType !== 'fixed'}
                  value={fixedSize}
                  onChange={(e) => setFixedSize(e.target.value)}
                  className="flex-1 border border-slate-300 rounded px-2 py-1 outline-none focus:border-blue-500 bg-white disabled:bg-slate-50"
                >
                  {Object.keys(PAGE_SIZES).map(size => (
                    <option key={size}>{size}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 w-28">
                  <input
                    type="radio" name="pageSize" checked={pageSizeType === 'custom'}
                    onChange={() => setPageSizeType('custom')}
                  />
                  Custom
                </label>
                <div className="flex items-center gap-2">
                  <span>Width:</span>
                  <input
                    type="number" disabled={pageSizeType !== 'custom'} value={customSize.width}
                    onChange={(e) => setCustomSize({ ...customSize, width: parseFloat(e.target.value) || 0 })}
                    className="w-16 border border-slate-300 px-2 py-1 outline-none text-center bg-slate-100 disabled:opacity-50"
                  />
                  <span className="text-slate-400">{unit === 'Inches' ? 'in' : 'mm'}</span>
                </div>
                <div className="flex items-center gap-2 ml-auto">
                  <span>Height:</span>
                  <input
                    type="number" disabled={pageSizeType !== 'custom'} value={customSize.height}
                    onChange={(e) => setCustomSize({ ...customSize, height: parseFloat(e.target.value) || 0 })}
                    className="w-16 border border-slate-300 px-2 py-1 outline-none text-center bg-slate-100 disabled:opacity-50"
                  />
                  <span className="text-slate-400">{unit === 'Inches' ? 'in' : 'mm'}</span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 w-28">
                  <input
                    type="checkbox" checked={isCentered}
                    onChange={(e) => setIsCentered(e.target.checked)}
                  />
                  Center
                </label>
                <div className="flex items-center gap-2">
                  <span>XOffset:</span>
                  <input
                    type="number" step="0.01" value={offsets.x}
                    onChange={(e) => setOffsets({ ...offsets, x: parseFloat(e.target.value) || 0 })}
                    className="w-16 border border-slate-300 px-2 py-1 outline-none text-center"
                  />
                  <span className="text-slate-400">{unit === 'Inches' ? 'in' : 'mm'}</span>
                </div>
                <div className="flex items-center gap-2 ml-auto">
                  <span>YOffset:</span>
                  <input
                    type="number" step="0.01" value={offsets.y}
                    onChange={(e) => setOffsets({ ...offsets, y: parseFloat(e.target.value) || 0 })}
                    className="w-16 border border-slate-300 px-2 py-1 outline-none text-center"
                  />
                  <span className="text-slate-400">{unit === 'Inches' ? 'in' : 'mm'}</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-slate-800 font-semibold text-sm border-b border-slate-200 pb-1">Page Range</h3>
              <div className="space-y-2 pl-2">
                <label className="flex items-center gap-2">
                  <input
                    type="radio" name="pageRange" checked={pageRangeType === 'all'}
                    onChange={() => setPageRangeType('all')}
                  />
                  All
                </label>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio" name="pageRange" checked={pageRangeType === 'range'}
                      onChange={() => setPageRangeType('range')}
                    />
                    Range:
                  </label>
                  <input
                    type="text" value={pageRange} onChange={(e) => setPageRange(e.target.value)}
                    disabled={pageRangeType !== 'range'}
                    className="w-24 border-b border-slate-400 px-1 outline-none focus:border-blue-500 disabled:opacity-50"
                  />
                  <span className="text-slate-400">of {totalPages} e.g.(1,3,5-10)</span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <span className="w-16">Subset:</span>
                <select
                  value={subset} onChange={(e) => setSubset(e.target.value)}
                  className="flex-1 border border-slate-300 rounded px-2 py-1 outline-none focus:border-blue-500 bg-white"
                >
                  <option>Even and odd pages</option>
                  <option>Even pages only</option>
                  <option>Odd pages only</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 pt-0 flex justify-end gap-3 font-medium">
          <button
            onClick={onClose}
            className="px-10 py-2 border border-blue-600 text-blue-600 hover:bg-blue-50 transition-colors uppercase text-sm min-w-[120px]"
          >
            CANCEL
          </button>
          <button
            onClick={handleApply}
            disabled={isProcessing}
            className="px-12 py-2 bg-[#4461FF] text-white hover:bg-blue-700 transition-colors uppercase text-sm disabled:bg-slate-300 disabled:cursor-not-allowed min-w-[120px]"
          >
            {isProcessing ? 'PROCESSING...' : 'OK'}
          </button>
        </div>
      </div>
    </div>
  );
}
