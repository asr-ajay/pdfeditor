import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { usePDF } from '../contexts/PDFContext';
import { cn } from '../lib/utils';
import { PDFDocument, rgb, degrees } from 'pdf-lib';

interface BackgroundModalProps {
  isOpen: boolean;
  mode: 'add' | 'replace';
  onClose: () => void;
}

export default function BackgroundModal({ isOpen, mode, onClose }: BackgroundModalProps) {
  const { activeFileId, sharedFiles, updateSharedFileData, totalPages, pages } = usePDF();

  const [localCurrentPage, setLocalCurrentPage] = useState(1);
  const [bgPreviewUrl, setBgPreviewUrl] = useState<string | null>(null);

  const [sourceType, setSourceType] = useState<'color' | 'file'>('color');

  // Color Settings
  const [color, setColor] = useState('#FFFF00');

  // File Settings
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [bgFile, setBgFile] = useState<File | null>(null);
  const [bgFilePreview, setBgFilePreview] = useState<string | null>(null);
  const [bgFilePage, setBgFilePage] = useState(1);
  const [bgFileScale, setBgFileScale] = useState(100);

  // Appearance
  const [opacity, setOpacity] = useState(50);

  // Page Range
  const [pageRangeType, setPageRangeType] = useState<'All' | 'Range'>('All');
  const [pageRangeLimit, setPageRangeLimit] = useState('1');
  const [pageRangeSubset, setPageRangeSubset] = useState('Even and odd pages');

  const [isProcessing, setIsProcessing] = useState(false);

  const activeFile = sharedFiles.find(f => f.id === activeFileId);

  useEffect(() => {
    if (isOpen) {
      setPageRangeLimit('1');
      if (mode === 'replace' && activeFile?.backgroundConfig) {
        const c = activeFile.backgroundConfig;
        setSourceType(c.sourceType ?? 'color');
        setColor(c.color ?? '#FFFF00');
        setOpacity(c.opacity ?? 50);
        setPageRangeType(c.pageRangeType ?? 'All');
        setPageRangeLimit(c.pageRangeLimit ?? '1');
        setPageRangeSubset(c.pageRangeSubset ?? 'Even and odd pages');
        setBgFileScale(c.bgFileScale ?? 100);
        setBgFilePage(c.bgFilePage ?? 1);
        if (c.bgFile) setBgFile(c.bgFile);
      } else {
        setSourceType('color');
        setColor('#FFFF00');
        setOpacity(50);
        setPageRangeType('All');
        setPageRangeLimit('1');
        setPageRangeSubset('Even and odd pages');
        setBgFileScale(100);
        setBgFilePage(1);
        setBgFile(null);
      }
    }
  }, [isOpen, mode, activeFile?.backgroundConfig]);

  const hexToRgbArray = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
      parseInt(result[1], 16) / 255,
      parseInt(result[2], 16) / 255,
      parseInt(result[3], 16) / 255
    ] : [1, 1, 1];
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setBgFile(file);
    }
  };

  useEffect(() => {
    let active = true;
    const generatePreview = async () => {
      if (!bgFile) {
        setBgFilePreview(null);
        return;
      }
      if (bgFile.type === 'application/pdf') {
        try {
          const pdfjsLib = await import('pdfjs-dist');
          if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
            pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
          }
          const arrayBuffer = await bgFile.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          const pageNum = Math.min(Math.max(1, bgFilePage), pdf.numPages);
          const page = await pdf.getPage(pageNum);
          const viewport = page.getViewport({ scale: 1.0 });
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          await page.render({ canvasContext: context!, viewport }).promise;
          if (active) {
            setBgFilePreview(canvas.toDataURL('image/png'));
          }
        } catch (e) {
          console.error('Error generating PDF preview', e);
        }
      } else {
        const url = URL.createObjectURL(bgFile);
        if (active) setBgFilePreview(url);
      }
    };
    generatePreview();
    return () => { active = false; };
  }, [bgFile, bgFilePage]);

  useEffect(() => {
    let active = true;
    const generateBasePreview = async () => {
      if (mode === 'replace' && activeFile?.fileWithoutBackground && isOpen) {
        if (active) setBgPreviewUrl(null);
        try {
          const pdfjsLib = await import('pdfjs-dist');
          if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
            pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
          }
          const arrayBuffer = await activeFile.fileWithoutBackground.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          const page = await pdf.getPage(localCurrentPage);
          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          await page.render({ canvasContext: context!, viewport }).promise;
          if (active) {
            setBgPreviewUrl(canvas.toDataURL('image/png'));
          }
        } catch (e) {
          console.error("Error generating bg preview", e);
        }
      } else {
        if (active) setBgPreviewUrl(null);
      }
    };
    generateBasePreview();
    return () => { active = false; };
  }, [mode, activeFile, isOpen, localCurrentPage]);

  const handleApply = async () => {
    if (!activeFile) return;
    setIsProcessing(true);

    try {
      let sourceFile = activeFile.file;
      if (mode === 'replace' && activeFile.fileWithoutBackground) {
        sourceFile = activeFile.fileWithoutBackground;
      }
      const buffer = await sourceFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(buffer);
      const allPages = pdfDoc.getPages();

      let targetIndices: number[] = [];
      if (pageRangeType === 'All') {
        targetIndices = allPages.map((_, i) => i);
      } else {
        const ranges = pageRangeLimit.split(',').map(r => r.trim());
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

      if (pageRangeSubset === 'Even pages only') {
        targetIndices = targetIndices.filter(idx => (idx + 1) % 2 === 0);
      } else if (pageRangeSubset === 'Odd pages only') {
        targetIndices = targetIndices.filter(idx => (idx + 1) % 2 !== 0);
      }

      const [r, g, b] = hexToRgbArray(color);

      // Embedded Resources
      let imgRef: any;
      let pdfPageToEmbed: any;

      if (sourceType === 'file' && bgFile) {
        const fileBuffer = await bgFile.arrayBuffer();
        if (bgFile.type === 'application/pdf') {
          const wmPdfDoc = await PDFDocument.load(fileBuffer);
          const pgIdx = Math.max(0, Math.min(wmPdfDoc.getPageCount() - 1, bgFilePage - 1));
          const [embedded] = await pdfDoc.embedPdf(wmPdfDoc, [pgIdx]);
          pdfPageToEmbed = embedded;
        } else if (bgFile.type === 'image/png') {
          imgRef = await pdfDoc.embedPng(fileBuffer);
        } else if (bgFile.type === 'image/jpeg' || bgFile.type === 'image/jpg') {
          imgRef = await pdfDoc.embedJpg(fileBuffer);
        }
      }

      for (const idx of targetIndices) {
        if (!targetIndices.includes(idx)) continue;
        const page = allPages[idx];
        const { width, height } = page.getSize();

        let itemWidth = width;
        let itemHeight = height;

        if (sourceType === 'file') {
          if (pdfPageToEmbed) {
            itemWidth = pdfPageToEmbed.width;
            itemHeight = pdfPageToEmbed.height;
          } else if (imgRef) {
            itemWidth = imgRef.width;
            itemHeight = imgRef.height;
          }
          if (bgFileScale !== 100) {
            itemWidth *= (bgFileScale / 100);
            itemHeight *= (bgFileScale / 100);
          }
        }

        let cx = width / 2;
        let cy = height / 2;

        let startX = 0, startY = 0;

        if (sourceType === 'color') {
          startX = 0;
          startY = 0;
          itemWidth = width;
          itemHeight = height;
        } else {
          const dx = (itemWidth / 2);
          const dy = (itemHeight / 2);
          startX = cx - dx;
          startY = cy - dy;
        }

        const drawOpts: any = {
          x: startX,
          y: startY,
          opacity: opacity / 100,
        };

        if (sourceType === 'color') {
          page.drawRectangle({
            x: startX,
            y: startY,
            width: itemWidth,
            height: itemHeight,
            color: rgb(r, g, b),
            opacity: opacity / 100
          });
        } else if (sourceType === 'file') {
          drawOpts.width = itemWidth;
          drawOpts.height = itemHeight;
          if (pdfPageToEmbed) {
            page.drawPage(pdfPageToEmbed, drawOpts);
          } else if (imgRef) {
            page.drawImage(imgRef, drawOpts);
          }
        }

        try {
          let afterContentsRef: any = null;
          if (typeof page.node.Contents === 'function') {
            afterContentsRef = page.node.Contents();
          }
          if (afterContentsRef && afterContentsRef.array) {
            const arr = afterContentsRef.array;
            if (arr.length > 1) {
              const lastItem = arr.pop();
              arr.unshift(lastItem);
            }
          }
        } catch (e) {
          console.error("Error moving background to background: ", e);
        }
      }

      const pdfBytes = await pdfDoc.save();
      const newFile = new File([pdfBytes as any], activeFile.file.name, { type: 'application/pdf' });

      const fileWithoutBackground = activeFile.fileWithoutBackground || activeFile.file;
      let newBackgroundStack;
      if (mode === 'replace') {
        newBackgroundStack = [{ file: newFile }];
      } else {
        newBackgroundStack = activeFile.backgroundStack ? [...activeFile.backgroundStack, { file: activeFile.file }] : [{ file: activeFile.file }];
      }

      const config = {
        sourceType, color,
        opacity,
        pageRangeType, pageRangeLimit, pageRangeSubset, bgFileScale, bgFilePage, bgFile
      };

      updateSharedFileData(activeFile.id, {
        file: newFile,
        pages: undefined,
        backgroundStack: newBackgroundStack,
        backgroundConfig: config,
        fileWithoutBackground
      }, true);

      onClose();

    } catch (err) {
      console.error('Failed to add background:', err);
      alert('An error occurred.');
    } finally {
      setIsProcessing(false);
    }
  };

  const currentPageData = pages[localCurrentPage - 1];

  let isPageInRange = true;
  if (pageRangeType === 'Range') {
    const ranges = pageRangeLimit.split(',').map(r => r.trim());
    let inAnyRange = false;
    for (const r of ranges) {
      if (r.includes('-')) {
        const [start, end] = r.split('-').map(Number);
        if (localCurrentPage >= start && localCurrentPage <= end) {
          inAnyRange = true;
          break;
        }
      } else {
        const num = parseInt(r);
        if (num === localCurrentPage) {
          inAnyRange = true;
          break;
        }
      }
    }
    if (!inAnyRange) isPageInRange = false;
  }

  if (isPageInRange) {
    if (pageRangeSubset === 'Even pages only' && localCurrentPage % 2 !== 0) {
      isPageInRange = false;
    } else if (pageRangeSubset === 'Odd pages only' && localCurrentPage % 2 === 0) {
      isPageInRange = false;
    }
  }

  const hexToRgba = (hex: string, op: number) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return `rgba(255, 255, 255, ${op / 100})`;
    return `rgba(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}, ${op / 100})`;
  };

  const origW = currentPageData?.width ?? 595;
  const origH = currentPageData?.height ?? 842;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm px-0 md:px-4">
      <div className="bg-white shadow-2xl w-full h-full md:h-auto md:max-w-[1000px] md:max-h-[95vh] flex flex-col border border-slate-200 text-sm overflow-hidden">
        <div className="bg-[#2D2D5F] text-white px-4 py-3 flex items-center justify-between shrink-0 sticky top-0 z-30">
          <h2 className="text-md font-medium uppercase tracking-wider text-xs">{mode === 'add' ? 'Add Background' : 'Update Background'}</h2>
          <button onClick={onClose} className="text-white/80 hover:text-white p-1">
            <X className="w-6 h-6 md:w-5 md:h-5" />
          </button>
        </div>

        <div className="flex flex-col md:flex-row flex-1 overflow-auto">
          {/* Left Panel - Preview */}
          <div className="w-full md:w-[350px] shrink-0 bg-[#F3F2F1] border-r border-slate-200 p-4 flex flex-col h-[400px] md:h-auto">
            <div className="flex items-center justify-between mb-4">
              <span className="font-medium text-slate-700">Preview</span>
              <div className="text-xs text-slate-500 bg-white px-2 py-1 rounded inline-flex items-center gap-2 shadow-sm">
                <button
                  onClick={() => setLocalCurrentPage(Math.max(1, localCurrentPage - 1))}
                  disabled={localCurrentPage <= 1}
                  className="hover:text-black disabled:opacity-50"
                  title="Previous Page"
                >
                  <ChevronLeft className="w-3 h-3" />
                </button>
                <span>Page {localCurrentPage} of {totalPages}</span>
                <button
                  onClick={() => setLocalCurrentPage(Math.min(totalPages, localCurrentPage + 1))}
                  disabled={localCurrentPage >= totalPages}
                  className="hover:text-black disabled:opacity-50"
                  title="Next Page"
                >
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>

            <div className="flex-1 relative overflow-hidden flex items-center justify-center p-4 bg-slate-100 border border-slate-300 shadow-inner rounded overflow-hidden mt-1 mb-2">
              {currentPageData && (
                <div className="relative inline-block max-w-[100%] max-h-[100%] bg-white shadow-md border border-slate-200">
                  <img
                    src={bgPreviewUrl || currentPageData.previewUrl}
                    alt="Document Preview"
                    className="max-w-full max-h-[500px] object-contain relative z-10 pointer-events-none"
                    style={{ mixBlendMode: 'multiply' }}
                  />

                  {/* Background Layer drawn positioned absolutely below the image */}
                  {isPageInRange && (
                    <div
                      className="absolute inset-0 overflow-hidden z-0"
                      style={{ backgroundColor: sourceType === 'color' ? hexToRgba(color, opacity) : 'transparent' }}
                    >
                      {sourceType === 'file' && bgFilePreview && (
                        <div className="absolute inset-0 flex items-center justify-center" style={{ opacity: opacity / 100 }}>
                          <img
                            src={bgFilePreview}
                            alt="background file"
                            style={{ width: `${bgFileScale}%`, maxWidth: 'none' }}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
            {!isPageInRange && (
              <div className="mt-2 text-xs text-center text-slate-500">
                (Background not applied to this page)
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto flex flex-col bg-white">
            <div className="flex flex-col p-4 gap-6">
              <div className="space-y-6">

                {/* Source */}
                <div>
                  <h3 className="text-slate-600 font-medium mb-3">Source</h3>
                  <div className="flex border border-slate-300 mb-6 font-sans w-[250px]">
                    <button
                      onClick={() => setSourceType('color')}
                      className={cn("flex-1 py-1 text-[13px] transition-colors border-r border-slate-300", sourceType === 'color' ? 'bg-[#565C6A] text-white' : 'bg-white text-slate-600 hover:bg-slate-50')}
                    >
                      From Color
                    </button>
                    <button
                      onClick={() => setSourceType('file')}
                      className={cn("flex-1 py-1 text-[13px] transition-colors", sourceType === 'file' ? 'bg-[#565C6A] text-white' : 'bg-white text-slate-600 hover:bg-slate-50')}
                    >
                      File
                    </button>
                  </div>

                  {sourceType === 'color' && (
                    <div className="space-y-5 text-[13px]">
                      <div className="flex items-center gap-4">
                        <span className="w-[80px] text-slate-600 shrink-0">Color:</span>
                        <input
                          type="color" value={color} onChange={(e) => setColor(e.target.value)}
                          className="w-12 h-[30px] p-0 border border-slate-300 cursor-pointer"
                        />
                      </div>
                    </div>
                  )}

                  {sourceType === 'file' && (
                    <div className="space-y-4 text-[13px]">
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="px-6 py-1 border border-blue-600 text-blue-600 hover:bg-blue-50 rounded-sm font-medium transition-colors bg-white shrink-0"
                        >
                          Browse...
                        </button>
                        <span className="text-slate-500 truncate flex-1 block max-w-[200px]">
                          {bgFile ? bgFile.name : 'No file selected'}
                        </span>
                        <input
                          type="file"
                          ref={fileInputRef}
                          className="hidden"
                          accept="image/png, image/jpeg, image/jpg, application/pdf"
                          onChange={handleFileChange}
                        />
                      </div>
                      {bgFile?.type === 'application/pdf' && (
                        <div className="flex items-center gap-4">
                          <span className="w-[80px] text-slate-600 shrink-0">Page No:</span>
                          <input
                            type="number"
                            min="1"
                            value={bgFilePage}
                            onChange={(e) => setBgFilePage(parseInt(e.target.value) || 1)}
                            className="w-16 border border-slate-300 px-1 py-1 outline-none text-right"
                          />
                        </div>
                      )}
                      <div className="flex items-center gap-4">
                        <span className="w-[80px] text-slate-600 shrink-0">Absolute Scale:</span>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="1"
                            value={bgFileScale}
                            onChange={(e) => setBgFileScale(parseInt(e.target.value) || 100)}
                            className="w-16 border border-slate-300 px-1 py-1 outline-none text-right"
                          />
                          <span className="text-slate-600">%</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Appearance */}
                <div className="grid grid-cols-2 gap-8 border-t border-slate-200 pt-6">
                  <div>
                    <h3 className="text-slate-600 font-medium mb-3">Appearance</h3>
                    <div className="space-y-4 ml-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="w-16 text-slate-600 flex-shrink-0">Opacity:</span>
                        <input
                          type="range" min="0" max="100"
                          value={opacity} onChange={(e) => setOpacity(parseInt(e.target.value))}
                          className="w-24 border-none p-0 outline-none flex-1 accent-black bg-slate-300 h-1 appearance-none rounded-full [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:bg-black min-w-[80px]"
                        />
                        <input
                          type="number" value={opacity} onChange={(e) => setOpacity(parseInt(e.target.value) || 0)}
                          className="w-12 border border-slate-300 px-1 outline-none text-right"
                        />
                        <span className="text-slate-600">%</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-5">
                    <div>
                      <h3 className="text-slate-600 font-medium mb-2">Page Range</h3>
                      <div className="space-y-2 ml-2">
                        <label className="flex items-center gap-2">
                          <input
                            type="radio" name="bgPageRange" checked={pageRangeType === 'All'}
                            onChange={() => setPageRangeType('All')}
                            className="w-4 h-4 text-blue-600 outline-none"
                          />
                          <span className="text-slate-700">All</span>
                        </label>
                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-2 text-slate-700">
                            <input
                              type="radio" name="bgPageRange" checked={pageRangeType === 'Range'}
                              onChange={() => setPageRangeType('Range')}
                              className="w-4 h-4 text-blue-600 outline-none"
                            />
                            Range:
                          </label>
                          <input
                            type="text" value={pageRangeLimit} onChange={(e) => setPageRangeLimit(e.target.value)}
                            disabled={pageRangeType !== 'Range'}
                            className="w-16 border-b border-slate-400 px-1 outline-none focus:border-blue-500 disabled:opacity-50 text-center bg-transparent"
                          />
                          <span className="text-slate-500 text-sm">of {totalPages}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-2 pt-1 border-t border-slate-100">
                          <span className="text-slate-600 w-12 text-xs">Subset:</span>
                          <select
                            value={pageRangeSubset} onChange={(e) => setPageRangeSubset(e.target.value)}
                            className="flex-1 border border-slate-300 rounded-sm px-1 py-1 outline-none text-slate-600 text-xs bg-white"
                          >
                            <option>Even and odd pages</option>
                            <option>Even pages only</option>
                            <option>Odd pages only</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3 rounded-b-sm z-30">
          <button
            onClick={onClose} disabled={isProcessing}
            className="px-6 py-1.5 border border-slate-300 bg-white hover:bg-slate-50 transition-colors uppercase text-xs font-semibold rounded-sm tracking-wide text-slate-600"
          >
            Cancel
          </button>
          <button
            onClick={handleApply} disabled={isProcessing}
            className="px-6 py-1.5 bg-[#4461FF] hover:bg-blue-700 text-white transition-colors uppercase text-xs font-semibold rounded-sm tracking-wide min-w-[100px] flex items-center justify-center disabled:opacity-50"
          >
            {isProcessing ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : "OK"}
          </button>
        </div>
      </div>
    </div>
  );
}

