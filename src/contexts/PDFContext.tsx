import React, { createContext, useContext, useState, ReactNode, useEffect, useRef, useMemo } from 'react';
import { ToolState } from '../types';
import { PDFDocument, degrees, rgb, StandardFonts } from 'pdf-lib';

export interface HeaderFooterConfig {
  headerLeft: string;
  headerCenter: string;
  headerRight: string;
  footerLeft: string;
  footerCenter: string;
  footerRight: string;
  style: string;
  size: number;
  color: string;
  bold: boolean;
  italic: boolean;
  top: number;
  bottom: number;
  left: number;
  right: number;
  unit: string;
  dateFormat: string;
  pageNumberFormat: string;
  startPageNumber: number;
  pageRangeType: 'All' | 'Range';
  pageRangeLimit: string;
  pageRangeSubset: string;
}

export interface HeaderFooterStackItem {
  file: File;
  config: HeaderFooterConfig;
}

export interface PDFFile {
  id: string;
  file: File;
  name: string;
  size: string;
  version: number;
  pages?: PageData[];
  lastPage?: number;
  hasImages?: boolean;
  headerFooterConfig?: HeaderFooterConfig;
  fileWithoutHeaderFooter?: File;
  headerFooterStack?: HeaderFooterStackItem[];
  watermarkStack?: any[];
  watermarkConfig?: any;
  fileWithoutWatermark?: File;
  backgroundStack?: any[];
  backgroundConfig?: any;
  fileWithoutBackground?: File;
  metadata?: {
    title: string;
    subject: string;
    keywords: string;
    author: string;
    producer: string;
    version: string;
  };
}

export interface Annotation {
  id: string;
  type: 'text' | 'image' | 'highlight' | 'underline' | 'strikethrough' | 'squiggly' | 'caret' | 'textbox' | 'link';
  x: number;
  y: number;
  width?: number;
  height?: number;
  rotation?: number;
  flipH?: boolean;
  flipV?: boolean;
  points?: { x: number; y: number }[];
  content: string; // text or image dataUrl or shape name
  fontSize?: number;
  fontFamily?: string;
  backgroundColor?: string;
  color?: string;
  opacity?: number;
  strokeWidth?: number;
  strokeType?: 'solid' | 'dashed';
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  alignment?: 'left' | 'center' | 'right' | 'justify';
  lineHeight?: number;
  letterSpacing?: number;
  isOriginal?: boolean;
  isCropMode?: boolean;
  cropRect?: { top: number; right: number; bottom: number; left: number };
  originalWidth?: number;
  originalHeight?: number;
  author?: string;
  createdAt?: number;
  note?: string;
  linkConfig?: any;
  isApplied?: boolean;
}

export type ViewMode = 'single' | 'continuous' | 'grid';
export type FitMode = 'width' | 'page' | 'none';

export interface PageData {
  id: string;
  originalIndex: number;
  previewUrl?: string;
  width?: number;
  height?: number;
  rotation: number;
  annotations: Annotation[];
  textContent?: string;
  textItems?: any[];
  isDeepParsed?: boolean;
}

export interface Bookmark {
  id: string;
  page: number;
  title: string;
  createdAt: number;
}

export interface Attachment {
  id: string;
  name: string;
  size: string;
  file?: File;
  type: string;
  description?: string;
}

interface PDFContextType {
  sharedFiles: PDFFile[];
  setSharedFiles: (files: PDFFile[]) => void;
  setSharedFilesWithHistory: (files: PDFFile[] | ((prev: PDFFile[]) => PDFFile[])) => void;
  addSharedFiles: (files: File[]) => Promise<void>;
  removeSharedFile: (id: string) => void;
  clearSharedFiles: () => void;
  updateSharedFileData: (id: string, data: Partial<PDFFile>, saveToHistory?: boolean) => void;
  updateFileMetadata: (id: string, metadata: any) => void;
  // View states
  zoom: number;
  setZoom: (zoom: number | ((prev: number) => number)) => void;
  rotation: number;
  setRotation: (rotation: number | ((prev: number) => number)) => void;
  viewRotation: number;
  setViewRotation: (rotation: number | ((prev: number) => number)) => void;
  currentPage: number;
  setCurrentPage: (page: number | ((prev: number) => number)) => void;
  selectedPageIds: string[];
  setSelectedPageIds: (ids: string[] | ((prev: string[]) => string[])) => void;
  totalPages: number;
  setTotalPages: (pages: number | ((prev: number) => number)) => void;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  fitMode: FitMode;
  setFitMode: (mode: FitMode) => void;
  activeTool: 'select' | 'hand' | 'edit' | 'text' | 'image' | 'link' | 'ocr' | 'crop' | 'watermark' | 'background' | 'settings' | 'highlight' | 'underline' | 'strikethrough' | 'squiggly' | 'caret' | 'note' | 'typewriter' | 'textbox' | 'area-highlight';
  setActiveTool: (tool: 'select' | 'hand' | 'edit' | 'text' | 'image' | 'link' | 'ocr' | 'crop' | 'watermark' | 'background' | 'settings' | 'highlight' | 'underline' | 'strikethrough' | 'squiggly' | 'caret' | 'note' | 'typewriter' | 'textbox' | 'area-highlight') => void;
  activeMenu: string;
  setActiveMenu: (menu: string) => void;
  hideAnnotations: boolean;
  setHideAnnotations: (hide: boolean) => void;
  activeAppTool: ToolState;
  setActiveAppTool: (tool: ToolState) => void;
  // Sidebar states
  activeSidebarTab: string;
  setActiveSidebarTab: (tab: string) => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
  isAddingBookmark: boolean;
  setIsAddingBookmark: (isAdding: boolean) => void;
  activeFileId: string | null;
  setActiveFileId: (id: string | null) => void;
  currentFile: PDFFile | null;
  hasImages: boolean;
  setHasImages: (value: boolean | ((prev: boolean) => boolean)) => void;
  // Data states
  pages: PageData[];
  setPages: (pages: PageData[] | ((prev: PageData[]) => PageData[])) => void;
  bookmarks: Bookmark[];
  setBookmarks: (bookmarks: Bookmark[] | ((prev: Bookmark[]) => Bookmark[])) => void;
  addBookmark: (bookmark: Bookmark) => void;
  removeBookmark: (id: string) => void;
  attachments: Attachment[];
  setAttachments: React.Dispatch<React.SetStateAction<Attachment[]>>;
  addAttachment: (attachment: Attachment) => void;
  removeAttachment: (id: string) => void;
  removeAnnotation: (id: string) => void;
  removeAnnotations: (ids: string[]) => void;
  addAnnotation: (
    type: Annotation['type'],
    pageIndex: number,
    x: number,
    y: number,
    content: string,
    width?: number,
    height?: number,
    backgroundColor?: string,
    note?: string
  ) => string;
  updateAnnotation: (id: string, data: Partial<Annotation>, saveToHistory?: boolean) => void;
  selectedAnnotationIds: string[];
  setSelectedAnnotationIds: (ids: string[] | ((prev: string[]) => string[])) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchMatchCase: boolean;
  setSearchMatchCase: (matchCase: boolean) => void;
  // History
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  pushToHistory: (files: PDFFile[]) => void;
  // Page operations
  deleteSelectedPages: (targetIds?: string[]) => Promise<void>;
  rotateSelectedPages: (direction: 'left' | 'right', permanent?: boolean, targetIds?: string[]) => Promise<void>;
  splitPDF: (mode: 'fixed' | 'range', value: string) => Promise<void>;
  reorderPages: (reorderedPages: PageData[]) => void;
  applyHeaderFooter: (config: HeaderFooterConfig, mode: 'add' | 'replace') => Promise<void>;
  removeHeaderFooter: () => Promise<boolean>;
  removeWatermark: () => Promise<boolean>;
  removeBackground: () => Promise<boolean>;
}

const PDFContext = createContext<PDFContextType | undefined>(undefined);

export function PDFProvider({ children }: { children: ReactNode }) {
  const [sharedFiles, setSharedFiles] = useState<PDFFile[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [hasImages, setHasImages] = useState(false);

  // Unified history state
  const [historyState, setHistoryState] = useState<{
    items: PDFFile[][];
    index: number;
  }>({
    items: [],
    index: -1
  });

  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0); // This will be used for permanent rotation synchronization if needed
  const [viewRotation, setViewRotation] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedPageIds, setSelectedPageIds] = useState<string[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [viewMode, setViewMode] = useState<ViewMode>('continuous');
  const [fitMode, setFitMode] = useState<FitMode>('width');
  const [activeTool, setActiveTool] = useState<'select' | 'hand' | 'edit' | 'text' | 'image' | 'link' | 'ocr' | 'crop' | 'watermark' | 'background' | 'settings' | 'highlight' | 'underline' | 'strikethrough' | 'squiggly' | 'caret' | 'note' | 'typewriter' | 'textbox' | 'area-highlight'>('select');
  const [activeMenu, setActiveMenu] = useState('Home');
  const [activeAppTool, setActiveAppTool] = useState<ToolState>(ToolState.DASHBOARD);
  const [hideAnnotations, setHideAnnotations] = useState(false);
  const [activeSidebarTab, setActiveSidebarTab] = useState('Thumbnails');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAddingBookmark, setIsAddingBookmark] = useState(false);
  const [pages, setPages] = useState<PageData[]>([]);

  const currentFile = sharedFiles.find(f => f.id === activeFileId) || null;

  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [selectedAnnotationIds, setSelectedAnnotationIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMatchCase, setSearchMatchCase] = useState(false);

  const addSharedFiles = async (files: File[], activate = true) => {
    const newFiles = await Promise.all(files.map(async (file) => {
      let extractedMetadata = {
        title: file.name.replace('.pdf', ''),
        subject: 'Add a category',
        keywords: 'Add keywords',
        author: 'Add the author',
        producer: 'Vite PDF Core',
        version: '1.7'
      };

      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer, { updateMetadata: false });

        extractedMetadata = {
          title: pdfDoc.getTitle() || file.name.replace('.pdf', ''),
          subject: pdfDoc.getSubject() || 'Add a category',
          keywords: pdfDoc.getKeywords() || 'Add keywords',
          author: pdfDoc.getAuthor() || 'Add the author',
          producer: pdfDoc.getProducer() || 'Vite PDF Core',
          version: '1.7'
        };
      } catch (e) {
        console.error('Error extracting metadata:', e);
      }

      return {
        id: crypto.randomUUID(),
        file,
        name: file.name,
        size: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
        version: 1,
        metadata: extractedMetadata
      };
    }));

    const updated = [...sharedFiles, ...newFiles];
    setSharedFiles(updated);
    pushToHistory(updated);

    if (newFiles.length > 0 && activate) {
      setActiveFileId(newFiles[newFiles.length - 1].id);
    }
  };

  const pushToHistory = (files: PDFFile[]) => {
    setHistoryState(prev => {
      const nextItems = [...prev.items.slice(0, prev.index + 1)];
      const clonedFiles = files.map(f => ({
        ...f,
        pages: f.pages ? JSON.parse(JSON.stringify(f.pages)) : undefined
      }));
      nextItems.push(clonedFiles);
      if (nextItems.length > 50) nextItems.shift();
      return {
        items: nextItems,
        index: nextItems.length - 1
      };
    });
  };

  const undo = () => {
    setHistoryState(prev => {
      if (prev.index > 0) {
        const nextIndex = prev.index - 1;
        const prevFiles = prev.items[nextIndex];
        setSharedFiles(prevFiles.map(f => ({ ...f })));

        if (activeFileId) {
          const activeFileInHistory = prevFiles.find(f => f.id === activeFileId);
          if (activeFileInHistory && activeFileInHistory.pages) {
            setPages(JSON.parse(JSON.stringify(activeFileInHistory.pages)));
          }
        }
        return { ...prev, index: nextIndex };
      }
      return prev;
    });
  };

  const redo = () => {
    setHistoryState(prev => {
      if (prev.index < prev.items.length - 1) {
        const nextIndex = prev.index + 1;
        const nextFiles = prev.items[nextIndex];
        setSharedFiles(nextFiles.map(f => ({ ...f })));

        if (activeFileId) {
          const activeFileInHistory = nextFiles.find(f => f.id === activeFileId);
          if (activeFileInHistory && activeFileInHistory.pages) {
            setPages(JSON.parse(JSON.stringify(activeFileInHistory.pages)));
          }
        }
        return { ...prev, index: nextIndex };
      }
      return prev;
    });
  };

  const deleteSelectedPages = async (targetIds?: string[]) => {
    const effectiveIds = targetIds || selectedPageIds;
    if (!activeFileId || effectiveIds.length === 0) return;
    const activeFile = sharedFiles.find(f => f.id === activeFileId);
    if (!activeFile) return;

    try {
      const buffer = await activeFile.file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(buffer);

      const indicesToRemove = effectiveIds
        .map(id => pages.findIndex(p => p.id === id))
        .filter(idx => idx !== -1)
        .sort((a, b) => b - a); // Sort descending to not mess up indices

      indicesToRemove.forEach(idx => pdfDoc.removePage(idx));

      const pdfBytes = await pdfDoc.save();
      const newFile = new File([pdfBytes as any], activeFile.name, { type: 'application/pdf' });

      const newPages = pages.filter(p => !effectiveIds.includes(p.id));
      const updatedFiles = sharedFiles.map(f => f.id === activeFileId ? { ...f, file: newFile, pages: newPages } : f);

      setPages(newPages);
      setSharedFiles(updatedFiles);
      pushToHistory(updatedFiles);
      setSelectedPageIds([]);
    } catch (err) {
      console.error('Delete pages failed:', err);
    }
  };

  const rotateSelectedPages = async (direction: 'left' | 'right', permanent: boolean = false, targetIds?: string[]) => {
    if (!activeFileId) return;

    if (!permanent) {
      // View rotation only
      setViewRotation(prev => {
        const delta = direction === 'right' ? 90 : -90;
        return (prev + delta + 360) % 360;
      });
      return;
    }

    const activeFile = sharedFiles.find(f => f.id === activeFileId);
    if (!activeFile) return;

    try {
      const buffer = await activeFile.file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(buffer);
      const pdfPages = pdfDoc.getPages();

      // Determine indices to rotate
      let indices: number[] = [];
      const effectiveIds = targetIds || selectedPageIds;
      const filePages = activeFile.pages || pages;

      if (effectiveIds.length === 0) {
        indices = [currentPage - 1];
      } else {
        indices = effectiveIds.map(id => filePages.findIndex(p => p.id === id)).filter(idx => idx !== -1);
      }

      indices.forEach(idx => {
        if (idx < 0 || idx >= pdfPages.length) return;
        const page = pdfPages[idx];
        const currentRotation = page.getRotation().angle;
        const newRotation = direction === 'right' ? (currentRotation + 90) % 360 : (currentRotation - 90 + 360) % 360;
        page.setRotation(degrees(newRotation));
      });

      const pdfBytes = await pdfDoc.save();
      const newFile = new File([pdfBytes as any], activeFile.name, { type: 'application/pdf' });

      // Update local pages rotation state for immediate preview update
      const updatedPages = pages.map((page, idx) => {
        if (indices.includes(idx)) {
          const delta = direction === 'right' ? 90 : -90;
          return { ...page, rotation: (page.rotation + delta + 360) % 360 };
        }
        return page;
      });
      setPages(updatedPages);

      const updatedFiles = sharedFiles.map(f => f.id === activeFileId ? {
        ...f,
        file: newFile,
        pages: updatedPages,
        version: (f.version || 0) + 1
      } : f);
      setSharedFiles(updatedFiles);
      pushToHistory(updatedFiles);
    } catch (err) {
      console.error('Rotate pages failed:', err);
    }
  };

  const splitPDF = async (mode: 'fixed' | 'range', value: string) => {
    if (!activeFileId) return;
    const activeFile = sharedFiles.find(f => f.id === activeFileId);
    if (!activeFile) return;

    try {
      const buffer = await activeFile.file.arrayBuffer();
      const pdf = await PDFDocument.load(buffer);
      const totalCount = pdf.getPageCount();

      if (mode === 'fixed') {
        const n = parseInt(value);
        if (isNaN(n) || n <= 0) return;

        for (let i = 0; i < totalCount; i += n) {
          const newPdf = await PDFDocument.create();
          const indices = [];
          for (let j = i; j < Math.min(i + n, totalCount); j++) {
            indices.push(j);
          }
          const copiedPages = await newPdf.copyPages(pdf, indices);
          copiedPages.forEach(p => newPdf.addPage(p));

          const bytes = await newPdf.save();
          const blob = new Blob([bytes as any], { type: 'application/pdf' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${activeFile.name.replace('.pdf', '')}_part_${Math.floor(i / n) + 1}.pdf`;
          link.click();
          URL.revokeObjectURL(url);
        }
      } else {
        // Range mode: value like "1-5, 8-10"
        const parts = value.split(',').map(p => p.trim()).filter(p => p);
        for (let i = 0; i < parts.length; i++) {
          const part = parts[i];
          const indices: number[] = [];
          if (part.includes('-')) {
            const [start, end] = part.split('-').map(Number);
            if (!isNaN(start) && !isNaN(end) && start >= 1 && end <= totalCount && start <= end) {
              for (let j = start; j <= end; j++) indices.push(j - 1);
            }
          } else {
            const pageNum = parseInt(part);
            if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalCount) {
              indices.push(pageNum - 1);
            }
          }

          if (indices.length > 0) {
            const newPdf = await PDFDocument.create();
            const copiedPages = await newPdf.copyPages(pdf, indices);
            copiedPages.forEach(p => newPdf.addPage(p));
            const bytes = await newPdf.save();
            const blob = new Blob([bytes as any], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${activeFile.name.replace('.pdf', '')}_range_${i + 1}.pdf`;
            link.click();
            URL.revokeObjectURL(url);
          }
        }
      }
    } catch (err) {
      console.error('Split failed:', err);
    }
  };

  const reorderPages = (reorderedPages: PageData[]) => {
    setPages(reorderedPages);
    if (activeFileId) {
      const updatedFiles = sharedFiles.map(f =>
        f.id === activeFileId ? { ...f, pages: reorderedPages } : f
      );
      setSharedFiles(updatedFiles);
    }
  };

  const applyHeaderFooter = async (config: HeaderFooterConfig, mode: 'add' | 'replace') => {
    if (!activeFileId) return;
    const activeFile = sharedFiles.find(f => f.id === activeFileId);
    if (!activeFile) return;

    let sourceFile = activeFile.file;
    let currentStack = activeFile.headerFooterStack || [];

    if (mode === 'replace') {
      if (currentStack.length > 0) {
        sourceFile = currentStack[currentStack.length - 1].file;
      } else if (activeFile.fileWithoutHeaderFooter) {
        sourceFile = activeFile.fileWithoutHeaderFooter;
      }
    }

    try {
      const buffer = await sourceFile.arrayBuffer();
      const pdf = await PDFDocument.load(buffer);
      const totalPagesCt = pdf.getPageCount();

      // Convert unit to points
      let scale = 72;
      if (config.unit === 'Inches') scale = 72;
      if (config.unit === 'Centimeters') scale = 72 / 2.54;
      if (config.unit === 'Millimeters') scale = 72 / 25.4;
      if (config.unit === 'Points') scale = 1;

      const pTop = config.top * scale;
      const pBottom = config.bottom * scale;
      const pLeft = config.left * scale;
      const pRight = config.right * scale;

      let standardFont = StandardFonts.Helvetica;
      const fValue = config.style.toLowerCase();
      if (fValue.includes('times') || fValue.includes('cambria') || fValue.includes('georgia') || fValue.includes('garamond') || fValue.includes('palatino') || fValue.includes('book antiqua') || fValue.includes('serif')) {
        if (config.bold && config.italic) standardFont = StandardFonts.TimesRomanBoldItalic;
        else if (config.bold) standardFont = StandardFonts.TimesRomanBold;
        else if (config.italic) standardFont = StandardFonts.TimesRomanItalic;
        else standardFont = StandardFonts.TimesRoman;
      } else if (fValue.includes('courier') || fValue.includes('consolas') || fValue.includes('mono')) {
        if (config.bold && config.italic) standardFont = StandardFonts.CourierBoldOblique;
        else if (config.bold) standardFont = StandardFonts.CourierBold;
        else if (config.italic) standardFont = StandardFonts.CourierOblique;
        else standardFont = StandardFonts.Courier;
      } else {
        if (config.bold && config.italic) standardFont = StandardFonts.HelveticaBoldOblique;
        else if (config.bold) standardFont = StandardFonts.HelveticaBold;
        else if (config.italic) standardFont = StandardFonts.HelveticaOblique;
        else standardFont = StandardFonts.Helvetica;
      }

      const fontObj = await pdf.embedFont(standardFont);
      const r = parseInt(config.color.slice(1, 3), 16) / 255;
      const g = parseInt(config.color.slice(3, 5), 16) / 255;
      const b = parseInt(config.color.slice(5, 7), 16) / 255;
      const rgbColor = rgb(r, g, b);

      const processMacro = (text: string, pageNum: number) => {
        let res = text;

        let pNumStr = pageNum.toString();
        if (config.pageNumberFormat === '1 of n') pNumStr = `${pageNum} of ${totalPagesCt}`;
        else if (config.pageNumberFormat === '1/n') pNumStr = `${pageNum}/${totalPagesCt}`;
        else if (config.pageNumberFormat === 'Page 1') pNumStr = `Page ${pageNum}`;
        else if (config.pageNumberFormat === 'Page 1 of n') pNumStr = `Page ${pageNum} of ${totalPagesCt}`;
        else if (config.pageNumberFormat === 'I') pNumStr = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][Math.min(pageNum - 1, 9)] || pNumStr;
        else if (config.pageNumberFormat === 'a') pNumStr = String.fromCharCode(97 + ((pageNum - 1) % 26));

        res = res.replace(/<<Page Number>>/g, pNumStr);
        res = res.replace(/<<Total Pages>>/g, totalPagesCt.toString());

        const d = new Date();
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yy = String(d.getFullYear()).slice(-2);
        const yyyy = d.getFullYear();

        let dateStr = `${mm}/${dd}/${yyyy}`;
        if (config.dateFormat === 'm/d') dateStr = `${d.getMonth() + 1}/${d.getDate()}`;
        if (config.dateFormat === 'm/d/yyyy') dateStr = `${d.getMonth() + 1}/${d.getDate()}/${yyyy}`;
        if (config.dateFormat === 'm.d.yyyy') dateStr = `${d.getMonth() + 1}.${d.getDate()}.${yyyy}`;
        if (config.dateFormat === 'mm.dd.yyyy') dateStr = `${mm}.${dd}.${yyyy}`;
        if (config.dateFormat === 'mm.yy') dateStr = `${mm}.${yy}`;
        if (config.dateFormat === 'd.m.yyyy') dateStr = `${d.getDate()}.${d.getMonth() + 1}.${yyyy}`;
        if (config.dateFormat === 'dd.mm.yyyy') dateStr = `${dd}.${mm}.${yyyy}`;
        if (config.dateFormat === 'yy-mm-dd') dateStr = `${yy}-${mm}-${dd}`;
        if (config.dateFormat === 'yyyy-mm-dd') dateStr = `${yyyy}-${mm}-${dd}`;

        res = res.replace(/<<Date>>/g, dateStr);
        res = res.replace(/<<Time>>/g, d.toLocaleTimeString());
        res = res.replace(/<<File Name>>/g, activeFile.name);
        return res;
      };

      for (let i = 0; i < totalPagesCt; i++) {
        const isEve = (i + 1) % 2 === 0;
        if (config.pageRangeType === 'Range') {
          let inRange = false;
          const ranges = config.pageRangeLimit.split(',');
          for (const r of ranges) {
            const parts = r.trim().split('-');
            if (parts.length === 2 && !isNaN(Number(parts[0])) && !isNaN(Number(parts[1]))) {
              if (i + 1 >= Number(parts[0]) && i + 1 <= Number(parts[1])) inRange = true;
            } else if (!isNaN(Number(parts[0])) && i + 1 === Number(parts[0])) {
              inRange = true;
            }
          }
          if (!inRange) continue;
        }

        if (config.pageRangeSubset === 'Even pages only' && !isEve) continue;
        if (config.pageRangeSubset === 'Odd pages only' && isEve) continue;

        const page = pdf.getPage(i);
        const { width, height } = page.getSize();

        const drawTextOpts = (text: string, pos: string, isHeader: boolean) => {
          if (!text) return;
          const finalStr = processMacro(text, i + Number(config.startPageNumber));
          const w = fontObj.widthOfTextAtSize(finalStr, config.size);
          let x = pLeft;
          if (pos === 'center') x = (width - w) / 2;
          if (pos === 'right') x = width - pRight - w;
          let y = isHeader ? height - pTop - config.size : pBottom;
          page.drawText(finalStr, { x, y, size: config.size, font: fontObj, color: rgbColor });
        };

        drawTextOpts(config.headerLeft, 'left', true);
        drawTextOpts(config.headerCenter, 'center', true);
        drawTextOpts(config.headerRight, 'right', true);
        drawTextOpts(config.footerLeft, 'left', false);
        drawTextOpts(config.footerCenter, 'center', false);
        drawTextOpts(config.footerRight, 'right', false);
      }

      const pdfBytes = await pdf.save();
      const newFile = new File([pdfBytes as any], activeFile.name, { type: 'application/pdf' });

      let newStack = [...currentStack];
      if (mode === 'add') {
        newStack.push({ file: activeFile.file, config });
      } else {
        if (newStack.length > 0) {
          newStack[newStack.length - 1].config = config;
        } else {
          newStack.push({ file: activeFile.file, config });
        }
      }

      const updatedFile = {
        ...activeFile,
        file: newFile,
        size: (newFile.size / 1024 / 1024).toFixed(2) + ' MB',
        version: activeFile.version ? activeFile.version + 1 : 1,
        pages: undefined, // force re-render
        headerFooterConfig: config,
        fileWithoutHeaderFooter: newStack[0].file,
        headerFooterStack: newStack
      };

      const updatedFiles = sharedFiles.map(f => f.id === activeFileId ? updatedFile : f);
      setSharedFiles(updatedFiles);
      pushToHistory(updatedFiles);

    } catch (err) {
      console.error('HeaderFooter failed:', err);
    }
  };

  const removeHeaderFooter = async () => {
    if (!activeFileId) return false;
    const activeFile = sharedFiles.find(f => f.id === activeFileId);
    if (!activeFile) return false;

    const currentStack = activeFile.headerFooterStack || [];
    if (currentStack.length === 0 && !activeFile.fileWithoutHeaderFooter) return false;

    let revertedFile: File;
    let newStack: HeaderFooterStackItem[] = [];
    let newConfig: HeaderFooterConfig | undefined = undefined;

    if (currentStack.length > 0) {
      newStack = [...currentStack];
      const items = newStack.pop();
      revertedFile = items!.file;
      if (newStack.length > 0) {
        newConfig = newStack[newStack.length - 1].config;
      }
    } else {
      revertedFile = activeFile.fileWithoutHeaderFooter!;
    }

    const updatedFile = {
      ...activeFile,
      file: revertedFile,
      size: (revertedFile.size / 1024 / 1024).toFixed(2) + ' MB',
      version: activeFile.version ? activeFile.version + 1 : 1,
      pages: undefined,
      headerFooterConfig: newConfig,
      fileWithoutHeaderFooter: newStack.length > 0 ? newStack[0].file : undefined,
      headerFooterStack: newStack.length > 0 ? newStack : undefined
    };

    const updatedFiles = sharedFiles.map(f => f.id === activeFileId ? updatedFile : f);
    setSharedFiles(updatedFiles);
    pushToHistory(updatedFiles);
    return true;
  };

  const removeWatermark = async () => {
    if (!activeFileId) return false;
    const activeFile = sharedFiles.find(f => f.id === activeFileId);
    if (!activeFile) return false;

    if (!activeFile.fileWithoutWatermark) return false;

    const revertedFile = activeFile.fileWithoutWatermark;

    const updatedFile = {
      ...activeFile,
      file: revertedFile,
      size: (revertedFile.size / 1024 / 1024).toFixed(2) + ' MB',
      version: activeFile.version ? activeFile.version + 1 : 1,
      pages: undefined,
      fileWithoutWatermark: undefined,
      watermarkStack: undefined,
      watermarkConfig: undefined
    };

    const updatedFiles = sharedFiles.map(f => f.id === activeFileId ? updatedFile : f);
    setSharedFiles(updatedFiles);
    pushToHistory(updatedFiles);
    return true;
  };

  const removeBackground = async () => {
    if (!activeFileId) return false;
    const activeFile = sharedFiles.find(f => f.id === activeFileId);
    if (!activeFile) return false;

    if (!activeFile.fileWithoutBackground) return false;

    const revertedFile = activeFile.fileWithoutBackground;

    const updatedFile = {
      ...activeFile,
      file: revertedFile,
      size: (revertedFile.size / 1024 / 1024).toFixed(2) + ' MB',
      version: activeFile.version ? activeFile.version + 1 : 1,
      pages: undefined,
      fileWithoutBackground: undefined,
      backgroundStack: undefined,
      backgroundConfig: undefined
    };

    const updatedFiles = sharedFiles.map(f => f.id === activeFileId ? updatedFile : f);
    setSharedFiles(updatedFiles);
    pushToHistory(updatedFiles);
    return true;
  };

  const setSharedFilesWithHistory = (next: PDFFile[] | ((prev: PDFFile[]) => PDFFile[])) => {
    const updated = typeof next === 'function' ? next(sharedFiles) : next;
    setSharedFiles(updated);
    pushToHistory(updated);
  };

  const removeSharedFile = (id: string) => {
    setSharedFiles(prev => {
      const updated = prev.filter(f => f.id !== id);
      if (activeFileId === id) {
        setActiveFileId(updated.length > 0 ? updated[0].id : null);
      }
      pushToHistory(updated);
      return updated;
    });
  };

  const clearSharedFiles = () => {
    setSharedFiles([]);
    setHistoryState({ items: [], index: -1 });
  };

  const addBookmark = (bookmark: Bookmark) => {
    setBookmarks(prev => [...prev, bookmark]);
  };

  const removeBookmark = (id: string) => {
    setBookmarks(prev => prev.filter(b => b.id !== id));
  };

  const addAttachment = (attachment: Attachment) => {
    setAttachments(prev => [...prev, attachment]);
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const addAnnotation = (
    type: Annotation['type'],
    pageIndex: number,
    x: number,
    y: number,
    content: string,
    width?: number,
    height?: number,
    backgroundColor?: string,
    note?: string
  ) => {
    const newAnn: Annotation = {
      id: crypto.randomUUID(),
      type,
      x,
      y,
      width: width || (['highlight', 'underline', 'strikethrough', 'squiggly'].includes(type) ? 20 : (type === 'caret' ? 3 : 25)),
      height: height || (['highlight', 'underline', 'strikethrough', 'squiggly'].includes(type) ? 4 : (type === 'caret' ? 3 : 8)),
      content,
      createdAt: Date.now(),
      author: 'User',
      fontSize: type === 'textbox' ? 12 : undefined,
      fontFamily: type === 'textbox' ? 'sans-serif' : undefined,
      color: type === 'textbox' ? '#000000' : (type === 'highlight' ? '#FFEB3B' : (type === 'caret' ? '#F44336' : (type === 'strikethrough' ? '#E91E63' : (type === 'text' ? '#1E293B' : '#000000')))),
      opacity: type === 'highlight' ? 0.3 : 1,
      backgroundColor,
      note
    };

    setPages(prevPages => {
      const updatedPages = prevPages.map((page, idx) => {
        if (idx === pageIndex) {
          return {
            ...page,
            annotations: [...page.annotations, newAnn]
          };
        }
        return page;
      });

      if (activeFileId) {
        setSharedFiles(prevFiles => {
          const updatedFiles = prevFiles.map(f =>
            f.id === activeFileId ? { ...f, pages: updatedPages } : f
          );
          pushToHistory(updatedFiles);
          return updatedFiles;
        });
      }
      return updatedPages;
    });
    return newAnn.id;
  };

  const removeAnnotation = (id: string) => {
    removeAnnotations([id]);
  };

  const removeAnnotations = (ids: string[]) => {
    setPages(prevPages => {
      const updatedPages = prevPages.map(page => ({
        ...page,
        annotations: page.annotations.filter(ann => !ids.includes(ann.id))
      }));

      const anyRemoved = prevPages.some(p => {
        const up = updatedPages.find(u => u.id === p.id);
        return up && p.annotations.length !== up.annotations.length;
      });

      if (anyRemoved && activeFileId) {
        setSharedFiles(prevFiles => {
          const updatedFiles = prevFiles.map(f =>
            f.id === activeFileId ? { ...f, pages: updatedPages } : f
          );
          pushToHistory(updatedFiles);
          return updatedFiles;
        });
      }

      return updatedPages;
    });
  };

  const updateAnnotation = (id: string, data: Partial<Annotation>, saveToHistory: boolean = true) => {
    setPages(prevPages => {
      const updatedPages = prevPages.map(page => ({
        ...page,
        annotations: page.annotations.map(ann => ann.id === id ? { ...ann, ...data } : ann)
      }));

      if (activeFileId) {
        setSharedFiles(prevFiles => {
          const updatedFiles = prevFiles.map(f =>
            f.id === activeFileId ? { ...f, pages: updatedPages } : f
          );
          if (saveToHistory) {
            pushToHistory(updatedFiles);
          }
          return updatedFiles;
        });
      }
      return updatedPages;
    });
  };

  const updateSharedFileData = (id: string, data: Partial<PDFFile>, saveToHistory: boolean = false) => {
    setSharedFiles(prev => {
      const updated = prev.map(f => f.id === id ? { ...f, ...data } : f);
      if (saveToHistory) pushToHistory(updated);
      return updated;
    });
  };

  const updateFileMetadata = (id: string, metadata: any) => {
    setSharedFiles(prev => {
      const updated = prev.map(f =>
        f.id === id ? { ...f, metadata: { ...f.metadata, ...metadata } } : f
      );
      pushToHistory(updated);
      return updated;
    });
  };

  return (
    <PDFContext.Provider value={{
      sharedFiles,
      setSharedFiles,
      setSharedFilesWithHistory,
      addSharedFiles,
      removeSharedFile,
      clearSharedFiles,
      updateSharedFileData,
      updateFileMetadata,
      activeFileId,
      setActiveFileId,
      currentFile,
      hasImages,
      setHasImages,
      zoom,
      setZoom,
      rotation,
      setRotation,
      viewRotation,
      setViewRotation,
      currentPage,
      setCurrentPage,
      selectedPageIds,
      setSelectedPageIds,
      totalPages,
      setTotalPages,
      viewMode,
      setViewMode,
      fitMode,
      setFitMode,
      activeTool,
      setActiveTool,
      activeMenu,
      setActiveMenu,
      hideAnnotations,
      setHideAnnotations,
      activeAppTool,
      setActiveAppTool,
      activeSidebarTab,
      setActiveSidebarTab,
      isSidebarOpen,
      setIsSidebarOpen,
      isAddingBookmark,
      setIsAddingBookmark,
      pages,
      setPages,
      bookmarks,
      setBookmarks,
      addBookmark,
      removeBookmark,
      attachments,
      setAttachments,
      addAttachment,
      removeAttachment,
      removeAnnotation,
      removeAnnotations,
      updateAnnotation,
      addAnnotation,
      selectedAnnotationIds,
      setSelectedAnnotationIds,
      searchQuery,
      setSearchQuery,
      searchMatchCase,
      setSearchMatchCase,
      undo,
      redo,
      canUndo: historyState.index > 0,
      canRedo: historyState.index < historyState.items.length - 1,
      pushToHistory,
      deleteSelectedPages,
      rotateSelectedPages,
      splitPDF,
      reorderPages,
      applyHeaderFooter,
      removeHeaderFooter,
      removeWatermark,
      removeBackground
    }}>
      {children}
    </PDFContext.Provider>
  );
}

export function usePDF() {
  const context = useContext(PDFContext);
  if (context === undefined) {
    throw new Error('usePDF must be used within a PDFProvider');
  }
  return context;
}
