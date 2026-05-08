import React, { useState, useEffect } from 'react';
import { cn } from '../lib/utils';
import { FONT_OPTIONS } from '../constants';
import { X } from 'lucide-react';
import { usePDF } from '../contexts/PDFContext';

interface HeaderFooterModalProps {
  isOpen: boolean;
  mode: 'add' | 'replace';
  onClose: () => void;
  onApply: (config: any) => void;
}

export default function HeaderFooterModal({
  isOpen,
  mode,
  onClose,
  onApply
}: HeaderFooterModalProps) {
  const { activeFileId, sharedFiles, updateSharedFileData } = usePDF();
  const activeFile = sharedFiles.find(f => f.id === activeFileId);
  const initialConfig = mode === 'replace' ? activeFile?.headerFooterConfig : undefined;

  const [style, setStyle] = useState(initialConfig?.style || 'Arial');
  const [size, setSize] = useState(initialConfig?.size || 11);
  const [color, setColor] = useState(initialConfig?.color || '#000000');
  const [bold, setBold] = useState(initialConfig?.bold || false);
  const [italic, setItalic] = useState(initialConfig?.italic || false);

  const [top, setTop] = useState(initialConfig?.top ?? 0.5);
  const [bottom, setBottom] = useState(initialConfig?.bottom ?? 0.5);
  const [left, setLeft] = useState(initialConfig?.left ?? 1);
  const [right, setRight] = useState(initialConfig?.right ?? 1);
  const [unit, setUnit] = useState(initialConfig?.unit || 'Inches');

  const [headerLeft, setHeaderLeft] = useState(initialConfig?.headerLeft || '');
  const [headerCenter, setHeaderCenter] = useState(initialConfig?.headerCenter || '');
  const [headerRight, setHeaderRight] = useState(initialConfig?.headerRight || '');
  
  const [footerLeft, setFooterLeft] = useState(initialConfig?.footerLeft || '');
  const [footerCenter, setFooterCenter] = useState(initialConfig?.footerCenter || '');
  const [footerRight, setFooterRight] = useState(initialConfig?.footerRight || '');

  const [macro, setMacro] = useState('<<Page Number>>');
  const [activeInput, setActiveInput] = useState<'headerLeft'|'headerCenter'|'headerRight'|'footerLeft'|'footerCenter'|'footerRight' | null>(null);

  // Macro Settings
  const [isMacroSettingsOpen, setIsMacroSettingsOpen] = useState(false);
  const [dateFormat, setDateFormat] = useState(initialConfig?.dateFormat || 'm/d/yyyy');
  const [pageNumberFormat, setPageNumberFormat] = useState(initialConfig?.pageNumberFormat || 'Page 1 of n');
  const [startPageNumber, setStartPageNumber] = useState(initialConfig?.startPageNumber ?? 1);

  // Page Range
  const [isPageRangeOpen, setIsPageRangeOpen] = useState(false);
  const [pageRangeType, setPageRangeType] = useState<'All'|'Range'>(initialConfig?.pageRangeType || 'All');
  const [pageRangeLimit, setPageRangeLimit] = useState(initialConfig?.pageRangeLimit || '');
  const [pageRangeSubset, setPageRangeSubset] = useState(initialConfig?.pageRangeSubset || 'Even and odd pages');

  // Sync back to file when state changes
  useEffect(() => {
    if (activeFileId && isOpen) {
       updateSharedFileData(activeFileId, {
         headerFooterConfig: {
            style, size, color, bold, italic,
            top, bottom, left, right, unit,
            headerLeft, headerCenter, headerRight,
            footerLeft, footerCenter, footerRight,
            dateFormat, pageNumberFormat, startPageNumber,
            pageRangeType, pageRangeLimit, pageRangeSubset
         }
       });
    }
  }, [
    activeFileId, isOpen,
    style, size, color, bold, italic,
    top, bottom, left, right, unit,
    headerLeft, headerCenter, headerRight,
    footerLeft, footerCenter, footerRight,
    dateFormat, pageNumberFormat, startPageNumber,
    pageRangeType, pageRangeLimit, pageRangeSubset
  ]);

  // Read from file on mount or when active file changes
  useEffect(() => {
    if (isOpen) {
      setStyle(initialConfig?.style || 'Arial');
      setSize(initialConfig?.size || 11);
      setColor(initialConfig?.color || '#000000');
      setBold(initialConfig?.bold || false);
      setItalic(initialConfig?.italic || false);
      setTop(initialConfig?.top ?? 0.5);
      setBottom(initialConfig?.bottom ?? 0.5);
      setLeft(initialConfig?.left ?? 1);
      setRight(initialConfig?.right ?? 1);
      setUnit(initialConfig?.unit || 'Inches');
      setHeaderLeft(initialConfig?.headerLeft || '');
      setHeaderCenter(initialConfig?.headerCenter || '');
      setHeaderRight(initialConfig?.headerRight || '');
      setFooterLeft(initialConfig?.footerLeft || '');
      setFooterCenter(initialConfig?.footerCenter || '');
      setFooterRight(initialConfig?.footerRight || '');
      setDateFormat(initialConfig?.dateFormat || 'm/d/yyyy');
      setPageNumberFormat(initialConfig?.pageNumberFormat || 'Page 1 of n');
      setStartPageNumber(initialConfig?.startPageNumber ?? 1);
      setPageRangeType(initialConfig?.pageRangeType || 'All');
      setPageRangeLimit(initialConfig?.pageRangeLimit || '');
      setPageRangeSubset(initialConfig?.pageRangeSubset || 'Even and odd pages');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFileId, isOpen]);

  if (!isOpen) return null;

  // Convert unit to preview pixels for layout (approximate scale)
  const getMarginInPx = (val: number, unit: string) => {
    let inPx = val;
    if (unit === 'Inches') inPx = val * 20;
    if (unit === 'Centimeters') inPx = (val / 2.54) * 20;
    if (unit === 'Millimeters') inPx = (val / 25.4) * 20;
    if (unit === 'Points') inPx = (val / 72) * 20;
    return Math.max(0, Math.min(inPx, 40)); // cap it so preview doesn't break
  };

  const pTop = getMarginInPx(top, unit);
  const pBottom = getMarginInPx(bottom, unit);
  const pLeft = getMarginInPx(left, unit);
  const pRight = getMarginInPx(right, unit);

  const insertMacro = () => {
    if (!activeInput) return;
    const macroText = macro;
    if (activeInput === 'headerLeft') setHeaderLeft(prev => prev + macroText);
    if (activeInput === 'headerCenter') setHeaderCenter(prev => prev + macroText);
    if (activeInput === 'headerRight') setHeaderRight(prev => prev + macroText);
    if (activeInput === 'footerLeft') setFooterLeft(prev => prev + macroText);
    if (activeInput === 'footerCenter') setFooterCenter(prev => prev + macroText);
    if (activeInput === 'footerRight') setFooterRight(prev => prev + macroText);
  };

  const processMacroPreview = (text: string) => {
    if (!text) return '';
    
    // Page Number Format
    let pNumStr = String(startPageNumber);
    if (pageNumberFormat === '1 of n') pNumStr = `${startPageNumber} of 10`;
    else if (pageNumberFormat === '1/n') pNumStr = `${startPageNumber}/10`;
    else if (pageNumberFormat === 'Page 1') pNumStr = `Page ${startPageNumber}`;
    else if (pageNumberFormat === 'Page 1 of n') pNumStr = `Page ${startPageNumber} of 10`;
    else if (pageNumberFormat === 'I') pNumStr = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][Math.min(startPageNumber-1, 9)] || 'I';
    else if (pageNumberFormat === 'a') pNumStr = String.fromCharCode(97 + ((startPageNumber - 1) % 26));

    // Date Format
    const d = new Date('2026-11-15T10:00:00');
    let dateStr = '11/15/2026';
    const dd = String(d.getDate()).padStart(2, '0');
    const d_single = String(d.getDate());
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const m_single = String(d.getMonth() + 1);
    const yyyy = d.getFullYear();
    const yy = String(yyyy).slice(2);

    if (dateFormat === 'm/d') dateStr = `${m_single}/${d_single}`;
    else if (dateFormat === 'm/d/yyyy') dateStr = `${m_single}/${d_single}/${yyyy}`;
    else if (dateFormat === 'm.d.yyyy') dateStr = `${m_single}.${d_single}.${yyyy}`;
    else if (dateFormat === 'mm.dd.yyyy') dateStr = `${mm}.${dd}.${yyyy}`;
    else if (dateFormat === 'mm.yy') dateStr = `${mm}.${yy}`;
    else if (dateFormat === 'd.m.yyyy') dateStr = `${d_single}.${m_single}.${yyyy}`;
    else if (dateFormat === 'dd.mm.yyyy') dateStr = `${dd}.${mm}.${yyyy}`;
    else if (dateFormat === 'yy-mm-dd') dateStr = `${yy}-${mm}-${dd}`;
    else if (dateFormat === 'yyyy-mm-dd') dateStr = `${yyyy}-${mm}-${dd}`;

    return text
      .replace(/<<Page Number>>/g, pNumStr)
      .replace(/<<Total Pages>>/g, '10')
      .replace(/<<Date>>/g, dateStr)
      .replace(/<<Time>>/g, '10:00 AM')
      .replace(/<<File Name>>/g, 'Document.pdf');
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-0 md:p-4 font-sans text-[13px]">
      <div className="bg-white text-slate-800 shadow-2xl flex flex-col w-full h-full md:h-auto md:w-[800px] md:max-w-full overflow-hidden">
        <div className="bg-[#2D2D5F] text-white px-4 py-3 flex items-center justify-between shrink-0 sticky top-0 z-30 md:hidden">
          <h2 className="text-md font-medium uppercase tracking-wider text-xs">{mode === 'add' ? 'Add Header & Footer' : 'Update Header & Footer'}</h2>
          <button onClick={onClose} className="text-white/80 hover:text-white p-1">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-2">
          {/* Header */}
          <div className="mb-6 hidden md:block">
            <h2 className="text-lg font-medium text-slate-800">{mode === 'add' ? 'Add Header & Footer' : 'Update Header & Footer'}</h2>
          </div>
          
          {/* Font */}
          <div className="mb-6">
            <h3 className="text-slate-500 text-[15px] mb-2 font-medium">Font</h3>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2">
                <span className="text-slate-600">Style:</span>
                <select 
                  value={style}
                  onChange={(e) => setStyle(e.target.value)}
                  className="border border-slate-300 px-1 py-0.5 w-[140px] md:w-[200px] outline-none"
                >
                  {FONT_OPTIONS.map(opt => (
                    <option key={opt.label} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-slate-600">Size:</span>
                <input 
                  type="number" 
                  value={size}
                  onChange={(e) => setSize(Number(e.target.value))}
                  className="border border-slate-300 px-1 py-0.5 w-[50px] outline-none ml-2 show-spinners"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <div className="border border-slate-300 ml-2 w-8 h-6 flex items-center justify-center p-0.5">
                  <input 
                    type="color" 
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-full h-full p-0 border-none bg-transparent cursor-pointer"
                  />
                </div>
                
                <button 
                  onClick={() => setBold(!bold)}
                  className={cn("border border-blue-400 w-6 h-6 flex items-center justify-center font-bold text-blue-800 ml-2", bold ? "bg-blue-100" : "bg-white")}
                >
                  B
                </button>
                <button 
                  onClick={() => setItalic(!italic)}
                  className={cn("border border-blue-400 w-6 h-6 flex items-center justify-center italic text-blue-800", italic ? "bg-blue-100" : "bg-white")}
                >
                  I
                </button>
              </div>
            </div>
          </div>

          {/* Position */}
          <div className="mb-6">
            <h3 className="text-slate-500 text-[15px] mb-2">Position</h3>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <span className="text-slate-600">Top:</span>
                <input 
                  type="number" step="0.1"
                  value={top} onChange={(e) => setTop(Number(e.target.value))}
                  className="border border-slate-300 px-1 py-0.5 w-[50px] outline-none show-spinners"
                />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-slate-600">Bottom:</span>
                <input 
                  type="number" step="0.1"
                  value={bottom} onChange={(e) => setBottom(Number(e.target.value))}
                  className="border border-slate-300 px-1 py-0.5 w-[50px] outline-none show-spinners"
                />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-slate-600">Left:</span>
                <input 
                  type="number" step="0.1"
                  value={left} onChange={(e) => setLeft(Number(e.target.value))}
                  className="border border-slate-300 px-1 py-0.5 w-[50px] outline-none show-spinners"
                />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-slate-600">Right:</span>
                <input 
                  type="number" step="0.1"
                  value={right} onChange={(e) => setRight(Number(e.target.value))}
                  className="border border-slate-300 px-1 py-0.5 w-[50px] outline-none show-spinners"
                />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-slate-600">Units:</span>
                <select 
                  value={unit} onChange={(e) => setUnit(e.target.value)}
                  className="border border-slate-300 px-1 py-0.5 w-24 outline-none"
                >
                  <option value="Inches">Inches</option>
                  <option value="Centimeters">Centimeters</option>
                  <option value="Millimeters">Millimeters</option>
                </select>
              </div>
            </div>
          </div>

          {/* Header & Footer TextAreas */}
          <div className="mb-2">
            <h3 className="text-slate-500 text-[15px] mb-2">Header & Footer</h3>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <textarea 
                value={headerLeft} onChange={(e) => setHeaderLeft(e.target.value)} onFocus={() => setActiveInput('headerLeft')}
                className="border border-slate-300 outline-none resize-none h-14 p-1 shadow-[inset_0_1px_3px_rgba(0,0,0,0.1)] focus:border-blue-500"
              />
              <textarea 
                value={headerCenter} onChange={(e) => setHeaderCenter(e.target.value)} onFocus={() => setActiveInput('headerCenter')}
                className="border border-slate-300 outline-none resize-none h-14 p-1 shadow-[inset_0_1px_3px_rgba(0,0,0,0.1)] focus:border-blue-500"
              />
              <textarea 
                value={headerRight} onChange={(e) => setHeaderRight(e.target.value)} onFocus={() => setActiveInput('headerRight')}
                className="border border-slate-300 outline-none resize-none h-14 p-1 shadow-[inset_0_1px_3px_rgba(0,0,0,0.1)] focus:border-blue-500"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <textarea 
                value={footerLeft} onChange={(e) => setFooterLeft(e.target.value)} onFocus={() => setActiveInput('footerLeft')}
                className="border border-slate-300 outline-none resize-none h-14 p-1 shadow-[inset_0_1px_3px_rgba(0,0,0,0.1)] focus:border-blue-500"
              />
              <textarea 
                value={footerCenter} onChange={(e) => setFooterCenter(e.target.value)} onFocus={() => setActiveInput('footerCenter')}
                className="border border-slate-300 outline-none resize-none h-14 p-1 shadow-[inset_0_1px_3px_rgba(0,0,0,0.1)] focus:border-blue-500"
              />
              <textarea 
                value={footerRight} onChange={(e) => setFooterRight(e.target.value)} onFocus={() => setActiveInput('footerRight')}
                className="border border-slate-300 outline-none resize-none h-14 p-1 shadow-[inset_0_1px_3px_rgba(0,0,0,0.1)] focus:border-blue-500"
              />
            </div>
          </div>

          {/* Macros Area */}
          <div className="flex items-center relative mb-4">
            <div className="flex items-center gap-2">
              <span className="text-slate-600">Macros:</span>
              <select 
                value={macro} onChange={(e) => setMacro(e.target.value)}
                className="border border-slate-300 px-1 py-0.5 w-[150px] outline-none"
              >
                <option value="<<Page Number>>">Page Number</option>
                <option value="<<Total Pages>>">Total Pages</option>
                <option value="<<Date>>">Date</option>
                <option value="<<Time>>">Time</option>
                <option value="<<File Name>>">File Name</option>
              </select>
              <button 
                onClick={() => setIsMacroSettingsOpen(true)}
                className="border border-blue-400 text-blue-500 px-6 py-0.5 hover:bg-blue-50 transition-colors"
              >
                Settings...
              </button>
              <button 
                onClick={insertMacro}
                className="border border-blue-400 text-blue-500 px-6 py-0.5 hover:bg-blue-50 transition-colors ml-2"
              >
                Insert Macro
              </button>
            </div>
            <button 
              onClick={() => setIsPageRangeOpen(true)}
              className="text-blue-600 underline ml-auto absolute right-0 top-6"
            >
              Page Range
            </button>
          </div>

          {/* Live Preview Area */}
          <div className="w-full border border-slate-400 h-[100px] relative mt-8 flex flex-col font-sans overflow-hidden">
             {/* The grid lines */}
             <div className="absolute inset-0 z-0 pointer-events-none">
               <div className="absolute left-0 right-0 border-t border-dashed border-blue-400/70" style={{ top: `${pTop}px` }}></div>
               <div className="absolute left-0 right-0 border-t border-dashed border-blue-400/70" style={{ bottom: `${pBottom}px` }}></div>
               <div className="absolute top-0 bottom-0 left-[33%] border-l border-dashed border-slate-300"></div>
               <div className="absolute top-0 bottom-0 left-[66%] border-l border-dashed border-slate-300"></div>
             </div>

             {/* Dummy Data */}
             <div className="absolute inset-0 flex flex-col justify-center items-center pointer-events-none z-10 px-12" style={{ color: '#666', fontFamily: 'sans-serif' }}>
                <div className="w-full flex">
                   <div className="w-1/3 text-[10px]">Name of Assessee</div>
                   <div className="w-2/3 text-[10px] truncate">Central Academy Jodhpur Education Society</div>
                </div>
                <div className="w-full flex mt-0.5">
                   <div className="w-1/3 text-[10px]">Address</div>
                   <div className="w-2/3 text-[10px] truncate">1/578, Vidhyadhar Nagar, Jaipur, Rajasthan, 302039</div>
                </div>
                <div className="w-full h-px bg-slate-200 my-1" />
                <div className="w-full flex justify-between">
                   <div className="text-[10px] w-1/2">Refundable (Round off u/s 288B)</div>
                   <div className="text-[10px] w-1/2 text-right">24,770</div>
                </div>
             </div>

             {/* Dynamic Content */}
             <div 
                className="absolute left-0 right-0 flex z-20 items-end justify-between pointer-events-none" 
                style={{ top: 0, height: `${Math.max(20, pTop)}px`, paddingLeft: `${pLeft}px`, paddingRight: `${pRight}px` }}
             >
               <div style={{ fontFamily: style, fontWeight: bold ? 'bold' : 'normal', fontStyle: italic ? 'italic' : 'normal', color, fontSize: `${Math.min(size, 20)}px`, lineHeight: 1 }} className="w-1/3 text-left overflow-hidden whitespace-nowrap mb-0.5">{processMacroPreview(headerLeft)}</div>
               <div style={{ fontFamily: style, fontWeight: bold ? 'bold' : 'normal', fontStyle: italic ? 'italic' : 'normal', color, fontSize: `${Math.min(size, 20)}px`, lineHeight: 1 }} className="w-1/3 text-center overflow-hidden whitespace-nowrap mb-0.5">{processMacroPreview(headerCenter)}</div>
               <div style={{ fontFamily: style, fontWeight: bold ? 'bold' : 'normal', fontStyle: italic ? 'italic' : 'normal', color, fontSize: `${Math.min(size, 20)}px`, lineHeight: 1 }} className="w-1/3 text-right overflow-hidden whitespace-nowrap mb-0.5">{processMacroPreview(headerRight)}</div>
             </div>
             
             <div 
                className="absolute left-0 right-0 flex z-20 items-start justify-between pointer-events-none" 
                style={{ bottom: 0, height: `${Math.max(20, pBottom)}px`, paddingLeft: `${pLeft}px`, paddingRight: `${pRight}px` }}
             >
               <div style={{ fontFamily: style, fontWeight: bold ? 'bold' : 'normal', fontStyle: italic ? 'italic' : 'normal', color, fontSize: `${Math.min(size, 20)}px`, lineHeight: 1 }} className="w-1/3 text-left overflow-hidden whitespace-nowrap mt-0.5">{processMacroPreview(footerLeft)}</div>
               <div style={{ fontFamily: style, fontWeight: bold ? 'bold' : 'normal', fontStyle: italic ? 'italic' : 'normal', color, fontSize: `${Math.min(size, 20)}px`, lineHeight: 1 }} className="w-1/3 text-center overflow-hidden whitespace-nowrap mt-0.5">{processMacroPreview(footerCenter)}</div>
               <div style={{ fontFamily: style, fontWeight: bold ? 'bold' : 'normal', fontStyle: italic ? 'italic' : 'normal', color, fontSize: `${Math.min(size, 20)}px`, lineHeight: 1 }} className="w-1/3 text-right overflow-hidden whitespace-nowrap mt-0.5">{processMacroPreview(footerRight)}</div>
             </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-3 p-4 bg-slate-50 border-t border-slate-200 sticky bottom-0 z-30 shrink-0">
          <button 
            onClick={onClose}
            className="px-8 py-2 border border-slate-300 text-slate-600 hover:bg-slate-100 transition-colors uppercase text-xs min-w-[100px] rounded-sm bg-white font-medium"
          >
            CANCEL
          </button>
          <button 
            onClick={() => {
              onApply({
                headerLeft, headerCenter, headerRight,
                footerLeft, footerCenter, footerRight,
                style, size, color, bold, italic,
                top, bottom, left, right, unit,
                dateFormat, pageNumberFormat, startPageNumber,
                pageRangeType, pageRangeLimit, pageRangeSubset
              });
              onClose();
            }}
            className="px-10 py-2 bg-[#4461FF] text-white hover:bg-blue-700 transition-colors uppercase text-xs min-w-[100px] rounded-sm tracking-wide font-medium"
          >
            OK
          </button>
        </div>
      </div>
      {/* Settings / Pickers can be appended here ... */}

      {isMacroSettingsOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-transparent backdrop-blur-[2px] p-4 font-sans text-sm">
          <div className="w-[400px] bg-white shadow-2xl border border-slate-300 rounded-sm flex flex-col">
            <div className="bg-[#2D2D5F] text-white px-4 py-2 flex items-center justify-between">
              <span className="text-md font-medium">Page number and date setting</span>
              <button onClick={() => setIsMacroSettingsOpen(false)} className="text-white/80 hover:text-white">
                <X className="w-4 h-4 flex-shrink-0" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between gap-4">
                <label className="text-slate-600">Date format:</label>
                <select 
                  value={dateFormat}
                  onChange={(e) => setDateFormat(e.target.value)}
                  className="border border-slate-300 px-2 py-1 flex-1 text-slate-700 outline-none"
                >
                  <option value="m/d">m/d</option>
                  <option value="m/d/yyyy">m/d/yyyy</option>
                  <option value="m.d.yyyy">m.d.yyyy</option>
                  <option value="mm.dd.yyyy">mm.dd.yyyy</option>
                  <option value="mm.yy">mm.yy</option>
                  <option value="d.m.yyyy">d.m.yyyy</option>
                  <option value="dd.mm.yyyy">dd.mm.yyyy</option>
                  <option value="yy-mm-dd">yy-mm-dd</option>
                  <option value="yyyy-mm-dd">yyyy-mm-dd</option>
                </select>
              </div>
              <div className="flex items-center justify-between gap-4">
                <label className="text-slate-600">Page number format:</label>
                <select 
                  value={pageNumberFormat}
                  onChange={(e) => setPageNumberFormat(e.target.value)}
                  className="border border-slate-300 px-2 py-1 flex-1 text-slate-700 outline-none"
                >
                  <option value="1">1</option>
                  <option value="1 of n">1 of n</option>
                  <option value="1/n">1/n</option>
                  <option value="Page 1">Page 1</option>
                  <option value="Page 1 of n">Page 1 of n</option>
                  <option value="I">I</option>
                  <option value="a">a</option>
                </select>
              </div>
              <div className="flex items-center justify-between gap-4">
                <label className="text-slate-600">Start page number:</label>
                <input 
                  type="number"
                  value={startPageNumber}
                  onChange={(e) => setStartPageNumber(Number(e.target.value))}
                  className="border border-slate-300 px-2 py-1 flex-1 text-slate-700 outline-none"
                />
              </div>
            </div>
            <div className="p-4 bg-white border-t border-slate-200 flex justify-end gap-3">
              <button 
                onClick={() => setIsMacroSettingsOpen(false)}
                className="px-6 py-1 border border-blue-400 text-blue-600 hover:bg-blue-50 transition-colors uppercase font-medium"
              >
                Cancel
              </button>
              <button 
                onClick={() => setIsMacroSettingsOpen(false)}
                className="px-6 py-1 bg-[#4461FF] text-white hover:bg-blue-700 transition-colors uppercase font-medium shadow-sm"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {isPageRangeOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-transparent backdrop-blur-[2px] p-4 font-sans text-sm">
          <div className="w-[400px] bg-white shadow-2xl border border-slate-300 rounded-sm flex flex-col">
            <div className="bg-[#2D2D5F] text-white px-4 py-2 flex items-center justify-between">
              <span className="text-md font-medium">Page Range</span>
              <button onClick={() => setIsPageRangeOpen(false)} className="text-white/80 hover:text-white">
                <X className="w-4 h-4 flex-shrink-0" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <h3 className="text-slate-700 font-medium text-base mb-2">Page Range</h3>
              <div className="space-y-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name="pageRange" 
                    checked={pageRangeType === 'All'}
                    onChange={() => setPageRangeType('All')}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span>All</span>
                </label>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 cursor-pointer shrink-0">
                    <input 
                      type="radio" 
                      name="pageRange" 
                      checked={pageRangeType === 'Range'}
                      onChange={() => setPageRangeType('Range')}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span>Range:</span>
                  </label>
                  <input 
                    type="text"
                    value={pageRangeLimit}
                    onChange={(e) => {
                      setPageRangeType('Range');
                      setPageRangeLimit(e.target.value);
                    }}
                    placeholder="1-4"
                    className="border-b border-slate-400 focus:border-blue-500 outline-none px-1 w-16"
                  />
                  <span className="text-slate-500 text-xs">e.g.(1,3,5,7-10)</span>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-6">
                <label className="text-slate-600 shrink-0">Subset:</label>
                <select 
                  value={pageRangeSubset}
                  onChange={(e) => setPageRangeSubset(e.target.value)}
                  className="border border-slate-300 px-2 py-1 flex-1 text-slate-700 outline-none"
                >
                  <option>Even and odd pages</option>
                  <option>Even pages only</option>
                  <option>Odd pages only</option>
                </select>
              </div>
            </div>
            <div className="p-4 bg-white border-t border-slate-200 flex justify-end gap-3 mt-4">
              <button 
                onClick={() => setIsPageRangeOpen(false)}
                className="px-6 py-1 border border-blue-400 text-blue-600 hover:bg-blue-50 transition-colors uppercase font-medium"
              >
                Cancel
              </button>
              <button 
                onClick={() => setIsPageRangeOpen(false)}
                className="px-6 py-1 bg-[#4461FF] text-white hover:bg-blue-700 transition-colors uppercase font-medium shadow-sm"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
