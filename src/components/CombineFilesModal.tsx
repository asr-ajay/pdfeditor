import React, { useState, useEffect } from 'react';
import { X, FileText, ChevronDown, Plus, GripVertical, Trash2 } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import { cn } from '../lib/utils';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

interface CombineFileItem {
  id: string;
  file: File;
  name: string;
  size: string;
  totalPages: number;
  pageRange: 'All' | 'Custom';
  customRange: string;
}

interface CombineFilesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCombine: (mergedFile: File) => void;
}

const parsePageRange = (range: string, totalPages: number): number[] => {
  if (!range.trim()) return [];
  const result: number[] = [];
  const parts = range.split(',').map(part => part.trim());

  for (const part of parts) {
    if (part.includes('-')) {
      const [start, end] = part.split('-').map(p => parseInt(p.trim()));
      if (!isNaN(start) && !isNaN(end)) {
        const s = Math.max(1, Math.min(totalPages, start));
        const e = Math.max(1, Math.min(totalPages, end));
        const rangeStart = Math.min(s, e);
        const rangeEnd = Math.max(s, e);
        for (let i = rangeStart; i <= rangeEnd; i++) {
          result.push(i - 1); // 0-indexed
        }
      }
    } else {
      const page = parseInt(part);
      if (!isNaN(page)) {
        const p = Math.max(1, Math.min(totalPages, page));
        result.push(p - 1); // 0-indexed
      }
    }
  }
  return [...new Set(result)].sort((a, b) => a - b);
};

function SortableItem({ file, selectedId, setSelectedId, setFiles, onDelete }: {
  file: CombineFileItem;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  setFiles: React.Dispatch<React.SetStateAction<CombineFileItem[]>>;
  onDelete: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: file.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 0
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => setSelectedId(file.id)}
      className={cn(
        "p-3 rounded border transition-all cursor-pointer flex items-center gap-4 relative group",
        selectedId === file.id
          ? "bg-[#D1F1FF] border-[#80D8FF] shadow-sm"
          : "bg-white border-slate-200 hover:border-slate-300 shadow-sm"
      )}
    >
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500">
        <GripVertical className="w-5 h-5" />
      </div>
      <div className="bg-slate-50 p-2 rounded border border-slate-200 shadow-sm pointer-events-none">
        <FileText className="w-6 h-6 text-slate-500" />
      </div>
      <div className="flex-1 pointer-events-none">
        <h3 className="text-sm font-semibold text-slate-800 truncate max-w-[250px]">{file.name}</h3>
        <div className="flex items-center gap-4 text-[11px] text-slate-500 mt-1">
          <span>Size: {file.size}</span>
          <span>All Pages: {file.totalPages}</span>
        </div>
      </div>
      <div className="text-right flex flex-col gap-1 min-w-[120px]">
        <label className="text-[11px] text-slate-500 block text-left">Page Range:</label>
        <div className="flex flex-col gap-1">
          <div className="flex items-center bg-white border border-slate-300 rounded px-2 py-0.5 gap-2">
            <select
              className="text-[11px] text-slate-700 outline-none w-full bg-transparent appearance-none py-0.5"
              value={file.pageRange}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => {
                const val = e.target.value as any;
                setFiles(prev => prev.map(f => f.id === file.id ? { ...f, pageRange: val } : f));
              }}
            >
              <option value="All">All</option>
              <option value="Custom">Custom</option>
            </select>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </div>
          {file.pageRange === 'Custom' && (
            <input
              type="text"
              placeholder="e.g. 1,3-5"
              value={file.customRange}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => {
                const val = e.target.value;
                setFiles(prev => prev.map(f => f.id === file.id ? { ...f, customRange: val } : f));
              }}
              className="text-[10px] border border-slate-200 rounded px-2 py-0.5 outline-none focus:border-[#4B4B8B]"
            />
          )}
        </div>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(file.id);
        }}
        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
        title="Remove file"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

export default function CombineFilesModal({ isOpen, onClose, onCombine }: CombineFilesModalProps) {
  const [files, setFiles] = useState<CombineFileItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

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

  useEffect(() => {
    if (!isOpen) {
      setFiles([]);
      setSelectedId(null);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' && selectedId) {
        handleDelete(selectedId);
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedId]);

  const handleDelete = (id: string) => {
    setFiles(prev => {
      const newFiles = prev.filter(f => f.id !== id);
      if (selectedId === id) {
        setSelectedId(newFiles.length > 0 ? newFiles[Math.max(0, prev.findIndex(f => f.id === id) - 1)].id : null);
      }
      return newFiles;
    });
  };

  const addFiles = async (newFiles: File[]) => {
    const items: CombineFileItem[] = [];
    for (const file of newFiles) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;

        items.push({
          id: crypto.randomUUID(),
          file,
          name: file.name,
          size: (file.size / 1024).toFixed(0) + 'KB',
          totalPages: pdf.numPages,
          pageRange: 'All',
          customRange: ''
        });
      } catch (err) {
        console.error('Error loading PDF for combine:', err);
      }
    }
    setFiles(prev => [...prev, ...items]);
  };

  const handleBrowse = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/pdf';
    input.multiple = true;
    input.onchange = (e) => {
      const selectedFiles = (e.target as HTMLInputElement).files;
      if (selectedFiles) {
        addFiles(Array.from(selectedFiles));
      }
    };
    input.click();
  };

  const handleCombine = async () => {
    if (files.length === 0) return;
    setIsProcessing(true);
    try {
      const mergedPdf = await PDFDocument.create();
      for (const item of files) {
        const arrayBuffer = await item.file.arrayBuffer();
        const doc = await PDFDocument.load(arrayBuffer);

        let pageIndices: number[] = [];
        if (item.pageRange === 'All') {
          pageIndices = doc.getPageIndices();
        } else {
          pageIndices = parsePageRange(item.customRange, item.totalPages);
          if (pageIndices.length === 0) {
            // Default to All if range is invalid/empty but Custom was selected?
            // User probably wants something specific, but let's be safe.
            pageIndices = doc.getPageIndices();
          }
        }

        const copiedPages = await mergedPdf.copyPages(doc, pageIndices);
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      }

      const mergedBytes = await mergedPdf.save();
      const mergedFile = new File([mergedBytes as any], "Combined_File.pdf", { type: "application/pdf" });
      onCombine(mergedFile);
      onClose();
    } catch (error) {
      console.error('Error merging PDFs:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setFiles((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white w-[600px] h-[550px] rounded shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-[#2D2D5F] text-white px-4 h-10 flex items-center justify-between">
          <span className="text-sm font-medium tracking-wide">Combine Files</span>
          <button onClick={onClose} className="hover:bg-white/10 p-1 rounded transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Top Actions */}
        <div className="p-4 border-b border-slate-200">
          <button
            onClick={handleBrowse}
            className="text-[#4B4B8B] text-sm font-medium hover:underline flex items-center gap-1"
          >
            Add Files...
          </button>
        </div>

        {/* File List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={files.map(f => f.id)}
              strategy={verticalListSortingStrategy}
            >
              {files.map(file => (
                <SortableItem
                  key={file.id}
                  file={file}
                  selectedId={selectedId}
                  setSelectedId={setSelectedId}
                  setFiles={setFiles}
                  onDelete={handleDelete}
                />
              ))}
            </SortableContext>
          </DndContext>

          {files.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-4 py-20">
              <Plus className="w-12 h-12 opacity-10" />
              <div className="flex flex-col items-center gap-2">
                <p className="text-sm font-medium opacity-60">Click "Browse" or "Add Files" to start combining</p>
                <button
                  onClick={handleBrowse}
                  className="px-8 py-2 border-2 border-dashed border-slate-300 rounded-lg hover:border-[#4B4B8B] hover:text-[#4B4B8B] transition-all group"
                >
                  <span className="text-sm font-semibold opacity-60 group-hover:opacity-100">Browse Files</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-white flex justify-end">
          <button
            onClick={handleCombine}
            disabled={files.length === 0 || isProcessing}
            className="px-12 py-2 bg-[#4B4B8B] text-white rounded text-sm font-bold hover:bg-[#3D3D7A] disabled:opacity-50 transition-all uppercase tracking-wider shadow-md active:scale-95"
          >
            {isProcessing ? 'Processing...' : 'NEXT'}
          </button>
        </div>
      </div>
    </div>
  );
}

