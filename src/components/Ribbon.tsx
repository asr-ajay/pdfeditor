import React, { useState, useRef, useEffect } from 'react';
import {
  MousePointer2,
  Hand,
  Edit3,
  FilePlus,
  Camera,
  FileStack,
  Minus,
  Plus,
  Maximize2,
  Layout,
  LayoutGrid,
  Columns,
  RotateCw,
  RotateCcw,
  Save,
  Zap,
  Download,
  Printer,
  Settings,
  Info,
  FolderOpen,
  ChevronUp,
  ChevronDown,
  FileText,
  FileSpreadsheet,
  Presentation,
  MoreHorizontal,
  Search,
  ChevronLeft,
  ChevronRight,
  Maximize,
  Monitor,
  Move,
  Type as TypeIcon,
  Scaling,
  Bookmark as BookmarkIcon,
  Highlighter,
  Underline,
  Strikethrough,
  Baseline,
  ChevronDownSquare,
  MoveRight,
  MessageSquareText,
  Type,
  BookText,
  SquareDashed,
  Paperclip,
  EyeOff,
  Image,
  Link2,
  ScanSearch,
  Crop,
  Layers,
  PaintBucket,
  TextQuote,
  Scissors,
  FileUp,
  FileDown,
  SeparatorHorizontal,
  Replace,
  FileDigit,
  Trash2,
  Check,
  StretchHorizontal,
  X,
  FileSearch,
  FileCheck
} from 'lucide-react';
import { cn } from '../lib/utils';
import { usePDF } from '../contexts/PDFContext';
import { ToolState } from '../types';
import CombineFilesModal from './CombineFilesModal';
import FilePropertiesModal from './FilePropertiesModal';
import ExtractPagesModal from './ExtractPagesModal';
import CompressPDFModal from './CompressPDFModal';
import InsertBlankPageModal from './InsertBlankPageModal';
import InsertFromFileModal from './InsertFromFileModal';
import ReplacePagesModal from './ReplacePagesModal';
import SetPageBoxModal from './SetPageBoxModal';
import CropModal from './CropModal';
import SplitDialog from './PDFTools/SplitDialog';
import HeaderFooterModal from './HeaderFooterModal';
import WatermarkModal from './WatermarkModal';
import BackgroundModal from './BackgroundModal';
import { PDFDocument } from 'pdf-lib';

interface RibbonProps {
  activeMenu: string;
  onBrowse: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function Ribbon({ activeMenu, onBrowse }: RibbonProps) {
  const {
    addSharedFiles,
    sharedFiles,
    zoom, setZoom,
    rotation, setRotation,
    currentPage, setCurrentPage,
    totalPages,
    viewMode, setViewMode,
    fitMode, setFitMode,
    activeTool, setActiveTool,
    hideAnnotations, setHideAnnotations,
    activeFileId,
    activeAppTool,
    setActiveAppTool,
    hasImages,
    pages,
    setActiveSidebarTab,
    setIsSidebarOpen,
    isAddingBookmark,
    setIsAddingBookmark,
    addBookmark,
    addAttachment,
    updateFileMetadata,
    updateSharedFileData,
    selectedPageIds,
    setSelectedPageIds,
    undo,
    redo,
    canUndo,
    canRedo,
    deleteSelectedPages,
    rotateSelectedPages,
    applyHeaderFooter,
    removeHeaderFooter,
    removeWatermark,
    removeBackground,
  } = usePDF();

  const [headerFooterMode, setHeaderFooterMode] = useState<'add' | 'replace'>('add');
  const [headerFooterDialog, setHeaderFooterDialog] = useState<null | 'confirmNew' | 'confirmUpdate' | 'noHeaderFind'>(null);

  const [isOpenCombineModal, setIsOpenCombineModal] = useState(false);
  const [isOpenPropertiesModal, setIsOpenPropertiesModal] = useState(false);
  const [isOpenExtractModal, setIsOpenExtractModal] = useState(false);
  const [isOpenInsertBlankModal, setIsOpenInsertBlankModal] = useState(false);
  const [isOpenInsertFileModal, setIsOpenInsertFileModal] = useState(false);
  const [isOpenReplaceModal, setIsOpenReplaceModal] = useState(false);
  const [isOpenSetPageBoxModal, setIsOpenSetPageBoxModal] = useState(false);
  const [isOpenCropModal, setIsOpenCropModal] = useState(false);
  const [isOpenSplitModal, setIsOpenSplitModal] = useState(false);
  const [isOpenCompressModal, setIsOpenCompressModal] = useState(false);
  const [isInsertDropdownOpen, setIsInsertDropdownOpen] = useState(false);
  const insertDropdownRef = useRef<HTMLDivElement>(null);
  const insertDropdownRef2 = useRef<HTMLDivElement>(null);
  const selectionDropdownRef = useRef<HTMLDivElement>(null);

  const [selectionRange, setSelectionRange] = useState('');
  const [isSelectionDropdownOpen, setIsSelectionDropdownOpen] = useState(false);

  const [isHeaderFooterDropdownOpen, setIsHeaderFooterDropdownOpen] = useState(false);
  const [isOpenHeaderFooterModal, setIsOpenHeaderFooterModal] = useState(false);
  const headerFooterDropdownRef = useRef<HTMLDivElement>(null);

  const [watermarkMode, setWatermarkMode] = useState<'add' | 'replace'>('add');
  const [watermarkDialog, setWatermarkDialog] = useState<null | 'confirmNew' | 'confirmUpdate' | 'noWatermarkFind'>(null);
  const [isWatermarkDropdownOpen, setIsWatermarkDropdownOpen] = useState(false);
  const [isOpenWatermarkModal, setIsOpenWatermarkModal] = useState(false);
  const watermarkDropdownRef = useRef<HTMLDivElement>(null);

  const [isLinkDropdownOpen, setIsLinkDropdownOpen] = useState(false);
  const linkDropdownRef = useRef<HTMLDivElement>(null);

  const [backgroundMode, setBackgroundMode] = useState<'add' | 'replace'>('add');
  const [backgroundDialog, setBackgroundDialog] = useState<null | 'confirmNew' | 'confirmUpdate' | 'noBackgroundFind'>(null);
  const [isBackgroundDropdownOpen, setIsBackgroundDropdownOpen] = useState(false);
  const [isOpenBackgroundModal, setIsOpenBackgroundModal] = useState(false);
  const backgroundDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (insertDropdownRef.current && !insertDropdownRef.current.contains(event.target as Node)) {
        setIsInsertDropdownOpen(false);
      }
      if (insertDropdownRef2.current && !insertDropdownRef2.current.contains(event.target as Node)) {
        setIsInsertDropdownOpen(false);
      }
      if (selectionDropdownRef.current && !selectionDropdownRef.current.contains(event.target as Node)) {
        setIsSelectionDropdownOpen(false);
      }
      if (headerFooterDropdownRef.current && !headerFooterDropdownRef.current.contains(event.target as Node)) {
        setIsHeaderFooterDropdownOpen(false);
      }
      if (linkDropdownRef.current && !linkDropdownRef.current.contains(event.target as Node)) {
        setIsLinkDropdownOpen(false);
      }
      if (watermarkDropdownRef.current && !watermarkDropdownRef.current.contains(event.target as Node)) {
        setIsWatermarkDropdownOpen(false);
      }
      if (backgroundDropdownRef.current && !backgroundDropdownRef.current.contains(event.target as Node)) {
        setIsBackgroundDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleSave = () => {
      const activeFile = sharedFiles.find(f => f.id === activeFileId);
      if (activeFile) {
        const url = URL.createObjectURL(activeFile.file);
        const link = document.createElement('a');
        link.href = url;
        link.download = activeFile.name;
        link.click();
        URL.revokeObjectURL(url);
      }
    };

    const handlePrintEvent = () => {
      const activeFile = sharedFiles.find(f => f.id === activeFileId);
      if (activeFile) {
        const url = URL.createObjectURL(activeFile.file);
        const printWindow = window.open(url, '_blank');
        if (printWindow) {
          printWindow.addEventListener('load', () => {
            printWindow.print();
          }, true);
        }
      }
    };

    const handlePropertiesEvent = () => {
      if (activeFileId) {
        setIsOpenPropertiesModal(true);
      } else {
        alert('Please open a PDF file to view properties.');
      }
    };

    const handleCombineEvent = () => setIsOpenCombineModal(true);
    const handleSplitEvent = () => setIsOpenSplitModal(true);
    const handleExtractEvent = () => setIsOpenExtractModal(true);
    const handleCompressEvent = () => setIsOpenCompressModal(true);
    const handleWatermarkEvent = () => setIsOpenWatermarkModal(true);
    const handleBackgroundEvent = () => setIsOpenBackgroundModal(true);
    const handleHeaderFooterEvent = () => setIsOpenHeaderFooterModal(true);
    const handleCropEvent = () => setIsOpenCropModal(true);
    const handleSetPageBoxEvent = () => setIsOpenSetPageBoxModal(true);
    const handleInsertBlankEvent = () => setIsOpenInsertBlankModal(true);
    const handleInsertFromFileEvent = () => setIsOpenInsertFileModal(true);
    const handleReplaceEvent = () => setIsOpenReplaceModal(true);
    const handleSetActiveToolEvent = (e: any) => {
      if (e.detail && e.detail.tool) {
        setActiveTool(e.detail.tool);
      }
    };
    const handleAddBookmarkEvent = () => handleAddBookmark();
    const handleAddAttachmentEvent = () => handleAddAttachment();
    const handleRotateLeftEvent = () => rotateSelectedPages('left', true);
    const handleRotateRightEvent = () => rotateSelectedPages('right', true);
    const handleDeletePagesEvent = () => deleteSelectedPages();
    const handleUpdateWatermarkEvent = () => handleUpdateWatermark();
    const handleRemoveWatermarkEvent = () => handleRemoveWatermark();
    const handleUpdateBackgroundEvent = () => handleUpdateBackground();
    const handleRemoveBackgroundEvent = () => handleRemoveBackground();
    const handleUpdateHeaderFooterEvent = () => handleUpdateHeaderFooter();
    const handleRemoveHeaderFooterEvent = () => handleRemoveHeaderFooter();

    window.addEventListener('ribbon-properties', handlePropertiesEvent);
    window.addEventListener('open-combine-modal', handleCombineEvent);
    window.addEventListener('open-split-modal', handleSplitEvent);
    window.addEventListener('open-extract-modal', handleExtractEvent);
    window.addEventListener('open-compress-modal', handleCompressEvent);
    window.addEventListener('open-watermark-modal', handleWatermarkEvent);
    window.addEventListener('open-background-modal', handleBackgroundEvent);
    window.addEventListener('open-header-footer-modal', handleHeaderFooterEvent);
    window.addEventListener('open-crop-modal', handleCropEvent);
    window.addEventListener('open-set-page-box-modal', handleSetPageBoxEvent);
    window.addEventListener('open-insert-blank-modal', handleInsertBlankEvent);
    window.addEventListener('open-insert-from-file-modal', handleInsertFromFileEvent);
    window.addEventListener('open-replace-modal', handleReplaceEvent);
    window.addEventListener('set-active-tool', handleSetActiveToolEvent);
    window.addEventListener('ribbon-add-bookmark', handleAddBookmarkEvent);
    window.addEventListener('ribbon-add-attachment', handleAddAttachmentEvent);
    window.addEventListener('ribbon-rotate-left', handleRotateLeftEvent);
    window.addEventListener('ribbon-rotate-right', handleRotateRightEvent);
    window.addEventListener('ribbon-delete-pages', handleDeletePagesEvent);
    window.addEventListener('ribbon-update-watermark', handleUpdateWatermarkEvent);
    window.addEventListener('ribbon-remove-watermark', handleRemoveWatermarkEvent);
    window.addEventListener('ribbon-update-background', handleUpdateBackgroundEvent);
    window.addEventListener('ribbon-remove-background', handleRemoveBackgroundEvent);
    window.addEventListener('ribbon-update-header-footer', handleUpdateHeaderFooterEvent);
    window.addEventListener('ribbon-remove-header-footer', handleRemoveHeaderFooterEvent);

    return () => {
      window.removeEventListener('ribbon-properties', handlePropertiesEvent);
      window.removeEventListener('open-combine-modal', handleCombineEvent);
      window.removeEventListener('open-split-modal', handleSplitEvent);
      window.removeEventListener('open-extract-modal', handleExtractEvent);
      window.removeEventListener('open-compress-modal', handleCompressEvent);
      window.removeEventListener('open-watermark-modal', handleWatermarkEvent);
      window.removeEventListener('open-background-modal', handleBackgroundEvent);
      window.removeEventListener('open-header-footer-modal', handleHeaderFooterEvent);
      window.removeEventListener('open-crop-modal', handleCropEvent);
      window.removeEventListener('open-set-page-box-modal', handleSetPageBoxEvent);
      window.removeEventListener('open-insert-blank-modal', handleInsertBlankEvent);
      window.removeEventListener('open-insert-from-file-modal', handleInsertFromFileEvent);
      window.removeEventListener('open-replace-modal', handleReplaceEvent);
      window.removeEventListener('set-active-tool', handleSetActiveToolEvent);
      window.removeEventListener('ribbon-add-bookmark', handleAddBookmarkEvent);
      window.removeEventListener('ribbon-add-attachment', handleAddAttachmentEvent);
      window.removeEventListener('ribbon-rotate-left', handleRotateLeftEvent);
      window.removeEventListener('ribbon-rotate-right', handleRotateRightEvent);
      window.removeEventListener('ribbon-delete-pages', handleDeletePagesEvent);
      window.removeEventListener('ribbon-update-watermark', handleUpdateWatermarkEvent);
      window.removeEventListener('ribbon-remove-watermark', handleRemoveWatermarkEvent);
      window.removeEventListener('ribbon-update-background', handleUpdateBackgroundEvent);
      window.removeEventListener('ribbon-remove-background', handleRemoveBackgroundEvent);
      window.removeEventListener('ribbon-update-header-footer', handleUpdateHeaderFooterEvent);
      window.removeEventListener('ribbon-remove-header-footer', handleRemoveHeaderFooterEvent);
    };
  }, [sharedFiles, activeFileId, pages]);

  const parseRange = (rangeText: string, total: number): number[] => {
    const result: number[] = [];
    const parts = rangeText.split(',').map(p => p.trim()).filter(p => p);

    for (const part of parts) {
      if (part.includes('-')) {
        const [start, end] = part.split('-').map(Number);
        if (!isNaN(start) && !isNaN(end) && start >= 1 && end <= total && start <= end) {
          for (let j = start; j <= end; j++) result.push(j);
        }
      } else {
        const pageNum = parseInt(part);
        if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= total) {
          result.push(pageNum);
        }
      }
    }
    return [...new Set(result)].sort((a, b) => a - b);
  };

  const handleSelection = (type: 'even' | 'odd' | 'all') => {
    if (!pages.length) return;

    let targetIndices: number[] = [];
    if (type === 'even') {
      targetIndices = pages.map((_, i) => i + 1).filter(n => n % 2 === 0);
    } else if (type === 'odd') {
      targetIndices = pages.map((_, i) => i + 1).filter(n => n % 2 !== 0);
    } else if (type === 'all') {
      targetIndices = pages.map((_, i) => i + 1);
    }

    const ids = targetIndices.map(idx => pages[idx - 1]?.id).filter(id => id);
    setSelectedPageIds(ids);
    if (targetIndices.length > 0) {
      setCurrentPage(targetIndices[0]);
    }
    setSelectionRange(targetIndices.join(', '));
    setIsSelectionDropdownOpen(false);
  };

  const handleRangeChange = (value: string) => {
    setSelectionRange(value);
    const indices = parseRange(value, totalPages);
    const ids = indices.map(idx => pages[idx - 1]?.id).filter(id => id);
    setSelectedPageIds(ids);
    if (indices.length > 0) {
      setCurrentPage(indices[0]);
    }
  };

  const handleCombine = (mergedFile: File) => {
    addSharedFiles([mergedFile]);
  };

  const handleAddBookmark = () => {
    setActiveSidebarTab('Bookmarks');
    setIsSidebarOpen(true);
    setIsAddingBookmark(true);
  };

  const handleAddAttachment = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        addAttachment({
          id: Math.random().toString(36).substring(7),
          name: file.name,
          size: (file.size / 1024).toFixed(1) + ' KB',
          file,
          type: file.type
        });
        setActiveSidebarTab('Attachments');
        setIsSidebarOpen(true);
      }
    };
    input.click();
  };

  const handleZoom = (delta: number) => {
    setZoom(Math.max(10, Math.min(6400, zoom + delta)));
    setFitMode('none');
  };

  const handleRotate = (delta: number) => {
    setRotation((rotation + delta + 360) % 360);
  };

  const [pageInput, setPageInput] = useState(currentPage.toString());

  useEffect(() => {
    setPageInput(currentPage.toString());
  }, [currentPage]);

  const handlePageInputBlur = () => {
    const val = parseInt(pageInput);
    if (!isNaN(val) && val >= 1 && val <= totalPages) {
      setCurrentPage(val);
    } else {
      setPageInput(currentPage.toString());
    }
  };

  const handlePageInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handlePageInputBlur();
      (e.target as HTMLInputElement).blur();
    }
  };

  const navigatePage = (delta: number) => {
    const newPage = Math.max(1, Math.min(totalPages, currentPage + delta));
    setCurrentPage(newPage);
  };

  const handleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const zoomLevels = [10, 25, 50, 75, 100, 125, 150, 200, 400, 800, 1600, 2400, 3200, 6400];
  const [isZoomMenuOpen, setIsZoomMenuOpen] = useState(false);
  const zoomMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (zoomMenuRef.current && !zoomMenuRef.current.contains(event.target as Node)) {
        setIsZoomMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const ZoomDropdown = () => (
    <div className="relative" ref={zoomMenuRef}>
      <div
        onClick={() => setIsZoomMenuOpen(!isZoomMenuOpen)}
        className={cn(
          "mx-2 flex items-center gap-1 cursor-pointer bg-white px-2 py-0.5 border h-7 min-w-[65px] justify-between transition-colors",
          isZoomMenuOpen ? "border-blue-500 shadow-[0_0_0_1px_rgba(59,130,246,0.5)]" : "border-slate-300 hover:border-slate-400"
        )}
      >
        <input
          type="text"
          value={`${zoom}%`}
          onChange={(e) => {
            const val = parseInt(e.target.value.replace('%', ''));
            if (!isNaN(val)) {
              setZoom(Math.max(10, Math.min(6400, val)));
              setFitMode('none');
            }
          }}
          onClick={(e) => e.stopPropagation()}
          className="text-[10px] font-medium text-slate-700 bg-transparent w-full outline-none text-center"
        />
        <ChevronDown className={cn("w-3 h-3 transition-colors", isZoomMenuOpen ? "text-blue-600" : "text-slate-400")} />
      </div>

      {isZoomMenuOpen && (
        <div className="absolute top-full left-2 mt-[1px] w-32 bg-white border border-slate-300 shadow-xl z-[9999] py-0.5 overflow-hidden flex flex-col">
          <div className="max-h-[400px] overflow-y-auto no-scrollbar">
            {zoomLevels.map((level) => (
              <button
                key={level}
                onClick={() => {
                  setZoom(level);
                  setFitMode('none');
                  setIsZoomMenuOpen(false);
                }}
                className="w-full flex items-stretch hover:bg-slate-100 transition-colors text-left group h-7"
              >
                {/* Checkmark area with gray background */}
                <div className="w-8 flex items-center justify-center bg-slate-50 border-r border-slate-100 group-hover:bg-slate-100/50">
                  {zoom === level && (
                    <div className="w-5 h-5 bg-blue-100 border border-blue-300 flex items-center justify-center rounded-sm">
                      <Check className="w-3.5 h-3.5 text-blue-800" />
                    </div>
                  )}
                </div>
                {/* Text area */}
                <div className="flex-1 flex items-center pl-4">
                  <span className={cn(
                    "text-[11px] transition-colors",
                    zoom === level ? "text-blue-800 font-bold" : "text-slate-700 font-medium"
                  )}>
                    {level}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const handleNewHeaderFooter = () => {
    setIsHeaderFooterDropdownOpen(false);
    const activeFile = sharedFiles.find(f => f.id === activeFileId);
    const hasHF = !!activeFile?.fileWithoutHeaderFooter || (!!activeFile?.headerFooterStack && activeFile.headerFooterStack.length > 0);
    if (hasHF) {
      setHeaderFooterDialog('confirmNew');
    } else {
      setHeaderFooterMode('add');
      setIsOpenHeaderFooterModal(true);
    }
  };

  const handleUpdateHeaderFooter = () => {
    setIsHeaderFooterDropdownOpen(false);
    const activeFile = sharedFiles.find(f => f.id === activeFileId);
    const hasHF = !!activeFile?.fileWithoutHeaderFooter || (!!activeFile?.headerFooterStack && activeFile.headerFooterStack.length > 0);
    if (hasHF) {
      setHeaderFooterMode('replace');
      setIsOpenHeaderFooterModal(true);
    } else {
      setHeaderFooterDialog('confirmUpdate');
    }
  };

  const handleRemoveHeaderFooter = async () => {
    setIsHeaderFooterDropdownOpen(false);
    const activeFile = sharedFiles.find(f => f.id === activeFileId);
    const hasHF = !!activeFile?.fileWithoutHeaderFooter || (!!activeFile?.headerFooterStack && activeFile.headerFooterStack.length > 0);
    if (!hasHF) {
      setHeaderFooterDialog('noHeaderFind');
    } else {
      await removeHeaderFooter();
    }
  };

  const handleNewWatermark = () => {
    setIsWatermarkDropdownOpen(false);
    const activeFile = sharedFiles.find(f => f.id === activeFileId);
    const hasHF = !!activeFile?.fileWithoutWatermark || (!!activeFile?.watermarkStack && activeFile.watermarkStack.length > 0);
    if (hasHF) {
      setWatermarkDialog('confirmNew');
    } else {
      setWatermarkMode('add');
      setIsOpenWatermarkModal(true);
    }
  };

  const handleUpdateWatermark = () => {
    setIsWatermarkDropdownOpen(false);
    const activeFile = sharedFiles.find(f => f.id === activeFileId);
    const hasHF = !!activeFile?.fileWithoutWatermark || (!!activeFile?.watermarkStack && activeFile.watermarkStack.length > 0);
    if (hasHF) {
      setWatermarkMode('replace');
      setIsOpenWatermarkModal(true);
    } else {
      setWatermarkDialog('confirmUpdate');
    }
  };

  const handleRemoveWatermark = async () => {
    setIsWatermarkDropdownOpen(false);
    const activeFile = sharedFiles.find(f => f.id === activeFileId);
    if (!activeFile) return;
    const hasHF = !!activeFile.fileWithoutWatermark || (!!activeFile.watermarkStack && activeFile.watermarkStack.length > 0);
    if (!hasHF) {
      setWatermarkDialog('noWatermarkFind');
    } else {
      await removeWatermark();
      setWatermarkDialog(null);
    }
  };

  const handleNewBackground = () => {
    setIsBackgroundDropdownOpen(false);
    const activeFile = sharedFiles.find(f => f.id === activeFileId);
    const hasBg = !!activeFile?.fileWithoutBackground || (!!activeFile?.backgroundStack && activeFile.backgroundStack.length > 0);
    if (hasBg) {
      setBackgroundDialog('confirmNew');
    } else {
      setBackgroundMode('add');
      setIsOpenBackgroundModal(true);
    }
  };

  const handleUpdateBackground = () => {
    setIsBackgroundDropdownOpen(false);
    const activeFile = sharedFiles.find(f => f.id === activeFileId);
    const hasBg = !!activeFile?.fileWithoutBackground || (!!activeFile?.backgroundStack && activeFile.backgroundStack.length > 0);
    if (hasBg) {
      setBackgroundMode('replace');
      setIsOpenBackgroundModal(true);
    } else {
      setBackgroundDialog('confirmUpdate');
    }
  };

  const handleRemoveBackground = async () => {
    setIsBackgroundDropdownOpen(false);
    const activeFile = sharedFiles.find(f => f.id === activeFileId);
    if (!activeFile) return;
    const hasBg = !!activeFile.fileWithoutBackground || (!!activeFile.backgroundStack && activeFile.backgroundStack.length > 0);
    if (!hasBg) {
      setBackgroundDialog('noBackgroundFind');
    } else {
      await removeBackground();
      setBackgroundDialog(null);
    }
  };

  const isAnyDropdownOpen = isInsertDropdownOpen || isWatermarkDropdownOpen || isBackgroundDropdownOpen || isHeaderFooterDropdownOpen || isLinkDropdownOpen;

  return (
    <div className={cn(
      "h-[74px] md:h-[74px] bg-[#F3F2F1] border-b border-slate-300 flex items-stretch px-2 select-none relative z-[100] no-print no-scrollbar whitespace-nowrap md:whitespace-normal",
      isAnyDropdownOpen ? "overflow-visible" : "overflow-x-auto"
    )}>
      <HeaderFooterModal
        isOpen={isOpenHeaderFooterModal}
        mode={headerFooterMode}
        onClose={() => setIsOpenHeaderFooterModal(false)}
        onApply={(config) => applyHeaderFooter(config, headerFooterMode)}
      />
      {isOpenWatermarkModal && (
        <WatermarkModal
          isOpen={isOpenWatermarkModal}
          mode={watermarkMode}
          onClose={() => setIsOpenWatermarkModal(false)}
        />
      )}
      {isOpenBackgroundModal && (
        <BackgroundModal
          isOpen={isOpenBackgroundModal}
          mode={backgroundMode}
          onClose={() => setIsOpenBackgroundModal(false)}
        />
      )}
      <CombineFilesModal
        isOpen={isOpenCombineModal}
        onClose={() => {
          setIsOpenCombineModal(false);
          if (!activeFileId) {
            setActiveAppTool(ToolState.DASHBOARD);
          }
        }}
        onCombine={handleCombine}
      />
      <FilePropertiesModal
        isOpen={isOpenPropertiesModal}
        onClose={() => setIsOpenPropertiesModal(false)}
        onSaveMetadata={(meta) => {
          if (activeFileId) {
            updateFileMetadata(activeFileId, meta);
          }
        }}
        fileData={(() => {
          const f = sharedFiles.find(sf => sf.id === activeFileId);
          if (!f) return null;
          return {
            name: f.file.name,
            size: f.size,
            type: f.file.type || 'application/pdf',
            lastModified: f.file.lastModified,
            pages: totalPages,
            zoom: zoom,
            rotation: rotation,
            id: activeFileId!,
            width: pages[0]?.width,
            height: pages[0]?.height,
            metadata: f.metadata || {
              title: f.file.name.replace('.pdf', ''),
              subject: 'Add a category',
              keywords: 'Add keywords',
              author: 'Add the author',
              producer: 'Vite PDF Core',
              version: '1.7'
            }
          };
        })()}
      />
      <ExtractPagesModal
        isOpen={isOpenExtractModal}
        onClose={() => setIsOpenExtractModal(false)}
        totalPages={totalPages}
        onExtract={(file) => addSharedFiles([file])}
        originalFileName={sharedFiles.find(f => f.id === activeFileId)?.file.name || 'document.pdf'}
        originalFile={sharedFiles.find(f => f.id === activeFileId)?.file!}
        selectedPageIndices={selectedPageIds.map(id => pages.findIndex(p => p.id === id)).filter(idx => idx !== -1)}
      />
      <SplitDialog
        isOpen={isOpenSplitModal}
        onClose={() => setIsOpenSplitModal(false)}
      />
      <InsertBlankPageModal
        isOpen={isOpenInsertBlankModal}
        onClose={() => setIsOpenInsertBlankModal(false)}
        onInsert={(file) => {
          // Replace current file or add as new? 
          // Usually insertion modifies current file.
          if (activeFileId) updateSharedFileData(activeFileId, { file, pages: undefined }, true);
        }}
        originalFile={sharedFiles.find(f => f.id === activeFileId)?.file!}
        currentPage={currentPage}
        totalPages={totalPages}
      />
      <InsertFromFileModal
        isOpen={isOpenInsertFileModal}
        onClose={() => setIsOpenInsertFileModal(false)}
        onInsert={(file) => {
          if (activeFileId) updateSharedFileData(activeFileId, { file, pages: undefined }, true);
        }}
        originalFile={sharedFiles.find(f => f.id === activeFileId)?.file!}
        targetTotalPages={totalPages}
      />
      <ReplacePagesModal
        isOpen={isOpenReplaceModal}
        onClose={() => setIsOpenReplaceModal(false)}
      />
      <SetPageBoxModal
        isOpen={isOpenSetPageBoxModal}
        onClose={() => setIsOpenSetPageBoxModal(false)}
      />
      <CropModal
        isOpen={isOpenCropModal}
        onClose={() => setIsOpenCropModal(false)}
      />
      <CompressPDFModal
        isOpen={isOpenCompressModal}
        onClose={() => setIsOpenCompressModal(false)}
      />
      <div className="flex items-stretch w-full">
        {/* Shared Left Group for most menus - Hidden for File tab */}
        {activeMenu !== 'Page' && (
          <div className="flex flex-col border-r border-slate-300 pr-2 mr-2 justify-center gap-1 min-w-[70px]">
            <button
              onClick={() => setActiveTool('select')}
              className={cn(
                "flex items-center gap-2 px-1 py-0.5 rounded transition-all text-slate-700",
                activeTool === 'select' ? "bg-white shadow-sm border border-slate-200" : "hover:bg-slate-200"
              )}
            >
              <MousePointer2 className="w-3.5 h-3.5" />
              <span className="text-[10px] font-medium leading-none">Select</span>
            </button>
            <button
              onClick={() => setActiveTool('hand')}
              className={cn(
                "flex items-center gap-2 px-1 py-0.5 rounded transition-all text-slate-700",
                activeTool === 'hand' ? "bg-white shadow-sm border border-slate-200" : "hover:bg-slate-200"
              )}
            >
              <Hand className="w-3.5 h-3.5" />
              <span className="text-[10px] font-medium leading-none">Hand</span>
            </button>
            <button
              onClick={() => setActiveTool('edit')}
              className={cn(
                "flex items-center gap-2 px-1 py-0.5 rounded transition-all text-slate-700",
                activeTool === 'edit' ? "bg-white shadow-sm border border-slate-200" : "hover:bg-slate-200"
              )}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span className="text-[10px] font-medium leading-none">Edit</span>
            </button>
          </div>
        )}



        {activeMenu === 'Home' && (
          <>
            {/* Group: Create/Source */}
            <div className="flex items-center border-r border-slate-300 pr-4 mr-4 gap-4">
              <label className="flex flex-col items-center justify-center gap-1 group cursor-pointer hover:bg-slate-200/50 p-1 rounded transition-all">
                <FilePlus className="w-5 h-5 text-slate-600" />
                <span className="text-[10px] text-slate-600 w-12 text-center leading-tight">From File</span>
                <input type="file" className="hidden" accept="application/pdf" multiple onChange={onBrowse} />
              </label>
              <button
                onClick={() => setIsOpenCombineModal(true)}
                className="flex flex-col items-center justify-center gap-1 group hover:bg-slate-200/50 p-1 rounded transition-all"
              >
                <FileStack className="w-5 h-5 text-slate-600" />
                <span className="text-[10px] text-slate-600 w-12 text-center leading-tight">Combine Files</span>
              </button>
              <button
                disabled={!activeFileId}
                onClick={() => setIsOpenCompressModal(true)}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 group p-1 rounded transition-all",
                  !activeFileId ? "opacity-30 cursor-not-allowed" : "hover:bg-slate-200/50"
                )}
              >
                <Zap className="w-5 h-5 text-orange-500 fill-orange-500/10" />
                <span className="text-[10px] text-slate-600 w-12 text-center leading-tight">Compress</span>
              </button>
            </div>

            {/* Group: Zoom & View */}
            <div className="flex items-center border-r border-slate-300 pr-4 mr-4 gap-2">
              <div className="flex items-center gap-1 bg-white border border-slate-300 rounded px-1 h-7">
                <button
                  onClick={() => handleZoom(-10)}
                  className="p-1 hover:bg-slate-100 rounded text-slate-600"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <div className="w-[1px] h-3 bg-slate-200 mx-1" />
                <button
                  onClick={() => handleZoom(10)}
                  className="p-1 hover:bg-slate-100 rounded text-slate-600"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
                <ZoomDropdown />
              </div>

              <div className="flex items-center gap-0.5">
                <button
                  title="View page continuously with auto width-fit"
                  onClick={() => {
                    setViewMode('continuous');
                    setFitMode('width');
                  }}
                  className={cn(
                    "p-1.5 hover:bg-slate-200 rounded border border-transparent hover:border-slate-300 transition-all",
                    viewMode === 'continuous' && fitMode === 'width' ? "bg-white shadow-sm border-slate-200 text-blue-600" : "text-slate-600"
                  )}
                >
                  <StretchHorizontal className="w-4 h-4" />
                </button>
                <button
                  title="View pages one-by-one with auto page-fit"
                  onClick={() => {
                    setViewMode('single');
                    setFitMode('page');
                  }}
                  className={cn(
                    "p-1.5 hover:bg-slate-200 rounded border border-transparent hover:border-slate-300 transition-all",
                    viewMode === 'single' && fitMode === 'page' ? "bg-white shadow-sm border-slate-200 text-blue-600" : "text-slate-600"
                  )}
                >
                  <Scaling className="w-4 h-4" />
                </button>
                <button
                  title="Enter full screen mode"
                  onClick={handleFullScreen}
                  className="p-1.5 hover:bg-slate-200 rounded border border-transparent hover:border-slate-300 transition-all text-slate-600"
                >
                  <Maximize className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Group: Rotate & Page Nav */}
            <div className="flex items-center border-r border-slate-300 pr-4 mr-4 gap-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => rotateSelectedPages('left', false)}
                  className="p-1.5 hover:bg-slate-200 rounded text-slate-600"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => rotateSelectedPages('right', false)}
                  className="p-1.5 hover:bg-slate-200 rounded text-slate-600"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigatePage(-1)}
                  className="p-1 border border-slate-400 hover:bg-slate-200 rounded-full text-slate-600 disabled:opacity-30 disabled:border-slate-200 transition-colors"
                  disabled={currentPage <= 1}
                  title="Previous Page"
                >
                  <ChevronUp className="w-5 h-5" />
                </button>
                <button
                  onClick={() => navigatePage(1)}
                  className="p-1 border border-slate-400 hover:bg-slate-200 rounded-full text-slate-600 disabled:opacity-30 disabled:border-slate-200 transition-colors"
                  disabled={currentPage >= totalPages}
                  title="Next Page"
                >
                  <ChevronDown className="w-5 h-5" />
                </button>
                <div className="flex items-center bg-white border border-slate-300 rounded px-2 h-7 gap-2 shadow-inner">
                  <input
                    type="text"
                    value={pageInput}
                    onChange={(e) => setPageInput(e.target.value)}
                    onBlur={handlePageInputBlur}
                    onKeyDown={handlePageInputKeyDown}
                    className="w-8 text-[11px] font-bold text-center focus:outline-none text-slate-700"
                  />
                  <span className="text-[11px] text-slate-400 font-medium">/ {totalPages || 1}</span>
                </div>
              </div>
            </div>
          </>
        )}


        {activeMenu === 'Edit' && (
          <>
            {/* Group 1: Add Text */}
            <div className="flex items-center border-r border-slate-300 pr-6 mr-4 gap-4 pl-4">
              <button
                disabled={!activeFileId}
                onClick={() => setActiveTool('textbox')}
                className={cn(
                  "flex flex-col items-center gap-1 p-1 rounded transition-all",
                  activeFileId ? "hover:bg-slate-200/50" : "opacity-50 cursor-not-allowed",
                  activeTool === 'textbox' && "bg-white shadow-sm ring-1 ring-slate-200"
                )}
              >
                <div className="relative border border-slate-400 border-dashed p-1.5 rounded-sm">
                  <Type className="w-5 h-5 text-slate-600" />
                </div>
                <span className="text-[10px] text-slate-600 mt-1">Add Text Box</span>
              </button>
            </div>

            {/* Group 2: Content Tools */}
            <div className="flex items-center border-r border-slate-300 pr-4 mr-4 gap-6">
              <button
                disabled={!activeFileId}
                onClick={() => setActiveTool('image')}
                className={cn(
                  "flex flex-col items-center gap-1 p-1 rounded transition-all",
                  activeFileId ? "hover:bg-slate-200/50" : "opacity-50 cursor-not-allowed",
                  activeTool === 'image' && "bg-white shadow-sm ring-1 ring-slate-200"
                )}
              >
                <div className="relative">
                  <Image className="w-6 h-6 text-slate-600" />
                </div>
                <span className="text-[10px] text-slate-600 mt-1">Add Image</span>
              </button>
              <div className="relative" ref={linkDropdownRef}>
                <button
                  disabled={!activeFileId}
                  onClick={() => setIsLinkDropdownOpen(!isLinkDropdownOpen)}
                  className={cn(
                    "flex flex-col items-center gap-1 p-1 rounded transition-all",
                    activeFileId ? "hover:bg-slate-200/50" : "opacity-50 cursor-not-allowed",
                    isLinkDropdownOpen && "bg-slate-200"
                  )}
                >
                  <div className="relative border border-transparent hover:border-slate-300 rounded p-[1px]">
                    <Link2 className="w-6 h-6 text-slate-600" />
                    <div className="absolute bottom-0 right-0 w-0 h-0 border-l-[4px] border-l-transparent border-b-[4px] border-b-slate-800" />
                  </div>
                  <span className="text-[10px] text-slate-600 mt-1">Link</span>
                </button>

                {isLinkDropdownOpen && (
                  <div
                    className="fixed top-[122px] left-1/2 -translate-x-1/2 md:absolute md:top-full md:left-0 md:translate-x-0 bg-white shadow-xl border border-slate-200 rounded-sm z-[9999] py-1 shadow-[0_4px_20px_rgba(0,0,0,0.15)] flex flex-col w-40"
                  >
                    <button
                      className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-100 transition-colors font-medium flex items-center justify-between"
                      onClick={() => {
                        setIsLinkDropdownOpen(false);
                        setActiveTool('link');
                      }}
                    >
                      New Link...
                    </button>
                    <button
                      className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-100 transition-colors font-medium flex items-center justify-between"
                      onClick={() => {
                        setIsLinkDropdownOpen(false);
                        window.dispatchEvent(new CustomEvent('open-update-links-modal'));
                      }}
                    >
                      Manage Links...
                    </button>
                  </div>
                )}
              </div>

              <button
                disabled={!activeFileId}
                onClick={handleAddBookmark}
                className={cn(
                  "flex flex-col items-center gap-1 p-1 rounded transition-all",
                  activeFileId ? "hover:bg-slate-200/50" : "opacity-50 cursor-not-allowed"
                )}
              >
                <div className="relative">
                  <BookmarkIcon className="w-6 h-6 text-slate-600" />
                </div>
                <span className="text-[10px] text-slate-600 mt-1">Add Bookmark</span>
              </button>

              <button
                disabled={!activeFileId}
                onClick={handleAddAttachment}
                className={cn(
                  "flex flex-col items-center gap-1 p-1 rounded transition-all",
                  activeFileId ? "hover:bg-slate-200/50" : "opacity-50 cursor-not-allowed"
                )}
              >
                <div className="relative">
                  <Paperclip className="w-6 h-6 text-slate-600" />
                </div>
                <span className="text-[10px] text-slate-600 mt-1">Add Attachment</span>
              </button>

              <button
                disabled={!activeFileId}
                onClick={() => setActiveTool('area-highlight')}
                className={cn(
                  "flex flex-col items-center gap-1 p-1 rounded transition-all",
                  activeFileId ? "hover:bg-slate-200/50" : "opacity-50 cursor-not-allowed",
                  activeTool === 'area-highlight' && "bg-white shadow-sm ring-1 ring-slate-200"
                )}
              >
                <div className="relative border border-slate-400 border-dashed p-[2px] rounded-sm">
                  <Highlighter className="w-5 h-5 text-slate-600" />
                </div>
                <span className="text-[10px] text-slate-600 mt-1">Highlight Area</span>
              </button>

            </div>

            {/* Group 3: Page/Layout Tools */}
            <div className="flex items-center gap-6">
              <button
                disabled={!activeFileId}
                onClick={() => {
                  if (activeFileId) {
                    setIsOpenCropModal(true);
                  }
                }}
                className={cn(
                  "flex flex-col items-center gap-1 p-1 rounded transition-all min-w-[50px]",
                  activeFileId ? "hover:bg-slate-200/50" : "opacity-50 cursor-not-allowed",
                  isOpenCropModal && "bg-white shadow-sm ring-1 ring-slate-200"
                )}
              >
                <div className="relative">
                  <Crop className="w-6 h-6 text-slate-600" />
                </div>
                <span className="text-[10px] text-slate-600 mt-1">Crop</span>
              </button>
              <div className="relative" ref={watermarkDropdownRef}>
                <button
                  disabled={!activeFileId}
                  onClick={() => setIsWatermarkDropdownOpen(!isWatermarkDropdownOpen)}
                  className={cn(
                    "flex flex-col items-center gap-1 p-1 rounded transition-all",
                    activeFileId ? "hover:bg-slate-200/50" : "opacity-50 cursor-not-allowed",
                    isWatermarkDropdownOpen && "bg-slate-200"
                  )}
                >
                  <div className="relative">
                    <Layers className="w-6 h-6 text-slate-600" />
                    <div className="absolute bottom-0 right-0 w-0 h-0 border-l-[4px] border-l-transparent border-b-[4px] border-b-slate-800" />
                  </div>
                  <span className="text-[10px] text-slate-600 mt-1">Watermark</span>
                </button>

                {isWatermarkDropdownOpen && (
                  <div
                    className="fixed top-[122px] left-1/2 -translate-x-1/2 md:absolute md:top-full md:left-0 md:translate-x-0 bg-white shadow-xl border border-slate-200 rounded-sm z-[9999] py-1 shadow-[0_4px_20px_rgba(0,0,0,0.15)] flex flex-col w-48"
                  >
                    <button
                      className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-100 transition-colors font-medium flex items-center justify-between"
                      onClick={handleNewWatermark}
                    >
                      New Watermark...
                    </button>
                    <button
                      className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-100 transition-colors font-medium flex items-center justify-between"
                      onClick={handleUpdateWatermark}
                    >
                      Update Watermark...
                    </button>
                    <div className="h-px bg-slate-200 my-1"></div>
                    <button
                      className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-100 transition-colors font-medium flex items-center justify-between hover:text-red-600"
                      onClick={handleRemoveWatermark}
                    >
                      Remove Watermark
                    </button>
                  </div>
                )}
              </div>
              <div className="relative" ref={backgroundDropdownRef}>
                <button
                  disabled={!activeFileId}
                  onClick={() => setIsBackgroundDropdownOpen(!isBackgroundDropdownOpen)}
                  className={cn(
                    "flex flex-col items-center gap-1 p-1 rounded transition-all",
                    activeFileId ? "hover:bg-slate-200/50" : "opacity-50 cursor-not-allowed",
                    isBackgroundDropdownOpen && "bg-slate-200"
                  )}
                >
                  <div className="relative">
                    <PaintBucket className="w-6 h-6 text-slate-600" />
                    <div className="absolute bottom-0 right-0 w-0 h-0 border-l-[4px] border-l-transparent border-b-[4px] border-b-slate-800" />
                  </div>
                  <span className="text-[10px] text-slate-600 mt-1">Background</span>
                </button>

                {isBackgroundDropdownOpen && (
                  <div
                    className="fixed top-[122px] left-1/2 -translate-x-1/2 md:absolute md:top-full md:left-0 md:translate-x-0 bg-white shadow-xl border border-slate-200 rounded-sm z-[9999] py-1 shadow-[0_4px_20px_rgba(0,0,0,0.15)] flex flex-col w-48"
                  >
                    <button
                      className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-100 transition-colors font-medium flex items-center justify-between"
                      onClick={handleNewBackground}
                    >
                      New Background...
                    </button>
                    <button
                      className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-100 transition-colors font-medium flex items-center justify-between"
                      onClick={handleUpdateBackground}
                    >
                      Update Background...
                    </button>
                    <div className="h-px bg-slate-200 my-1"></div>
                    <button
                      className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-100 transition-colors font-medium flex items-center justify-between hover:text-red-600"
                      onClick={handleRemoveBackground}
                    >
                      Remove Background
                    </button>
                  </div>
                )}
              </div>
              <div className="relative" ref={headerFooterDropdownRef}>
                <button
                  disabled={!activeFileId}
                  onClick={() => setIsHeaderFooterDropdownOpen(!isHeaderFooterDropdownOpen)}
                  className={cn(
                    "flex flex-col items-center gap-1 p-1 rounded transition-all",
                    activeFileId ? "hover:bg-slate-200/50" : "opacity-50 cursor-not-allowed",
                    isHeaderFooterDropdownOpen && "bg-slate-200"
                  )}
                >
                  <div className="relative">
                    <TextQuote className="w-6 h-6 text-slate-600" />
                    <div className="absolute bottom-0 right-0 w-0 h-0 border-l-[4px] border-l-transparent border-b-[4px] border-b-slate-800" />
                  </div>
                  <span className="text-[10px] text-slate-600 mt-1">Header & Footer</span>
                </button>

                {isHeaderFooterDropdownOpen && (
                  <div
                    className="fixed top-[122px] left-1/2 -translate-x-1/2 md:absolute md:top-full md:left-0 md:translate-x-0 bg-white shadow-xl border border-slate-200 rounded-sm z-[9999] py-1 shadow-[0_4px_20px_rgba(0,0,0,0.15)] flex flex-col w-48"
                  >
                    <button
                      className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-100 transition-colors font-medium flex items-center justify-between"
                      onClick={handleNewHeaderFooter}
                    >
                      New Header & Footer...
                    </button>
                    <button
                      className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-100 transition-colors font-medium flex items-center justify-between"
                      onClick={handleUpdateHeaderFooter}
                    >
                      Update Header & Footer...
                    </button>
                    <div className="h-px bg-slate-200 my-1"></div>
                    <button
                      className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-100 transition-colors font-medium flex items-center justify-between hover:text-red-600"
                      onClick={handleRemoveHeaderFooter}
                    >
                      Remove Header & Footer
                    </button>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {activeMenu === 'Page' && (
          <>
            {/* Group: Page Boxes */}
            <div className="flex items-center border-r border-slate-300 pr-4 mr-4 gap-4 pl-4">
              <button
                disabled={!activeFileId}
                onClick={() => {
                  if (activeFileId) {
                    setIsOpenSetPageBoxModal(true);
                  }
                }}
                className={cn(
                  "flex flex-col items-center gap-1 p-1 rounded min-w-[60px] transition-all",
                  activeFileId ? "hover:bg-slate-200/50" : "opacity-50 cursor-not-allowed"
                )}
              >
                <div className="relative">
                  <FileText className="w-7 h-7 text-slate-600 transition-colors" />
                  <Scissors className="w-3.5 h-3.5 absolute -bottom-1 -right-1 text-slate-700 bg-[#F3F2F1] rounded-full p-0.5" />
                </div>
                <span className="text-[10px] text-slate-600">Page Boxes</span>
              </button>
            </div>

            {/* Group: Document Actions */}
            <div className="flex items-center border-r border-slate-300 pr-4 mr-4 gap-4 pl-4">
              <button
                disabled={!activeFileId}
                onClick={() => {
                  if (activeFileId) {
                    setIsOpenExtractModal(true);
                  }
                }}
                className={cn(
                  "flex flex-col items-center gap-1 p-1 rounded min-w-[50px] transition-all",
                  activeFileId ? "hover:bg-slate-200/50" : "opacity-50 cursor-not-allowed"
                )}
              >
                <FileUp className="w-7 h-7 text-slate-600" />
                <span className="text-[10px] text-slate-600">Extract</span>
              </button>

              <div className="relative" ref={insertDropdownRef2}>
                <button
                  disabled={!activeFileId}
                  onClick={() => setIsInsertDropdownOpen(!isInsertDropdownOpen)}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 group p-1 rounded transition-all min-w-[50px]",
                    activeFileId ? "hover:bg-slate-200/50" : "opacity-50 cursor-not-allowed",
                    isInsertDropdownOpen && "bg-white shadow-sm ring-1 ring-slate-200"
                  )}
                >
                  <div className="relative">
                    <FileDown className="w-7 h-7 text-slate-600" />
                    <div className="absolute bottom-0 right-0 w-0 h-0 border-l-[4px] border-l-transparent border-b-[4px] border-b-slate-800" />
                  </div>
                  <span className="text-[10px] text-slate-600 leading-tight">Insert</span>
                </button>

                {isInsertDropdownOpen && (
                  <div
                    className="fixed top-[122px] left-1/2 -translate-x-1/2 md:absolute md:top-full md:left-0 md:translate-x-0 mt-1 w-40 bg-white border border-slate-300 shadow-xl z-[9999] py-1 rounded"
                  >
                    <button
                      onClick={() => {
                        setIsOpenInsertBlankModal(true);
                        setIsInsertDropdownOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-xs hover:bg-slate-100 transition-colors flex items-center justify-between group text-slate-700 font-medium"
                    >
                      Blank Page
                    </button>
                    <div className="h-[1px] bg-slate-100 my-1" />
                    <button
                      onClick={() => {
                        setIsOpenInsertFileModal(true);
                        setIsInsertDropdownOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-xs hover:bg-slate-100 transition-colors flex items-center justify-between group text-slate-700 font-medium"
                    >
                      From File
                    </button>
                  </div>
                )}
              </div>

              <button
                disabled={!activeFileId}
                onClick={() => setIsOpenSplitModal(true)}
                className={cn(
                  "flex flex-col items-center gap-1 p-1 rounded min-w-[50px] transition-all",
                  activeFileId ? "hover:bg-slate-200/50" : "opacity-50 cursor-not-allowed"
                )}
              >
                <SeparatorHorizontal className="w-7 h-7 text-slate-600" />
                <span className="text-[10px] text-slate-600">Split</span>
              </button>
              <button
                disabled={!activeFileId}
                onClick={() => {
                  if (activeFileId) {
                    setIsOpenReplaceModal(true);
                  }
                }}
                className={cn(
                  "flex flex-col items-center gap-1 p-1 rounded min-w-[50px] transition-all",
                  activeFileId ? "hover:bg-slate-200/50" : "opacity-50 cursor-not-allowed"
                )}
              >
                <Replace className="w-7 h-7 text-slate-600" />
                <span className="text-[10px] text-slate-600">Replace</span>
              </button>
              <button
                disabled={!activeFileId}
                onClick={() => deleteSelectedPages()}
                className={cn(
                  "flex flex-col items-center gap-1 p-1 rounded min-w-[50px] transition-all",
                  activeFileId ? "hover:bg-slate-200/50" : "opacity-50 cursor-not-allowed"
                )}
              >
                <Trash2 className="w-7 h-7 text-slate-600" />
                <span className="text-[10px] text-slate-600">Delete</span>
              </button>
            </div>

            {/* Group: Selection */}
            <div className="flex items-center gap-2 border-r border-slate-300 pr-4 mr-4 pl-4 h-full py-2">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Selection</span>
                <div className="flex items-center bg-white border border-slate-300 rounded h-7 min-w-[180px] shadow-sm focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-100 transition-all">
                  <input
                    type="text"
                    placeholder="Page Range (e.g. 1-5, 8)"
                    value={selectionRange}
                    onChange={(e) => handleRangeChange(e.target.value)}
                    className="flex-1 px-2 text-[11px] outline-none h-full bg-transparent"
                  />
                  <div className="relative h-full" ref={selectionDropdownRef}>
                    <button
                      onClick={() => setIsSelectionDropdownOpen(!isSelectionDropdownOpen)}
                      className="px-1 h-full hover:bg-slate-50 border-l border-slate-200 transition-colors flex items-center justify-center"
                    >
                      <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                    </button>

                    {isSelectionDropdownOpen && (
                      <div className="absolute top-full right-0 mt-1 w-48 bg-white border border-slate-200 shadow-xl rounded py-1 z-[2000]">
                        {[
                          { label: 'Even Pages', value: 'even' },
                          { label: 'Odd Pages', value: 'odd' },
                          { label: 'Even and odd pages', value: 'all' },
                        ].map((item) => (
                          <button
                            key={item.value}
                            onClick={() => handleSelection(item.value as any)}
                            className="w-full px-3 py-1.5 text-left text-[11px] hover:bg-slate-100 transition-colors"
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Group: Utilities */}
            <div className="flex items-center gap-4">
              <button
                disabled={!activeFileId}
                onClick={() => rotateSelectedPages('left', true)}
                className={cn(
                  "p-1.5 rounded transition-all",
                  activeFileId ? "hover:bg-slate-200 text-slate-600" : "text-slate-400 opacity-50 cursor-not-allowed"
                )}
              >
                <RotateCcw className="w-6 h-6" />
              </button>
              <button
                disabled={!activeFileId}
                onClick={() => rotateSelectedPages('right', true)}
                className={cn(
                  "p-1.5 rounded transition-all",
                  activeFileId ? "hover:bg-slate-200 text-slate-600" : "text-slate-400 opacity-50 cursor-not-allowed"
                )}
              >
                <RotateCw className="w-6 h-6" />
              </button>
            </div>
          </>
        )}

        {/* Placeholder for other menus */}
        {!['Home', 'Edit', 'Page', 'File'].includes(activeMenu) && (
          <div className="flex items-center px-4 text-[10px] text-slate-400 font-medium italic">
          </div>
        )}
      </div>
      {headerFooterDialog === 'confirmNew' && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-transparent backdrop-blur-[2px] p-4 font-sans text-sm">
          <div className="w-[400px] bg-white shadow-2xl border border-slate-300 rounded-sm flex flex-col">
            <div className="bg-[#2D2D5F] text-white px-4 py-2 flex items-center justify-between">
              <span className="text-md font-medium">Add New Header & Footer</span>
              <button onClick={() => setHeaderFooterDialog(null)} className="text-white/80 hover:text-white">
                <X className="w-4 h-4 flex-shrink-0" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-slate-700">Would you like to replace the existing header and footer, or add a new one?</p>
            </div>
            <div className="p-4 bg-white border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => setHeaderFooterDialog(null)}
                className="px-6 py-1 border border-blue-400 text-blue-600 hover:bg-blue-50 transition-colors uppercase font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setHeaderFooterDialog(null);
                  setHeaderFooterMode('replace');
                  setIsOpenHeaderFooterModal(true);
                }}
                className="px-6 py-1 border border-slate-400 text-slate-700 hover:bg-slate-50 transition-colors uppercase font-medium shadow-sm"
              >
                Replace Existing
              </button>
              <button
                onClick={() => {
                  setHeaderFooterDialog(null);
                  setHeaderFooterMode('add');
                  setIsOpenHeaderFooterModal(true);
                }}
                className="px-6 py-1 bg-[#4461FF] text-white hover:bg-blue-700 transition-colors uppercase font-medium shadow-sm"
              >
                Add New
              </button>
            </div>
          </div>
        </div>
      )}

      {headerFooterDialog === 'confirmUpdate' && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-transparent backdrop-blur-[2px] p-4 font-sans text-sm">
          <div className="w-[400px] bg-white shadow-2xl border border-slate-300 rounded-sm flex flex-col">
            <div className="bg-[#2D2D5F] text-white px-4 py-2 flex items-center justify-between">
              <span className="text-md font-medium">Update Header & Footer</span>
              <button onClick={() => setHeaderFooterDialog(null)} className="text-white/80 hover:text-white">
                <X className="w-4 h-4 flex-shrink-0" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-slate-700">There is no header or footer available to update. Do you want to add new?</p>
            </div>
            <div className="p-4 bg-white border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => setHeaderFooterDialog(null)}
                className="px-6 py-1 border border-blue-400 text-blue-600 hover:bg-blue-50 transition-colors uppercase font-medium"
              >
                No
              </button>
              <button
                onClick={() => {
                  setHeaderFooterDialog(null);
                  setHeaderFooterMode('add');
                  setIsOpenHeaderFooterModal(true);
                }}
                className="px-6 py-1 bg-[#4461FF] text-white hover:bg-blue-700 transition-colors uppercase font-medium shadow-sm"
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}

      {headerFooterDialog === 'noHeaderFind' && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-transparent backdrop-blur-[2px] p-4 font-sans text-sm">
          <div className="w-[400px] bg-white shadow-2xl border border-slate-300 rounded-sm flex flex-col">
            <div className="bg-[#2D2D5F] text-white px-4 py-2 flex items-center justify-between">
              <span className="text-md font-medium">Remove Header & Footer</span>
              <button onClick={() => setHeaderFooterDialog(null)} className="text-white/80 hover:text-white">
                <X className="w-4 h-4 flex-shrink-0" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-slate-700">No header or footer found to remove.</p>
            </div>
            <div className="p-4 bg-white border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => setHeaderFooterDialog(null)}
                className="px-6 py-1 bg-[#4461FF] text-white hover:bg-blue-700 transition-colors uppercase font-medium shadow-sm"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
      {watermarkDialog === 'confirmNew' && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-transparent backdrop-blur-[2px] p-4 font-sans text-sm">
          <div className="w-[400px] bg-white shadow-2xl border border-slate-300 rounded-sm flex flex-col">
            <div className="bg-[#2D2D5F] text-white px-4 py-2 flex items-center justify-between">
              <span className="text-md font-medium">Add New Watermark</span>
              <button onClick={() => setWatermarkDialog(null)} className="text-white/80 hover:text-white">
                <X className="w-4 h-4 flex-shrink-0" />
              </button>
            </div>
            <div className="p-6">
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-blue-600 font-bold text-lg font-serif">i</span>
                </div>
                <div className="text-sm text-slate-700 leading-relaxed pt-1">
                  You already have a watermark in this document. Would you like to replace the existing watermark or add a new one?
                </div>
              </div>
            </div>
            <div className="bg-slate-50 border-t border-slate-200 p-4 flex justify-end gap-2">
              <button
                onClick={() => setWatermarkDialog(null)}
                className="px-6 py-1.5 border border-slate-300 bg-white hover:bg-slate-50 transition-colors uppercase text-xs font-semibold rounded-sm tracking-wide text-slate-600"
              >
                CANCEL
              </button>
              <button
                onClick={() => {
                  setWatermarkMode('replace');
                  setWatermarkDialog(null);
                  setIsOpenWatermarkModal(true);
                }}
                className="px-4 py-1.5 border border-slate-300 bg-white hover:bg-slate-50 transition-colors uppercase text-xs font-semibold rounded-sm tracking-wide text-[#3B4D87]"
              >
                REPLACE EXISTING
              </button>
              <button
                onClick={() => {
                  setWatermarkMode('add');
                  setWatermarkDialog(null);
                  setIsOpenWatermarkModal(true);
                }}
                className="px-4 py-1.5 bg-[#4461FF] hover:bg-blue-700 text-white transition-colors uppercase text-xs font-semibold rounded-sm tracking-wide"
              >
                ADD NEW
              </button>
            </div>
          </div>
        </div>
      )}

      {watermarkDialog === 'confirmUpdate' && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-transparent backdrop-blur-[2px] p-4 font-sans text-sm">
          <div className="w-[400px] bg-white shadow-2xl border border-slate-300 rounded-sm flex flex-col">
            <div className="bg-[#2D2D5F] text-white px-4 py-2 flex items-center justify-between">
              <span className="text-md font-medium">Update Watermark</span>
              <button onClick={() => setWatermarkDialog(null)} className="text-white/80 hover:text-white">
                <X className="w-4 h-4 flex-shrink-0" />
              </button>
            </div>
            <div className="p-6">
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-blue-600 font-bold text-lg font-serif">i</span>
                </div>
                <div className="text-sm text-slate-700 leading-relaxed pt-1">
                  We did not find any watermark in this document. To update a watermark, first use "Add Watermark". Would you like to add a new watermark now?
                </div>
              </div>
            </div>
            <div className="bg-slate-50 border-t border-slate-200 p-4 flex justify-end gap-2">
              <button
                onClick={() => setWatermarkDialog(null)}
                className="px-6 py-1.5 border border-slate-300 bg-white hover:bg-slate-50 transition-colors uppercase text-xs font-semibold rounded-sm tracking-wide text-slate-600"
              >
                NO
              </button>
              <button
                onClick={() => {
                  setWatermarkMode('add');
                  setWatermarkDialog(null);
                  setIsOpenWatermarkModal(true);
                }}
                className="px-6 py-1.5 bg-[#4461FF] hover:bg-blue-700 text-white transition-colors uppercase text-xs font-semibold rounded-sm tracking-wide"
              >
                YES
              </button>
            </div>
          </div>
        </div>
      )}

      {watermarkDialog === 'noWatermarkFind' && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-transparent backdrop-blur-[2px] p-4 font-sans text-sm">
          <div className="w-[400px] bg-white shadow-2xl border border-slate-300 rounded-sm flex flex-col">
            <div className="bg-[#2D2D5F] text-white px-4 py-2 flex items-center justify-between">
              <span className="text-md font-medium">Remove Watermark</span>
              <button onClick={() => setWatermarkDialog(null)} className="text-white/80 hover:text-white">
                <X className="w-4 h-4 flex-shrink-0" />
              </button>
            </div>
            <div className="p-6">
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-yellow-600 font-bold text-lg font-serif">!</span>
                </div>
                <div className="text-sm text-slate-700 leading-relaxed pt-1">
                  Cannot find watermark to remove.
                </div>
              </div>
            </div>
            <div className="bg-slate-50 border-t border-slate-200 p-4 flex justify-end">
              <button
                onClick={() => setWatermarkDialog(null)}
                className="px-6 py-1.5 bg-[#4461FF] hover:bg-blue-700 text-white transition-colors uppercase text-xs font-semibold rounded-sm tracking-wide"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
      {backgroundDialog === 'confirmNew' && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-transparent backdrop-blur-[2px] p-4 font-sans text-sm">
          <div className="w-[400px] bg-white shadow-2xl border border-slate-300 rounded-sm flex flex-col">
            <div className="bg-[#2D2D5F] text-white px-4 py-2 flex items-center justify-between">
              <span className="text-md font-medium">Add New Background</span>
              <button onClick={() => setBackgroundDialog(null)} className="text-white/80 hover:text-white">
                <X className="w-4 h-4 flex-shrink-0" />
              </button>
            </div>
            <div className="p-6">
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-blue-600 font-bold text-lg font-serif">i</span>
                </div>
                <div className="text-sm text-slate-700 leading-relaxed pt-1">
                  You already have a background in this document. Would you like to replace the existing background?
                </div>
              </div>
            </div>
            <div className="bg-slate-50 border-t border-slate-200 p-4 flex justify-end gap-2">
              <button
                onClick={() => setBackgroundDialog(null)}
                className="px-6 py-1.5 border border-slate-300 bg-white hover:bg-slate-50 transition-colors uppercase text-xs font-semibold rounded-sm tracking-wide text-slate-600"
              >
                NO
              </button>
              <button
                onClick={() => {
                  setBackgroundMode('replace');
                  setBackgroundDialog(null);
                  setIsOpenBackgroundModal(true);
                }}
                className="px-6 py-1.5 bg-[#4461FF] hover:bg-blue-700 text-white transition-colors uppercase text-xs font-semibold rounded-sm tracking-wide"
              >
                YES
              </button>
            </div>
          </div>
        </div>
      )}

      {backgroundDialog === 'confirmUpdate' && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-transparent backdrop-blur-[2px] p-4 font-sans text-sm">
          <div className="w-[400px] bg-white shadow-2xl border border-slate-300 rounded-sm flex flex-col">
            <div className="bg-[#2D2D5F] text-white px-4 py-2 flex items-center justify-between">
              <span className="text-md font-medium">Update Background</span>
              <button onClick={() => setBackgroundDialog(null)} className="text-white/80 hover:text-white">
                <X className="w-4 h-4 flex-shrink-0" />
              </button>
            </div>
            <div className="p-6">
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-blue-600 font-bold text-lg font-serif">i</span>
                </div>
                <div className="text-sm text-slate-700 leading-relaxed pt-1">
                  We did not find any background in this document. To update a background, first use "Add Background". Would you like to add a new background now?
                </div>
              </div>
            </div>
            <div className="bg-slate-50 border-t border-slate-200 p-4 flex justify-end gap-2">
              <button
                onClick={() => setBackgroundDialog(null)}
                className="px-6 py-1.5 border border-slate-300 bg-white hover:bg-slate-50 transition-colors uppercase text-xs font-semibold rounded-sm tracking-wide text-slate-600"
              >
                NO
              </button>
              <button
                onClick={() => {
                  setBackgroundMode('add');
                  setBackgroundDialog(null);
                  setIsOpenBackgroundModal(true);
                }}
                className="px-6 py-1.5 bg-[#4461FF] hover:bg-blue-700 text-white transition-colors uppercase text-xs font-semibold rounded-sm tracking-wide"
              >
                YES
              </button>
            </div>
          </div>
        </div>
      )}

      {backgroundDialog === 'noBackgroundFind' && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-transparent backdrop-blur-[2px] p-4 font-sans text-sm">
          <div className="w-[400px] bg-white shadow-2xl border border-slate-300 rounded-sm flex flex-col">
            <div className="bg-[#2D2D5F] text-white px-4 py-2 flex items-center justify-between">
              <span className="text-md font-medium">Remove Background</span>
              <button onClick={() => setBackgroundDialog(null)} className="text-white/80 hover:text-white">
                <X className="w-4 h-4 flex-shrink-0" />
              </button>
            </div>
            <div className="p-6">
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-yellow-600 font-bold text-lg font-serif">!</span>
                </div>
                <div className="text-sm text-slate-700 leading-relaxed pt-1">
                  Cannot find background to remove.
                </div>
              </div>
            </div>
            <div className="bg-slate-50 border-t border-slate-200 p-4 flex justify-end">
              <button
                onClick={() => setBackgroundDialog(null)}
                className="px-6 py-1.5 bg-[#4461FF] hover:bg-blue-700 text-white transition-colors uppercase text-xs font-semibold rounded-sm tracking-wide"
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
