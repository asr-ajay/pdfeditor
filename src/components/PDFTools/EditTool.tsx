import React, { useState, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import { FONT_OPTIONS } from '../../constants';
import {
  FileEdit,
  X,
  Download,
  Loader2,
  FileText,
  Type,
  Image as ImageIcon,
  Trash2,
  GripHorizontal,
  Plus,
  Save,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Layout,
  Undo2,
  Redo2,
  Hand,
  MousePointer2,
  Edit3,
  Link,
  ScanSearch,
  Crop,
  PaintBucket,
  Layers,
  StretchHorizontal,
  Scaling,
  Maximize,
  Underline,
  Strikethrough,
  ChevronUp,
  RotateCcw,
  RotateCw,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Bold,
  Italic,
  Subscript as SubscriptIcon,
  Superscript as SuperscriptIcon,
  Baseline,
  FlipHorizontal,
  FlipVertical,
  ImagePlus,
  ArrowLeftRight,
  ArrowUpDown,
  AlignVerticalJustifyStart,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  AlignHorizontalJustifyCenter,
  ChevronDown,
  Settings,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '../../lib/utils';
import { usePDF, Annotation, PageData } from '../../contexts/PDFContext';
import LinkModal from '../LinkModal';
import UpdateLinksModal from '../UpdateLinksModal';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

interface SortablePageProps {
  id: string;
  children: React.ReactNode;
  disabled?: boolean;
}

function SortablePage({ id, children, disabled }: SortablePageProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "h-full w-full rounded-xl transition-all duration-200",
        isDragging && "shadow-2xl scale-105 z-50 cursor-grabbing"
      )}
    >
      <div className={cn("h-full w-full transition-opacity duration-200", isDragging && "opacity-50")}>
        {children}
      </div>
    </div>
  );
}

interface AnnotationObjectProps {
  annotation: Annotation;
  pageWidth: number;
  pageHeight: number;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (data: Partial<Annotation>, saveToHistory?: boolean) => void;
  onDelete: () => void;
  zoom: number;
  activeTool?: string;
}

const AnnotationObject = ({ annotation, pageWidth, pageHeight, isSelected, onSelect, onUpdate, onDelete, zoom, activeTool }: AnnotationObjectProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState<string | null>(null);
  const [isCropping, setIsCropping] = useState<string | null>(null);

  const dragStartRef = useRef({ x: 0, y: 0 });
  const initialPosRef = useRef({ x: 0, y: 0, w: 0, h: 0 });
  const initialCropRef = useRef({ top: 0, right: 0, bottom: 0, left: 0 });

  // Refs for stability in useEffect
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;
  const annotationRef = useRef(annotation);
  annotationRef.current = annotation;
  const metricsRef = useRef({ pageWidth, pageHeight, zoom });
  metricsRef.current = { pageWidth, pageHeight, zoom };

  const scale = zoom / 100;
  const x = (annotation.x / 100) * pageWidth * scale;
  const y = (annotation.y / 100) * pageHeight * scale;
  const w = ((annotation.width || 25) / 100) * pageWidth * scale;
  const h = ((annotation.height || 10) / 100) * pageHeight * scale;

  const handleMouseDown = (e: React.MouseEvent, type: string | null = null, mode: 'resize' | 'crop' = 'resize') => {
    e.stopPropagation();


    // Don't drag links in select/hand modes if they're acting as links
    if (annotation.type === 'link' && (activeTool === 'select' || activeTool === 'hand')) {
      return;
    }

    onSelect();

    if (type) {
      if (mode === 'crop') {
        setIsCropping(type);
        initialCropRef.current = annotation.cropRect || { top: 0, right: 0, bottom: 0, left: 0 };
      } else {
        setIsResizing(type);
      }
    } else {
      setIsDragging(true);
    }

    dragStartRef.current = { x: e.clientX, y: e.clientY };
    initialPosRef.current = {
      x: annotation.x,
      y: annotation.y,
      w: annotation.width || 25,
      h: annotation.height || 10
    };
  };

  useEffect(() => {
    if (!isDragging && !isResizing && !isCropping) return;

    const handlePointerMove = (e: PointerEvent) => {
      const { pageWidth: pw, pageHeight: ph, zoom: z } = metricsRef.current;
      const s = z / 100;

      const dx_px = e.clientX - dragStartRef.current.x;
      const dy_px = e.clientY - dragStartRef.current.y;
      const dx = dx_px / (pw * s) * 100;
      const dy = dy_px / (ph * s) * 100;

      if (isDragging) {
        onUpdateRef.current({
          x: Math.max(0, Math.min(100 - initialPosRef.current.w, initialPosRef.current.x + dx)),
          y: Math.max(0, Math.min(100 - initialPosRef.current.h, initialPosRef.current.y + dy))
        }, false);
      } else if (isResizing) {
        const updates: Partial<Annotation> = {};
        if (isResizing.includes('right')) updates.width = Math.max(0.5, initialPosRef.current.w + dx);
        if (isResizing.includes('bottom')) updates.height = Math.max(0.5, initialPosRef.current.h + dy);
        if (isResizing.includes('left')) {
          const maxLeft = initialPosRef.current.x + initialPosRef.current.w - 0.5;
          updates.x = Math.min(maxLeft, initialPosRef.current.x + dx);
          updates.width = Math.max(0.5, initialPosRef.current.w - dx);
        }
        if (isResizing.includes('top')) {
          const maxTop = initialPosRef.current.y + initialPosRef.current.h - 0.5;
          updates.y = Math.min(maxTop, initialPosRef.current.y + dy);
          updates.height = Math.max(0.5, initialPosRef.current.h - dy);
        }
        onUpdateRef.current(updates, false);
      } else if (isCropping) {
        const currentCrop = { ...(annotationRef.current.cropRect || { top: 0, right: 0, bottom: 0, left: 0 }) };
        // We use current pixel dimensions for crop delta calculation
        const px_w = (initialPosRef.current.w / 100) * pw * s;
        const px_h = (initialPosRef.current.h / 100) * ph * s;
        const dx_pct = (dx_px / px_w) * 100;
        const dy_pct = (dy_px / px_h) * 100;

        if (isCropping.includes('right')) currentCrop.right = Math.max(0, Math.min(100 - initialCropRef.current.left - 5, initialCropRef.current.right - dx_pct));
        if (isCropping.includes('left')) currentCrop.left = Math.max(0, Math.min(100 - initialCropRef.current.right - 5, initialCropRef.current.left + dx_pct));
        if (isCropping.includes('bottom')) currentCrop.bottom = Math.max(0, Math.min(100 - initialCropRef.current.top - 5, initialCropRef.current.bottom - dy_pct));
        if (isCropping.includes('top')) currentCrop.top = Math.max(0, Math.min(100 - initialCropRef.current.bottom - 5, initialCropRef.current.top + dy_pct));

        onUpdateRef.current({ cropRect: currentCrop }, false);
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      setIsResizing(null);
      setIsCropping(null);
      // Trigger a final update to push the completed move/resize to history
      onUpdateRef.current({}, true);
    };

    window.addEventListener('pointermove', handlePointerMove, { capture: true });
    window.addEventListener('pointerup', handlePointerUp, { capture: true });

    return () => {
      window.removeEventListener('pointermove', handlePointerMove, { capture: true });
      window.removeEventListener('pointerup', handlePointerUp, { capture: true });
    };
  }, [isDragging, isResizing, isCropping]);


  const rotation = annotation.rotation || 0;
  const flipH = annotation.flipH ? -1 : 1;
  const flipV = annotation.flipV ? -1 : 1;
  const crop = annotation.cropRect || { top: 0, right: 0, bottom: 0, left: 0 };
  const clipPath = `inset(${crop.top}% ${crop.right}% ${crop.bottom}% ${crop.left}%)`;

  return (
    <div
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
      onMouseDown={(e) => handleMouseDown(e)}
      className={cn(
        "absolute group select-none touch-none",
        (annotation.type === 'link' && (activeTool === 'select' || activeTool === 'hand')) ? "cursor-pointer" : "cursor-move",
        isSelected ? "z-50" : "z-10"
      )}
      style={{
        left: `${x}px`,
        top: `${y}px`,
        width: `${w}px`,
        height: `${h}px`,
        transform: `rotate(${rotation}deg) scaleX(${flipH}) scaleY(${flipV})`,
      }}
    >
      <div className="w-full h-full relative" style={{ backgroundColor: annotation.backgroundColor || 'transparent' }}>
        {annotation.type === 'image' && annotation.isCropMode && (
          <img src={annotation.content} alt="" className="absolute inset-0 w-full h-full object-fill pointer-events-none opacity-30 grayscale" />
        )}

        <div className="w-full h-full absolute inset-0" style={{ clipPath }}>
          {annotation.type === 'textbox' ? (
            <div
              ref={(el) => {
                if (el && el.innerHTML !== annotation.content && document.activeElement !== el) {
                  el.innerHTML = annotation.content;
                }
              }}
              className="w-full h-full p-1 overflow-visible break-words focus:outline-none min-h-[1em]"
              style={{
                fontSize: `${(annotation.fontSize || 12) * scale}px`,
                color: annotation.color || '#000000',
                fontFamily: annotation.fontFamily || 'sans-serif',
                textAlign: annotation.alignment || 'left',
                fontWeight: annotation.bold ? 'bold' : 'normal',
                fontStyle: annotation.italic ? 'italic' : 'normal',
                textDecoration: [annotation.underline ? 'underline' : '', annotation.strikethrough ? 'line-through' : ''].filter(Boolean).join(' ') || 'none',
                lineHeight: annotation.lineHeight || 1.2,
                letterSpacing: `${annotation.letterSpacing || 0}px`,
              }}
              contentEditable={isSelected}
              suppressContentEditableWarning
              onBlur={(e) => onUpdate({ content: e.currentTarget.innerHTML })}
              onInput={(e) => onUpdate({ content: e.currentTarget.innerHTML }, false)}
            />
          ) : annotation.type === 'link' ? (
            <div
              className="w-full h-full"
              style={{
                border: annotation.linkConfig?.linkType !== 'Invisible rectangle' ? `${annotation.strokeWidth || 1}px ${annotation.strokeType || 'solid'} ${annotation.color || '#000'}` : 'none',
                backgroundColor: annotation.linkConfig?.highlightStyle === 'Invert' ? `${annotation.color}66` : 'transparent',
              }}
            />
          ) : (
            <img
              src={annotation.content}
              alt=""
              className="w-full h-full object-fill pointer-events-none"
            />
          )}
        </div>
      </div>

      {/* Visual bounding box for selection/hover */}
      <div
        className={cn(
          "absolute pointer-events-none z-[55]",
          isSelected ? "ring-2 ring-blue-500 shadow-lg" : "group-hover:ring-1 group-hover:ring-blue-300"
        )}
        style={{
          top: `${crop.top}%`,
          bottom: `${crop.bottom}%`,
          left: `${crop.left}%`,
          right: `${crop.right}%`,
        }}
      />

      {isSelected && (
        <>
          {/* Resize Handles */}
          {!annotation.isCropMode && ['top-left', 'top-right', 'bottom-left', 'bottom-right'].map(pos => (
            <div
              key={pos}
              onMouseDown={(e) => handleMouseDown(e, pos)}
              className={cn(
                "absolute w-3 h-3 bg-white border-2 border-blue-500 rounded-full z-[60]",
                pos === 'top-left' && "cursor-nwse-resize",
                pos === 'top-right' && "cursor-nesw-resize",
                pos === 'bottom-left' && "cursor-nesw-resize",
                pos === 'bottom-right' && "cursor-nwse-resize"
              )}
              style={{
                top: pos.includes('top') ? `${crop.top}%` : `${100 - crop.bottom}%`,
                left: pos.includes('left') ? `${crop.left}%` : `${100 - crop.right}%`,
                transform: 'translate(-50%, -50%)'
              }}
            />
          ))}

          {/* Crop Handles */}
          {annotation.isCropMode && (
            <div
              className="absolute pointer-events-none z-[65] border border-dashed border-white/50 ring-1 ring-black/50"
              style={{
                top: `${crop.top}%`,
                bottom: `${crop.bottom}%`,
                left: `${crop.left}%`,
                right: `${crop.right}%`,
              }}
            >
              {['top', 'right', 'bottom', 'left'].map(side => (
                <div
                  key={side}
                  onMouseDown={(e) => handleMouseDown(e, side, 'crop')}
                  className={cn(
                    "absolute bg-black/80 hover:bg-black transition-colors z-[70] pointer-events-auto",
                    side === 'top' || side === 'bottom' ? "h-1.5 w-8 cursor-ns-resize" : "w-1.5 h-8 cursor-ew-resize",
                    side === 'top' && "-top-1 left-1/2 -translate-x-1/2",
                    side === 'bottom' && "-bottom-1 left-1/2 -translate-x-1/2",
                    side === 'left' && "-left-1 top-1/2 -translate-y-1/2",
                    side === 'right' && "-right-1 top-1/2 -translate-y-1/2"
                  )}
                />
              ))}
              {/* Corner Crop Handles */}
              {['top-left', 'top-right', 'bottom-left', 'bottom-right'].map(corner => (
                <div
                  key={corner}
                  onMouseDown={(e) => handleMouseDown(e, corner, 'crop')}
                  className={cn(
                    "absolute w-4 h-4 border-black z-[75] bg-transparent pointer-events-auto",
                    corner === 'top-left' && "-top-1 -left-1 border-t-4 border-l-4 cursor-nwse-resize",
                    corner === 'top-right' && "-top-1 -right-1 border-t-4 border-r-4 cursor-nesw-resize",
                    corner === 'bottom-left' && "-bottom-1 -left-1 border-b-4 border-l-4 cursor-nesw-resize",
                    corner === 'bottom-right' && "-bottom-1 -right-1 border-b-4 border-r-4 cursor-nwse-resize"
                  )}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

interface AnnotationPropertiesProps {
  annotation: Annotation;
  pageWidth: number;
  pageHeight: number;
  zoom: number;
  onUpdate: (data: Partial<Annotation>, saveToHistory?: boolean) => void;
  onDelete: () => void;
  onReplace: () => void;
  onAlign: (type: string) => void;
  onClose: () => void;
  onEditLink?: () => void;
}

const AnnotationProperties = ({ annotation, pageWidth, pageHeight, zoom, onUpdate, onDelete, onReplace, onAlign, onClose, onEditLink }: AnnotationPropertiesProps) => {
  const [isAlignOpen, setIsAlignOpen] = useState(false);

  const applyCommand = (command: string) => {
    document.execCommand(command, false);
  };

  if (annotation.type === 'textbox' || annotation.type === 'link') {
    return (
      <div className="absolute bg-white border border-slate-300 shadow-xl rounded-lg flex p-1 z-[200] items-center gap-1"
        style={{
          top: `${Math.max(10, (annotation.y / 100) * pageHeight * zoom / 100 - 35)}px`,
          left: `${(annotation.x / 100) * pageWidth * zoom / 100}px`,
          transform: 'translateY(-100%)',
        }}
      >
        {annotation.type === 'link' && onEditLink && (
          <button onClick={onEditLink} className="p-1.5 hover:bg-slate-100 text-slate-600 rounded" title="Edit Link Settings">
            <Settings className="w-4 h-4" />
          </button>
        )}
        <button onClick={onDelete} className="p-1.5 hover:bg-red-50 text-red-500 rounded" title="Delete"><Trash2 className="w-4 h-4" /></button>
        <div className="w-[1px] h-4 bg-slate-200 mx-0.5" />
        <button onClick={onClose} className="p-1.5 hover:bg-slate-100 text-slate-500 rounded" title="Close"><X className="w-4 h-4" /></button>
      </div>
    );
  }

  return (
    <div className="absolute bg-white border border-slate-300 shadow-xl rounded-lg flex flex-col p-1 z-[200] min-w-[320px]"
      style={{
        top: `${Math.max(10, (annotation.y / 100) * pageHeight * zoom / 100 - 45)}px`,
        left: `${(annotation.x / 100) * pageWidth * zoom / 100}px`,
        transform: 'translateY(-100%)',
      }}
    >
      <div className="flex items-center gap-1 border-b border-slate-100 pb-1 mb-1 overflow-x-auto no-scrollbar">
        <button onClick={() => onUpdate({ rotation: ((annotation.rotation || 0) - 90 + 360) % 360 })} className="p-1.5 hover:bg-slate-100 rounded text-slate-600" title="Rotate Left"><RotateCcw className="w-4 h-4" /></button>
        <button onClick={() => onUpdate({ rotation: ((annotation.rotation || 0) + 90) % 360 })} className="p-1.5 hover:bg-slate-100 rounded text-slate-600" title="Rotate Right"><RotateCw className="w-4 h-4" /></button>
        <button onClick={() => onUpdate({ flipH: !annotation.flipH })} className="p-1.5 hover:bg-slate-100 rounded text-slate-600" title="Flip Horizontal"><FlipHorizontal className="w-4 h-4" /></button>
        <button onClick={() => onUpdate({ flipV: !annotation.flipV })} className="p-1.5 hover:bg-slate-100 rounded text-slate-600" title="Flip Vertical"><FlipVertical className="w-4 h-4" /></button>

        {annotation.type === 'image' && (
          <>
            <div className="w-[1px] h-4 bg-slate-200 mx-0.5" />
            <button onClick={onReplace} className="p-1.5 hover:bg-slate-100 rounded text-slate-600" title="Replace Image"><ImagePlus className="w-4 h-4" /></button>
            <button
              onClick={() => onUpdate({ isCropMode: !annotation.isCropMode })}
              className={cn("p-1.5 hover:bg-slate-100 rounded", annotation.isCropMode ? "bg-slate-200 text-blue-600" : "text-slate-600")}
              title="Crop Image"
            >
              <Crop className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
      <div className="flex items-center gap-1">
        <div className="relative">
          <button onClick={() => setIsAlignOpen(!isAlignOpen)} className="p-1.5 hover:bg-slate-100 rounded text-slate-600 flex items-center gap-1" title="Align Selected Item">
            <AlignCenter className="w-4 h-4" />
            <span className="text-[10px] font-medium">Align</span>
            <ChevronDown className="w-3 h-3" />
          </button>
          {isAlignOpen && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-slate-300 shadow-2xl rounded-md py-1 min-w-[180px] z-[110]">
              {[
                { label: 'Align Left', icon: AlignLeft, type: 'left' },
                { label: 'Align Right', icon: AlignRight, type: 'right' },
                { label: 'Align Top', icon: AlignVerticalJustifyStart, type: 'top' },
                { label: 'Align Bottom', icon: AlignVerticalJustifyEnd, type: 'bottom' },
                { label: 'Align Horizontal Center', icon: AlignHorizontalJustifyCenter, type: 'h-center' },
                { label: 'Align Vertical Center', icon: AlignVerticalJustifyCenter, type: 'v-center' },
                { divider: true },
                { label: 'Center Page Horizontally', icon: ArrowLeftRight, type: 'page-h' },
                { label: 'Center Page Vertically', icon: ArrowUpDown, type: 'page-v' },
                { label: 'Both', icon: Maximize2, type: 'page-both' }
              ].map((item, i) => 'divider' in item ? (
                <div key={i} className="h-[1px] bg-slate-100 my-1" />
              ) : (
                <button
                  key={i}
                  onClick={() => { onAlign(item.type!); setIsAlignOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-1.5 hover:bg-slate-100 text-left"
                >
                  <item.icon className="w-4 h-4 text-slate-500" />
                  <span className="text-[11px] text-slate-700">{item.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1" />
        <button onClick={onDelete} className="p-1.5 hover:bg-red-50 text-red-500 rounded" title="Delete"><Trash2 className="w-4 h-4" /></button>
        <button onClick={onClose} className="p-1.5 hover:bg-slate-100 text-slate-500 rounded" title="Close"><X className="w-4 h-4" /></button>
      </div>
    </div>
  );
};

export default function EditTool() {
  const {
    sharedFiles, setSharedFiles,
    addSharedFiles,
    activeFileId, setActiveFileId,
    hasImages, setHasImages,
    updateSharedFileData,
    zoom, setZoom,
    rotation, setRotation,
    viewRotation, setViewRotation,
    currentPage, setCurrentPage,
    totalPages, setTotalPages,
    activeTool, setActiveTool,
    pages, setPages,
    viewMode,
    activeMenu,
    fitMode, setFitMode,
    hideAnnotations,
    setActiveSidebarTab,
    setIsSidebarOpen,
    pushToHistory: pushToGlobalHistory,
    selectedPageIds, setSelectedPageIds,
    undo, redo,
    reorderPages,
    updateAnnotation,
    addAnnotation,
    removeAnnotation,
    attachments,
    searchQuery,
    searchMatchCase
  } = usePDF();

  const activeFile = sharedFiles.find(f => f.id === activeFileId);

  const [activeDraggedId, setActiveDraggedId] = useState<string | null>(null);
  const [localPages, setLocalPages] = useState(pages);

  // Sync localPages with global pages when not dragging
  useEffect(() => {
    if (!activeDraggedId) {
      setLocalPages(pages);
    }
  }, [pages, activeDraggedId]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const draggedId = event.active.id as string;
    setActiveDraggedId(draggedId);

    // If dragging a page that isn't selected, select only it
    if (!selectedPageIds.includes(draggedId)) {
      setSelectedPageIds([draggedId]);

      // Also update current page to match
      const pIdx = localPages.findIndex(p => p.id === draggedId);
      if (pIdx !== -1) {
        setCurrentPage(pIdx + 1);
      }
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDraggedId(null);

    if (over && active.id !== over.id) {
      const oldIndex = localPages.findIndex((p) => p.id === active.id);
      const newIndex = localPages.findIndex((p) => p.id === over.id);

      const currentPageId = localPages[currentPage - 1]?.id;
      const newOrder = arrayMove(localPages, oldIndex, newIndex);

      setLocalPages(newOrder);
      reorderPages(newOrder);

      // Keep current page synced with the page ID
      const updatedCurrentPageIndex = newOrder.findIndex(p => p.id === currentPageId);
      if (updatedCurrentPageIndex !== -1) {
        setCurrentPage(updatedCurrentPageIndex + 1);
      }

      const updatedFiles = sharedFiles.map(f =>
        f.id === activeFileId ? { ...f, pages: newOrder } : f
      );
      pushToGlobalHistory(updatedFiles);
    }
  };

  const draggedIndex = activeDraggedId ? localPages.findIndex(p => p.id === activeDraggedId) : -1;
  const [gridCols, setGridCols] = useState(5);

  useEffect(() => {
    const updateCols = () => {
      const w = window.innerWidth;
      if (w < 768) setGridCols(2);
      else if (w < 1024) setGridCols(3);
      else if (w < 1280) setGridCols(4);
      else setGridCols(5);
    };
    updateCols();
    window.addEventListener('resize', updateCols);
    return () => window.removeEventListener('resize', updateCols);
  }, []);

  const [selectionMenu, setSelectionMenu] = useState<{ x: number, y: number, width: number, height: number, text: string, pageIndex: number } | null>(null);
  const [selectedAnnId, setSelectedAnnId] = useState<string | null>(null);
  const [isDrawingTextBox, setIsDrawingTextBox] = useState(false);
  const [textBoxStart, setTextBoxStart] = useState<{ x: number, y: number } | null>(null);
  const [textBoxEnd, setTextBoxEnd] = useState<{ x: number, y: number } | null>(null);
  const [isDrawingLink, setIsDrawingLink] = useState(false);
  const [linkStart, setLinkStart] = useState<{ x: number, y: number } | null>(null);
  const [linkEnd, setLinkEnd] = useState<{ x: number, y: number } | null>(null);
  const [isDrawingAreaHighlight, setIsDrawingAreaHighlight] = useState(false);
  const [areaHighlightStart, setAreaHighlightStart] = useState<{ x: number, y: number } | null>(null);
  const [areaHighlightEnd, setAreaHighlightEnd] = useState<{ x: number, y: number } | null>(null);
  const [showLinkModal, setShowLinkModal] = useState<{ pageIndex: number, bounds: { x: number, y: number, width: number, height: number }, editAnnId?: string, initialConfig?: any } | null>(null);
  const [showUpdateLinksModal, setShowUpdateLinksModal] = useState(false);
  const [imageToPlace, setImageToPlace] = useState<{ content: string, width: number, height: number } | null>(null);
  const [placingImagePos, setPlacingImagePos] = useState<{ x: number, y: number } | null>(null);
  const [isSidebarMinimized, setIsSidebarMinimized] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddImageRequest = (replaceAnnId?: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const result = event.target?.result as string;
          if (replaceAnnId) {
            updateAnnotation(replaceAnnId, { content: result });
          } else {
            const img = new Image();
            img.onload = () => {
              setImageToPlace({ content: result, width: img.naturalWidth, height: img.naturalHeight });
            };
            img.src = result;
          }
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  useEffect(() => {
    if (activeTool === 'textbox') {
      setIsDrawingTextBox(true);
      setIsDrawingLink(false);
      setImageToPlace(null);
    } else if (activeTool === 'link') {
      setIsDrawingLink(true);
      setIsDrawingTextBox(false);
      setImageToPlace(null);
    } else if (activeTool === 'area-highlight') {
      setIsDrawingAreaHighlight(true);
      setIsDrawingTextBox(false);
      setIsDrawingLink(false);
      setImageToPlace(null);
    } else if (activeTool === 'image') {
      setIsDrawingTextBox(false);
      setIsDrawingLink(false);
      setIsDrawingAreaHighlight(false);
      handleAddImageRequest();
      setActiveTool('select');
    } else {
      setIsDrawingTextBox(false);
      setIsDrawingLink(false);
      setIsDrawingAreaHighlight(false);
      setImageToPlace(null);
    }
  }, [activeTool]);

  const getRelativeCoords = (e: React.MouseEvent | MouseEvent, pageIndex: number) => {
    const page = pages[pageIndex];
    if (!page) return { x: 0, y: 0 };

    const container = (e.currentTarget as HTMLElement).closest('.pdf-page-container');
    if (!container) return { x: 0, y: 0 };

    const rect = container.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    // Account for total rotation
    const totalRotation = (rotation + viewRotation + (page.rotation || 0)) % 360;
    const theta = -(totalRotation * Math.PI) / 180;

    // Map click point back to unrotated space
    const rx = (e.clientX - cx) * Math.cos(theta) - (e.clientY - cy) * Math.sin(theta) + cx;
    const ry = (e.clientX - cx) * Math.sin(theta) + (e.clientY - cy) * Math.cos(theta) + cy;

    const zoomScale = zoom / 100;
    const isRotated = totalRotation % 180 !== 0;
    const widthBase = page.width;
    const heightBase = page.height || page.width * 1.414;

    const unrotatedWidth = widthBase * zoomScale;
    const unrotatedHeight = heightBase * zoomScale;

    const unrotatedLeft = cx - unrotatedWidth / 2;
    const unrotatedTop = cy - unrotatedHeight / 2;

    const x = ((rx - unrotatedLeft) / unrotatedWidth) * 100;
    const y = ((ry - unrotatedTop) / unrotatedHeight) * 100;

    return { x, y };
  };

  const justAddedAnnotation = useRef(false);

  const handleEditToolMouseDown = (e: React.MouseEvent | React.PointerEvent, pageIndex: number) => {
    if ((e.target as HTMLElement).closest('.annotation-toolbar')) return;
    e.preventDefault();
    e.stopPropagation();

    if (e.type === 'pointerdown') {
      (e.target as HTMLElement).setPointerCapture((e as React.PointerEvent).pointerId);
    }

    const { x, y } = getRelativeCoords(e as any, pageIndex);

    if (imageToPlace) {
      if (justAddedAnnotation.current) return;
      const page = pages[pageIndex];
      const pw = page.width;
      const ph = page.height || page.width * 1.414;
      const aspect = imageToPlace.width / imageToPlace.height;

      let w_pct = 30;
      let h_pct = w_pct * (pw / ph) / aspect;
      if (h_pct > 30) {
        h_pct = 30;
        w_pct = h_pct * (ph / pw) * aspect;
      }

      const id = addAnnotation('image', pageIndex, x, y, imageToPlace.content, w_pct, h_pct);
      setSelectedAnnId(id);
      justAddedAnnotation.current = true;
      setImageToPlace(null);
      return;
    }

    if (isDrawingTextBox) {
      setTextBoxStart({ x, y });
      setTextBoxEnd({ x, y });
    } else if (isDrawingLink) {
      setLinkStart({ x, y });
      setLinkEnd({ x, y });
    } else if (isDrawingAreaHighlight) {
      setAreaHighlightStart({ x, y });
      setAreaHighlightEnd({ x, y });
    }
  };

  const handleEditToolMouseMove = (e: React.MouseEvent | React.PointerEvent, pageIndex: number) => {
    if (imageToPlace) {
      setPlacingImagePos({ x: (e as React.MouseEvent).clientX, y: (e as React.MouseEvent).clientY });
    }

    const { x, y } = getRelativeCoords(e as any, pageIndex);

    if (isDrawingTextBox && textBoxStart) {
      setTextBoxEnd({ x, y });
    } else if (isDrawingLink && linkStart) {
      setLinkEnd({ x, y });
    } else if (isDrawingAreaHighlight && areaHighlightStart) {
      setAreaHighlightEnd({ x, y });
    }
  };

  const handleEditToolMouseUp = (pageIndex: number, e?: React.PointerEvent) => {
    if (e && e.type === 'pointerup') {
      try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch (err) { }
    }

    if (isDrawingTextBox && textBoxStart && textBoxEnd) {
      const xLeft = Math.min(textBoxStart.x, textBoxEnd.x);
      const yTop = Math.min(textBoxStart.y, textBoxEnd.y);
      const width = Math.abs(textBoxEnd.x - textBoxStart.x);
      const height = Math.abs(textBoxEnd.y - textBoxStart.y);
      const x = xLeft + width / 2;
      const y = yTop + height / 2;

      if (width > 1 && height > 1) {
        const id = addAnnotation('textbox', pageIndex, x, y, 'Type here...', width, height);
        setSelectedAnnId(id);
        justAddedAnnotation.current = true;
      } else {
        // Just a click, add a default box
        const id = addAnnotation('textbox', pageIndex, x, y, 'Type here...', 30, 10);
        setSelectedAnnId(id);
        justAddedAnnotation.current = true;
      }
      setTextBoxStart(null);
      setTextBoxEnd(null);
      setIsDrawingTextBox(false);
    } else if (isDrawingLink && linkStart && linkEnd) {
      const xLeft = Math.min(linkStart.x, linkEnd.x);
      const yTop = Math.min(linkStart.y, linkEnd.y);
      const width = Math.abs(linkEnd.x - linkStart.x);
      const height = Math.abs(linkEnd.y - linkStart.y);
      const x = xLeft + width / 2;
      const y = yTop + height / 2;

      if (width > 1 && height > 1) {
        setShowLinkModal({ pageIndex, bounds: { x, y, width, height } });
      }
      setLinkStart(null);
      setLinkEnd(null);
      setIsDrawingLink(false);
    } else if (isDrawingAreaHighlight && areaHighlightStart && areaHighlightEnd) {
      const xLeft = Math.min(areaHighlightStart.x, areaHighlightEnd.x);
      const yTop = Math.min(areaHighlightStart.y, areaHighlightEnd.y);
      const width = Math.abs(areaHighlightEnd.x - areaHighlightStart.x);
      const height = Math.abs(areaHighlightEnd.y - areaHighlightStart.y);
      const x = xLeft + width / 2;
      const y = yTop + height / 2;

      if (width > 1 && height > 1) {
        const id = addAnnotation('highlight', pageIndex, x, y, '', width, height);
        setSelectedAnnId(id);
        justAddedAnnotation.current = true;
      }
      setAreaHighlightStart(null);
      setAreaHighlightEnd(null);
      setIsDrawingAreaHighlight(false);
      setActiveTool('select');
    }
  };

  const handleAlignAnnotation = (annId: string, type: string, pageWidth: number, pageHeight: number) => {
    const page = pages.find(p => p.annotations.some(a => a.id === annId));
    if (!page) return;
    const ann = page.annotations.find(a => a.id === annId);
    if (!ann) return;

    const updates: Partial<Annotation> = {};
    const w = ann.width || 100;
    const h = ann.height || 100;

    switch (type) {
      case 'left': updates.x = 0; break;
      case 'right': updates.x = 100 - w; break;
      case 'top': updates.y = 0; break;
      case 'bottom': updates.y = 100 - h; break;
      case 'h-center': updates.x = (100 - w) / 2; break;
      case 'v-center': updates.y = (100 - h) / 2; break;
      case 'page-h': updates.x = (100 - w) / 2; break;
      case 'page-v': updates.y = (100 - h) / 2; break;
      case 'page-both':
        updates.x = (100 - w) / 2;
        updates.y = (100 - h) / 2;
        break;
    }
    updateAnnotation(annId, updates);
  };
  const file = activeFile ? activeFile.file : null;

  // Mouse wheel zoom implementation
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      // Check if Ctrl or Cmd is held for zooming
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        e.stopPropagation();

        const delta = e.deltaY;
        const zoomStep = 10;

        setZoom(prevZoom => {
          if (delta < 0) {
            return Math.min(prevZoom + zoomStep, 500);
          } else {
            return Math.max(prevZoom - zoomStep, 10);
          }
        });
      }
    };

    // Attach to the container with non-passive listener to allow preventDefault
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false });
    }

    return () => {
      if (container) {
        container.removeEventListener('wheel', handleWheel);
      }
    };
  }, [setZoom, file]);

  // Sync current pages and page number to sharedFiles state before switching
  const prevActiveFileId = useRef<string | null>(null);

  useEffect(() => {
    if (prevActiveFileId.current && prevActiveFileId.current !== activeFileId) {
      updateSharedFileData(prevActiveFileId.current, {
        pages: [...pages],
        lastPage: currentPage
      });
    }

    if (activeFileId) {
      const targetFile = sharedFiles.find(f => f.id === activeFileId);
      if (targetFile) {
        setHasImages(!!targetFile.hasImages);
        if (targetFile.pages && targetFile.pages.length > 0) {
          setPages(targetFile.pages);
          setTotalPages(targetFile.pages.length);
          setCurrentPage(targetFile.lastPage || 1);
        } else if (targetFile.file) {
          loadPDF(targetFile.file);
        }
      }
    } else {
      setPages([]);
      setTotalPages(1);
      setCurrentPage(1);
    }

    prevActiveFileId.current = activeFileId;
  }, [activeFileId, activeFile?.file]);

  // Selection box states
  const [selectionBoxStart, setSelectionBoxStart] = useState<{ x: number, y: number } | null>(null);
  const [selectionBoxEnd, setSelectionBoxEnd] = useState<{ x: number, y: number } | null>(null);
  const [lastSelectionDist, setLastSelectionDist] = useState(0);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

  const handleUpdateNote = (pageIndex: number, annId: string, note: string) => {
    const updatedPages = [...pages];
    const targetPage = updatedPages[pageIndex];
    const annIdx = targetPage.annotations.findIndex(a => a.id === annId);
    if (annIdx !== -1) {
      targetPage.annotations[annIdx].note = note;
      updatePagesWithHistory(updatedPages);
    }
  };

  // Drag selection handlers
  const handleSelectMouseDown = (e: React.MouseEvent) => {
    if (activeMenu !== 'Page' || e.button !== 0) return;

    // Always reset selection dist on new mouse down
    setLastSelectionDist(0);

    // Only start selection if clicking on blank space, not on a page or a tool button
    const target = e.target as HTMLElement;
    if (target.closest('.pdf-page-container') || target.closest('button') || target.closest('[role="button"]') || target.closest('.reorder-item')) return;

    setSelectionBoxStart({ x: e.clientX, y: e.clientY });
    setSelectionBoxEnd({ x: e.clientX, y: e.clientY });

    // Clear selection if not holding shift/ctrl
    if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
      setSelectedPageIds([]);
    }
  };

  const handleSelectMouseMove = (e: React.MouseEvent) => {
    if (!selectionBoxStart || activeMenu !== 'Page') return;
    setSelectionBoxEnd({ x: e.clientX, y: e.clientY });
  };

  const handleSelectMouseUp = () => {
    if (selectionBoxStart && selectionBoxEnd) {
      const dist = Math.sqrt(Math.pow(selectionBoxEnd.x - selectionBoxStart.x, 2) + Math.pow(selectionBoxEnd.y - selectionBoxStart.y, 2));
      setLastSelectionDist(dist);
    }
    setSelectionBoxStart(null);
    setSelectionBoxEnd(null);
  };

  const {
    rotateSelectedPages,
    deleteSelectedPages
  } = usePDF();

  useEffect(() => {
    if (!selectionBoxStart || !selectionBoxEnd || activeMenu !== 'Page' || !scrollContainerRef.current) return;

    // Only trigger selection box if we've moved significantly (e.g. 5px)
    const dist = Math.sqrt(Math.pow(selectionBoxEnd.x - selectionBoxStart.x, 2) + Math.pow(selectionBoxEnd.y - selectionBoxStart.y, 2));
    if (dist < 5) return;

    const scrollContainer = scrollContainerRef.current;
    const rect = scrollContainer.getBoundingClientRect();

    // Convert scroll container relative coords to viewport coords for calc
    const x1 = Math.min(selectionBoxStart.x, selectionBoxEnd.x);
    const x2 = Math.max(selectionBoxStart.x, selectionBoxEnd.x);
    const y1 = Math.min(selectionBoxStart.y, selectionBoxEnd.y);
    const y2 = Math.max(selectionBoxStart.y, selectionBoxEnd.y);

    const overlappingPageIds: string[] = [];
    const pageElements = scrollContainer.querySelectorAll('.pdf-page-container');

    pageElements.forEach((el) => {
      const elRect = el.getBoundingClientRect();
      const pageId = el.getAttribute('data-page-id');

      if (pageId && !(elRect.right < x1 || elRect.left > x2 || elRect.bottom < y1 || elRect.top > y2)) {
        overlappingPageIds.push(pageId);
      }
    });

    setSelectedPageIds(overlappingPageIds);
  }, [selectionBoxEnd]);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);

  // Zoom and Fit Logic
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || pages.length === 0 || fitMode === 'none') return;

    const updateZoomFromFit = () => {
      const padding = 64; // p-8
      const availableWidth = container.clientWidth - padding;
      const availableHeight = container.clientHeight - padding;

      // In continuous mode, we don't want the zoom to jump between pages
      // Base it on the first page or the max width found so far.
      let targetPage = pages[0];
      if (viewMode === 'single' || viewMode === 'grid') {
        const pageIndex = Math.max(0, currentPage - 1);
        targetPage = pages[pageIndex] || pages[0];
      }

      if (!targetPage || !targetPage.width) return;

      const isRotated = (rotation + viewRotation + (targetPage.rotation || 0)) % 180 !== 0;
      const pageWidth = isRotated ? (targetPage.height || targetPage.width * 1.414) : targetPage.width;
      const pageHeight = isRotated ? targetPage.width : (targetPage.height || targetPage.width * 1.414);

      if (fitMode === 'width') {
        const newZoom = (availableWidth / pageWidth) * 100;
        setZoom(Math.round(newZoom));
      } else if (fitMode === 'page') {
        const zoomW = availableWidth / pageWidth;
        const zoomH = availableHeight / pageHeight;
        const newZoom = Math.min(zoomW, zoomH) * 100;
        setZoom(Math.round(newZoom));
      }
    };

    updateZoomFromFit();

    const resizeObserver = new ResizeObserver(updateZoomFromFit);
    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [fitMode, pages, currentPage, viewMode, rotation, viewRotation]);

  const isProgrammaticScroll = useRef(false);
  const navigationSource = useRef<'scroll' | 'direct'>('direct');

  useEffect(() => {
    const isAnnotationTool = ['highlight', 'underline', 'strikethrough', 'squiggly', 'caret'].includes(activeTool);
    if (!isAnnotationTool) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return;

    const range = selection.getRangeAt(0);
    const pageContainer = (range.commonAncestorContainer.nodeType === 3
      ? range.commonAncestorContainer.parentElement
      : range.commonAncestorContainer as HTMLElement)?.closest('.pdf-page-container');

    if (!pageContainer) return;

    const pageId = pageContainer.getAttribute('data-page-id');
    const pageIndex = pages.findIndex(p => p.id === pageId);
    if (pageIndex === -1) return;

    const rect = range.getBoundingClientRect();
    const pRect = pageContainer.getBoundingClientRect();

    // Calculate relative coordinates and dimensions
    const relX = ((rect.left + rect.width / 2 - pRect.left) / pRect.width) * 100;
    const relY = ((rect.top + rect.height / 2 - pRect.top) / pRect.height) * 100;

    if (rect.width > 0 && rect.height > 0) {
      addAnnotation(activeTool as any, pageIndex, relX, relY, selection.toString(), rect.width, rect.height);
      selection.removeAllRanges();
    }
  }, [activeTool, pages]); // Added pages to dependency just in case, though it might be stable

  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
        if (selectionMenu) setSelectionMenu(null);
        return;
      }

      const isAnnotationTool = ['highlight', 'underline', 'strikethrough', 'squiggly', 'caret'].includes(activeTool);
      const isSelectMode = activeTool === 'select' || activeTool === 'edit' || isAnnotationTool;

      if (!isSelectMode || activeMenu === 'Page') {
        if (selectionMenu) setSelectionMenu(null);
        return;
      }

      const text = selection.toString().trim();
      if (!text) {
        return; // Don't clear if just whitespace, might be transitional
      }

      try {
        const range = selection.getRangeAt(0);
        const startNode = range.startContainer.nodeType === 3 ? range.startContainer.parentElement : range.startContainer as HTMLElement;

        // If we are in edit mode and selecting inside a contentEditable, we might want to skip the selection menu
        // to avoid re-renders that reset the caret position.
        const isEditableElement = startNode?.closest('[contenteditable="true"]');
        if (activeTool === 'edit' && isEditableElement) {
          if (selectionMenu) setSelectionMenu(null);
          return;
        }

        const pageContainer = startNode?.closest('.pdf-page-container') as HTMLElement;

        if (pageContainer) {
          const rect = range.getBoundingClientRect();
          const pageId = pageContainer.getAttribute('data-page-id');
          const pageIndex = pages.findIndex(p => p.id === pageId);

          if (isAnnotationTool) {
            // Real-time annotation is handled on mouseup usually, 
            // but for selection menu we just set the state
          }

          setSelectionMenu({
            x: rect.left + rect.width / 2,
            y: rect.top,
            width: rect.width,
            height: rect.height,
            text,
            pageIndex
          });
        }
      } catch (err) {
        // Selection might be invalid during change
      }
    };

    const handleMouseUp = () => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
        if (selectionMenu) setSelectionMenu(null);
        return;
      }

      const isAnnotationTool = ['highlight', 'underline', 'strikethrough', 'squiggly', 'caret'].includes(activeTool);
      if (isAnnotationTool) {
        const text = selection.toString().trim();
        if (text) {
          try {
            const range = selection.getRangeAt(0);
            const startNode = range.startContainer.nodeType === 3 ? range.startContainer.parentElement : range.startContainer as HTMLElement;
            const pageContainer = startNode?.closest('.pdf-page-container') as HTMLElement;
            if (pageContainer) {
              const rect = range.getBoundingClientRect();
              const pageRect = pageContainer.getBoundingClientRect();
              const pageId = pageContainer.getAttribute('data-page-id');
              const pageIndex = pages.findIndex(p => p.id === pageId);
              const relX = ((rect.left + rect.width / 2 - pageRect.left) / pageRect.width) * 100;
              const relY = ((rect.top + rect.height / 2 - pageRect.top) / pageRect.height) * 100;
              addAnnotation(activeTool as any, pageIndex, relX, relY, text, rect.width, rect.height);
              selection.removeAllRanges();
              if (selectionMenu) setSelectionMenu(null);
            }
          } catch (err) { }
        }
      }
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [activeTool, activeMenu, pages]);

  useEffect(() => {
    // Also clear selection menu when clicking elsewhere
    const handleClick = (e: MouseEvent) => {
      if (selectionMenu && !(e.target as HTMLElement).closest('.pdf-page-container') && !(e.target as HTMLElement).closest('[data-selection-menu]')) {
        setSelectionMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [selectionMenu]); // Removed selectionMenu from dependencies to avoid listener swap loops

  // Auto-scroll to current page when it changes from UI/Buttons
  const lastNavTime = useRef(0);

  useEffect(() => {
    if (!scrollContainerRef.current || pages.length === 0) return;

    if (viewMode === 'continuous') {
      if (navigationSource.current === 'direct') {
        const container = scrollContainerRef.current;
        const containers = container.querySelectorAll('.pdf-page-container');
        const targetContainer = containers[currentPage - 1] as HTMLElement;

        if (targetContainer) {
          isProgrammaticScroll.current = true;
          lastNavTime.current = Date.now();
          targetContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });

          const timeout = setTimeout(() => {
            isProgrammaticScroll.current = false;
          }, 1000);
          return () => clearTimeout(timeout);
        }
      }
      navigationSource.current = 'direct';
    } else if (viewMode === 'single') {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [currentPage, viewMode, pages.length]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (pages.length === 0 || isProgrammaticScroll.current || viewMode !== 'continuous') return;

    // Ignore scroll events immediately following a direct navigation
    if (Date.now() - lastNavTime.current < 500) return;

    const container = e.currentTarget;
    const children = container.querySelectorAll('.pdf-page-container');
    let activePage = currentPage;
    let maxVisibleHeight = 0;

    const containerRect = container.getBoundingClientRect();

    children.forEach((child, idx) => {
      const rect = child.getBoundingClientRect();

      const visibleTop = Math.max(rect.top, containerRect.top);
      const visibleBottom = Math.min(rect.bottom, containerRect.bottom);
      const visibleHeight = Math.max(0, visibleBottom - visibleTop);

      if (visibleHeight > maxVisibleHeight) {
        maxVisibleHeight = visibleHeight;
        activePage = idx + 1;
      }
    });

    if (activePage !== currentPage) {
      navigationSource.current = 'scroll';
      setCurrentPage(activePage);
    }
  };

  // Wheel listener for single page mode scrolling
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || viewMode !== 'single') return;

    let wheelAccumulator = 0;
    let isLocked = false;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (isLocked) return;

      wheelAccumulator += e.deltaY;

      if (Math.abs(wheelAccumulator) > 100) {
        if (wheelAccumulator > 0 && currentPage < totalPages) {
          setCurrentPage(currentPage + 1);
          isLocked = true;
          wheelAccumulator = 0;
          setTimeout(() => { isLocked = false; }, 400);
        } else if (wheelAccumulator < 0 && currentPage > 1) {
          setCurrentPage(currentPage - 1);
          isLocked = true;
          wheelAccumulator = 0;
          setTimeout(() => { isLocked = false; }, 400);
        } else {
          wheelAccumulator = 0;
        }
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [viewMode, currentPage, totalPages, setCurrentPage]);

  // PDF Merge Listener
  useEffect(() => {
    const handleMergeRequest = async (e: any) => {
      const files = e.detail.files as File[];
      if (!files || files.length === 0) return;

      setIsProcessing(true);
      try {
        const mergedPdf = await PDFDocument.create();

        for (const fileItem of files) {
          const arrayBuffer = await fileItem.arrayBuffer();
          const doc = await PDFDocument.load(arrayBuffer);
          const copiedPages = await mergedPdf.copyPages(doc, doc.getPageIndices());
          copiedPages.forEach((page) => mergedPdf.addPage(page));
        }

        const mergedBytes = await mergedPdf.save();
        const mergedFile = new File([mergedBytes as any], "merged.pdf", { type: "application/pdf" });

        setCurrentPage(1);
        addSharedFiles([mergedFile]);
      } catch (error) {
        console.error('Error merging PDFs:', error);
      } finally {
        setIsProcessing(false);
      }
    };

    window.addEventListener('pdf-merge-request', handleMergeRequest);
    return () => window.removeEventListener('pdf-merge-request', handleMergeRequest);
  }, [setSharedFiles]);

  // Keydown listener for shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      if (cmdOrCtrl) {
        const target = e.target as HTMLElement;
        const isEditableElement = target.isContentEditable || target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

        if (e.key.toLowerCase() === 'z' && !isEditableElement) {
          e.preventDefault();
          if (e.shiftKey) {
            redo();
          } else {
            undo();
          }
        }

        // Select All: Ctrl+A (only in Page menu)
        if (e.key.toLowerCase() === 'a' && activeMenu === 'Page') {
          e.preventDefault();
          setSelectedPageIds(pages.map(p => p.id));
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeMenu, pages, setSelectedPageIds, undo, redo]);

  const updatePagesWithHistory = (newPages: PageData[]) => {
    setPages(newPages);
    if (activeFileId) {
      const updatedFiles = sharedFiles.map(f =>
        f.id === activeFileId ? { ...f, pages: newPages } : f
      );
      setSharedFiles(updatedFiles);
      pushToGlobalHistory(updatedFiles);
    }
  };

  const resetHistory = (initialPages: PageData[]) => {
    setPages(initialPages);
  };

  const [selectedTextItem, setSelectedTextItem] = useState<{ pageId: string, itemIdx: number } | null>(null);

  const handleTextItemSelect = (pageId: string, itemIdx: number) => {
    if (selectedTextItem?.pageId === pageId && selectedTextItem?.itemIdx === itemIdx) return;
    setSelectedTextItem({ pageId, itemIdx });
  };

  const updateSelectedTextItem = (updates: any) => {
    if (!selectedTextItem) return;

    const updatedPages = pages.map(p => {
      if (p.id === selectedTextItem.pageId) {
        const newItems = [...p.textItems!];
        newItems[selectedTextItem.itemIdx] = {
          ...newItems[selectedTextItem.itemIdx],
          ...updates,
          wasEdited: true
        };
        return { ...p, textItems: newItems };
      }
      return p;
    });

    updatePagesWithHistory(updatedPages);
  };

  const getSelectedTextItemData = () => {
    if (!selectedTextItem) return null;
    const page = pages.find(p => p.id === selectedTextItem.pageId);
    return page?.textItems?.[selectedTextItem.itemIdx];
  };

  const applyFormatting = (command: string) => {
    if (typeof document !== 'undefined') {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
        // If no selection, fall back to the old behavior (toggle for entire box)
        if (command === 'superscript') updateSelectedTextItem({ superscript: !activeItem?.superscript, subscript: false });
        if (command === 'subscript') updateSelectedTextItem({ subscript: !activeItem?.subscript, superscript: false });
        return;
      }

      document.execCommand(command, false);

      // Update state from the innerHTML of the active editable div
      const activeEl = document.activeElement as HTMLElement;
      if (activeEl && activeEl.isContentEditable) {
        const pId = activeEl.closest('.pdf-page-container')?.getAttribute('data-page-id');
        const itemIdx = parseInt(activeEl.getAttribute('data-item-idx') || '-1');

        if (pId && itemIdx !== -1) {
          updateSelectedTextItem({ str: activeEl.innerHTML });
        }
      }
    }
  };

  const activeItem = getSelectedTextItemData();
  const selectedAnnotation = pages.flatMap(p => p.annotations || []).find(a => a.id === selectedAnnId);
  const activeTextProps = activeItem || (selectedAnnotation?.type === 'textbox' ? selectedAnnotation : null);

  const updateActiveTextProps = (updates: Partial<any>) => {
    if (activeItem) {
      updateSelectedTextItem(updates);
    } else if (selectedAnnotation && selectedAnnotation.type === 'textbox') {
      updateAnnotation(selectedAnnotation.id, updates);
    }
  };
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [headerText, setHeaderText] = useState('');
  const [footerText, setFooterText] = useState('');
  const [headerPos, setHeaderPos] = useState<'left' | 'center' | 'right'>('center');
  const [footerPos, setFooterPos] = useState<'left' | 'center' | 'right'>('center');
  const [headerColor, setHeaderColor] = useState('#475569');
  const [footerColor, setFooterColor] = useState('#475569');
  const [headerFontSize, setHeaderFontSize] = useState(10);
  const [footerFontSize, setFooterFontSize] = useState(10);
  const [globalFontSize, setGlobalFontSize] = useState(10);
  const [addPageNumbers, setAddPageNumbers] = useState(false);
  const [pageNumberFormat, setPageNumberFormat] = useState('Page {n}');
  const [pageNumberPos, setPageNumberPos] = useState<'header' | 'footer'>('footer');
  const [pageNumberAlign, setPageNumberAlign] = useState<'left' | 'center' | 'right'>('right');

  const [isDraggingHand, setIsDraggingHand] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });

  // Drawing states for shapes
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingStart, setDrawingStart] = useState<{ x: number, y: number, pageIndex: number } | null>(null);
  const [currentDrawingRect, setCurrentDrawingRect] = useState<{ x: number, y: number, width: number, height: number } | null>(null);
  const [tempPoints, setTempPoints] = useState<{ x: number, y: number }[]>([]);
  const [isFreehandDrawing, setIsFreehandDrawing] = useState(false);

  const [isResizing, setIsResizing] = useState<string | null>(null);
  const [resizeStart, setResizeStart] = useState<{ x: number, y: number, annId: string, pageIndex: number, originalBox: { x: number, y: number, w: number, h: number } } | null>(null);

  const handleResizeMouseDown = (e: React.MouseEvent, handle: string, ann: Annotation, pageIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(handle);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      annId: ann.id,
      pageIndex,
      originalBox: {
        x: ann.x,
        y: ann.y,
        w: ann.originalWidth || 0,
        h: ann.originalHeight || 0
      }
    });
  };

  const handleResizeMouseMove = (e: React.MouseEvent) => {
    if (!isResizing || !resizeStart) return;

    const dx = e.clientX - resizeStart.x;
    const dy = e.clientY - resizeStart.y;

    const targetPage = pages[resizeStart.pageIndex];
    if (!targetPage) return;

    const zoomScale = zoom / 100;
    const pageW = targetPage.width;
    const pageH = targetPage.height || targetPage.width * 1.414;

    const dxReal = (dx / zoomScale);
    const dyReal = (dy / zoomScale);

    const updatedPages = [...pages];
    const targetP = updatedPages[resizeStart.pageIndex];
    const annIdx = targetP.annotations.findIndex(a => a.id === resizeStart.annId);
    if (annIdx === -1) return;
    const ann = { ...targetP.annotations[annIdx] };

    let newX = resizeStart.originalBox.x;
    let newY = resizeStart.originalBox.y;
    let newW = resizeStart.originalBox.w;
    let newH = resizeStart.originalBox.h;

    const minSize = 10;

    if (isResizing.includes('right')) {
      newW = Math.max(minSize, resizeStart.originalBox.w + dxReal);
    }
    if (isResizing.includes('left')) {
      const delta = Math.min(resizeStart.originalBox.w - minSize, dxReal);
      newX = resizeStart.originalBox.x + (delta / pageW * 100);
      newW = resizeStart.originalBox.w - delta;
    }
    if (isResizing.includes('bottom')) {
      newH = Math.max(minSize, resizeStart.originalBox.h + dyReal);
    }
    if (isResizing.includes('top')) {
      const delta = Math.min(resizeStart.originalBox.h - minSize, dyReal);
      newY = resizeStart.originalBox.y + (delta / pageH * 100);
      newH = resizeStart.originalBox.h - delta;
    }

    ann.x = newX;
    ann.y = newY;
    ann.originalWidth = newW;
    ann.originalHeight = newH;

    targetP.annotations[annIdx] = ann;
    setPages(updatedPages);
  };

  const handleResizeMouseUp = () => {
    if (isResizing) {
      updatePagesWithHistory(pages);
      setIsResizing(null);
      setResizeStart(null);
    }
  };

  const handleHandMouseDown = (e: React.MouseEvent) => {
    if (activeTool !== 'hand' || !scrollContainerRef.current) return;
    setIsDraggingHand(true);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      scrollLeft: scrollContainerRef.current.scrollLeft,
      scrollTop: scrollContainerRef.current.scrollTop
    });
  };

  const handleHandMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingHand || !scrollContainerRef.current) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    scrollContainerRef.current.scrollLeft = dragStart.scrollLeft - dx;
    scrollContainerRef.current.scrollTop = dragStart.scrollTop - dy;
  };

  const handleHandMouseUp = () => {
    setIsDraggingHand(false);
  };

  const getUnrotatedCoords = (clientX: number, clientY: number, container: HTMLElement, pageIndex: number) => {
    const rect = container.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const targetPage = pages[pageIndex];
    const totalRotation = rotation + viewRotation + (targetPage?.rotation || 0);
    const theta = -(totalRotation * Math.PI) / 180;

    const rx = (clientX - cx) * Math.cos(theta) - (clientY - cy) * Math.sin(theta) + cx;
    const ry = (clientX - cx) * Math.sin(theta) + (clientY - cy) * Math.cos(theta) + cy;

    const zoomScale = zoom / 100;
    const unrotatedWidth = targetPage.width * zoomScale;
    const unrotatedHeight = (targetPage.height || targetPage.width * 1.414) * zoomScale;

    const unrotatedLeft = cx - unrotatedWidth / 2;
    const unrotatedTop = cy - unrotatedHeight / 2;

    const x = ((rx - unrotatedLeft) / unrotatedWidth) * 100;
    const y = ((ry - unrotatedTop) / unrotatedHeight) * 100;

    return { x, y };
  };

  const handleDrawingMouseDown = (e: React.MouseEvent, pageIndex: number) => {
    const isShapeTool = ['square', 'circle', 'cloud', 'pentagon', 'spline', 'line', 'arrow', 'pencil'].includes(activeTool as string);
    if (!isShapeTool) return;

    e.preventDefault();
    e.stopPropagation();

    const coords = getUnrotatedCoords(e.clientX, e.clientY, e.currentTarget as HTMLElement, pageIndex);
    setSelectedAnnId(null);

    if (activeTool === 'pencil') {
      setIsFreehandDrawing(true);
      setTempPoints([coords]);
      setDrawingStart({ ...coords, pageIndex });
    } else if (['line', 'arrow', 'spline'].includes(activeTool as string)) {
      if (tempPoints.length === 0) {
        setTempPoints([coords]);
        setDrawingStart({ ...coords, pageIndex });
        setIsDrawing(true);
      } else {
        // Finish line/arrow/spline on second click
        finishDrawing([...tempPoints, coords], pageIndex);
      }
    } else if (['cloud', 'pentagon'].includes(activeTool as string)) {
      if (tempPoints.length === 0) {
        setTempPoints([coords]);
        setDrawingStart({ ...coords, pageIndex });
        setIsDrawing(true);
      } else {
        setTempPoints([...tempPoints, coords]);
      }
    } else {
      // Traditional drag for square/circle
      setIsDrawing(true);
      setDrawingStart({ ...coords, pageIndex });
      setCurrentDrawingRect({ ...coords, width: 0, height: 0 });
    }
  };

  const handleDrawingMouseMove = (e: React.MouseEvent) => {
    if ((!isDrawing && !isFreehandDrawing) || !drawingStart) return;
    e.stopPropagation();

    const pageContainers = document.querySelectorAll('.pdf-page-container');
    const container = pageContainers[drawingStart.pageIndex] as HTMLElement;
    if (!container) return;

    const coords = getUnrotatedCoords(e.clientX, e.clientY, container, drawingStart.pageIndex);

    if (isFreehandDrawing) {
      setTempPoints(prev => [...prev, coords]);
    } else if (['line', 'arrow', 'spline', 'cloud', 'pentagon'].includes(activeTool as string)) {
      // Just for preview
      setCurrentDrawingRect({ x: coords.x, y: coords.y, width: 0, height: 0 }); // Use coords for cursor update if needed
    } else {
      // Drag behavior
      const width = coords.x - drawingStart.x;
      const height = coords.y - drawingStart.y;

      setCurrentDrawingRect({
        x: Math.min(drawingStart.x, coords.x),
        y: Math.min(drawingStart.y, coords.y),
        width: Math.abs(width),
        height: Math.abs(height)
      });
    }
  };

  const handleDrawingMouseUp = (e: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (isFreehandDrawing) {
      finishDrawing(tempPoints, drawingStart?.pageIndex || 0);
      setIsFreehandDrawing(false);
      return;
    }

    if (['square', 'circle'].includes(activeTool as string)) {
      if (currentDrawingRect && (currentDrawingRect.width > 0.5 || currentDrawingRect.height > 0.5)) {
        finishDrawing([], drawingStart?.pageIndex || 0, currentDrawingRect);
      } else {
        resetDrawing();
      }
    }
    // line, arrow, spline, cloud, pentagon wait for second click or double click
  };

  const handleDrawingDoubleClick = (e: React.MouseEvent, pageIndex: number) => {
    e.stopPropagation();
    if (['cloud', 'pentagon'].includes(activeTool as string)) {
      finishDrawing(tempPoints, pageIndex);
    }
  };

  const resetDrawing = () => {
    setIsDrawing(false);
    setIsFreehandDrawing(false);
    setDrawingStart(null);
    setCurrentDrawingRect(null);
    setTempPoints([]);
  };

  const finishDrawing = (points: { x: number, y: number }[], pageIndex: number, rect?: { x: number, y: number, width: number, height: number }) => {
    const targetPage = pages[pageIndex];
    if (!targetPage) return resetDrawing();

    const pageW = targetPage.width;
    const pageH = targetPage.height || targetPage.width * 1.414;

    let finalX = rect?.x || 0;
    let finalY = rect?.y || 0;
    let finalWidth = rect?.width ? (rect.width * pageW) / 100 : 0;
    let finalHeight = rect?.height ? (rect.height * pageH) / 100 : 0;
    let normalizedPoints: { x: number, y: number }[] | undefined = undefined;

    if (points.length > 0) {
      const xs = points.map(p => p.x);
      const ys = points.map(p => p.y);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);

      finalX = minX;
      finalY = minY;
      const widthPercent = maxX - minX;
      const heightPercent = maxY - minY;

      finalWidth = (widthPercent * pageW) / 100;
      finalHeight = (heightPercent * pageH) / 100;

      // Minimum size for empty dimensions
      if (finalWidth < 2) finalWidth = 2;
      if (finalHeight < 2) finalHeight = 2;

      const normWidthPercent = (finalWidth / pageW) * 100;
      const normHeightPercent = (finalHeight / pageH) * 100;

      normalizedPoints = points.map(p => ({
        x: normWidthPercent === 0 ? 50 : ((p.x - minX) / normWidthPercent) * 100,
        y: normHeightPercent === 0 ? 50 : ((p.y - minY) / normHeightPercent) * 100
      }));
    }

    const newAnn: Annotation = {
      id: `ann-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'shape',
      x: finalX,
      y: finalY,
      originalWidth: finalWidth,
      originalHeight: finalHeight,
      points: normalizedPoints,
      content: activeTool as string,
      color: '#3b82f6',
      backgroundColor: 'transparent',
      strokeWidth: 2,
      strokeType: 'solid',
      opacity: 1,
      author: 'ajay',
      createdAt: Date.now()
    };

    const updatedPages = [...pages];
    updatedPages[pageIndex] = {
      ...updatedPages[pageIndex],
      annotations: [...updatedPages[pageIndex].annotations, newAnn]
    };
    updatePagesWithHistory(updatedPages);
    setSelectedAnnId(newAnn.id);
    setActiveTool('select');
    resetDrawing();
  };

  const handleAnnotateSelection = (type: Annotation['type'], color?: string) => {
    if (!selectionMenu) return;

    const { x, y, width, height, text, pageIndex } = selectionMenu;
    const container = previewContainerRef.current;
    if (!container) return;

    const updatedPages = [...pages];
    const targetPage = updatedPages[pageIndex];
    if (!targetPage) return;

    const pageContainers = document.querySelectorAll('.pdf-page-container');
    const pageContainer = pageContainers[pageIndex] as HTMLElement;
    if (!pageContainer) return;
    const pageRect = pageContainer.getBoundingClientRect();

    // Calculate center of the page container in screen space
    const cx = pageRect.left + pageRect.width / 2;
    const cy = pageRect.top + pageRect.height / 2;

    // The point we want to map (center of selection)
    const targetX = type === 'caret' ? (x + width / 2) : x;
    const targetY = y + height / 2;

    // Rotate the point back to 0 degrees to get the original page coordinates
    const theta = -(rotation * Math.PI) / 180;
    const rotatedX = (targetX - cx) * Math.cos(theta) - (targetY - cy) * Math.sin(theta) + cx;
    const rotatedY = (targetX - cx) * Math.sin(theta) + (targetY - cy) * Math.cos(theta) + cy;

    // Now calculate relative to the top-left of the UNROTATED page container
    // When unrotated, the page container is centered at (cx, cy) and has dimensions (zoomWidth, zoomHeight)
    const zoomScale = zoom / 100;
    const unrotatedWidth = targetPage.width * zoomScale;
    const unrotatedHeight = (targetPage.height || targetPage.width * 1.414) * zoomScale;

    const unrotatedLeft = cx - unrotatedWidth / 2;
    const unrotatedTop = cy - unrotatedHeight / 2;

    const relativeX = ((rotatedX - unrotatedLeft) / unrotatedWidth) * 100;
    const relativeY = ((rotatedY - unrotatedTop) / unrotatedHeight) * 100;

    // Use black for most things, yellow for highlights unless specified
    const defaultColor = type === 'highlight' ? '#FFEB3B' : '#000000';
    const finalColor = color || defaultColor;

    const newAnn: Annotation = {
      id: crypto.randomUUID(),
      type: type,
      x: relativeX,
      y: relativeY,
      content: (type === 'text' || type === 'caret') ? '' : text,
      color: type === 'text' ? '#000000' : finalColor,
      backgroundColor: type === 'text' ? '#FFF9C4' : undefined,
      opacity: type === 'highlight' ? 0.3 : 1,
      fontSize: 12,
      originalWidth: type === 'caret' ? 20 : (width / (zoom / 100)),
      originalHeight: type === 'caret' ? 20 : (height / (zoom / 100)),
      author: 'ajay',
      createdAt: Date.now()
    };

    targetPage.annotations.push(newAnn);
    updatePagesWithHistory(updatedPages);
    setSelectionMenu(null);
    window.getSelection()?.removeAllRanges();
  };

  const loadPDF = async (pdfFile: File) => {
    setIsProcessing(true);
    try {
      const arrayBuffer = await pdfFile.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      const numPages = pdf.numPages;
      setTotalPages(numPages);
      const loadedPages: PageData[] = [];
      let imagesDetected = false;

      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1.0 }); // Use 1.0 for base dimensions
        const highResViewport = page.getViewport({ scale: 2.5 }); // High resolution for clear view

        // Detect images on page
        const ops = await page.getOperatorList();
        const pageHasImages = ops.fnArray.some(fn =>
          fn === (pdfjsLib as any).OPS.paintImageXObject ||
          fn === (pdfjsLib as any).OPS.paintInlineImageXObject
        );
        if (pageHasImages) imagesDetected = true;

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) continue;

        canvas.height = highResViewport.height;
        canvas.width = highResViewport.width;

        await page.render({ canvasContext: context, viewport: highResViewport }).promise;

        const textContent = await page.getTextContent();

        // Sample colors from the canvas for better matching
        const canvasForColor = document.createElement('canvas');
        canvasForColor.width = canvas.width;
        canvasForColor.height = canvas.height;
        const ctxColor = canvasForColor.getContext('2d');
        if (ctxColor) {
          ctxColor.drawImage(canvas, 0, 0);
        }

        const textItems = textContent.items.map((item: any) => {
          const [sx, skx, sky, sy, tx, ty] = item.transform;
          const fontSize = Math.abs(sy) || Math.abs(sx) || 12;

          // Guess font style from fontName
          const fontName = item.fontName?.toLowerCase() || '';
          const isBold = fontName.includes('bold') || fontName.includes('700') || fontName.includes('800') || fontName.includes('black');
          const isItalic = fontName.includes('italic') || fontName.includes('oblique') || fontName.includes('slanted');
          const isSerif = fontName.includes('serif') || fontName.includes('times') || fontName.includes('roman') || fontName.includes('mincho') || fontName.includes('batang');

          // Sample color from canvas at the text position
          let sampleColor = '#000000';
          if (ctxColor) {
            // Map PDF coords to canvas coords
            // PDF coords (tx, ty) are from bottom-left
            // Canvas coords are from top-left
            const scaleX = canvas.width / viewport.width;
            const scaleY = canvas.height / viewport.height;
            const canvasX = tx * scaleX;
            const canvasY = canvas.height - (ty * scaleY);

            try {
              const pixel = ctxColor.getImageData(Math.max(0, canvasX), Math.max(0, canvasY - (fontSize * scaleY / 2)), 1, 1).data;
              // Simple check: if it's very light (background), try slightly above or below
              // but usually tx, ty is the baseline, so ty - fontSize/2 is the middle of the char
              sampleColor = `#${((1 << 24) | (pixel[0] << 16) | (pixel[1] << 8) | pixel[2]).toString(16).slice(1)}`;

              // If we sampled white (or very light), it might be the background. Default to black if unsure.
              if (pixel[0] > 240 && pixel[1] > 240 && pixel[2] > 240) {
                sampleColor = '#333333';
              }
            } catch (e) {
              console.warn("Color sampling failed", e);
            }
          }

          return {
            ...item,
            fontSize,
            color: sampleColor,
            bold: isBold,
            italic: isItalic,
            serif: isSerif,
            lineHeight: 1.1,
            letterSpacing: 0,
            wasEdited: false,
            originalStr: item.str
          };
        });

        loadedPages.push({
          id: crypto.randomUUID(), // Stable ID based on file and index
          originalIndex: i - 1,
          previewUrl: canvas.toDataURL(),
          width: viewport.width,
          height: viewport.height,
          rotation: 0,
          annotations: [],
          textContent: textItems.map((it: any) => it.str).join(' '),
          textItems: textItems
        });
      }
      setHasImages(imagesDetected);
      resetHistory(loadedPages);
      if (activeFileId) {
        updateSharedFileData(activeFileId, { pages: loadedPages, hasImages: imagesDetected });
      }
    } catch (error) {
      console.error('Error loading PDF:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const onDrop = async (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      addSharedFiles(acceptedFiles);
      setPages([]);
      setCurrentPage(1);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: false
  });

  const handlePageClick = (e: React.MouseEvent<HTMLDivElement>, pageIndex: number) => {
    if (activeTool === 'select' || activeTool === 'hand' || activeTool === 'textbox' || activeTool === 'image') return;

    const { x, y } = getRelativeCoords(e, pageIndex);

    if (['text', 'typewriter', 'note', 'highlight', 'underline', 'strikethrough', 'squiggly', 'caret'].includes(activeTool as string)) {
      const type = ['highlight', 'underline', 'strikethrough', 'squiggly', 'caret'].includes(activeTool as string) ? activeTool : 'text';
      let content = '';
      if (activeTool === 'typewriter') content = 'Typewriter Text';
      if (activeTool === 'text') content = 'New Text';

      const id = addAnnotation(type as any, pageIndex, x, y, content);
      setSelectedAnnId(id);
      justAddedAnnotation.current = true;
      setActiveTool('select');
    } else if (activeTool === 'area-highlight' || activeTool === 'stamp') {
      const type = activeTool === 'area-highlight' ? 'highlight' : 'text';
      const content = activeTool === 'stamp' ? 'APPROVED' : '';

      const id = addAnnotation(type as any, pageIndex, x, y, content, 20, 10);
      setSelectedAnnId(id);
      justAddedAnnotation.current = true;
      setActiveTool('select');
    }
  };

  const hexToPdfRgb = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    return rgb(r, g, b);
  };

  const saveModifiedPDF = async (shouldPrint = false) => {
    if (!file) return;
    setIsSaving(true);
    try {
      const activeFile = sharedFiles.find(f => f.id === activeFileId);
      const existingPdfBytes = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      const newPdfDoc = await PDFDocument.create();

      // Set Metadata
      if (activeFile?.metadata) {
        newPdfDoc.setTitle(activeFile.metadata.title || '');
        newPdfDoc.setSubject(activeFile.metadata.subject === 'Add a category' ? '' : activeFile.metadata.subject);
        newPdfDoc.setAuthor(activeFile.metadata.author === 'Add the author' ? '' : activeFile.metadata.author);
        newPdfDoc.setKeywords(activeFile.metadata.keywords === 'Add keywords' ? [] : (activeFile.metadata.keywords || '').split(',').map(k => k.trim()));
        newPdfDoc.setProducer(activeFile.metadata.producer || 'Vite PDF Core');
        newPdfDoc.setCreator('Vite PDF App');
      }

      const fontRegular = await newPdfDoc.embedFont(StandardFonts.Helvetica);
      const fontBold = await newPdfDoc.embedFont(StandardFonts.HelveticaBold);
      const fontItalic = await newPdfDoc.embedFont(StandardFonts.HelveticaOblique);
      const fontBoldItalic = await newPdfDoc.embedFont(StandardFonts.HelveticaBoldOblique);

      const fontSerifRegular = await newPdfDoc.embedFont(StandardFonts.TimesRoman);
      const fontSerifBold = await newPdfDoc.embedFont(StandardFonts.TimesRomanBold);
      const fontSerifItalic = await newPdfDoc.embedFont(StandardFonts.TimesRomanItalic);
      const fontSerifBoldItalic = await newPdfDoc.embedFont(StandardFonts.TimesRomanBoldItalic);

      const getFont = (bold?: boolean, italic?: boolean, serif?: boolean) => {
        if (serif) {
          if (bold && italic) return fontSerifBoldItalic;
          if (bold) return fontSerifBold;
          if (italic) return fontSerifItalic;
          return fontSerifRegular;
        }
        if (bold && italic) return fontBoldItalic;
        if (bold) return fontBold;
        if (italic) return fontItalic;
        return fontRegular;
      };

      // Draw the new text with support for partial superscript/subscript
      const decodeHtml = (html: string) => {
        const txt = document.createElement("textarea");
        txt.innerHTML = html;
        return txt.value;
      };

      // Helper to calculate total width of text with tags
      const calculateTotalWidth = (text: string, font: any, baseSize: number) => {
        if (!text.includes('<')) return font.widthOfTextAtSize(text, baseSize);

        const cleanText = text.replace(/<br\s*\/?>/gi, ' ');
        const parts = cleanText.split(/(<sup\b[^>]*>.*?<\/sup>|<sub\b[^>]*>.*?<\/sub>)/gi);
        let total = 0;

        parts.forEach(part => {
          if (!part) return;
          let rawText = '';
          let size = baseSize;

          if (part.toLowerCase().startsWith('<sup') || part.toLowerCase().startsWith('<sub')) {
            rawText = part.replace(/<[^>]+>/g, '');
            size = baseSize * 0.7;
          } else {
            rawText = part.replace(/<[^>]+>/g, '');
          }

          total += font.widthOfTextAtSize(decodeHtml(rawText), size);
        });
        return total;
      };

      for (const pageData of pages) {
        let newPage;
        if (pageData.originalIndex === -1) {
          newPage = newPdfDoc.addPage();
        } else {
          const [copiedPage] = await newPdfDoc.copyPages(pdfDoc, [pageData.originalIndex]);
          newPage = newPdfDoc.addPage(copiedPage);
        }

        const { width, height } = newPage.getSize();

        // Draw the new text with support for partial superscript/subscript
        const renderTextWithStyles = (text: string, baseOptions: any) => {
          // Remove most tags, but keep sup and sub
          const cleanText = text.replace(/<br\s*\/?>/gi, ' ');
          const parts = cleanText.split(/(<sup\b[^>]*>.*?<\/sup>|<sub\b[^>]*>.*?<\/sub>)/gi);

          let currentPrefixX = baseOptions.x;
          const fontSize = baseOptions.size;

          parts.forEach(part => {
            if (!part) return;

            let rawTextToDraw = part;
            let options = { ...baseOptions, x: currentPrefixX };

            if (part.toLowerCase().startsWith('<sup')) {
              rawTextToDraw = part.replace(/<sup\b[^>]*>(.*?)<\/sup>/gi, '$1').replace(/<[^>]+>/g, '');
              options.size = fontSize * 0.7;
              options.y += fontSize * 0.35;
            } else if (part.toLowerCase().startsWith('<sub')) {
              rawTextToDraw = part.replace(/<sub\b[^>]*>(.*?)<\/sub>/gi, '$1').replace(/<[^>]+>/g, '');
              options.size = fontSize * 0.7;
              options.y -= fontSize * 0.2;
            } else {
              rawTextToDraw = part.replace(/<[^>]+>/g, '');
            }

            const textToDraw = decodeHtml(rawTextToDraw);

            if (textToDraw) {
              newPage.drawText(textToDraw, options);
              currentPrefixX += baseOptions.font.widthOfTextAtSize(textToDraw, options.size);
            }
          });
        };

        // Apply Global Header/Footer
        const margin = 20;
        if (headerText) {
          const textWidth = fontRegular.widthOfTextAtSize(headerText, headerFontSize);
          let x = margin;
          if (headerPos === 'center') x = (width - textWidth) / 2;
          if (headerPos === 'right') x = width - textWidth - margin;
          newPage.drawText(headerText, {
            x,
            y: height - margin - headerFontSize,
            size: headerFontSize,
            font: fontRegular,
            color: hexToPdfRgb(headerColor),
          });
        }

        if (footerText) {
          const textWidth = fontRegular.widthOfTextAtSize(footerText, footerFontSize);
          let x = margin;
          if (footerPos === 'center') x = (width - textWidth) / 2;
          if (footerPos === 'right') x = width - textWidth - margin;
          newPage.drawText(footerText, {
            x,
            y: margin,
            size: footerFontSize,
            font: fontRegular,
            color: hexToPdfRgb(footerColor),
          });
        }

        // Apply Page Numbers
        if (addPageNumbers) {
          const pageIndex = pages.indexOf(pageData);
          const pageNumStr = pageNumberFormat
            .replace('{n}', (pageIndex + 1).toString())
            .replace('{total}', pages.length.toString());

          const textWidth = fontRegular.widthOfTextAtSize(pageNumStr, globalFontSize);
          let x = margin;
          if (pageNumberAlign === 'center') x = (width - textWidth) / 2;
          if (pageNumberAlign === 'right') x = width - textWidth - margin;

          newPage.drawText(pageNumStr, {
            x,
            y: pageNumberPos === 'header' ? height - margin - globalFontSize : margin,
            size: globalFontSize,
            font: fontRegular,
            color: rgb(0.3, 0.3, 0.3),
          });
        }

        // Apply text content edits
        if (pageData.textItems) {
          for (const item of pageData.textItems as any[]) {
            if (item.wasEdited) {
              const [sx, skx, sky, sy, tx, ty] = item.transform;
              const fontSize = Math.abs(sy) || Math.abs(sx) || 12;

              // Mask the original text
              newPage.drawRectangle({
                x: tx - 2,
                y: ty - (fontSize * 0.25),
                width: (item.width || 50) + 4,
                height: fontSize * 1.2,
                color: item.backgroundColor && item.backgroundColor !== 'transparent' ? hexToPdfRgb(item.backgroundColor) : rgb(1, 1, 1),
              });

              const itemFont = getFont(item.bold, item.italic, item.serif);
              const itemColor = item.color ? hexToPdfRgb(item.color) : rgb(0, 0, 0);

              // Calculate new width for the mask and positioning
              const fontSizeForCalc = item.fontSize || fontSize;
              const newWidth = calculateTotalWidth(item.str, itemFont, fontSizeForCalc);
              const originalWidth = item.width || 0;
              let drawX = tx;

              if (item.align === 'center') {
                drawX = tx + (originalWidth - newWidth) / 2;
              } else if (item.align === 'right') {
                drawX = tx + (originalWidth - newWidth);
              }

              // Mask the original text
              newPage.drawRectangle({
                x: tx - 2,
                y: ty - ((item.fontSize || fontSize) * 0.25),
                width: Math.max(newWidth, originalWidth) + 4,
                height: (item.fontSize || fontSize) * 1.2,
                color: item.backgroundColor && item.backgroundColor !== 'transparent' ? hexToPdfRgb(item.backgroundColor) : rgb(1, 1, 1),
              });

              const drawOptions = {
                x: drawX,
                y: ty + (item.superscript ? (item.fontSize || fontSize) * 0.35 : item.subscript ? -(item.fontSize || fontSize) * 0.25 : 0),
                size: (item.superscript || item.subscript) ? (item.fontSize || fontSize) * 0.7 : (item.fontSize || fontSize),
                font: itemFont,
                color: itemColor,
              };

              if (item.str.includes('<')) {
                renderTextWithStyles(item.str, drawOptions);
              } else {
                newPage.drawText(item.str, {
                  ...drawOptions,
                });
              }

              // Underline
              if (item.underline) {
                newPage.drawLine({
                  start: { x: drawX, y: ty - 1.5 },
                  end: { x: drawX + newWidth, y: ty - 1.5 },
                  thickness: (item.fontSize || fontSize) / 20,
                  color: itemColor,
                });
              }

              // Strikethrough
              if (item.strikethrough) {
                const strikethroughOffset = (item.fontSize || fontSize) * 0.3;
                newPage.drawLine({
                  start: { x: drawX, y: ty + strikethroughOffset },
                  end: { x: drawX + newWidth, y: ty + strikethroughOffset },
                  thickness: (item.fontSize || fontSize) / 20,
                  color: itemColor,
                });
              }
            }
          }
        }

        // Apply annotations
        for (const ann of pageData.annotations) {
          const pdfX = (ann.x / 100) * width;
          const pdfY = height - ((ann.y / 100) * height);

          if (ann.type === 'text') {
            const size = (ann.fontSize || 12) * (width / 400);
            const annFont = getFont(ann.bold, ann.italic);
            const textWidth = annFont.widthOfTextAtSize(ann.content, size);

            let finalX = pdfX;
            if (ann.alignment === 'center') finalX = pdfX - textWidth / 2;
            else if (ann.alignment === 'right') finalX = pdfX - textWidth;

            if (ann.isOriginal || (ann.backgroundColor && ann.backgroundColor !== 'transparent')) {
              const fontScale = width / 595;
              const bgBoxWidth = (ann.isOriginal && ann.originalWidth) ? ann.originalWidth * fontScale : textWidth + 4;
              const bgBoxHeight = (ann.isOriginal && ann.originalHeight) ? ann.originalHeight * fontScale : size + 4;

              newPage.drawRectangle({
                x: finalX - (ann.isOriginal ? 0 : 2),
                y: pdfY - 2,
                width: bgBoxWidth,
                height: bgBoxHeight,
                color: (ann.backgroundColor && ann.backgroundColor !== 'transparent') ? hexToPdfRgb(ann.backgroundColor) : rgb(1, 1, 1),
              });
            }

            newPage.drawText(ann.content, {
              x: finalX,
              y: pdfY,
              size,
              font: annFont,
              color: ann.color ? hexToPdfRgb(ann.color) : rgb(0.1, 0.1, 0.1),
            });
          } else if (ann.type === 'highlight' || ann.type === 'underline' || ann.type === 'strikethrough' || ann.type === 'squiggly') {
            const fontScale = width / 595;
            const annWidth = ann.originalWidth ? ann.originalWidth * fontScale : (ann.width || 0) * (width / 100);
            const annHeight = ann.originalHeight ? ann.originalHeight * fontScale : (ann.height || 0) * (height / 100);
            const pdfColor = ann.color ? hexToPdfRgb(ann.color) : (ann.type === 'highlight' ? rgb(1, 0.92, 0.23) : rgb(0, 0, 0));

            if (ann.type === 'highlight') {
              newPage.drawRectangle({
                x: pdfX - annWidth / 2,
                y: pdfY - annHeight / 2,
                width: annWidth,
                height: annHeight,
                color: pdfColor,
                opacity: ann.opacity || 0.3,
              });
            } else if (ann.type === 'underline') {
              newPage.drawLine({
                start: { x: pdfX - annWidth / 2, y: pdfY - annHeight / 2 },
                end: { x: pdfX + annWidth / 2, y: pdfY - annHeight / 2 },
                thickness: 1.5,
                color: pdfColor,
              });
            } else if (ann.type === 'strikethrough') {
              newPage.drawLine({
                start: { x: pdfX - annWidth / 2, y: pdfY },
                end: { x: pdfX + annWidth / 2, y: pdfY },
                thickness: 1.5,
                color: pdfColor,
              });
            } else if (ann.type === 'squiggly') {
              newPage.drawLine({
                start: { x: pdfX - annWidth / 2, y: pdfY - annHeight / 2 },
                end: { x: pdfX + annWidth / 2, y: pdfY - annHeight / 2 },
                thickness: 1.5,
                color: pdfColor,
                dashArray: [2, 2]
              });
            }
          } else if (ann.type === 'caret') {
            const fontScale = width / 595;
            const size = 12 * fontScale;
            const annHeight = ann.originalHeight ? ann.originalHeight * fontScale : (ann.height || 0) * (height / 100);
            // pdfX is selection end, so we place the '^' there
            newPage.drawText('^', {
              x: pdfX - (3 * fontScale), // Center the char roughly on the point
              y: pdfY - (annHeight / 2),
              size,
              font: fontRegular,
              color: ann.color ? hexToPdfRgb(ann.color) : rgb(1, 0, 0),
            });
          } else if (ann.type === 'textbox') {
            const fontScale = width / 595;
            const size = (ann.fontSize || 12) * fontScale;
            // Use fontFamily to determine if serif or mono
            const isSerif = ann.fontFamily === 'serif';
            const isMono = ann.fontFamily === 'monospace';

            let annFont;
            if (isMono) {
              annFont = fontRegular; // Fallback to sans for mono if not embedded correctly
            } else {
              annFont = getFont(ann.bold, ann.italic, isSerif);
            }

            const annColor = ann.color ? hexToPdfRgb(ann.color) : rgb(0, 0, 0);
            const annWidth = (ann.width || 100) * (width / 100);
            const annHeight = (ann.height || 50) * (height / 100);

            if (ann.backgroundColor && ann.backgroundColor !== 'transparent') {
              newPage.drawRectangle({
                x: pdfX,
                y: pdfY - annHeight,
                width: annWidth,
                height: annHeight,
                color: hexToPdfRgb(ann.backgroundColor),
              });
            }

            const drawOptions = {
              x: pdfX + 2,
              y: pdfY - size - 2,
              size,
              font: annFont,
              color: annColor,
              maxWidth: annWidth - 4,
              lineHeight: size * 1.2,
            };

            if (ann.content.includes('<')) {
              renderTextWithStyles(ann.content, drawOptions);
            } else {
              newPage.drawText(ann.content, drawOptions);
            }
          } else if (ann.type === 'image') {
            const imgBytes = await fetch(ann.content).then(res => res.arrayBuffer());
            const isPng = ann.content.includes('image/png');
            const embeddedImg = isPng
              ? await newPdfDoc.embedPng(imgBytes)
              : await newPdfDoc.embedJpg(imgBytes);

            const annWidth = (ann.width || 100) * (width / 100);
            const annHeight = (ann.height || 100) * (height / 100);
            const rotate = degrees(ann.rotation || 0);
            const crop = ann.cropRect || { top: 0, right: 0, bottom: 0, left: 0 };

            if (crop.top > 0 || crop.bottom > 0 || crop.left > 0 || crop.right > 0) {
              newPage.pushGraphicsState();
              // The crop rectangle is relative to the bounding box
              newPage.drawRectangle({
                x: pdfX + (crop.left / 100) * annWidth,
                y: pdfY - annHeight + (crop.bottom / 100) * annHeight,
                width: annWidth * (1 - (crop.left + crop.right) / 100),
                height: annHeight * (1 - (crop.top + crop.bottom) / 100),
              });
              newPage.clip();

              newPage.drawImage(embeddedImg, {
                x: pdfX,
                y: pdfY - annHeight,
                width: annWidth,
                height: annHeight,
                rotate,
              });
              newPage.popGraphicsState();
            } else {
              newPage.drawImage(embeddedImg, {
                x: pdfX,
                y: pdfY - annHeight,
                width: annWidth,
                height: annHeight,
                rotate,
              });
            }
          } else if (ann.type === 'link') {
            const fontScale = width / 595;
            const linkWidth = (ann.width || 100) * (width / 100);
            const linkHeight = (ann.height || 50) * (height / 100);

            if (ann.linkConfig?.linkType === 'Visible rectangle') {
              newPage.drawRectangle({
                x: pdfX,
                y: pdfY - linkHeight,
                width: linkWidth,
                height: linkHeight,
                borderWidth: (ann.strokeWidth || 1) * fontScale,
                borderColor: ann.color ? hexToPdfRgb(ann.color) : rgb(0, 0, 0),
                color: ann.linkConfig.highlightStyle === 'Push' ? rgb(ann.color ? parseInt(ann.color.slice(1, 3), 16) / 255 : 0, ann.color ? parseInt(ann.color.slice(3, 5), 16) / 255 : 0, ann.color ? parseInt(ann.color.slice(5, 7), 16) / 255 : 0) : undefined,
                opacity: ann.linkConfig.highlightStyle === 'Push' ? 0.2 : undefined,
                borderDashArray: ann.strokeType === 'dashed' ? [5 * fontScale, 5 * fontScale] : undefined,
              });
            }

            // Create Link Annotation Object
            try {
              let linkAnnot = null;
              if (ann.linkConfig?.actionType === 'web' && ann.linkConfig?.webUrl) {
                linkAnnot = newPdfDoc.context.obj({
                  Type: 'Annot',
                  Subtype: 'Link',
                  Rect: [pdfX, pdfY - linkHeight, pdfX + linkWidth, pdfY],
                  A: {
                    Type: 'Action',
                    S: 'URI',
                    URI: ann.linkConfig.webUrl,
                  },
                  Border: [0, 0, 0], // Invisible border since we drew it manually
                });
              } else if (ann.linkConfig?.actionType === 'page' && ann.linkConfig?.targetPage) {
                const pageIdx = Math.min(Math.max(0, ann.linkConfig.targetPage - 1), newPdfDoc.getPageCount() - 1);
                const pageRef = newPdfDoc.getPage(pageIdx).ref;
                linkAnnot = newPdfDoc.context.obj({
                  Type: 'Annot',
                  Subtype: 'Link',
                  Rect: [pdfX, pdfY - linkHeight, pdfX + linkWidth, pdfY],
                  Dest: [pageRef, 'Fit'],
                  Border: [0, 0, 0],
                });
              }

              if (linkAnnot) {
                let annots = newPage.node.Annots();
                if (!annots) {
                  newPage.node.set(newPdfDoc.context.obj('Annots'), newPdfDoc.context.obj([]));
                  annots = newPage.node.Annots();
                }
                if (annots) {
                  annots.push(linkAnnot);
                }
              }
            } catch (e) {
              console.error('Failed to embed link', e);
            }
          } else if (ann.type === 'shape') {
            const fontScale = width / 595;
            const annWidth = ann.width ? ann.width * (width / 100) : 60 * fontScale;
            const annHeight = ann.height ? ann.height * (height / 100) : 60 * fontScale;

            const borderColor = ann.color ? hexToPdfRgb(ann.color) : rgb(0.23, 0.51, 0.96); // blue-500
            const fillColor = (ann.backgroundColor && ann.backgroundColor !== 'transparent') ? hexToPdfRgb(ann.backgroundColor) : undefined;
            const borderWidth = ann.strokeWidth !== undefined ? ann.strokeWidth * fontScale : 2 * fontScale;
            const dashArray = ann.strokeType === 'dashed' ? [5 * fontScale, 5 * fontScale] : undefined;
            const opacity = ann.opacity ?? 1;

            if (ann.content === 'square') {
              newPage.drawRectangle({
                x: pdfX - annWidth / 2,
                y: pdfY - annHeight / 2,
                width: annWidth,
                height: annHeight,
                borderColor,
                borderWidth,
                color: fillColor,
                borderDashArray: dashArray,
                opacity
              });
            } else if (ann.content === 'circle') {
              const diameter = (annWidth + annHeight) / 2;
              newPage.drawCircle({
                x: pdfX,
                y: pdfY,
                size: diameter / 2,
                borderColor,
                borderWidth,
                color: fillColor,
                borderDashArray: dashArray,
                opacity
              });
            } else if (ann.content === 'line' || ann.content === 'arrow') {
              newPage.drawLine({
                start: { x: pdfX - annWidth / 2, y: pdfY },
                end: { x: pdfX + annWidth / 2, y: pdfY },
                thickness: borderWidth,
                color: borderColor,
                dashArray,
                opacity
              });
              if (ann.content === 'arrow') {
                newPage.drawLine({
                  start: { x: pdfX + annWidth / 2, y: pdfY },
                  end: { x: pdfX + annWidth / 2 - (10 * fontScale), y: pdfY + (10 * fontScale) },
                  thickness: borderWidth,
                  color: borderColor,
                  opacity
                });
                newPage.drawLine({
                  start: { x: pdfX + annWidth / 2, y: pdfY },
                  end: { x: pdfX + annWidth / 2 - (10 * fontScale), y: pdfY - (10 * fontScale) },
                  thickness: borderWidth,
                  color: borderColor,
                  opacity
                });
              }
            } else if (ann.content === 'pentagon') {
              const points = [
                { x: pdfX, y: pdfY + annHeight / 2 },
                { x: pdfX + annWidth / 2, y: pdfY + annHeight * 0.15 },
                { x: pdfX + annWidth * 0.3, y: pdfY - annHeight / 2 },
                { x: pdfX - annWidth * 0.3, y: pdfY - annHeight / 2 },
                { x: pdfX - annWidth / 2, y: pdfY + annHeight * 0.15 },
              ];
              // drawPolygon takes points array
              // Note: pdf-lib doesn't have drawPolygon in basic but we can draw lines or use SVG path
              // Let's use lines for simplicity if drawPolygon is tricky or use a loop
              for (let i = 0; i < points.length; i++) {
                const start = points[i];
                const end = points[(i + 1) % points.length];
                newPage.drawLine({
                  start, end,
                  thickness: borderWidth,
                  color: borderColor,
                  dashArray,
                  opacity
                });
              }
              if (fillColor) {
                // To fill we would need a proper polygon drawing
                // For now, let's at least draw the outline
              }
            } else if (ann.content === 'cloud' || ann.content === 'pencil' || ann.content === 'spline') {
              // Simplified representations for now
              newPage.drawRectangle({
                x: pdfX - annWidth / 4,
                y: pdfY - annHeight / 4,
                width: annWidth / 2,
                height: annHeight / 2,
                borderColor,
                borderWidth,
                color: fillColor,
                borderDashArray: [2, 2],
                opacity
              });
            }
          }
        }
      }

      // Attach any files added by the user
      for (const attachment of attachments) {
        if (attachment.file) {
          try {
            const arrayBuffer = await attachment.file.arrayBuffer();
            await newPdfDoc.attach(new Uint8Array(arrayBuffer), attachment.name, {
              mimeType: attachment.type || attachment.file.type || 'application/octet-stream',
              description: attachment.description || 'Attachment',
              creationDate: new Date(),
              modificationDate: new Date()
            });
          } catch (e) {
            console.error('Failed to attach file:', e);
          }
        }
      }

      const pdfBytes = await newPdfDoc.save();
      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      if (shouldPrint) {
        const printWindow = window.open(url, '_blank');
        if (printWindow) {
          printWindow.addEventListener('load', () => {
            printWindow.print();
          });
        } else {
          alert('Pop-up blocked. Please allow pop-ups to print.');
        }
      } else {
        const link = document.createElement('a');
        link.href = url;
        link.download = activeFile?.file.name || `edited_${file.name}`;
        link.click();
      }
    } catch (error) {
      console.error('Error saving PDF:', error);
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    const handleUndo = () => undo();
    const handleRedo = () => redo();
    const handleSave = () => saveModifiedPDF(false);
    const handlePrint = () => saveModifiedPDF(true);
    const handleRemoveAllLinks = () => {
      const updatedPages = pages.map(page => ({
        ...page,
        annotations: page.annotations.filter(a => a.type !== 'link')
      }));
      updatePagesWithHistory(updatedPages);
      if (activeTool === 'link') setActiveTool('select');
    };

    const handleOpenUpdateLinksModal = () => {
      setShowUpdateLinksModal(true);
    };

    window.addEventListener('ribbon-undo', handleUndo);
    window.addEventListener('ribbon-redo', handleRedo);
    window.addEventListener('ribbon-save', handleSave);
    window.addEventListener('ribbon-print', handlePrint);
    window.addEventListener('remove-all-links', handleRemoveAllLinks);
    window.addEventListener('open-update-links-modal', handleOpenUpdateLinksModal);
    return () => {
      window.removeEventListener('ribbon-undo', handleUndo);
      window.removeEventListener('ribbon-redo', handleRedo);
      window.removeEventListener('ribbon-save', handleSave);
      window.removeEventListener('ribbon-print', handlePrint);
      window.removeEventListener('remove-all-links', handleRemoveAllLinks);
      window.removeEventListener('open-update-links-modal', handleOpenUpdateLinksModal);
    };
  }, [pages, sharedFiles, activeFileId, attachments]);


  return (
    <div className="h-full flex flex-col space-y-6">
      {!file ? (
        <div
          {...getRootProps()}
          className={cn(
            "dashed-border flex-1 flex flex-col items-center justify-center transition-all cursor-pointer group",
            isDragActive ? "border-accent bg-accent/5" : "bg-white hover:border-slate-400"
          )}
        >
          <input {...getInputProps()} />
          <div className="p-6 bg-slate-50 border border-border rounded shadow-sm mb-6 group-hover:scale-110 transition-transform">
            <FileEdit className="w-10 h-10 text-accent" />
          </div>
          <p className="text-lg font-bold uppercase tracking-tight mb-2">Load PDF to Edit</p>
          <p className="text-xs text-muted-foreground uppercase tracking-[0.2em] font-medium">Reorder, delete, and annotate</p>
        </div>
      ) : isProcessing ? (
        <div className="flex-1 flex flex-col items-center justify-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
          <p className="text-[10px] font-black uppercase tracking-widest">Parsing document...</p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col bg-white border border-border rounded-lg shadow-sm overflow-hidden min-h-0">
          <div className="flex-1 flex overflow-hidden relative">
            {/* Floating Zoom Control */}
            <div className={cn(
              "fixed right-4 md:right-8 top-1/2 -translate-y-1/2 z-[4000] flex flex-col items-center bg-[#1e1e1e]/90 backdrop-blur-xl rounded-2xl shadow-2xl p-2 md:p-3 w-12 md:w-16 border border-white/10 select-none ring-1 ring-black/40 group/zoom transition-all duration-300",
              activeMenu === 'Page' ? "opacity-0 pointer-events-none scale-90 translate-x-10" : "opacity-100"
            )}>
              <div className="text-[10px] md:text-xs font-black text-blue-400 mb-2 md:mb-4 py-1 tracking-wider tabular-nums bg-black/20 w-full text-center rounded-lg">{Math.round(zoom)}%</div>

              <button
                onClick={() => setZoom && setZoom(prev => Math.min((prev as number) + 10, 300))}
                className="p-2 md:p-3 hover:bg-white/10 active:bg-white/20 rounded-xl transition-all text-white/70 hover:text-white"
                title="Zoom In"
              >
                <ZoomIn className="w-5 h-5 md:w-6 md:h-6" />
              </button>

              <div className="relative flex flex-col items-center h-40 md:h-64 my-4 md:my-6 group/slider px-2">
                <div className="absolute inset-y-0 w-1 md:w-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="absolute bottom-0 inset-x-0 bg-blue-500/50 transition-all duration-300"
                    style={{ height: `${((zoom - 10) / 290) * 100}%` }}
                  />
                </div>

                <input
                  type="range"
                  min="10"
                  max="300"
                  step="5"
                  value={zoom}
                  onChange={(e) => setZoom && setZoom(parseFloat(e.target.value))}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  style={{
                    writingMode: 'vertical-lr',
                    direction: 'rtl'
                  } as any}
                />

                <div
                  className="absolute left-1/2 -translate-x-1/2 w-4 md:w-5 h-4 md:h-5 bg-white rounded-full shadow-[0_0_15px_rgba(255,255,255,0.3)] pointer-events-none transition-all duration-100 group-hover/slider:scale-110 ring-2 ring-blue-500"
                  style={{ bottom: `calc(${((zoom - 10) / 290) * 100}% - 8px)` }}
                />
              </div>

              <button
                onClick={() => setZoom && setZoom(prev => Math.max((prev as number) - 10, 10))}
                className="p-2 md:p-3 hover:bg-white/10 active:bg-white/20 rounded-xl transition-all text-white/70 hover:text-white"
                title="Zoom Out"
              >
                <ZoomOut className="w-5 h-5 md:w-6 md:h-6" />
              </button>

              <div className="mt-2 md:mt-4 w-full px-1">
                <button
                  onClick={() => setZoom && setZoom(100)}
                  className="w-full py-1 text-[8px] md:text-[9px] font-black uppercase tracking-tighter text-white/40 hover:text-blue-400 transition-colors"
                >
                  Reset
                </button>
              </div>
            </div>

            <div
              ref={scrollContainerRef}
              onPointerDown={(e) => {
                if (isResizing) return;
                (e.target as HTMLElement).setPointerCapture(e.pointerId);
                if (activeMenu === 'Page') handleSelectMouseDown(e);
                else handleHandMouseDown(e);
              }}
              onPointerMove={(e) => {
                handleResizeMouseMove(e);
                if (isResizing) return;
                if (activeMenu === 'Page') handleSelectMouseMove(e);
                else {
                  handleHandMouseMove(e);
                  handleDrawingMouseMove(e);
                }
              }}
              onPointerUp={(e) => {
                handleResizeMouseUp();
                if (activeMenu === 'Page') handleSelectMouseUp();
                else {
                  handleHandMouseUp();
                  handleDrawingMouseUp(e);
                }
              }}
              onPointerLeave={() => {
                handleResizeMouseUp();
                if (activeMenu === 'Page') handleSelectMouseUp();
                else handleHandMouseUp();
              }}
              onScroll={handleScroll}
              className="flex-1 bg-[#808080] p-2 md:p-8 overflow-y-auto overflow-x-auto flex flex-col items-center custom-scrollbar scroll-smooth relative touch-none"
            >
              {/* Selection Box */}
              {selectionBoxStart && selectionBoxEnd && (
                <div
                  className="fixed z-[9999] bg-blue-500/20 border border-blue-500 pointer-events-none"
                  style={{
                    left: Math.min(selectionBoxStart.x, selectionBoxEnd.x),
                    top: Math.min(selectionBoxStart.y, selectionBoxEnd.y),
                    width: Math.abs(selectionBoxEnd.x - selectionBoxStart.x),
                    height: Math.abs(selectionBoxEnd.y - selectionBoxStart.y),
                  }}
                />
              )}

              {activeTool === 'settings' && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  className="w-full max-w-4xl bg-white border border-border rounded-lg shadow-md mb-6 p-6 grid grid-cols-2 gap-8"
                >
                  <div className="space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 border-b border-border pb-2">Header Configuration</h3>
                    <div className="space-y-2">
                      <label className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Header Text</label>
                      <input
                        type="text"
                        value={headerText}
                        onChange={(e) => setHeaderText(e.target.value)}
                        placeholder="Enter header..."
                        className="w-full bg-slate-50 border border-border rounded px-3 py-2 text-xs font-bold outline-none focus:border-accent"
                      />
                    </div>
                    <div className="flex gap-4">
                      <div className="flex-1 space-y-2">
                        <label className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Placement</label>
                        <div className="flex gap-1 bg-slate-100 p-1 rounded">
                          {(['left', 'center', 'right'] as const).map(pos => (
                            <button
                              key={`h-${pos}`}
                              onClick={() => setHeaderPos(pos)}
                              className={cn(
                                "flex-1 text-[8px] font-bold uppercase py-1 rounded transition-all",
                                headerPos === pos ? "bg-white shadow-sm text-accent" : "text-slate-400 hover:text-slate-600"
                              )}
                            >
                              {pos}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Size</label>
                        <input
                          type="number"
                          min="6"
                          max="32"
                          value={headerFontSize}
                          onChange={(e) => setHeaderFontSize(parseInt(e.target.value))}
                          className="w-12 bg-slate-50 border border-border rounded px-2 py-1.5 text-xs font-bold outline-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Color</label>
                        <input
                          type="color"
                          value={headerColor}
                          onChange={(e) => setHeaderColor(e.target.value)}
                          className="w-8 h-8 rounded border border-border cursor-pointer bg-transparent"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 border-b border-border pb-2">Footer Configuration</h3>
                    <div className="space-y-2">
                      <label className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Footer Text</label>
                      <input
                        type="text"
                        value={footerText}
                        onChange={(e) => setFooterText(e.target.value)}
                        placeholder="Enter footer..."
                        className="w-full bg-slate-50 border border-border rounded px-3 py-2 text-xs font-bold outline-none focus:border-accent"
                      />
                    </div>
                    <div className="flex gap-4">
                      <div className="flex-1 space-y-2">
                        <label className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Placement</label>
                        <div className="flex gap-1 bg-slate-100 p-1 rounded">
                          {(['left', 'center', 'right'] as const).map(pos => (
                            <button
                              key={`f-${pos}`}
                              onClick={() => setFooterPos(pos)}
                              className={cn(
                                "flex-1 text-[8px] font-bold uppercase py-1 rounded transition-all",
                                footerPos === pos ? "bg-white shadow-sm text-accent" : "text-slate-400 hover:text-slate-600"
                              )}
                            >
                              {pos}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Size</label>
                        <input
                          type="number"
                          min="6"
                          max="32"
                          value={footerFontSize}
                          onChange={(e) => setFooterFontSize(parseInt(e.target.value))}
                          className="w-12 bg-slate-50 border border-border rounded px-2 py-1.5 text-xs font-bold outline-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Color</label>
                        <input
                          type="color"
                          value={footerColor}
                          onChange={(e) => setFooterColor(e.target.value)}
                          className="w-8 h-8 rounded border border-border cursor-pointer bg-transparent"
                        />
                      </div>
                    </div>
                    <div className="pt-2 border-t border-border mt-4 flex items-center justify-between">
                      <label className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Global Font Size</label>
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min="6"
                          max="24"
                          value={globalFontSize}
                          onChange={(e) => setGlobalFontSize(parseInt(e.target.value))}
                          className="w-24 accent-accent"
                        />
                        <span className="text-[10px] font-mono font-bold text-accent">{globalFontSize}px</span>
                      </div>
                    </div>
                  </div>

                  <div className="col-span-2 pt-4 border-t border-border grid grid-cols-3 gap-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Page Numbering</h3>
                        <button
                          onClick={() => setAddPageNumbers(!addPageNumbers)}
                          className={cn(
                            "w-8 h-4 rounded-full relative transition-colors",
                            addPageNumbers ? "bg-accent" : "bg-slate-200"
                          )}
                        >
                          <div className={cn(
                            "absolute top-0.5 h-3 w-3 bg-white rounded-full transition-all",
                            addPageNumbers ? "left-4.5" : "left-0.5"
                          )} />
                        </button>
                      </div>
                      <div className={cn("space-y-3 transition-opacity", !addPageNumbers && "opacity-30 pointer-events-none")}>
                        <div className="space-y-1">
                          <label className="text-[8px] font-bold uppercase tracking-widest text-slate-500">Format (use {'{n}'}, {'{total}'})</label>
                          <input
                            type="text"
                            value={pageNumberFormat}
                            onChange={(e) => setPageNumberFormat(e.target.value)}
                            className="w-full bg-slate-50 border border-border rounded px-3 py-1.5 text-[10px] font-bold outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    <div className={cn("space-y-4 transition-opacity", !addPageNumbers && "opacity-30 pointer-events-none")}>
                      <div className="space-y-1">
                        <label className="text-[8px] font-bold uppercase tracking-widest text-slate-500">Section</label>
                        <div className="flex gap-1 bg-slate-100 p-1 rounded">
                          {(['header', 'footer'] as const).map(p => (
                            <button
                              key={`pn-p-${p}`}
                              onClick={() => setPageNumberPos(p)}
                              className={cn(
                                "flex-1 text-[8px] font-bold uppercase py-1 rounded transition-all",
                                pageNumberPos === p ? "bg-white shadow-sm text-accent" : "text-slate-400 hover:text-slate-600"
                              )}
                            >
                              {p}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className={cn("space-y-4 transition-opacity", !addPageNumbers && "opacity-30 pointer-events-none")}>
                      <div className="space-y-1">
                        <label className="text-[8px] font-bold uppercase tracking-widest text-slate-500">Alignment</label>
                        <div className="flex gap-1 bg-slate-100 p-1 rounded">
                          {(['left', 'center', 'right'] as const).map(a => (
                            <button
                              key={`pn-a-${a}`}
                              onClick={() => setPageNumberAlign(a)}
                              className={cn(
                                "flex-1 text-[8px] font-bold uppercase py-1 rounded transition-all",
                                pageNumberAlign === a ? "bg-white shadow-sm text-accent" : "text-slate-400 hover:text-slate-600"
                              )}
                            >
                              {a}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={localPages.map(p => p.id)}
                  strategy={rectSortingStrategy}
                >
                  <div
                    className={cn(
                      "w-full pb-20 justify-items-center",
                      activeMenu === 'Page'
                        ? "grid gap-y-12 gap-x-8 p-4 md:p-8 w-full"
                        : "flex flex-col gap-8 items-center"
                    )}
                    style={activeMenu === 'Page' ? {
                      gridTemplateColumns: 'repeat(4, 1fr)'
                    } : undefined}
                  >
                    {localPages.filter((_, idx) => activeMenu === 'Page' || viewMode === 'continuous' || idx === currentPage - 1).map((page, index) => {
                      const originalPageIndex = localPages.findIndex(p => p.id === page.id);
                      // Use global pages for stable initial rendering if needed
                      const stableIndex = pages.findIndex(p => p.id === page.id);

                      const totalRotation = (rotation + viewRotation + (page.rotation || 0)) % 360;
                      const isRotated = totalRotation % 180 !== 0;
                      const widthBase = page.width;
                      const heightBase = page.height || page.width * 1.414;
                      const displayWidth = isRotated ? heightBase : widthBase;
                      const displayHeight = isRotated ? widthBase : heightBase;

                      return (
                        <SortablePage key={page.id} id={page.id} disabled={activeMenu !== 'Page'}>
                          <div
                            className={cn(
                              "reorder-item relative flex flex-col items-center justify-center z-0"
                            )}
                            style={{
                              width: `${displayWidth * (activeMenu === 'Page' ? 0.35 : (zoom / 100))}px`,
                              height: `${displayHeight * (activeMenu === 'Page' ? 0.35 : (zoom / 100))}px`,
                              touchAction: 'none'
                            }}
                          >
                            {/* Drag position indicator */}
                            {activeMenu === 'Page' && (
                              <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-bold text-slate-400 bg-white/40 px-2 py-0.5 rounded-full select-none whitespace-nowrap">
                                {activeDraggedId === page.id ? `Moving...` : `Page ${originalPageIndex + 1}`}
                              </div>
                            )}

                            <div
                              data-page-id={page.id}
                              ref={index === 0 ? previewContainerRef : undefined}
                              onPointerDown={(e) => {
                                if (imageToPlace || isDrawingTextBox || isDrawingLink || isDrawingAreaHighlight) {
                                  handleEditToolMouseDown(e, originalPageIndex);
                                } else if (['square', 'circle', 'cloud', 'pentagon', 'spline', 'line', 'arrow', 'pencil'].includes(activeTool as string)) {
                                  handleDrawingMouseDown(e, originalPageIndex);
                                } else {
                                  handleHandMouseDown(e);
                                }
                              }}
                              onPointerMove={(e) => {
                                if (imageToPlace || isDrawingTextBox || isDrawingLink || isDrawingAreaHighlight) {
                                  handleEditToolMouseMove(e, originalPageIndex);
                                } else if (isDrawing) {
                                  handleDrawingMouseMove(e);
                                } else if (isDraggingHand) {
                                  handleHandMouseMove(e);
                                }
                              }}
                              onPointerUp={(e) => {
                                if (imageToPlace || isDrawingTextBox || isDrawingLink || isDrawingAreaHighlight) {
                                  handleEditToolMouseUp(originalPageIndex, e);
                                } else if (isDrawing) {
                                  handleDrawingMouseUp(e);
                                } else if (isDraggingHand) {
                                  handleHandMouseUp();
                                }
                              }}
                              onDoubleClick={(e) => {
                                if (['cloud', 'pentagon'].includes(activeTool as string)) {
                                  handleDrawingDoubleClick(e, originalPageIndex);
                                }
                              }}
                              className={cn(
                                "pdf-page-container group relative bg-white shadow-2xl h-fit origin-center touch-none",
                                isDrawing || isDraggingHand || imageToPlace || isDrawingTextBox || isDrawingLink || isDrawingAreaHighlight ? "select-none" : "",
                                activeTool === 'hand' ? "cursor-grab active:cursor-grabbing" :
                                  (activeTool === 'text' || activeTool === 'textbox' || activeTool === 'link' || activeTool === 'area-highlight' || !!imageToPlace) ? "cursor-crosshair" : "cursor-default",
                                (activeMenu === 'Page' ? selectedPageIds.includes(page.id) : (currentPage === originalPageIndex + 1)) && "ring-4 ring-blue-500 ring-offset-4 ring-offset-slate-400"
                              )}
                              style={{
                                width: '100%',
                                height: '100%',
                                aspectRatio: `${displayWidth} / ${displayHeight}`,
                              }}
                              onClick={(e) => {
                                if (activeMenu === 'Page') {
                                  setCurrentPage(originalPageIndex + 1);

                                  // Multi-select logic
                                  if (e.ctrlKey || e.metaKey) {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    // Toggle individual page
                                    setSelectedPageIds(prev => {
                                      const exists = prev.includes(page.id);
                                      if (exists) {
                                        return prev.filter(id => id !== page.id);
                                      } else {
                                        return [...prev, page.id];
                                      }
                                    });
                                  } else if (e.shiftKey && selectedPageIds.length > 0) {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    // Range select
                                    const lastSelectedId = selectedPageIds[selectedPageIds.length - 1];
                                    const lastIdx = pages.findIndex(p => p.id === lastSelectedId);
                                    const start = Math.min(lastIdx, originalPageIndex);
                                    const end = Math.max(lastIdx, originalPageIndex);
                                    const rangeIds = pages.slice(start, end + 1).map(p => p.id);
                                    setSelectedPageIds(Array.from(new Set([...selectedPageIds, ...rangeIds])));
                                  } else {
                                    // Single select
                                    if (lastSelectionDist < 5) {
                                      setSelectedPageIds([page.id]);
                                    }
                                  }
                                }
                                const isAnnotationTool = ['highlight', 'underline', 'strikethrough', 'squiggly', 'caret', 'text', 'typewriter', 'textbox', 'note', 'area-highlight', 'stamp', 'image'].includes(activeTool as string);

                                if ((e.target === e.currentTarget || isAnnotationTool) && !isDrawing) {
                                  if (justAddedAnnotation.current) {
                                    justAddedAnnotation.current = false;
                                    if (activeTool === 'image' || activeTool === 'textbox') {
                                      setActiveTool('select');
                                    }
                                    return;
                                  }
                                  setSelectedAnnId(null);
                                  if (activeTool !== 'hand' && activeTool !== 'select') handlePageClick(e, originalPageIndex);
                                }
                              }}
                            >
                              {/* Interactive Annotations */}
                              {page.annotations?.map(ann => (
                                <React.Fragment key={ann.id}>
                                  {(ann.type === 'image' || ann.type === 'textbox' || ann.type === 'link') && (
                                    <AnnotationObject
                                      annotation={ann}
                                      pageWidth={widthBase}
                                      pageHeight={heightBase}
                                      zoom={zoom}
                                      activeTool={activeTool as string}
                                      isSelected={selectedAnnId === ann.id}
                                      onSelect={() => {
                                        if (ann.type === 'link' && (activeTool === 'select' || activeTool === 'hand')) {
                                          if (ann.linkConfig?.actionType === 'web' && ann.linkConfig?.webUrl) {
                                            let url = ann.linkConfig.webUrl;
                                            if (!url.startsWith('http://') && !url.startsWith('https://')) {
                                              url = 'https://' + url;
                                            }
                                            window.open(url, '_blank');
                                          } else if (ann.linkConfig?.actionType === 'page' && ann.linkConfig?.targetPage) {
                                            navigationSource.current = 'direct';
                                            setCurrentPage(ann.linkConfig.targetPage);
                                          }
                                        } else {
                                          setSelectedAnnId(ann.id);
                                        }
                                      }}
                                      onUpdate={(data, saveToHistory) => updateAnnotation(ann.id, data, saveToHistory)}
                                      onDelete={() => removeAnnotation(ann.id)}
                                    />
                                  )}
                                  {selectedAnnId === ann.id && (ann.type === 'image' || ann.type === 'textbox' || ann.type === 'link') && (
                                    <AnnotationProperties
                                      annotation={ann}
                                      pageWidth={widthBase}
                                      pageHeight={heightBase}
                                      zoom={zoom}
                                      onUpdate={(data, saveToHistory) => updateAnnotation(ann.id, data, saveToHistory)}
                                      onDelete={() => { removeAnnotation(ann.id); setSelectedAnnId(null); }}
                                      onReplace={() => handleAddImageRequest(ann.id)}
                                      onAlign={(type) => handleAlignAnnotation(ann.id, type, widthBase, heightBase)}
                                      onClose={() => { setSelectedAnnId(null); setActiveTool('select'); }}
                                      onEditLink={() => setShowLinkModal({
                                        pageIndex: originalPageIndex,
                                        bounds: { x: ann.x, y: ann.y, width: ann.width || 0, height: ann.height || 0 },
                                        editAnnId: ann.id,
                                        initialConfig: ann.linkConfig
                                      })}
                                    />
                                  )}
                                </React.Fragment>
                              ))}

                              {/* Ghost elements for placement */}
                              {isDrawingTextBox && textBoxStart && textBoxEnd && (
                                <div
                                  className="absolute border-2 border-blue-500 border-dashed bg-blue-500/10 pointer-events-none z-50"
                                  style={{
                                    left: `${Math.min(textBoxStart.x, textBoxEnd.x)}%`,
                                    top: `${Math.min(textBoxStart.y, textBoxEnd.y)}%`,
                                    width: `${Math.abs(textBoxEnd.x - textBoxStart.x)}%`,
                                    height: `${Math.abs(textBoxEnd.y - textBoxStart.y)}%`,
                                  }}
                                />
                              )}

                              {isDrawingLink && linkStart && linkEnd && (
                                <div
                                  className="absolute border-2 border-green-500 border-solid bg-green-500/10 pointer-events-none z-50"
                                  style={{
                                    left: `${Math.min(linkStart.x, linkEnd.x)}%`,
                                    top: `${Math.min(linkStart.y, linkEnd.y)}%`,
                                    width: `${Math.abs(linkEnd.x - linkStart.x)}%`,
                                    height: `${Math.abs(linkEnd.y - linkStart.y)}%`,
                                  }}
                                />
                              )}


                              {isDrawingAreaHighlight && areaHighlightStart && areaHighlightEnd && (
                                <div
                                  className="absolute bg-[#FFEB3B]/40 pointer-events-none z-50 mix-blend-multiply"
                                  style={{
                                    left: `${Math.min(areaHighlightStart.x, areaHighlightEnd.x)}%`,
                                    top: `${Math.min(areaHighlightStart.y, areaHighlightEnd.y)}%`,
                                    width: `${Math.abs(areaHighlightEnd.x - areaHighlightStart.x)}%`,
                                    height: `${Math.abs(areaHighlightEnd.y - areaHighlightStart.y)}%`,
                                  }}
                                />
                              )}

                              {imageToPlace && placingImagePos && (
                                <div
                                  className="fixed pointer-events-none z-[10000] opacity-50 border-2 border-blue-500"
                                  style={{
                                    left: `${placingImagePos.x}px`,
                                    top: `${placingImagePos.y}px`,
                                    width: '150px',
                                    height: `${150 / (imageToPlace.width / imageToPlace.height)}px`,
                                    transform: 'translate(-50%, -50%)'
                                  }}
                                >
                                  <img src={imageToPlace.content} className="w-full h-full object-contain" alt="" />
                                </div>
                              )}
                              {isDrawing && drawingStart?.pageIndex === originalPageIndex && currentDrawingRect && (
                                <div
                                  className="absolute border-2 border-blue-500 bg-blue-500/10 z-[1000] pointer-events-none"
                                  style={{
                                    left: `${currentDrawingRect.x}%`,
                                    top: `${currentDrawingRect.y}%`,
                                    width: `${currentDrawingRect.width}%`,
                                    height: `${currentDrawingRect.height}%`,
                                    borderRadius: activeTool === 'circle' ? '50%' : '0'
                                  }}
                                />
                              )}
                              <div
                                className="relative w-full h-full"
                                style={{
                                  width: `${widthBase * (zoom / 100)}px`,
                                  height: `${heightBase * (zoom / 100)}px`,
                                  position: 'absolute',
                                  top: '50%',
                                  left: '50%',
                                  transform: `translate(-50%, -50%) rotate(${rotation + viewRotation + (page.rotation || 0)}deg)`,
                                  transition: rotation + viewRotation + (page.rotation || 0) === 0 ? 'none' : 'transform 0.2s ease-out',
                                  // Handle responsive width in Page tab
                                  ...(activeMenu === 'Page' && {
                                    width: isRotated ? `${(widthBase / displayWidth) * 100}%` : '100%',
                                    height: isRotated ? `${(heightBase / displayHeight) * 100}%` : '100%',
                                  })
                                }}
                              >
                                <img
                                  src={page.previewUrl}
                                  alt={`Page ${originalPageIndex + 1}`}
                                  className="w-full h-full pointer-events-none select-none object-contain"
                                />

                                {/* Hover Controls */}
                                {activeMenu === 'Page' && (
                                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none">
                                    <button
                                      className="p-2 bg-white/90 hover:bg-white rounded-full shadow-lg text-slate-700 hover:text-blue-600 border border-slate-200 transition-all pointer-events-auto active:scale-95"
                                      title="Rotate Left"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        rotateSelectedPages('left', true, [page.id]);
                                      }}
                                    >
                                      <RotateCcw className="w-5 h-5" />
                                    </button>
                                    <button
                                      className="p-3 bg-red-500 hover:bg-red-600 rounded-full shadow-lg text-white border border-red-400 transition-all pointer-events-auto active:scale-95"
                                      title="Delete Page"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        deleteSelectedPages([page.id]);
                                      }}
                                    >
                                      <Trash2 className="w-6 h-6" />
                                    </button>
                                    <button
                                      className="p-2 bg-white/90 hover:bg-white rounded-full shadow-lg text-slate-700 hover:text-blue-600 border border-slate-200 transition-all pointer-events-auto active:scale-95"
                                      title="Rotate Right"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        rotateSelectedPages('right', true, [page.id]);
                                      }}
                                    >
                                      <RotateCw className="w-5 h-5" />
                                    </button>
                                  </div>
                                )}

                                {/* Text Selection Layer */}
                                <div
                                  className={cn(
                                    "absolute inset-0 overflow-hidden",
                                    (activeTool === 'select' || ['highlight', 'underline', 'strikethrough', 'squiggly', 'caret'].includes(activeTool)) && activeMenu !== 'Page' && !isDrawing && !isDraggingHand ? "pointer-events-auto select-text" : "pointer-events-none select-none"
                                  )}
                                >
                                  {activeMenu !== 'Page' && page.textItems?.map((item: any, idx: number) => {
                                    const [sx, skx, sky, sy, tx, ty] = item.transform;
                                    const pageWidth = page.width || 1;
                                    const pageHeight = page.height || 1;

                                    // Position by percentage to handle container scaling correctly
                                    const left = (tx / pageWidth) * 100;
                                    const bottom = (ty / pageHeight) * 100;

                                    // item.width is in points, convert to percentage of container
                                    const itemWidthPercent = (item.width / pageWidth) * 100;

                                    // Most PDFs use sx as font size, but it can be sy if rotated.
                                    const fontSizePoints = Math.abs(sy) || Math.abs(sx) || 12;

                                    const isSelectable = (activeTool === 'select' || ['highlight', 'underline', 'strikethrough', 'squiggly', 'caret'].includes(activeTool)) && activeMenu !== 'Page';

                                    return (
                                      <span
                                        key={idx}
                                        className="absolute whitespace-pre text-transparent origin-bottom-left font-sans select-text"
                                        style={{
                                          left: `${left}%`,
                                          bottom: `${bottom}%`,
                                          width: `${itemWidthPercent + 0.5}%`,
                                          fontSize: `${fontSizePoints * (zoom / 100)}px`,
                                          pointerEvents: isSelectable ? 'auto' : 'none',
                                          userSelect: isSelectable ? 'text' : 'none',
                                          lineHeight: 1,
                                          height: `${(fontSizePoints / pageHeight) * 100}%`,
                                          fontVariantLigatures: 'none',
                                          letterSpacing: '0px',
                                          display: 'inline-block',
                                          transform: 'scaleX(1)'
                                        }}
                                      >
                                        {searchQuery ? (() => {
                                          const q = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                                          const flags = searchMatchCase ? 'g' : 'gi';
                                          const parts = item.str.split(new RegExp(`(${q})`, flags));
                                          return parts.map((part: string, i: number) => {
                                            const isMatch = searchMatchCase ? part === searchQuery : part.toLowerCase() === searchQuery.toLowerCase();
                                            return isMatch ? (
                                              <span key={i} className="bg-yellow-400 text-black mix-blend-multiply border-y border-yellow-600/20">{part}</span>
                                            ) : part;
                                          });
                                        })() : item.str}
                                      </span>
                                    );
                                  })}
                                </div>

                                {/* Text Replacement & Edit Layer */}
                                {page.textItems && activeMenu !== 'Page' && (
                                  <div className={`absolute inset-0 z-40 ${activeTool === 'edit' ? 'group/edit-page' : 'pointer-events-none'}`}>
                                    {page.textItems.map((item: any, idx: number) => {
                                      const [sx, skx, sky, sy, tx, ty] = item.transform;
                                      const pageWidth = page.width || 1;
                                      const pageHeight = page.height || 1;

                                      const left = (tx / pageWidth) * 100;
                                      const bottom = (ty / pageHeight) * 100;
                                      const itemWidthPercent = (item.width / pageWidth) * 100;
                                      const fontSizePoints = Math.abs(sy) || Math.abs(sx) || 12;
                                      const itemHeightPercent = (fontSizePoints / pageHeight) * 100;

                                      const handleSize = Math.max(4, 6 * (zoom / 100));
                                      const isEditable = activeTool === 'edit';
                                      const isAnnotating = ['highlight', 'underline', 'strikethrough', 'squiggly', 'caret'].includes(activeTool);

                                      return (
                                        <div
                                          key={`edit-${idx}`}
                                          className={cn(
                                            "absolute",
                                            (isEditable || isAnnotating) ? "group/item pointer-events-auto" : "pointer-events-none"
                                          )}
                                          style={{
                                            left: `${left}%`,
                                            bottom: `${bottom}%`,
                                            width: `${itemWidthPercent + 0.5}%`,
                                            height: `${itemHeightPercent * 1.5}%`,
                                            backgroundColor: (selectedTextItem?.pageId === page.id && selectedTextItem?.itemIdx === idx) || item.wasEdited ? 'white' : 'transparent',
                                            transform: 'translateY(15%)',
                                            zIndex: (selectedTextItem?.pageId === page.id && selectedTextItem?.itemIdx === idx) ? 60 : (isEditable ? 10 : (item.wasEdited ? 5 : 1)),
                                            display: !isEditable && !item.wasEdited ? 'none' : 'flex',
                                            alignItems: 'center',
                                          }}
                                        >
                                          {isEditable && (
                                            <>
                                              {/* Border wrapper - visible on page hover or item focus */}
                                              <div className={cn(
                                                "absolute inset-0 border border-transparent transition-all pointer-events-none",
                                                isEditable && "group-hover/edit-page:border-blue-200",
                                                isEditable && "group-hover/item:border-blue-500 group-hover/item:border-dashed",
                                                selectedTextItem?.pageId === page.id && selectedTextItem?.itemIdx === idx && "border-blue-600 border-2"
                                              )}>
                                                {/* Selection handles */}
                                                {selectedTextItem?.pageId === page.id && selectedTextItem?.itemIdx === idx && (
                                                  <>
                                                    <div className="absolute -top-1 -left-1 rounded-full border border-blue-600 bg-white" style={{ width: handleSize, height: handleSize }} />
                                                    <div className="absolute -top-1 -right-1 rounded-full border border-blue-600 bg-white" style={{ width: handleSize, height: handleSize }} />
                                                    <div className="absolute -bottom-1 -left-1 rounded-full border border-blue-600 bg-white" style={{ width: handleSize, height: handleSize }} />
                                                    <div className="absolute -bottom-1 -right-1 rounded-full border border-blue-600 bg-white" style={{ width: handleSize, height: handleSize }} />
                                                  </>
                                                )}
                                              </div>
                                            </>
                                          )}

                                          <div
                                            contentEditable={isEditable && activeTool === 'edit'}
                                            suppressContentEditableWarning
                                            data-item-idx={idx}
                                            className={cn(
                                              "w-full h-full outline-none break-words bg-transparent selection:bg-blue-200",
                                              (isEditable || isAnnotating) ? "select-text" : "select-none",
                                              selectedTextItem?.pageId === page.id && selectedTextItem?.itemIdx === idx && "bg-blue-50/50",
                                              activeTool === 'hand' && "pointer-events-none select-none"
                                            )}
                                            onClick={(e) => {
                                              if (isEditable && activeTool === 'edit') {
                                                e.stopPropagation();
                                                handleTextItemSelect(page.id, idx);
                                              }
                                            }}
                                            onFocus={() => {
                                              if (isEditable && activeTool === 'edit') {
                                                handleTextItemSelect(page.id, idx);
                                              }
                                            }}
                                            style={{
                                              fontSize: `${(item.fontSize || fontSizePoints) * (zoom / 100)}px`,
                                              color: ((selectedTextItem?.pageId === page.id && selectedTextItem?.itemIdx === idx) || item.wasEdited) ? (item.color || '#000000') : 'transparent',
                                              fontWeight: item.bold ? 'bold' : 'normal',
                                              fontStyle: item.italic ? 'italic' : 'normal',
                                              textDecoration: `${item.underline ? 'underline' : ''} ${item.strikethrough ? 'line-through' : ''}`.trim() || 'none',
                                              textAlign: item.align || 'left',
                                              fontFamily: item.fontFamily || (item.serif ? 'serif' : 'sans-serif'),
                                              transform: `translateY(${item.superscript ? '-25%' : item.subscript ? '25%' : '0'}) scale(${item.superscript || item.subscript ? 0.7 : 1})`,
                                              lineHeight: item.lineHeight || 1.1,
                                              letterSpacing: `${item.letterSpacing || 0}px`,
                                              display: 'flex',
                                              alignItems: 'center',
                                              justifyContent: item.align === 'center' ? 'center' : item.align === 'right' ? 'flex-end' : 'flex-start',
                                              whiteSpace: 'nowrap',
                                              cursor: isEditable && activeTool === 'edit' ? 'text' : (activeTool === 'hand' ? 'grab' : 'default'),
                                              minWidth: '4px'
                                            }}
                                            onKeyDown={(e) => {
                                              if (e.key === 'Enter') {
                                                e.preventDefault();
                                                e.currentTarget.blur();
                                              } else if (e.key === 'Escape') {
                                                e.currentTarget.textContent = item.str;
                                                e.currentTarget.blur();
                                              }
                                            }}
                                            onBlur={(e) => {
                                              if (!isEditable) return;
                                              const newText = e.currentTarget.innerHTML || '';
                                              if (newText !== item.str) {
                                                updateSelectedTextItem({ str: newText });
                                              }
                                            }}
                                          >
                                            <div dangerouslySetInnerHTML={{ __html: item.str }} />
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}

                                {/* Global Overlays (Simulated in UI) */}
                                <div className="absolute inset-x-0 top-2 px-4 pointer-events-none flex" style={{ justifyContent: headerPos === 'left' ? 'flex-start' : headerPos === 'right' ? 'flex-end' : 'center' }}>
                                  {headerText && <span className="text-slate-400 text-[10px] bg-transparent px-2 rounded border border-border/50 font-bold" style={{ fontSize: `${globalFontSize / 2}px` }}>{headerText}</span>}
                                </div>
                                <div className="absolute inset-x-0 bottom-2 px-4 pointer-events-none flex" style={{ justifyContent: footerPos === 'left' ? 'flex-start' : footerPos === 'right' ? 'flex-end' : 'center' }}>
                                  {footerText && <span className="text-slate-400 text-[10px] bg-transparent px-2 rounded border border-border/50 font-bold" style={{ fontSize: `${globalFontSize / 2}px` }}>{footerText}</span>}
                                </div>

                                {/* Page Number Preview */}
                                {addPageNumbers && (
                                  <div
                                    className="absolute inset-x-0 px-4 pointer-events-none flex"
                                    style={{
                                      top: pageNumberPos === 'header' ? '0.5rem' : 'auto',
                                      bottom: pageNumberPos === 'footer' ? '0.5rem' : 'auto',
                                      justifyContent: pageNumberAlign === 'left' ? 'flex-start' : pageNumberAlign === 'right' ? 'flex-end' : 'center'
                                    }}
                                  >
                                    <span
                                      className="text-accent/60 text-[10px] bg-transparent px-2 rounded border border-accent/20 font-mono font-bold italic"
                                      style={{ fontSize: `${globalFontSize / 2}px` }}
                                    >
                                      {pageNumberFormat
                                        .replace('{n}', (originalPageIndex + 1).toString())
                                        .replace('{total}', pages.length.toString())}
                                    </span>
                                  </div>
                                )}

                                {/* Annotations Layer */}
                                {!hideAnnotations && (
                                  <div className="absolute inset-0 pointer-events-none z-[100]">
                                    {page.annotations?.filter(ann => ann.type !== 'image' && ann.type !== 'textbox').map((ann) => (
                                      <motion.div
                                        key={ann.id}
                                        drag={!['highlight', 'underline', 'strikethrough', 'squiggly', 'caret'].includes(ann.type) && (activeTool === 'select' || activeTool === 'edit')}
                                        dragMomentum={false}
                                        onDragEnd={(_, info) => {
                                          const container = previewContainerRef.current;
                                          if (!container) return;

                                          const updatedPages = [...pages];
                                          const targetPage = updatedPages[originalPageIndex];
                                          if (!targetPage) return;
                                          const annIdx = targetPage.annotations.findIndex(a => a.id === ann.id);

                                          const zoomScale = zoom / 100;
                                          const origW = targetPage.width * zoomScale;
                                          const origH = (targetPage.height || targetPage.width * 1.414) * zoomScale;

                                          const theta = -((rotation + viewRotation) * Math.PI) / 180;
                                          const rx = info.offset.x * Math.cos(theta) - info.offset.y * Math.sin(theta);
                                          const ry = info.offset.x * Math.sin(theta) + info.offset.y * Math.cos(theta);

                                          const newX = ann.x + (rx / origW) * 100;
                                          const newY = ann.y + (ry / origH) * 100;

                                          targetPage.annotations[annIdx] = { ...ann, x: newX, y: newY };
                                          updatePagesWithHistory(updatedPages);
                                        }}
                                        className={cn(
                                          "absolute group/ann transition-[box-shadow]",
                                          activeTool === 'hand' ? "pointer-events-none" : "pointer-events-auto",
                                          (activeTool === 'select' || activeTool === 'edit') && ann.type !== 'highlight' ? "cursor-move" : "cursor-pointer",
                                          selectedAnnId === ann.id && "ring-2 ring-accent ring-offset-2 rounded-sm"
                                        )}
                                        style={{
                                          left: `${ann.x}%`,
                                          top: `${ann.y}%`,
                                          width: (['highlight', 'underline', 'strikethrough', 'squiggly', 'caret'].includes(ann.type)) ? (ann.originalWidth ? `${ann.originalWidth * (zoom / 100)}px` : `${ann.width}%`) : (ann.type === 'textbox' || ann.type === 'image' ? `${ann.width}%` : undefined),
                                          height: (['highlight', 'underline', 'strikethrough', 'squiggly', 'caret'].includes(ann.type)) ? (ann.originalHeight ? `${ann.originalHeight * (zoom / 100)}px` : `${ann.height}%`) : (ann.type === 'textbox' || ann.type === 'image' ? `${ann.height}%` : undefined),
                                          transform: ann.type === 'text' ? 'translate(0, -85%)' : 'translate(-50%, -50%)'
                                        }}
                                        onClick={(e) => {
                                          if (activeTool === 'hand') return;
                                          e.stopPropagation();
                                          if (activeTool === 'eraser') {
                                            removeAnnotation(ann.id);
                                            setSelectedAnnId(null);
                                          } else {
                                            setSelectedAnnId(ann.id);
                                          }
                                        }}
                                        onDoubleClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedAnnId(ann.id);
                                          setEditingNoteId(ann.id);
                                        }}
                                      >
                                        {/* Inline Note Editor */}
                                        {editingNoteId === ann.id && (
                                          <div className="absolute z-[200] -top-2 left-full ml-2 bg-yellow-50 border border-yellow-300 shadow-2xl rounded-lg p-3 min-w-[200px] pointer-events-auto">
                                            <div className="flex items-center justify-between mb-2">
                                              <span className="text-[10px] font-black uppercase text-yellow-700">Edit Note</span>
                                              <button onClick={(e) => { e.stopPropagation(); setEditingNoteId(null); }} className="p-0.5 hover:bg-yellow-100 rounded">
                                                <X className="w-3 h-3 text-yellow-800" />
                                              </button>
                                            </div>
                                            <textarea
                                              autoFocus
                                              defaultValue={ann.note || ''}
                                              onBlur={(e) => {
                                                handleUpdateNote(originalPageIndex, ann.id, e.target.value);
                                                setEditingNoteId(null);
                                              }}
                                              onKeyDown={(e) => {
                                                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                                                  handleUpdateNote(originalPageIndex, ann.id, e.currentTarget.value);
                                                  setEditingNoteId(null);
                                                }
                                              }}
                                              className="w-full h-24 bg-white/50 border border-yellow-200 rounded p-2 text-xs focus:ring-1 focus:ring-yellow-400 outline-none resize-none font-medium leading-relaxed"
                                              placeholder="Add a note..."
                                            />
                                            <div className="mt-2 flex justify-between items-center">
                                              <span className="text-[8px] text-yellow-600 font-bold italic">Ctrl+Enter to save</span>
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  const textarea = (e.currentTarget.previousElementSibling?.previousElementSibling as HTMLTextAreaElement);
                                                  handleUpdateNote(originalPageIndex, ann.id, textarea.value);
                                                  setEditingNoteId(null);
                                                }}
                                                className="px-2 py-1 bg-yellow-400 text-yellow-900 rounded text-[10px] font-bold hover:bg-yellow-500 transition-colors"
                                              >
                                                Save
                                              </button>
                                            </div>
                                          </div>
                                        )}

                                        {/* Note Hover display */}
                                        {ann.note && editingNoteId !== ann.id && (
                                          <div className="absolute opacity-0 group-hover/ann:opacity-100 transition-opacity bg-yellow-50 border border-yellow-200 p-2 rounded shadow-lg z-[100] min-w-[150px] -top-2 left-full ml-2 pointer-events-none">
                                            <div className="text-[10px] uppercase font-black text-yellow-600 mb-1 border-b border-yellow-100 pb-1">Note by {ann.author || 'Author'}</div>
                                            <div className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">{ann.note}</div>
                                            <div className="text-[8px] text-slate-400 mt-2 italic">Double click to edit</div>
                                          </div>
                                        )}

                                        {ann.type === 'text' && (
                                          <div
                                            className={cn(
                                              "px-2 py-1 rounded whitespace-pre-wrap transition-all min-w-[40px] min-h-[1.5em] relative",
                                              selectedAnnId === ann.id ? "ring-2 ring-accent/50 shadow-md" : "ring-0",
                                              ann.bold && "font-bold",
                                              ann.italic && "italic"
                                            )}
                                            style={{
                                              color: ann.color || '#000000',
                                              backgroundColor: ann.backgroundColor || 'transparent',
                                              fontSize: `${(ann.fontSize || 12) * (zoom / 100)}px`,
                                              textAlign: ann.alignment || 'left'
                                            }}
                                          >
                                            {ann.content}
                                            {ann.note && (
                                              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-yellow-400 rounded-full border border-white shadow-sm" />
                                            )}
                                          </div>
                                        )}
                                        {ann.type === 'highlight' && (
                                          <div
                                            className="rounded-sm"
                                            style={{
                                              width: '100%',
                                              height: '100%',
                                              backgroundColor: ann.color || '#FFEB3B',
                                              opacity: ann.opacity ?? 0.3
                                            }}
                                          >
                                            <div className="sr-only">{ann.content}</div>
                                          </div>
                                        )}
                                        {ann.type === 'underline' && (
                                          <div
                                            className="mt-[-2px]"
                                            style={{
                                              width: '100%',
                                              height: '100%',
                                              borderBottom: `1.5px solid ${ann.color || '#000000'}`,
                                              opacity: ann.opacity ?? 1
                                            }}
                                          />
                                        )}
                                        {ann.type === 'strikethrough' && (
                                          <div
                                            className="absolute inset-0 flex items-center"
                                            style={{
                                              width: '100%',
                                              height: '100%',
                                              opacity: ann.opacity ?? 1,
                                              left: '50%',
                                              top: '50%',
                                              transform: 'translate(-50%, -50%)'
                                            }}
                                          >
                                            <div className="w-full h-[1.5px]" style={{ backgroundColor: ann.color || '#000000' }} />
                                          </div>
                                        )}
                                        {ann.type === 'squiggly' && (
                                          <div
                                            className="relative"
                                            style={{
                                              width: '100%',
                                              height: '100%',
                                              opacity: ann.opacity ?? 1
                                            }}
                                          >
                                            <svg className="absolute bottom-0 left-0 w-full h-[4px]" preserveAspectRatio="none" viewBox="0 0 100 4">
                                              <path
                                                d="M 0 2 Q 2.5 0 5 2 T 10 2 T 15 2 T 20 2 T 25 2 T 30 2 T 35 2 T 40 2 T 45 2 T 50 2 T 55 2 T 60 2 T 65 2 T 70 2 T 75 2 T 80 2 T 85 2 T 90 2 T 95 2 T 100 2"
                                                fill="none"
                                                stroke={ann.color || '#000000'}
                                                strokeWidth="2"
                                              />
                                            </svg>
                                          </div>
                                        )}
                                        {ann.type === 'caret' && (
                                          <div
                                            className="flex items-end justify-center"
                                            style={{
                                              width: ann.originalWidth ? `${ann.originalWidth * (zoom / 100)}px` : '20px',
                                              height: ann.originalHeight ? `${ann.originalHeight * (zoom / 100)}px` : '20px',
                                              opacity: ann.opacity ?? 1
                                            }}
                                          >
                                            <ChevronUp
                                              className="w-4 h-4"
                                              style={{
                                                color: ann.color || '#ef4444',
                                                transform: `scale(${zoom / 100})`,
                                                transformOrigin: 'bottom center'
                                              }}
                                            />
                                          </div>
                                        )}
                                        {ann.type === 'shape' && (
                                          <div
                                            style={{
                                              width: ann.originalWidth ? `${ann.originalWidth * (zoom / 100)}px` : `${40 * (zoom / 100)}px`,
                                              height: ann.originalHeight ? `${ann.originalHeight * (zoom / 100)}px` : `${40 * (zoom / 100)}px`,
                                              opacity: ann.opacity ?? 1
                                            }}
                                          >
                                            <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ display: 'block' }}>
                                              {ann.points ? (
                                                <>
                                                  {['line', 'arrow'].includes(ann.content) ? (
                                                    <line
                                                      x1={ann.points[0].x} y1={ann.points[0].y}
                                                      x2={ann.points[ann.points.length - 1].x} y2={ann.points[ann.points.length - 1].y}
                                                      stroke={ann.color || '#3b82f6'}
                                                      strokeWidth={ann.strokeWidth || 2}
                                                      strokeDasharray={ann.strokeType === 'dashed' ? '5,5' : 'none'}
                                                    />
                                                  ) : (
                                                    <polyline
                                                      points={ann.points.map(p => `${p.x},${p.y}`).join(' ')}
                                                      fill={['pentagon', 'cloud'].includes(ann.content) ? (ann.backgroundColor || 'transparent') : 'none'}
                                                      stroke={ann.color || '#3b82f6'}
                                                      strokeWidth={ann.strokeWidth || 2}
                                                      strokeDasharray={ann.strokeType === 'dashed' ? '5,5' : 'none'}
                                                      fillRule="evenodd"
                                                    />
                                                  )}
                                                </>
                                              ) : (
                                                <>
                                                  {ann.content === 'square' && (
                                                    <rect
                                                      x="5" y="5" width="90" height="90"
                                                      fill={ann.backgroundColor || 'transparent'}
                                                      stroke={ann.color || '#3b82f6'}
                                                      strokeWidth={ann.strokeWidth || 2}
                                                      strokeDasharray={ann.strokeType === 'dashed' ? '5,5' : 'none'}
                                                    />
                                                  )}
                                                  {ann.content === 'circle' && (
                                                    <circle
                                                      cx="50" cy="50" r="45"
                                                      fill={ann.backgroundColor || 'transparent'}
                                                      stroke={ann.color || '#3b82f6'}
                                                      strokeWidth={ann.strokeWidth || 2}
                                                      strokeDasharray={ann.strokeType === 'dashed' ? '5,5' : 'none'}
                                                    />
                                                  )}
                                                </>
                                              )}
                                            </svg>
                                          </div>
                                        )}

                                        {/* Annotation Toolbar */}
                                        {selectedAnnId === ann.id && (
                                          <div className="fixed bottom-[max(20vh,120px)] md:bottom-auto left-1/2 -translate-x-1/2 md:absolute md:-top-14 bg-white border border-border shadow-[0_10px_40px_rgba(0,0,0,0.3)] rounded-xl px-2 py-1.5 flex items-center gap-1.5 z-[9999] pointer-events-auto min-w-max ring-1 ring-black/10 max-w-[92vw] overflow-x-auto no-scrollbar md:overflow-visible annotation-toolbar">
                                            {ann.type === 'shape' && (
                                              <>
                                                <div className="flex bg-slate-100 p-0.5 rounded gap-0.5">
                                                  <input
                                                    type="color"
                                                    value={ann.color || '#3b82f6'}
                                                    onChange={(e) => {
                                                      const updated = [...pages];
                                                      const targetP = updated[originalPageIndex];
                                                      if (!targetP) return;
                                                      const aIdx = targetP.annotations.findIndex(a => a.id === ann.id);
                                                      targetP.annotations[aIdx].color = e.target.value;
                                                      updatePagesWithHistory(updated);
                                                    }}
                                                    className="w-6 h-6 rounded border-none p-0 cursor-pointer bg-transparent"
                                                    title="Stroke Color"
                                                  />
                                                  <input
                                                    type="color"
                                                    value={ann.backgroundColor === 'transparent' ? '#ffffff' : (ann.backgroundColor || '#ffffff')}
                                                    onChange={(e) => {
                                                      const updated = [...pages];
                                                      const targetP = updated[originalPageIndex];
                                                      if (!targetP) return;
                                                      const aIdx = targetP.annotations.findIndex(a => a.id === ann.id);
                                                      targetP.annotations[aIdx].backgroundColor = e.target.value;
                                                      updatePagesWithHistory(updated);
                                                    }}
                                                    className="w-6 h-6 rounded border-none p-0 cursor-pointer bg-transparent"
                                                    style={{ opacity: ann.backgroundColor === 'transparent' ? 0.3 : 1 }}
                                                    title="Fill Color"
                                                  />
                                                  <button
                                                    onClick={() => {
                                                      const updated = [...pages];
                                                      const targetP = updated[originalPageIndex];
                                                      if (!targetP) return;
                                                      const aIdx = targetP.annotations.findIndex(a => a.id === ann.id);
                                                      targetP.annotations[aIdx].backgroundColor = ann.backgroundColor === 'transparent' ? '#ffffff' : 'transparent';
                                                      updatePagesWithHistory(updated);
                                                    }}
                                                    className={cn(
                                                      "w-6 h-6 flex items-center justify-center rounded",
                                                      ann.backgroundColor === 'transparent' ? "bg-slate-200 text-slate-500" : "bg-accent text-white"
                                                    )}
                                                    title="Toggle Fill"
                                                  >
                                                    <PaintBucket className="w-3.5 h-3.5" />
                                                  </button>
                                                </div>

                                                <div className="h-4 w-px bg-border mx-1" />

                                                <div className="flex bg-slate-100 p-0.5 rounded gap-0.5 items-center px-1">
                                                  <span className="text-[8px] font-bold text-slate-500">Width</span>
                                                  <input
                                                    type="number"
                                                    min="1"
                                                    max="20"
                                                    value={ann.strokeWidth || 2}
                                                    onChange={(e) => {
                                                      const val = parseInt(e.target.value);
                                                      const updated = [...pages];
                                                      const targetP = updated[originalPageIndex];
                                                      if (!targetP) return;
                                                      const aIdx = targetP.annotations.findIndex(a => a.id === ann.id);
                                                      targetP.annotations[aIdx].strokeWidth = val;
                                                      updatePagesWithHistory(updated);
                                                    }}
                                                    className="w-9 bg-white border border-border rounded text-[10px] font-bold px-1 outline-none"
                                                  />
                                                </div>

                                                <div className="h-4 w-px bg-border mx-1" />

                                                <div className="flex items-center gap-1.5 px-2 bg-slate-100 py-1 rounded-md">
                                                  <button
                                                    onClick={() => {
                                                      const updated = [...pages];
                                                      const targetP = updated[originalPageIndex];
                                                      if (!targetP) return;
                                                      const aIdx = targetP.annotations.findIndex(a => a.id === ann.id);
                                                      targetP.annotations[aIdx].strokeType = ann.strokeType === 'dashed' ? 'solid' : 'dashed';
                                                      updatePagesWithHistory(updated);
                                                    }}
                                                    className={cn(
                                                      "w-7 h-6 flex items-center justify-center rounded text-[8px] font-bold",
                                                      ann.strokeType === 'dashed' ? "bg-accent text-white" : "bg-white text-slate-500"
                                                    )}
                                                  >
                                                    {ann.strokeType === 'dashed' ? 'DASH' : 'SOLID'}
                                                  </button>
                                                </div>

                                                <div className="h-4 w-px bg-border mx-1" />

                                                <div className="flex items-center gap-1.5 px-2 bg-slate-100 py-1 rounded-md">
                                                  <span className="text-[9px] font-bold text-slate-500">Op:</span>
                                                  <input
                                                    type="range"
                                                    min="0.1"
                                                    max="1"
                                                    step="0.1"
                                                    value={ann.opacity ?? 1}
                                                    onChange={(e) => {
                                                      const val = parseFloat(e.target.value);
                                                      const updated = [...pages];
                                                      const targetP = updated[originalPageIndex];
                                                      if (!targetP) return;
                                                      const aIdx = targetP.annotations.findIndex(a => a.id === ann.id);
                                                      targetP.annotations[aIdx].opacity = val;
                                                      updatePagesWithHistory(updated);
                                                    }}
                                                    className="w-12 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-accent"
                                                  />
                                                </div>

                                                <div className="h-4 w-px bg-border mx-1" />
                                              </>
                                            )}
                                            {ann.type === 'text' && (
                                              <>
                                                <div className="flex bg-slate-100 p-0.5 rounded gap-0.5">
                                                  <button
                                                    onClick={() => {
                                                      const updated = [...pages];
                                                      const targetP = updated[originalPageIndex];
                                                      if (!targetP) return;
                                                      const aIdx = targetP.annotations.findIndex(a => a.id === ann.id);
                                                      targetP.annotations[aIdx].bold = !ann.bold;
                                                      updatePagesWithHistory(updated);
                                                    }}
                                                    className={cn(
                                                      "w-7 h-7 rounded flex items-center justify-center font-bold text-xs transition-colors",
                                                      ann.bold ? "bg-accent text-white" : "hover:bg-slate-100 text-slate-600"
                                                    )}
                                                  >
                                                    B
                                                  </button>
                                                  <button
                                                    onClick={() => {
                                                      const updated = [...pages];
                                                      const targetP = updated[originalPageIndex];
                                                      if (!targetP) return;
                                                      const aIdx = targetP.annotations.findIndex(a => a.id === ann.id);
                                                      targetP.annotations[aIdx].italic = !ann.italic;
                                                      updatePagesWithHistory(updated);
                                                    }}
                                                    className={cn(
                                                      "w-7 h-7 rounded flex items-center justify-center italic text-xs font-serif transition-colors",
                                                      ann.italic ? "bg-accent text-white" : "hover:bg-slate-100 text-slate-600"
                                                    )}
                                                  >
                                                    I
                                                  </button>
                                                </div>

                                                <div className="h-4 w-px bg-border mx-1" />

                                                <div className="flex bg-slate-100 p-0.5 rounded gap-0.5">
                                                  {(['left', 'center', 'right'] as const).map(align => (
                                                    <button
                                                      key={align}
                                                      onClick={() => {
                                                        const updated = [...pages];
                                                        const targetP = updated[originalPageIndex];
                                                        if (!targetP) return;
                                                        const aIdx = targetP.annotations.findIndex(a => a.id === ann.id);
                                                        targetP.annotations[aIdx].alignment = align;
                                                        updatePagesWithHistory(updated);
                                                      }}
                                                      className={cn(
                                                        "w-6 h-6 rounded flex items-center justify-center transition-all",
                                                        (ann.alignment || 'left') === align ? "bg-white shadow-sm text-accent" : "text-slate-400 hover:text-slate-600"
                                                      )}
                                                    >
                                                      <div className="flex flex-col gap-0.5 items-center w-3">
                                                        <div className={cn("h-0.5 bg-current rounded-full", align === 'left' ? "w-full self-start" : align === 'right' ? "w-full self-end" : "w-full")} />
                                                        <div className={cn("h-0.5 bg-current rounded-full", align === 'left' ? "w-2/3 self-start" : align === 'right' ? "w-2/3 self-end" : "w-2/3")} />
                                                        <div className={cn("h-0.5 bg-current rounded-full", align === 'left' ? "w-full self-start" : align === 'right' ? "w-full self-end" : "w-full")} />
                                                      </div>
                                                    </button>
                                                  ))}
                                                </div>

                                                <div className="h-4 w-px bg-border mx-1" />

                                                <div className="flex items-center gap-1 border-l border-border pl-1 ml-1">
                                                  <span className="text-[8px] font-bold text-slate-400">Si</span>
                                                  <input
                                                    type="number"
                                                    value={ann.fontSize || 12}
                                                    onChange={(e) => {
                                                      const val = parseInt(e.target.value);
                                                      const updated = [...pages];
                                                      const targetP = updated[originalPageIndex];
                                                      if (!targetP) return;
                                                      const aIdx = targetP.annotations.findIndex(a => a.id === ann.id);
                                                      targetP.annotations[aIdx].fontSize = val;
                                                      updatePagesWithHistory(updated);
                                                    }}
                                                    className="w-10 bg-slate-50 border border-border rounded text-[10px] font-bold px-1 py-0.5 outline-none"
                                                  />
                                                </div>

                                                <div className="h-4 w-px bg-border mx-1" />

                                                <input
                                                  type="color"
                                                  value={ann.color || '#000000'}
                                                  onChange={(e) => {
                                                    const updated = [...pages];
                                                    const targetP = updated[originalPageIndex];
                                                    if (!targetP) return;
                                                    const aIdx = targetP.annotations.findIndex(a => a.id === ann.id);
                                                    targetP.annotations[aIdx].color = e.target.value;
                                                    updatePagesWithHistory(updated);
                                                  }}
                                                  className="w-6 h-6 rounded border-none p-0 cursor-pointer bg-transparent"
                                                  title="Text Color"
                                                />

                                                <div className="h-4 w-px bg-border mx-1" />

                                                <input
                                                  type="color"
                                                  value={ann.backgroundColor === 'transparent' ? '#ffffff' : (ann.backgroundColor || '#ffffff')}
                                                  onChange={(e) => {
                                                    const updated = [...pages];
                                                    const targetP = updated[originalPageIndex];
                                                    if (!targetP) return;
                                                    const aIdx = targetP.annotations.findIndex(a => a.id === ann.id);
                                                    targetP.annotations[aIdx].backgroundColor = e.target.value;
                                                    updatePagesWithHistory(updated);
                                                  }}
                                                  className="w-6 h-6 rounded border-none p-0 cursor-pointer bg-transparent"
                                                  style={{ opacity: (!ann.backgroundColor || ann.backgroundColor === 'transparent') ? 0.3 : 1 }}
                                                  title="Background Color"
                                                />
                                                <button
                                                  onClick={() => {
                                                    const updated = [...pages];
                                                    const targetP = updated[originalPageIndex];
                                                    if (!targetP) return;
                                                    const aIdx = targetP.annotations.findIndex(a => a.id === ann.id);
                                                    targetP.annotations[aIdx].backgroundColor = (!ann.backgroundColor || ann.backgroundColor === 'transparent') ? '#ffffff' : 'transparent';
                                                    updatePagesWithHistory(updated);
                                                  }}
                                                  className={cn(
                                                    "w-6 h-6 flex items-center justify-center rounded",
                                                    (!ann.backgroundColor || ann.backgroundColor === 'transparent') ? "bg-slate-200 text-slate-500" : "bg-accent text-white"
                                                  )}
                                                  title="Toggle Background"
                                                >
                                                  <PaintBucket className="w-3.5 h-3.5" />
                                                </button>

                                                <div className="h-4 w-px bg-border mx-1" />
                                              </>
                                            )}
                                            {(ann.type === 'highlight' || ann.type === 'underline' || ann.type === 'strikethrough' || ann.type === 'squiggly' || ann.type === 'caret') && (
                                              <>
                                                <div className="flex gap-1 bg-slate-100 p-1 rounded-md items-center">
                                                  {['#FFEB3B', '#4CAF50', '#03A9F4', '#FF5722', '#E91E63'].map(color => (
                                                    <button
                                                      key={color}
                                                      onClick={() => {
                                                        const updated = [...pages];
                                                        const targetP = updated[originalPageIndex];
                                                        if (!targetP) return;
                                                        const aIdx = targetP.annotations.findIndex(a => a.id === ann.id);
                                                        targetP.annotations[aIdx].color = color;
                                                        updatePagesWithHistory(updated);
                                                      }}
                                                      className={cn(
                                                        "w-4 h-4 rounded-full border border-slate-300 transition-all hover:scale-125",
                                                        (ann.color || '#FFEB3B') === color ? "ring-2 ring-slate-400" : "opacity-80 hover:opacity-100"
                                                      )}
                                                      style={{ backgroundColor: color }}
                                                    />
                                                  ))}
                                                  <div className="w-px h-3 bg-slate-300 mx-1" />
                                                  <input
                                                    type="color"
                                                    value={ann.color || '#FFEB3B'}
                                                    onChange={(e) => {
                                                      const updated = [...pages];
                                                      const targetP = updated[originalPageIndex];
                                                      if (!targetP) return;
                                                      const aIdx = targetP.annotations.findIndex(a => a.id === ann.id);
                                                      targetP.annotations[aIdx].color = e.target.value;
                                                      updatePagesWithHistory(updated);
                                                    }}
                                                    className="w-5 h-5 rounded-full border-none p-0 cursor-pointer bg-transparent overflow-hidden"
                                                    title="Custom Color"
                                                  />
                                                </div>

                                                <div className="h-4 w-px bg-border mx-1" />

                                                <div className="flex items-center gap-1.5 px-2 bg-slate-100 py-1 rounded-md">
                                                  <span className="text-[10px] font-bold text-slate-500 min-w-[20px]">Op:</span>
                                                  <input
                                                    type="range"
                                                    min="0"
                                                    max="1"
                                                    step="0.1"
                                                    value={ann.opacity ?? 0.3}
                                                    onChange={(e) => {
                                                      const val = parseFloat(e.target.value);
                                                      const updated = [...pages];
                                                      const targetP = updated[originalPageIndex];
                                                      if (!targetP) return;
                                                      const aIdx = targetP.annotations.findIndex(a => a.id === ann.id);
                                                      targetP.annotations[aIdx].opacity = val;
                                                      updatePagesWithHistory(updated);
                                                    }}
                                                    className="w-16 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-accent"
                                                  />
                                                  <span className="text-[9px] font-mono text-slate-400 w-6">
                                                    {Math.round((ann.opacity ?? 0.3) * 100)}%
                                                  </span>
                                                </div>

                                                <div className="h-4 w-px bg-border mx-1" />
                                              </>
                                            )}
                                            <button
                                              onClick={(e) => { e.stopPropagation(); removeAnnotation(ann.id); setSelectedAnnId(null); }}
                                              className="p-1.5 hover:bg-red-50 text-red-500 rounded"
                                              title="Delete"
                                            >
                                              <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                              onClick={(e) => { e.stopPropagation(); setSelectedAnnId(null); }}
                                              className="p-1.5 hover:bg-slate-100 rounded text-slate-400"
                                              title="Close"
                                            >
                                              <X className="w-3.5 h-3.5" />
                                            </button>
                                          </div>
                                        )}
                                      </motion.div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </SortablePage>
                      );
                    })}
                  </div>
                </SortableContext>
              </DndContext>

              {showLinkModal && (
                <LinkModal
                  isOpen={!!showLinkModal}
                  onClose={() => { setShowLinkModal(null); setActiveTool('select'); }}
                  totalPages={pages.length}
                  initialConfig={showLinkModal.initialConfig}
                  onSave={(config) => {
                    const { pageIndex, bounds, editAnnId } = showLinkModal;

                    if (editAnnId) {
                      const updatedProps = {
                        linkConfig: config,
                        color: config.color,
                        strokeType: config.lineStyle === 'Dashed' ? 'dashed' : 'solid',
                        strokeWidth: config.lineThickness === 'Thick' ? 3 : config.lineThickness === 'Medium' ? 2 : 1,
                      };
                      updateAnnotation(editAnnId, updatedProps as Partial<Annotation>);
                    } else {
                      const newAnnId = `ann-${Date.now()}`;
                      const newAnn: Annotation = {
                        id: newAnnId,
                        type: 'link',
                        x: bounds.x,
                        y: bounds.y,
                        width: bounds.width,
                        height: bounds.height,
                        content: 'link',
                        linkConfig: config,
                        color: config.color,
                        strokeType: config.lineStyle === 'Dashed' ? 'dashed' : 'solid',
                        strokeWidth: config.lineThickness === 'Thick' ? 3 : config.lineThickness === 'Medium' ? 2 : 1,
                      };
                      const updatedPages = [...pages];
                      if (updatedPages[pageIndex]) {
                        updatedPages[pageIndex] = {
                          ...updatedPages[pageIndex],
                          annotations: [...updatedPages[pageIndex].annotations, newAnn]
                        };
                        updatePagesWithHistory(updatedPages);
                      }
                    }
                    setShowLinkModal(null);
                    setActiveTool('select');
                  }}
                />
              )}

              <UpdateLinksModal
                isOpen={showUpdateLinksModal}
                onClose={() => setShowUpdateLinksModal(false)}
                pages={pages}
                onDelete={(annId) => {
                  removeAnnotation(annId);
                }}
                onEdit={(annId, pageIndex, ann) => {
                  setShowUpdateLinksModal(false);
                  setShowLinkModal({
                    pageIndex,
                    bounds: { x: ann.x, y: ann.y, width: ann.width || 0, height: ann.height || 0 },
                    editAnnId: ann.id,
                    initialConfig: ann.linkConfig
                  });
                }}
              />


              {/* Active Tool Cursor Preview */}
              {activeTool !== 'select' && activeTool !== 'hand' && activeTool !== 'settings' as any && !selectedTextItem && (
                <div className="fixed top-36 left-1/2 -translate-x-1/2 pointer-events-none z-[1500] px-4 w-full flex justify-center">
                  <div className="border border-dashed border-accent p-3 md:p-4 text-[10px] md:text-sm font-black uppercase tracking-widest text-accent bg-white/80 backdrop-blur-sm rounded-lg shadow-xl text-center max-w-sm md:max-w-none">
                    {['highlight', 'underline', 'strikethrough', 'squiggly', 'caret', 'area-highlight'].includes(activeTool as string)
                      ? `Select text or click to place ${activeTool === 'area-highlight' ? 'Area Highlight' : activeTool}`
                      : (activeTool === 'edit' ? 'Select a text element to edit properties' : `Click to place ${activeTool}`)}
                  </div>
                </div>
              )}
            </div>

            {/* Properties Sidebar */}
            <AnimatePresence>
              {((activeTool === 'edit' && selectedTextItem) || (selectedAnnId && selectedAnnotation && selectedAnnotation.type === 'textbox')) && (
                <motion.div
                  initial={{ y: 300, opacity: 0 }}
                  animate={{
                    y: isSidebarMinimized ? (window.innerWidth < 768 ? 'calc(100% - 48px)' : 0) : 0,
                    opacity: 1
                  }}
                  exit={{ y: 300, opacity: 0 }}
                  transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                  className={cn(
                    "fixed bottom-0 left-0 right-0 md:relative md:w-72 border-t md:border-t-0 md:border-l border-border bg-white shadow-2xl md:shadow-xl flex flex-col z-[5000] overflow-hidden transition-all duration-300",
                    isSidebarMinimized ? "h-[48px]" : "h-[85vh] max-h-[85vh] md:h-auto"
                  )}
                >
                  <div className="p-4 border-b border-border flex items-center justify-between bg-slate-50 border-t border-slate-200 shrink-0 h-[56px]">
                    <h3 className="font-semibold text-slate-900 flex items-center gap-2 text-sm">
                      <Layout className="w-4 h-4 text-accent" />
                      Properties
                    </h3>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setIsSidebarMinimized(!isSidebarMinimized)}
                        className="p-1 hover:bg-slate-200 rounded-full transition-colors text-slate-500"
                        title={isSidebarMinimized ? "Maximize" : "Minimize"}
                      >
                        {isSidebarMinimized ? (
                          <div className="w-4 h-4 border-2 border-current rounded-sm flex items-center justify-center p-0.5">
                            <div className="w-full h-0.5 bg-current" />
                          </div>
                        ) : (
                          <div className="w-4 h-4 border-2 border-current rounded-sm flex items-end justify-center p-0.5">
                            <div className="w-full h-0.5 bg-current" />
                          </div>
                        )}
                      </button>
                      <button
                        onClick={() => { setSelectedTextItem(null); setSelectedAnnId(null); }}
                        className="p-1 hover:bg-slate-200 rounded-full transition-colors"
                      >
                        <X className="w-4 h-4 text-slate-500" />
                      </button>
                    </div>
                  </div>

                  <div className={cn("flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar transition-opacity", isSidebarMinimized ? "opacity-0" : "opacity-100")}>
                    {/* Font Selection */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Font Family</label>
                      <select
                        value={activeTextProps?.fontFamily || (activeTextProps?.serif ? 'serif' : 'sans-serif')}
                        onChange={(e) => updateActiveTextProps({ fontFamily: e.target.value })}
                        className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-md text-sm outline-none focus:ring-1 focus:ring-accent"
                      >
                        {FONT_OPTIONS.map(opt => (
                          <option key={opt.label} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Font Size and Colors */}
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Size</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={Math.round(activeTextProps?.fontSize || 12)}
                            onChange={(e) => updateActiveTextProps({ fontSize: parseInt(e.target.value) || 12 })}
                            className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-md text-sm outline-none focus:ring-1 focus:ring-accent"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Color</label>
                          <div className="flex items-center h-9 px-2 bg-slate-50 border border-slate-200 rounded-md gap-2">
                            <input
                              type="color"
                              value={activeTextProps?.color || '#000000'}
                              onChange={(e) => updateActiveTextProps({ color: e.target.value })}
                              className="w-6 h-6 rounded-full border border-slate-200 cursor-pointer p-0 bg-transparent overflow-hidden shrink-0"
                            />
                            <span className="text-xs font-mono text-slate-600 uppercase truncate">{activeTextProps?.color || '#000000'}</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Fill</label>
                          <div className="flex items-center h-9 px-2 bg-slate-50 border border-slate-200 rounded-md gap-1">
                            <button
                              onClick={() => updateActiveTextProps({ backgroundColor: (!activeTextProps?.backgroundColor || activeTextProps?.backgroundColor === 'transparent') ? '#ffffff' : 'transparent' })}
                              className={cn("shrink-0 p-1 rounded-md transition-colors", (!activeTextProps?.backgroundColor || activeTextProps?.backgroundColor === 'transparent') ? "text-slate-400 hover:text-slate-600 hover:bg-slate-200" : "bg-accent text-white")}
                              title="Toggle Fill"
                            >
                              <PaintBucket className="w-3.5 h-3.5" />
                            </button>
                            <div className="h-4 w-px bg-slate-300 mx-0.5 shrink-0"></div>
                            <input
                              type="color"
                              value={activeTextProps?.backgroundColor === 'transparent' ? '#ffffff' : (activeTextProps?.backgroundColor || '#ffffff')}
                              onChange={(e) => updateActiveTextProps({ backgroundColor: e.target.value })}
                              className="w-6 h-6 rounded-full border border-slate-200 cursor-pointer p-0 bg-transparent overflow-hidden shrink-0"
                              disabled={!activeTextProps?.backgroundColor || activeTextProps?.backgroundColor === 'transparent'}
                              style={{ opacity: (!activeTextProps?.backgroundColor || activeTextProps?.backgroundColor === 'transparent') ? 0.3 : 1 }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Spacing and Line Height */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Line Height</label>
                        <input
                          type="number"
                          step="0.1"
                          min="0.5"
                          max="3"
                          value={activeTextProps?.lineHeight || 1.1}
                          onChange={(e) => updateActiveTextProps({ lineHeight: parseFloat(e.target.value) || 1.1 })}
                          className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-md text-sm outline-none focus:ring-1 focus:ring-accent"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Letter Spacing</label>
                        <input
                          type="number"
                          step="0.5"
                          value={activeTextProps?.letterSpacing || 0}
                          onChange={(e) => updateActiveTextProps({ letterSpacing: parseFloat(e.target.value) || 0 })}
                          className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-md text-sm outline-none focus:ring-1 focus:ring-accent"
                        />
                      </div>
                    </div>

                    {/* Text Formatting Button Group */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Text Style</label>
                      <div className="flex items-center p-1 bg-slate-50 border border-slate-200 rounded-lg gap-1">
                        <button
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => updateActiveTextProps({ bold: !activeTextProps?.bold })}
                          className={cn("flex-1 h-8 flex items-center justify-center rounded transition-all", activeTextProps?.bold ? "bg-white shadow-sm text-accent" : "hover:bg-slate-200/50 text-slate-400")}
                        >
                          <div className="font-black text-sm">B</div>
                        </button>
                        <button
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => updateActiveTextProps({ italic: !activeTextProps?.italic })}
                          className={cn("flex-1 h-8 flex items-center justify-center rounded transition-all italic font-serif", activeTextProps?.italic ? "bg-white shadow-sm text-accent" : "hover:bg-slate-200/50 text-slate-400")}
                        >
                          <div className="text-sm italic">I</div>
                        </button>
                        <button
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => updateActiveTextProps({ underline: !activeTextProps?.underline })}
                          className={cn("flex-1 h-8 flex items-center justify-center rounded transition-all underline decoration-2 underline-offset-2", activeTextProps?.underline ? "bg-white shadow-sm text-accent" : "hover:bg-slate-200/50 text-slate-400")}
                        >
                          <Underline className="w-4 h-4" />
                        </button>
                        <button
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => updateActiveTextProps({ strikethrough: !activeTextProps?.strikethrough })}
                          className={cn("flex-1 h-8 flex items-center justify-center rounded transition-all line-through decoration-2", activeTextProps?.strikethrough ? "bg-white shadow-sm text-accent" : "hover:bg-slate-200/50 text-slate-400")}
                        >
                          <Strikethrough className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Text Alignment */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Alignment</label>
                      <div className="flex items-center p-1 bg-slate-50 border border-slate-200 rounded-lg gap-1">
                        {(['left', 'center', 'right', 'justify'] as const).map((align) => (
                          <button
                            key={align}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => updateActiveTextProps({ align, alignment: align })}
                            className={cn(
                              "flex-1 h-8 flex items-center justify-center rounded transition-all",
                              (activeTextProps?.align || activeTextProps?.alignment || 'left') === align ? "bg-white shadow-sm text-accent" : "hover:bg-slate-200/50 text-slate-400"
                            )}
                          >
                            {align === 'left' && <AlignLeft className="w-4 h-4" />}
                            {align === 'center' && <AlignCenter className="w-4 h-4" />}
                            {align === 'right' && <AlignRight className="w-4 h-4" />}
                            {align === 'justify' && <AlignJustify className="w-4 h-4" />}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Scripts and Effects */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Script & Adjust</label>
                      <div className="flex gap-2">
                        <button
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => applyFormatting('superscript')}
                          className={cn("flex-1 h-9 flex items-center justify-center border rounded-md transition-all", activeTextProps?.superscript ? "bg-accent/5 border-accent text-accent" : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100")}
                          title="Superscript"
                        >
                          <SuperscriptIcon className="w-4 h-4" />
                        </button>
                        <button
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => applyFormatting('subscript')}
                          className={cn("flex-1 h-9 flex items-center justify-center border rounded-md transition-all", activeTextProps?.subscript ? "bg-accent/5 border-accent text-accent" : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100")}
                          title="Subscript"
                        >
                          <SubscriptIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => updateActiveTextProps({ baseline: !activeTextProps?.baseline })}
                          className={cn("flex-1 h-9 flex items-center justify-center border rounded-md transition-all", activeTextProps?.baseline ? "bg-accent/5 border-accent text-accent" : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100")}
                          title="Baseline Adjust"
                        >
                          <Baseline className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Restoration */}
                    <div className="pt-4 border-t border-border">
                      <button
                        onClick={() => {
                          if (!activeItem) return;
                          updateSelectedTextItem({
                            str: activeItem.originalStr || activeItem.str,
                            wasEdited: false,
                            bold: activeItem.originalBold ?? false,
                            italic: activeItem.originalItalic ?? false,
                            color: '#000000',
                            fontSize: activeItem.originalFontSize || 12,
                            align: 'left',
                            lineHeight: 1.1,
                            letterSpacing: 0,
                            superscript: false,
                            subscript: false,
                            baseline: false
                          });
                        }}
                        className="w-full h-10 border border-amber-200 bg-amber-50 rounded-md text-amber-700 flex items-center justify-center gap-2 text-xs font-semibold hover:bg-amber-100 transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Restore Original State
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      <AnimatePresence>
        {selectionMenu && (
          <motion.div
            key="selection-toolbar"
            data-selection-menu="true"
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            className="fixed z-[9999] bg-white shadow-2xl rounded-lg border border-slate-200 p-1 flex items-center gap-0"
            style={{
              left: selectionMenu.x,
              // Ensure it's at least 140px from top to not hide under Ribbon, 
              // and also doesn't go below the viewport
              top: Math.max(140, Math.min(window.innerHeight - 60, selectionMenu.y - 55)),
              transform: 'translateX(-50%)'
            }}
          >
            <div className="flex items-center">
              {/* Highlight */}
              <button
                onClick={() => handleAnnotateSelection('highlight')}
                className="w-8 h-8 flex items-center justify-center hover:bg-slate-100 rounded transition-colors group"
                title="Highlight"
              >
                <div className="w-6 h-6 bg-yellow-200 rounded-sm flex items-center justify-center font-serif text-sm text-slate-700">T</div>
              </button>

              {/* Underline */}
              <button
                onClick={() => handleAnnotateSelection('underline')}
                className="w-8 h-8 flex items-center justify-center hover:bg-slate-100 rounded transition-colors"
                title="Underline"
              >
                <div className="relative font-serif text-sm text-slate-700">
                  T
                  <div className="absolute -bottom-0.5 left-0 right-0 h-[1.5px] bg-slate-700"></div>
                </div>
              </button>

              {/* Strikethrough */}
              <button
                onClick={() => handleAnnotateSelection('strikethrough')}
                className="w-8 h-8 flex items-center justify-center hover:bg-slate-100 rounded transition-colors"
                title="Strikethrough"
              >
                <div className="relative font-serif text-sm text-slate-700">
                  T
                  <div className="absolute top-1/2 left-0 right-0 h-[1.5px] bg-slate-700 -translate-y-1/2"></div>
                </div>
              </button>

              {/* Squiggly */}
              <button
                onClick={() => handleAnnotateSelection('squiggly')}
                className="w-8 h-8 flex items-center justify-center hover:bg-slate-100 rounded transition-colors"
                title="Squiggly Underline"
              >
                <div className="relative font-serif text-sm text-slate-700">
                  T
                  <svg className="absolute -bottom-1 left-0 w-full h-1" preserveAspectRatio="none">
                    <path d="M 0 2 Q 2 0 4 2 T 8 2 T 12 2 T 16 2" fill="none" stroke="currentColor" strokeWidth="1" />
                  </svg>
                </div>
              </button>

              {/* Caret */}
              <button
                onClick={() => handleAnnotateSelection('caret')}
                className="w-8 h-8 flex items-center justify-center hover:bg-slate-100 rounded transition-colors"
                title="Caret / Insert"
              >
                <div className="relative font-serif text-sm text-slate-700 flex items-end">
                  T
                  <span className="text-[8px] leading-tight mb-[-2px] ml-0.5">^</span>
                </div>
              </button>
            </div>

            <div className="w-px h-4 bg-slate-200 mx-1" />

            <button
              onClick={() => {
                navigator.clipboard.writeText(selectionMenu.text);
                setSelectionMenu(null);
                window.getSelection()?.removeAllRanges();
              }}
              className="flex items-center gap-1.5 px-2 py-1.5 hover:bg-slate-100 text-slate-600 rounded text-[11px] font-bold transition-colors"
            >
              <Download className="w-3.5 h-3.5 rotate-90" />
              Copy
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
