import React, { useState, useEffect, useRef } from 'react';
import { X, FileText } from 'lucide-react';
import { usePDF } from '../contexts/PDFContext';
import { cn } from '../lib/utils';
import { FONT_OPTIONS } from '../constants';
import { PDFDocument, rgb, degrees, StandardFonts, BlendMode } from 'pdf-lib';

interface WatermarkModalProps {
  isOpen: boolean;
  mode: 'add' | 'replace';
  onClose: () => void;
}

export default function WatermarkModal({ isOpen, mode, onClose }: WatermarkModalProps) {
  const { activeFileId, sharedFiles, updateSharedFileData, totalPages, pages } = usePDF();

  const [localCurrentPage, setLocalCurrentPage] = useState(1);
  const [bgPreviewUrl, setBgPreviewUrl] = useState<string | null>(null);

  const [sourceType, setSourceType] = useState<'text' | 'file'>('text');

  // Text Settings
  const [text, setText] = useState('');
  const [fontStyle, setFontStyle] = useState("Arial, Helvetica, sans-serif");
  const [fontSize, setFontSize] = useState<number | ''>(24);
  const [color, setColor] = useState('#000000');
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);

  // File Settings
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [watermarkFile, setWatermarkFile] = useState<File | null>(null);
  const [watermarkFilePreview, setWatermarkFilePreview] = useState<string | null>(null);
  const [watermarkFilePage, setWatermarkFilePage] = useState(1);
  const [watermarkFileScale, setWatermarkFileScale] = useState(100);

  // Position
  const [alignment, setAlignment] = useState(4); // 0-8 for 3x3 grid
  const [vertical, setVertical] = useState(0);
  const [horizontal, setHorizontal] = useState(0);
  const [unit, setUnit] = useState('Inches');

  // Appearance
  const [rotation, setRotation] = useState(-45);
  const [opacity, setOpacity] = useState(100);
  const [scaleToTarget, setScaleToTarget] = useState(false);
  const [scalePercent, setScalePercent] = useState(50);

  // Page Range
  const [pageRangeType, setPageRangeType] = useState<'All' | 'Range'>('All');
  const [pageRangeLimit, setPageRangeLimit] = useState('1');
  const [pageRangeSubset, setPageRangeSubset] = useState('Even and odd pages');

  // Location
  const [location, setLocation] = useState<'Behind' | 'Above'>('Above');

  const [isProcessing, setIsProcessing] = useState(false);

  const activeFile = sharedFiles.find(f => f.id === activeFileId);

  useEffect(() => {
    if (isOpen) {
      setPageRangeLimit('1');
      if (mode === 'replace' && activeFile?.watermarkConfig) {
        const c = activeFile.watermarkConfig;
        setSourceType(c.sourceType ?? 'text');
        setText(c.text ?? 'CONFIDENTIAL');
        setFontStyle(c.fontStyle ?? 'Arial, Helvetica, sans-serif');
        setFontSize(c.fontSize ?? 24);
        setColor(c.color ?? '#FF0000');
        setIsBold(c.isBold ?? false);
        setIsItalic(c.isItalic ?? false);
        setIsUnderline(c.isUnderline ?? false);
        setScalePercent(c.scalePercent ?? 100);
        setScaleToTarget(c.scaleToTarget ?? false);
        setRotation(c.rotation ?? -45);
        setOpacity(c.opacity ?? 50);
        setLocation(c.location ?? 'Behind');
        setAlignment(c.alignment ?? 4);
        setHorizontal(c.horizontal ?? 0);
        setVertical(c.vertical ?? 0);
        setUnit(c.unit ?? 'Inches');
        setPageRangeType(c.pageRangeType ?? 'All');
        setPageRangeLimit(c.pageRangeLimit ?? '1');
        setPageRangeSubset(c.pageRangeSubset ?? 'Even and odd pages');
        setWatermarkFileScale(c.watermarkFileScale ?? 100);
        setWatermarkFilePage(c.watermarkFilePage ?? 1);
        if (c.watermarkFile) setWatermarkFile(c.watermarkFile);
      } else {
        setSourceType('text');
        setText('CONFIDENTIAL');
        setFontStyle('Arial, Helvetica, sans-serif');
        setFontSize(24);
        setColor('#FF0000');
        setIsBold(false);
        setIsItalic(false);
        setIsUnderline(false);
        setScalePercent(100);
        setScaleToTarget(false);
        setRotation(-45);
        setOpacity(50);
        setLocation('Behind');
        setAlignment(4);
        setHorizontal(0);
        setVertical(0);
        setUnit('Inches');
        setPageRangeType('All');
        setPageRangeLimit('1');
        setPageRangeSubset('Even and odd pages');
        setWatermarkFileScale(100);
        setWatermarkFilePage(1);
        setWatermarkFile(null);
      }
    }
  }, [isOpen, mode, activeFile?.watermarkConfig]);

  const hexToRgbArray = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
      parseInt(result[1], 16) / 255,
      parseInt(result[2], 16) / 255,
      parseInt(result[3], 16) / 255
    ] : [0, 0, 0];
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setWatermarkFile(file);
    }
  };

  useEffect(() => {
    let active = true;
    const generatePreview = async () => {
      if (!watermarkFile) {
        setWatermarkFilePreview(null);
        return;
      }
      if (watermarkFile.type === 'application/pdf') {
        try {
          const pdfjsLib = await import('pdfjs-dist');
          if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
            pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
          }
          const arrayBuffer = await watermarkFile.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          const pageNum = Math.min(Math.max(1, watermarkFilePage), pdf.numPages);
          const page = await pdf.getPage(pageNum);
          const viewport = page.getViewport({ scale: 1.0 });
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          await page.render({ canvasContext: context!, viewport }).promise;
          if (active) {
            setWatermarkFilePreview(canvas.toDataURL('image/png'));
          }
        } catch (e) {
          console.error('Error generating PDF preview', e);
        }
      } else {
        const url = URL.createObjectURL(watermarkFile);
        if (active) setWatermarkFilePreview(url);
      }
    };
    generatePreview();
    return () => { active = false; };
  }, [watermarkFile, watermarkFilePage]);

  useEffect(() => {
    let active = true;
    const generateBgPreview = async () => {
      if (mode === 'replace' && activeFile?.fileWithoutWatermark && isOpen) {
        if (active) setBgPreviewUrl(null);
        try {
          const pdfjsLib = await import('pdfjs-dist');
          if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
            pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
          }
          const arrayBuffer = await activeFile.fileWithoutWatermark.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          const pageNum = Math.min(Math.max(1, localCurrentPage), pdf.numPages);
          const page = await pdf.getPage(pageNum);
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
    generateBgPreview();
    return () => { active = false; };
  }, [mode, activeFile?.fileWithoutWatermark, isOpen, localCurrentPage]);

  const handleApply = async () => {
    if (!activeFile) return;
    setIsProcessing(true);

    try {
      let sourceFile = activeFile.file;
      if (mode === 'replace' && activeFile.fileWithoutWatermark) {
        sourceFile = activeFile.fileWithoutWatermark;
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
      let fontRef: any;
      let imgRef: any;
      let pdfPageToEmbed: any;

      if (sourceType === 'text') {
        const isSerif = fontStyle.toLowerCase().includes('serif') || fontStyle.toLowerCase().includes('times') || fontStyle.toLowerCase().includes('georgia');
        const isMono = fontStyle.toLowerCase().includes('monospace') || fontStyle.toLowerCase().includes('courier') || fontStyle.toLowerCase().includes('consolas');

        if (isMono) {
          if (isBold && isItalic) fontRef = await pdfDoc.embedFont(StandardFonts.CourierBoldOblique);
          else if (isBold) fontRef = await pdfDoc.embedFont(StandardFonts.CourierBold);
          else if (isItalic) fontRef = await pdfDoc.embedFont(StandardFonts.CourierOblique);
          else fontRef = await pdfDoc.embedFont(StandardFonts.Courier);
        } else if (isSerif) {
          if (isBold && isItalic) fontRef = await pdfDoc.embedFont(StandardFonts.TimesRomanBoldItalic);
          else if (isBold) fontRef = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
          else if (isItalic) fontRef = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);
          else fontRef = await pdfDoc.embedFont(StandardFonts.TimesRoman);
        } else {
          if (isBold && isItalic) fontRef = await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique);
          else if (isBold) fontRef = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
          else if (isItalic) fontRef = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
          else fontRef = await pdfDoc.embedFont(StandardFonts.Helvetica);
        }
      } else if (sourceType === 'file' && watermarkFile) {
        const fileBuffer = await watermarkFile.arrayBuffer();
        if (watermarkFile.type === 'application/pdf') {
          const wmPdfDoc = await PDFDocument.load(fileBuffer);
          const pgIdx = Math.max(0, Math.min(wmPdfDoc.getPageCount() - 1, watermarkFilePage - 1));
          const [embedded] = await pdfDoc.embedPdf(wmPdfDoc, [pgIdx]);
          pdfPageToEmbed = embedded;
        } else if (watermarkFile.type === 'image/png') {
          imgRef = await pdfDoc.embedPng(fileBuffer);
        } else if (watermarkFile.type === 'image/jpeg' || watermarkFile.type === 'image/jpg') {
          imgRef = await pdfDoc.embedJpg(fileBuffer);
        }
      }

      for (const idx of targetIndices) {
        const page = allPages[idx];
        const { width, height } = page.getSize();

        let targetSize = Number(fontSize) || 24;
        let itemWidth = 0;
        let itemHeight = 0;

        if (sourceType === 'text') {
          itemWidth = fontRef.widthOfTextAtSize(text, targetSize);
          itemHeight = fontRef.heightAtSize(targetSize);

          if (scaleToTarget && itemWidth > 0 && scalePercent > 0) {
            const targetTextWidthInPt = width * (scalePercent / 100);
            targetSize = targetSize * (targetTextWidthInPt / itemWidth);
            itemWidth = fontRef.widthOfTextAtSize(text, targetSize);
            itemHeight = fontRef.heightAtSize(targetSize);
          }
        } else if (sourceType === 'file') {
          if (pdfPageToEmbed) {
            itemWidth = pdfPageToEmbed.width;
            itemHeight = pdfPageToEmbed.height;
          } else if (imgRef) {
            itemWidth = imgRef.width;
            itemHeight = imgRef.height;
          }
          if (watermarkFileScale !== 100) {
            itemWidth *= (watermarkFileScale / 100);
            itemHeight *= (watermarkFileScale / 100);
          }
        }

        // Object alignment logic (0-8)
        let cx = 0;
        let cy = 0;
        const PADDING = 20;

        const angleRad = (-rotation * Math.PI) / 180;
        const cos = Math.cos(angleRad);
        const sin = Math.sin(angleRad);

        const boundingWidth = itemWidth * Math.abs(cos) + itemHeight * Math.abs(sin);
        const boundingHeight = itemWidth * Math.abs(sin) + itemHeight * Math.abs(cos);

        // Horiz (0: Left, 1: Center, 2: Right)
        if (alignment % 3 === 0) cx = boundingWidth / 2 + PADDING;
        else if (alignment % 3 === 1) cx = width / 2;
        else cx = width - boundingWidth / 2 - PADDING;

        // Vert (0: Top, 1: Middle, 2: Bottom)
        if (Math.floor(alignment / 3) === 0) cy = height - boundingHeight / 2 - PADDING;
        else if (Math.floor(alignment / 3) === 1) cy = height / 2;
        else cy = boundingHeight / 2 + PADDING;

        let unitMult = 1;
        if (unit === 'Inches') unitMult = 72;
        else if (unit === 'Centimeters') unitMult = 28.35;
        else if (unit === 'Millimeters') unitMult = 2.835;

        cx += horizontal * unitMult;
        cy -= vertical * unitMult; // Y coordinates are bottom-up in pdf lib

        let startX = 0, startY = 0;

        if (sourceType === 'text') {
          // For text, the pivot point in drawText is the bottom-left of the text bounding box.
          // Relative to text center, bottom-left is (-itemWidth/2, -itemHeight/2 * 0.8) approximate 
          const dyOffset = (itemHeight / 3);
          const dx = (itemWidth / 2) * cos - (dyOffset) * sin;
          const dy = (itemWidth / 2) * sin + (dyOffset) * cos;
          startX = cx - dx;
          startY = cy - dy;
        } else {
          // For drawImage/drawPage, pivot behaves similarly or uses bottom left. 
          const dx = (itemWidth / 2) * cos - (itemHeight / 2) * sin;
          const dy = (itemWidth / 2) * sin + (itemHeight / 2) * cos;
          startX = cx - dx;
          startY = cy - dy;
        }

        const drawOpts: any = {
          x: startX,
          y: startY,
          opacity: opacity / 100,
          rotate: degrees(-rotation),
        };

        if (sourceType === 'text' && text) {
          drawOpts.size = targetSize;
          drawOpts.font = fontRef;
          drawOpts.color = rgb(r, g, b);
          page.drawText(text, drawOpts);
        } else if (sourceType === 'file') {
          drawOpts.width = itemWidth;
          drawOpts.height = itemHeight;
          if (pdfPageToEmbed) {
            page.drawPage(pdfPageToEmbed, drawOpts);
          } else if (imgRef) {
            page.drawImage(imgRef, drawOpts);
          }
        }

        if (location === 'Behind') {
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
            console.error("Error moving watermark to background: ", e);
          }
        }
      }

      const pdfBytes = await pdfDoc.save();
      const newFile = new File([pdfBytes as any], activeFile.file.name, { type: 'application/pdf' });

      const fileWithoutWatermark = activeFile.fileWithoutWatermark || activeFile.file;
      let newWatermarkStack;
      if (mode === 'replace') {
        newWatermarkStack = [{ file: newFile }];
      } else {
        newWatermarkStack = activeFile.watermarkStack ? [...activeFile.watermarkStack, { file: activeFile.file }] : [{ file: activeFile.file }];
      }

      const config = {
        sourceType, text, fontStyle, fontSize, color, isBold, isItalic, isUnderline,
        scalePercent, scaleToTarget, rotation, opacity, location, alignment, horizontal, vertical, unit,
        pageRangeType, pageRangeLimit, pageRangeSubset, watermarkFileScale, watermarkFilePage, watermarkFile
      };

      updateSharedFileData(activeFile.id, {
        file: newFile,
        pages: undefined,
        watermarkStack: newWatermarkStack,
        watermarkConfig: config,
        fileWithoutWatermark
      }, true);

      onClose();

    } catch (err) {
      console.error('Failed to add watermark:', err);
      alert('An error occurred.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm px-0 md:px-4">
      <div className="bg-white shadow-2xl w-full h-full md:h-auto md:max-w-[900px] md:max-h-[95vh] overflow-y-auto border border-slate-200 text-sm flex flex-col">
        <div className="bg-[#2D2D5F] text-white px-4 py-3 flex items-center justify-between sticky top-0 z-30 shrink-0">
          <h2 className="text-md font-medium uppercase tracking-wider text-xs">Add Watermark</h2>
          <button onClick={onClose} className="text-white/80 hover:text-white p-1">
            <X className="w-6 h-6 md:w-5 md:h-5" />
          </button>
        </div>

        <div className="flex flex-col md:flex-row p-4 gap-6 flex-1">
          <div className="flex-1 space-y-6">

            {/* Source */}
            <div>
              <div className="flex border border-slate-300 mb-6 font-sans">
                <button
                  onClick={() => setSourceType('text')}
                  className={cn("flex-1 py-1 text-[13px] transition-colors border-r border-slate-300", sourceType === 'text' ? 'bg-[#565C6A] text-white' : 'bg-white text-slate-600 hover:bg-slate-50')}
                >
                  Text
                </button>
                <button
                  onClick={() => setSourceType('file')}
                  className={cn("flex-1 py-1 text-[13px] transition-colors", sourceType === 'file' ? 'bg-[#565C6A] text-white' : 'bg-white text-slate-600 hover:bg-slate-50')}
                >
                  File
                </button>
              </div>

              {sourceType === 'text' && (
                <div className="space-y-5 text-[13px]">
                  <div className="flex items-center gap-4">
                    <span className="w-[80px] text-slate-600 shrink-0">Text:</span>
                    <input
                      type="text" value={text} onChange={(e) => setText(e.target.value)}
                      className="flex-1 border-b border-[#00B4F0] px-1 py-1 outline-none bg-transparent"
                    />
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="w-[80px] text-slate-600 shrink-0">Style:</span>
                    <select
                      value={fontStyle} onChange={(e) => setFontStyle(e.target.value)}
                      className="flex-1 border border-slate-300 rounded-sm px-2 py-1 outline-none focus:border-blue-500 relative bg-white"
                    >
                      {FONT_OPTIONS.map(opt => (
                        <option key={opt.label} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="w-[80px] text-slate-600 shrink-0">Properties:</span>
                    <div className="flex items-center gap-2">
                      <div className="relative flex items-center">
                        <input
                          type="number"
                          value={fontSize}
                          onChange={(e) => setFontSize(e.target.value === '' ? '' : parseInt(e.target.value) || 24)}
                          className="w-16 border border-slate-300 rounded-sm px-1 py-1 outline-none text-[#565C6A]"
                        />
                      </div>
                      <div className="relative">
                        <input
                          type="color" value={color} onChange={(e) => setColor(e.target.value)}
                          className="w-8 h-[26px] p-0 border border-slate-300 cursor-pointer"
                        />
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => setIsBold(!isBold)}
                          className={cn("w-[26px] h-[26px] flex items-center justify-center font-serif font-bold text-base border border-[#565C6A] text-[#565C6A] rounded-sm", isBold ? 'bg-slate-200' : 'bg-white')}
                        >
                          B
                        </button>
                        <button
                          onClick={() => setIsItalic(!isItalic)}
                          className={cn("w-[26px] h-[26px] flex items-center justify-center font-serif italic text-base border border-[#565C6A] text-[#565C6A] rounded-sm", isItalic ? 'bg-slate-200' : 'bg-white')}
                        >
                          I
                        </button>
                        <button
                          onClick={() => setIsUnderline(!isUnderline)}
                          className={cn("w-[26px] h-[26px] flex items-center justify-center font-serif underline text-base border border-[#565C6A] text-[#565C6A] rounded-sm", isUnderline ? 'bg-slate-200' : 'bg-white')}
                        >
                          U
                        </button>
                      </div>
                    </div>
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
                    <span className="text-slate-500 truncate flex-1">
                      {watermarkFile ? watermarkFile.name : 'No file selected'}
                    </span>
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept="image/png, image/jpeg, image/jpg, application/pdf"
                      onChange={handleFileChange}
                    />
                  </div>
                  {watermarkFile?.type === 'application/pdf' && (
                    <div className="flex items-center gap-4">
                      <span className="w-[80px] text-slate-600 shrink-0">Page No:</span>
                      <input
                        type="number"
                        min="1"
                        value={watermarkFilePage}
                        onChange={(e) => setWatermarkFilePage(parseInt(e.target.value) || 1)}
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
                        value={watermarkFileScale}
                        onChange={(e) => setWatermarkFileScale(parseInt(e.target.value) || 100)}
                        className="w-16 border border-slate-300 px-1 py-1 outline-none text-right"
                      />
                      <span className="text-slate-600">%</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Position */}
            <div className="flex gap-8">
              <div className="flex-1">
                <h3 className="text-slate-600 font-medium mb-3">Position</h3>
                <div className="w-24 h-24 border border-slate-300 grid grid-cols-3 grid-rows-3 ml-2 relative">
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                    <button
                      key={i}
                      onClick={() => setAlignment(i)}
                      className={cn("border border-slate-100 border-dashed hover:bg-slate-100 transition-colors flex items-center justify-center relative", alignment === i && "bg-blue-100")}
                    >
                      {alignment === i && <div className="w-full h-full bg-[#4A64FF]" />}
                    </button>
                  ))}
                  <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 border border-slate-400 border-dashed" />
                </div>
              </div>

              <div className="flex-1">
                <h3 className="text-slate-600 font-medium mb-3">Place</h3>
                <div className="space-y-4 ml-2">
                  <div className="flex items-center gap-2">
                    <span className="w-16 text-slate-600">Vertical:</span>
                    <input
                      type="number" value={vertical} onChange={(e) => setVertical(parseFloat(e.target.value) || 0)}
                      className="w-16 border border-slate-300 px-1 py-1 outline-none text-right"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-16 text-slate-600">Horizontal:</span>
                    <input
                      type="number" value={horizontal} onChange={(e) => setHorizontal(parseFloat(e.target.value) || 0)}
                      className="w-16 border border-slate-300 px-1 py-1 outline-none text-right"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-16 text-slate-600">Units:</span>
                    <select
                      value={unit} onChange={(e) => setUnit(e.target.value)}
                      className="flex-1 border border-slate-300 rounded-sm px-2 py-1 outline-none bg-white"
                    >
                      <option>Inches</option>
                      <option>Centimeters</option>
                      <option>Millimeters</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Appearance */}
            <div className="grid grid-cols-2 gap-8">
              <div>
                <h3 className="text-slate-600 font-medium mb-3">Appearance</h3>
                <div className="space-y-4 ml-2">
                  <div className="flex items-center gap-2">
                    <span className="w-16 text-slate-600 flex-shrink-0">Rotation:</span>
                    <div className="flex items-center gap-1 font-mono text-xs">
                      <button onClick={() => setRotation(-45)} className={cn("px-1.5 py-0.5 border", rotation === -45 ? "border-blue-600 text-blue-600 bg-blue-50" : "border-slate-300")}>-45</button>
                      <button onClick={() => setRotation(0)} className={cn("px-1.5 py-0.5 border", rotation === 0 ? "border-blue-600 text-blue-600 bg-blue-50" : "border-slate-300")}>0</button>
                      <button onClick={() => setRotation(45)} className={cn("px-1.5 py-0.5 border", rotation === 45 ? "border-blue-600 text-blue-600 bg-blue-50" : "border-slate-300")}>45</button>
                      <input
                        type="number" value={rotation} onChange={(e) => setRotation(parseInt(e.target.value) || 0)}
                        className="w-12 border border-slate-300 px-1 outline-none ml-1 text-center"
                      />
                      <span className="text-slate-400">°</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="w-16 text-slate-600 flex-shrink-0">Opacity:</span>
                    <input
                      type="range" min="0" max="100"
                      value={opacity} onChange={(e) => setOpacity(parseInt(e.target.value))}
                      className="w-24 border-none p-0 outline-none flex-1 accent-black bg-slate-300 h-1 appearance-none rounded-full [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:bg-black"
                    />
                    <input
                      type="number" value={opacity} onChange={(e) => setOpacity(parseInt(e.target.value) || 0)}
                      className="w-12 border border-slate-300 px-1 outline-none text-right"
                    />
                    <span className="text-slate-600">%</span>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <label className="flex items-center gap-2 text-slate-600 flex-1 whitespace-nowrap overflow-hidden text-ellipsis">
                      <input
                        type="checkbox" checked={scaleToTarget} onChange={(e) => setScaleToTarget(e.target.checked)}
                        className="w-4 h-4 text-blue-600 focus:ring-blue-500 rounded-sm flex-shrink-0"
                      />
                      Scale target to:
                    </label>
                    <input
                      type="number" disabled={!scaleToTarget} value={scalePercent} onChange={(e) => setScalePercent(parseInt(e.target.value) || 0)}
                      className="w-12 border border-slate-300 px-1 outline-none disabled:opacity-50 text-right shrink-0"
                    />
                    <span className="text-slate-600 shrink-0">%</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-5">
                <div>
                  <h3 className="text-slate-600 font-medium mb-2">Page Range</h3>
                  <div className="space-y-2 ml-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio" name="wmPageRange" checked={pageRangeType === 'All'}
                        onChange={() => setPageRangeType('All')}
                        className="w-4 h-4 text-blue-600 outline-none"
                      />
                      <span className="text-slate-700">All</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-2 text-slate-700">
                        <input
                          type="radio" name="wmPageRange" checked={pageRangeType === 'Range'}
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
                      <span className="text-slate-500 text-sm">of {totalPages} e.g.(1,3,5,7-10)</span>
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

                <div>
                  <h3 className="text-slate-600 font-medium mb-2 mt-1">Location</h3>
                  <div className="flex items-center gap-6 ml-2">
                    <label className="flex items-center gap-2 text-slate-600">
                      <input
                        type="radio" name="wmLoc" checked={location === 'Behind'} onChange={() => setLocation('Behind')}
                        className="w-4 h-4 text-blue-600"
                      />
                      Behind
                    </label>
                    <label className="flex items-center gap-2 text-slate-600">
                      <input
                        type="radio" name="wmLoc" checked={location === 'Above'} onChange={() => setLocation('Above')}
                        className="w-4 h-4 text-blue-600"
                      />
                      Above
                    </label>
                  </div>
                </div>
              </div>
            </div>

          </div>

          <div className="w-full md:w-[40%] md:min-w-[300px] border border-slate-300 shadow-sm p-1 bg-slate-50 flex flex-col h-[350px] md:h-auto shrink-0">
            <div className="flex-1 relative flex flex-col justify-center items-center overflow-hidden bg-white">
              {(() => {
                const currentPageData = pages[localCurrentPage - 1];
                const origW = currentPageData?.width || 595;
                const origH = currentPageData?.height || 842;

                let unitMultPx = 1;
                if (unit === 'Inches') unitMultPx = 72;
                else if (unit === 'Centimeters') unitMultPx = 28.35;
                else if (unit === 'Millimeters') unitMultPx = 2.835;

                const scaleVis = 350 / 842;

                let isPageInRange = false;
                if (pageRangeType === 'All') {
                  isPageInRange = true;
                } else {
                  const ranges = pageRangeLimit.split(',').map(r => r.trim());
                  ranges.forEach(r => {
                    if (r.includes('-')) {
                      const [start, end] = r.split('-').map(Number);
                      for (let i = start; i <= end; i++) {
                        if (i === localCurrentPage) isPageInRange = true;
                      }
                    } else {
                      const num = parseInt(r);
                      if (num === localCurrentPage) isPageInRange = true;
                    }
                  });
                }

                if (pageRangeSubset === 'Even pages only' && localCurrentPage % 2 !== 0) {
                  isPageInRange = false;
                } else if (pageRangeSubset === 'Odd pages only' && localCurrentPage % 2 === 0) {
                  isPageInRange = false;
                }

                let previewFontSize = Number(fontSize) * scaleVis;
                if (scaleToTarget && text.length > 0 && sourceType === 'text') {
                  const estimatedCharWidth = 0.6;
                  const targetWidth = origW * (scalePercent / 100);
                  previewFontSize = (targetWidth / (text.length * estimatedCharWidth)) * scaleVis;
                }

                // Simulate PDF-lib layout logic
                const angleRad = (-rotation * Math.PI) / 180;
                const cos = Math.cos(angleRad);
                const sin = Math.sin(angleRad);

                let itemWidth = 0;
                let itemHeight = 0;

                if (sourceType === 'text') {
                  itemWidth = (text.length * 0.6) * (previewFontSize / scaleVis); // approximate Pt size
                  itemHeight = (previewFontSize / scaleVis) * 1.2;
                } else if (sourceType === 'file') {
                  itemWidth = 200; // Mock dimensions for preview
                  itemHeight = 200;
                  if (watermarkFileScale !== 100) {
                    itemWidth *= (watermarkFileScale / 100);
                    itemHeight *= (watermarkFileScale / 100);
                  }
                  if (scaleToTarget && scalePercent > 0) {
                    // If scaled to target, approximate the width
                    const targetW = origW * (scalePercent / 100);
                    const ratio = targetW / itemWidth;
                    itemWidth *= ratio;
                    itemHeight *= ratio;
                  }
                }

                const boundingWidth = itemWidth * Math.abs(cos) + itemHeight * Math.abs(sin);
                const boundingHeight = itemWidth * Math.abs(sin) + itemHeight * Math.abs(cos);

                let cx = 0;
                let cy = 0;
                const PADDING = 20;

                if (alignment % 3 === 0) cx = boundingWidth / 2 + PADDING;
                else if (alignment % 3 === 1) cx = origW / 2;
                else cx = origW - boundingWidth / 2 - PADDING;

                if (Math.floor(alignment / 3) === 0) cy = origH - boundingHeight / 2 - PADDING;
                else if (Math.floor(alignment / 3) === 1) cy = origH / 2;
                else cy = boundingHeight / 2 + PADDING;

                cx += horizontal * unitMultPx;
                cy -= vertical * unitMultPx;

                const previewCx = cx * scaleVis;
                const previewCy = (origH - cy) * scaleVis; // invert Y for web

                let previewWrapStyle: React.CSSProperties = {
                  position: 'absolute',
                  left: `${previewCx}px`,
                  top: `${previewCy}px`,
                  transform: `translate(-50%, -50%)`,
                  pointerEvents: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  zIndex: 20
                };

                const blendStyle: React.CSSProperties = {
                  mixBlendMode: location === 'Behind' ? 'multiply' : 'normal',
                  opacity: opacity / 100,
                  transform: `rotate(${rotation}deg)`,
                };

                return (
                  <div className="relative overflow-hidden border border-slate-300 shadow-sm w-full h-[350px] bg-slate-100/50">
                    <div className="absolute inset-0 max-w-full max-h-full flex items-center justify-center p-2">
                      <div className="relative bg-white shadow overflow-hidden" style={{ height: '100%', aspectRatio: `${origW}/${origH}` }}>

                        {/* Overlay Text Preview */}
                        {isPageInRange && sourceType === 'text' && text && (
                          <div style={previewWrapStyle}>
                            <div
                              className="whitespace-nowrap flex-shrink-0"
                              style={{
                                fontSize: `${previewFontSize}px`,
                                color: color,
                                fontFamily: fontStyle,
                                fontStyle: isItalic ? 'italic' : 'normal',
                                fontWeight: isBold ? 'bold' : 'normal',
                                textDecoration: isUnderline ? 'underline' : 'none',
                                ...blendStyle
                              }}
                            >
                              {text}
                            </div>
                          </div>
                        )}

                        {/* Overlay Image / File Preview */}
                        {isPageInRange && sourceType === 'file' && watermarkFilePreview && (
                          <div style={previewWrapStyle}>
                            <img
                              src={watermarkFilePreview}
                              alt="watermark preview"
                              className="flex-shrink-0"
                              style={{
                                width: `${itemWidth * scaleVis}px`,
                                height: `${itemHeight * scaleVis}px`,
                                ...blendStyle
                              }}
                            />
                          </div>
                        )}

                        {(bgPreviewUrl || currentPageData?.previewUrl) ? (
                          <img
                            src={bgPreviewUrl || currentPageData.previewUrl}
                            alt="Preview"
                            className="w-full h-full object-fill relative z-10 pointer-events-none"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center relative z-10 pointer-events-none">
                            <FileText className="w-10 h-10 text-slate-200" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
            <div className="flex justify-center items-center py-2 bg-white gap-4 border-t border-slate-200">
              <button
                onClick={() => setLocalCurrentPage(p => Math.max(1, p - 1))}
                className="text-slate-400 hover:text-slate-600 disabled:opacity-30"
                disabled={localCurrentPage <= 1}
              >◀</button>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={localCurrentPage || ''}
                  onChange={(e) => {
                    if (e.target.value === '') {
                      setLocalCurrentPage(0);
                      return;
                    }
                    const num = parseInt(e.target.value);
                    if (!isNaN(num) && num >= 1 && num <= totalPages) {
                      setLocalCurrentPage(num);
                    }
                  }}
                  onBlur={() => {
                    if (!localCurrentPage || localCurrentPage < 1) setLocalCurrentPage(1);
                  }}
                  className="w-8 border border-slate-300 outline-none text-center h-6"
                />
                <span className="text-slate-500 text-xs">/ {totalPages}</span>
              </div>
              <button
                onClick={() => setLocalCurrentPage(p => Math.min(totalPages, p + 1))}
                className="text-slate-600 hover:text-slate-800 disabled:opacity-30"
                disabled={localCurrentPage >= totalPages}
              >▶</button>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3 font-medium sticky bottom-0 shrink-0 z-30">
          <button
            onClick={onClose}
            className="px-8 py-2 border border-slate-300 text-slate-600 hover:bg-slate-100 transition-colors uppercase text-xs min-w-[100px] rounded-sm bg-white"
          >
            CANCEL
          </button>
          <button
            onClick={handleApply}
            disabled={isProcessing}
            className="px-10 py-2 bg-[#4461FF] text-white hover:bg-blue-700 transition-colors uppercase text-xs disabled:bg-slate-300 disabled:cursor-not-allowed min-w-[100px] rounded-sm tracking-wide"
          >
            {isProcessing ? 'PROCESSING...' : 'OK'}
          </button>
        </div>
      </div>
    </div>
  );
}
