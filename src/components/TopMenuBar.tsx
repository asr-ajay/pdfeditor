import React, { useState, useRef, useEffect } from 'react';
import { cn } from '../lib/utils';
import {
  Lightbulb,
  Search,
  X,
  FileStack,
  Scissors,
  Zap,
  Edit3,
  Layers,
  PaintBucket,
  TextQuote,
  RotateCw,
  RotateCcw,
  Trash2,
  Type,
  Image as ImageIcon,
  Crop,
  FilePlus,
  FileText,
  Info,
  Link2,
  Replace,
  ArrowRight,
  FileDigit,
  Maximize2,
  Bookmark,
  Paperclip,
  Highlighter,
  Link,
  Trash
} from 'lucide-react';
import { usePDF } from '../contexts/PDFContext';
import { ToolState } from '../types';

const menus = [
  'Home', 'Edit', 'Page'
];

interface Feature {
  id: string;
  name: string;
  desc: string;
  keywords: string[];
  icon: any;
  action: () => void;
}

export default function TopMenuBar() {
  const { activeMenu, setActiveMenu, activeFileId, setActiveAppTool } = usePDF();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const features: Feature[] = [
    {
      id: 'merge',
      name: 'Merge PDF',
      desc: 'Combine multiple PDF files into one',
      keywords: ['combine', 'join', 'merge', 'add files'],
      icon: FileStack,
      action: () => {
        window.dispatchEvent(new CustomEvent('trigger-app-tool', { detail: { tool: ToolState.MERGE } }));
      }
    },
    {
      id: 'split',
      name: 'Split PDF',
      desc: 'Separate PDF into multiple documents',
      keywords: ['divide', 'split', 'cut', 'separate'],
      icon: Scissors,
      action: () => {
        window.dispatchEvent(new CustomEvent('trigger-app-tool', { detail: { tool: ToolState.SPLIT } }));
      }
    },
    {
      id: 'extract',
      name: 'Extract Pages',
      desc: 'Pull specific pages into a new PDF',
      keywords: ['extract', 'select pages', 'pull'],
      icon: FilePlus,
      action: () => {
        window.dispatchEvent(new CustomEvent('trigger-app-tool', { detail: { tool: ToolState.EXTRACT } }));
      }
    },
    {
      id: 'compress',
      name: 'Compress PDF',
      desc: 'Reduce file size without losing quality',
      keywords: ['compress', 'smaller', 'optimize', 'shrink'],
      icon: Zap,
      action: () => {
        window.dispatchEvent(new CustomEvent('trigger-app-tool', { detail: { tool: ToolState.COMPRESS } }));
      }
    },
    {
      id: 'edit',
      name: 'Edit PDF',
      desc: 'Modify text, images, and content',
      keywords: ['edit', 'modify', 'change'],
      icon: Edit3,
      action: () => {
        window.dispatchEvent(new CustomEvent('trigger-app-tool', { detail: { tool: ToolState.EDIT } }));
      }
    },
    {
      id: 'organize',
      name: 'Organize PDF',
      desc: 'Reorder, rotate, or delete pages',
      keywords: ['organize', 'reorder', 'sort', 'pages'],
      icon: FileText,
      action: () => {
        window.dispatchEvent(new CustomEvent('trigger-app-tool', { detail: { tool: ToolState.ORGANIZE } }));
      }
    },
    {
      id: 'watermark',
      name: 'New Watermark',
      desc: 'Overlay text or image logo',
      keywords: ['watermark', 'logo', 'overlay', 'stamp', 'branding', 'new'],
      icon: Layers,
      action: () => {
        window.dispatchEvent(new CustomEvent('trigger-app-tool', { detail: { tool: ToolState.WATERMARK } }));
      }
    },
    {
      id: 'update-watermark',
      name: 'Update Watermark',
      desc: 'Modify existing watermark settings',
      keywords: ['watermark', 'update', 'change', 'edit'],
      icon: Layers,
      action: () => {
        window.dispatchEvent(new CustomEvent('trigger-app-tool', { detail: { tool: ToolState.UPDATE_WATERMARK } }));
      }
    },
    {
      id: 'remove-watermark',
      name: 'Remove Watermark',
      desc: 'Delete all watermarks from document',
      keywords: ['watermark', 'remove', 'delete', 'clear'],
      icon: Layers,
      action: () => {
        window.dispatchEvent(new CustomEvent('trigger-app-tool', { detail: { tool: ToolState.REMOVE_WATERMARK } }));
      }
    },
    {
      id: 'background',
      name: 'New Background',
      desc: 'Set solid color or image background',
      keywords: ['background', 'bg', 'color', 'page color', 'new'],
      icon: PaintBucket,
      action: () => {
        window.dispatchEvent(new CustomEvent('trigger-app-tool', { detail: { tool: ToolState.BACKGROUND } }));
      }
    },
    {
      id: 'update-background',
      name: 'Update Background',
      desc: 'Modify current background color or image',
      keywords: ['background', 'bg', 'update', 'change'],
      icon: PaintBucket,
      action: () => {
        window.dispatchEvent(new CustomEvent('trigger-app-tool', { detail: { tool: ToolState.UPDATE_BACKGROUND } }));
      }
    },
    {
      id: 'remove-background',
      name: 'Remove Background',
      desc: 'Delete background from all pages',
      keywords: ['background', 'bg', 'remove', 'delete'],
      icon: PaintBucket,
      action: () => {
        window.dispatchEvent(new CustomEvent('trigger-app-tool', { detail: { tool: ToolState.REMOVE_BACKGROUND } }));
      }
    },
    {
      id: 'header-footer',
      name: 'New Header & Footer',
      desc: 'Add page numbers, dates, or custom text',
      keywords: ['header', 'footer', 'page numbers', 'date', 'pagination', 'new'],
      icon: TextQuote,
      action: () => {
        window.dispatchEvent(new CustomEvent('trigger-app-tool', { detail: { tool: ToolState.HEADER_FOOTER } }));
      }
    },
    {
      id: 'update-header-footer',
      name: 'Update Header & Footer',
      desc: 'Edit current header and footer settings',
      keywords: ['header', 'footer', 'update', 'change', 'edit'],
      icon: TextQuote,
      action: () => {
        window.dispatchEvent(new CustomEvent('trigger-app-tool', { detail: { tool: ToolState.UPDATE_HEADER_FOOTER } }));
      }
    },
    {
      id: 'remove-header-footer',
      name: 'Remove Header & Footer',
      desc: 'Clear headers and footers from document',
      keywords: ['header', 'footer', 'remove', 'delete'],
      icon: TextQuote,
      action: () => {
        window.dispatchEvent(new CustomEvent('trigger-app-tool', { detail: { tool: ToolState.REMOVE_HEADER_FOOTER } }));
      }
    },
    {
      id: 'rotate-left',
      name: 'Rotate Left',
      desc: 'Turn selected pages counter-clockwise',
      keywords: ['rotate', 'turn', 'left', 'ccw'],
      icon: RotateCcw,
      action: () => {
        window.dispatchEvent(new CustomEvent('trigger-app-tool', { detail: { tool: ToolState.ROTATE_LEFT } }));
      }
    },
    {
      id: 'rotate-right',
      name: 'Rotate Right',
      desc: 'Turn selected pages clockwise',
      keywords: ['rotate', 'turn', 'right', 'cw'],
      icon: RotateCw,
      action: () => {
        window.dispatchEvent(new CustomEvent('trigger-app-tool', { detail: { tool: ToolState.ROTATE_RIGHT } }));
      }
    },
    {
      id: 'delete-pages',
      name: 'Delete Pages',
      desc: 'Remove selected pages from document',
      keywords: ['delete', 'remove', 'trash'],
      icon: Trash,
      action: () => {
        window.dispatchEvent(new CustomEvent('trigger-app-tool', { detail: { tool: ToolState.DELETE_PAGE } }));
      }
    },
    {
      id: 'add-text',
      name: 'Add Text Box',
      desc: 'Type text anywhere on the page',
      keywords: ['text', 'type', 'write'],
      icon: Type,
      action: () => {
        if (!activeFileId) {
          window.dispatchEvent(new CustomEvent('trigger-app-tool', { detail: { tool: ToolState.EDIT } }));
        } else {
          setActiveMenu('Edit');
          // Dispatch event to set active tool to textbox
          window.dispatchEvent(new CustomEvent('set-active-tool', { detail: { tool: 'textbox' } }));
        }
      }
    },
    {
      id: 'add-image',
      name: 'Add Image',
      desc: 'Insert photos or graphics into PDF',
      keywords: ['image', 'photo', 'picture', 'insert'],
      icon: ImageIcon,
      action: () => {
        if (!activeFileId) {
          window.dispatchEvent(new CustomEvent('trigger-app-tool', { detail: { tool: ToolState.EDIT } }));
        } else {
          setActiveMenu('Edit');
          window.dispatchEvent(new CustomEvent('set-active-tool', { detail: { tool: 'image' } }));
        }
      }
    },
    {
      id: 'crop',
      name: 'Crop PDF',
      desc: 'Trim page margins or select area',
      keywords: ['crop', 'trim', 'cut', 'resize', 'margins'],
      icon: Crop,
      action: () => {
        window.dispatchEvent(new CustomEvent('trigger-app-tool', { detail: { tool: ToolState.CROP } }));
      }
    },
    {
      id: 'properties',
      name: 'File Properties',
      desc: 'View and edit document metadata',
      keywords: ['properties', 'metadata', 'info', 'author', 'title'],
      icon: Info,
      action: () => {
        window.dispatchEvent(new CustomEvent('trigger-app-tool', { detail: { tool: ToolState.PROPERTIES } }));
      }
    },
    {
      id: 'link',
      name: 'Add Link',
      desc: 'Create clickable links to URLs or pages',
      keywords: ['link', 'url', 'hyperlink', 'click', 'new'],
      icon: Link2,
      action: () => {
        if (!activeFileId) {
          window.dispatchEvent(new CustomEvent('trigger-app-tool', { detail: { tool: ToolState.EDIT } }));
        } else {
          setActiveMenu('Edit');
          window.dispatchEvent(new CustomEvent('set-active-tool', { detail: { tool: 'link' } }));
        }
      }
    },
    {
      id: 'manage-links',
      name: 'Manage Links',
      desc: 'View, edit, or delete existing links',
      keywords: ['link', 'manage', 'update', 'edit', 'list'],
      icon: Link,
      action: () => {
        window.dispatchEvent(new CustomEvent('trigger-app-tool', { detail: { tool: ToolState.MANAGE_LINKS } }));
      }
    },
    {
      id: 'add-bookmark',
      name: 'Add Bookmark',
      desc: 'Create a shortcut to the current page',
      keywords: ['bookmark', 'save', 'favorite', 'shortcut'],
      icon: Bookmark,
      action: () => {
        window.dispatchEvent(new CustomEvent('trigger-app-tool', { detail: { tool: ToolState.BOOKMARK } }));
      }
    },
    {
      id: 'add-attachment',
      name: 'Add Attachment',
      desc: 'Embed files directly into the PDF',
      keywords: ['attachment', 'file', 'embed', 'attach'],
      icon: Paperclip,
      action: () => {
        window.dispatchEvent(new CustomEvent('trigger-app-tool', { detail: { tool: ToolState.ATTACHMENT } }));
      }
    },
    {
      id: 'highlight-area',
      name: 'Highlight Area',
      desc: 'Draw a highlight box over any area',
      keywords: ['highlight', 'area', 'box', 'mark'],
      icon: Highlighter,
      action: () => {
        if (!activeFileId) {
          window.dispatchEvent(new CustomEvent('trigger-app-tool', { detail: { tool: ToolState.EDIT } }));
        } else {
          setActiveMenu('Edit');
          window.dispatchEvent(new CustomEvent('set-active-tool', { detail: { tool: 'area-highlight' } }));
        }
      }
    },
    {
      id: 'page-boxes',
      name: 'Page Boxes',
      desc: 'Adjust CropBox, ArtBox, TrimBox, and BleedBox, Change Page Size',
      keywords: ['page boxes', 'cropbox', 'trimbox', 'margins', 'boxes', 'page', 'size'],
      icon: FileDigit,
      action: () => {
        window.dispatchEvent(new CustomEvent('trigger-app-tool', { detail: { tool: ToolState.PAGE_BOXES } }));
      }
    },
    {
      id: 'insert-blank',
      name: 'Insert Blank Page',
      desc: 'Add a new empty page to the document',
      keywords: ['insert', 'blank', 'new page', 'add page', 'empty'],
      icon: FilePlus,
      action: () => {
        window.dispatchEvent(new CustomEvent('trigger-app-tool', { detail: { tool: ToolState.INSERT_BLANK } }));
      }
    },
    {
      id: 'insert-file',
      name: 'Insert From File',
      desc: 'Add pages from another PDF file',
      keywords: ['insert', 'from file', 'append', 'combine', 'attach'],
      icon: FilePlus,
      action: () => {
        window.dispatchEvent(new CustomEvent('trigger-app-tool', { detail: { tool: ToolState.INSERT_FILE } }));
      }
    },
    {
      id: 'replace-pages',
      name: 'Replace Pages',
      desc: 'Swap existing pages with pages from another file',
      keywords: ['replace', 'swap', 'overwrite', 'change'],
      icon: Replace,
      action: () => {
        window.dispatchEvent(new CustomEvent('trigger-app-tool', { detail: { tool: ToolState.REPLACE_PAGES } }));
      }
    }
  ];

  const filteredFeatures = features.filter(f =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.keywords.some(k => k.toLowerCase().includes(searchQuery.toLowerCase())) ||
    f.desc.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
    setSelectedIndex(0);
  }, [isSearchOpen, searchQuery]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % Math.max(1, filteredFeatures.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filteredFeatures.length) % Math.max(1, filteredFeatures.length));
    } else if (e.key === 'Enter') {
      if (filteredFeatures.length > 0) {
        handleFeatureClick(filteredFeatures[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsSearchOpen(false);
    }
  };

  useEffect(() => {
    if (isSearchOpen && selectedIndex >= 0) {
      const container = document.getElementById('search-results-container');
      const selectedElement = document.getElementById(`feature-item-${selectedIndex}`);
      if (container && selectedElement) {
        const containerRect = container.getBoundingClientRect();
        const elementRect = selectedElement.getBoundingClientRect();

        if (elementRect.bottom > containerRect.bottom) {
          selectedElement.scrollIntoView({ block: 'end', behavior: 'smooth' });
        } else if (elementRect.top < containerRect.top) {
          selectedElement.scrollIntoView({ block: 'start', behavior: 'smooth' });
        }
      }
    }
  }, [selectedIndex, isSearchOpen]);

  const handleFeatureClick = (feature: Feature) => {
    feature.action();
    setIsSearchOpen(false);
    setSearchQuery('');
  };

  return (
    <div className="h-8 bg-[#4B4B8B] flex items-center justify-between px-2 select-none no-print">
      <div className="flex items-center h-full">
        {menus.map((menu) => (
          <button
            key={menu}
            onClick={() => setActiveMenu(menu)}
            className={cn(
              "px-4 h-full text-[11px] text-white/90 hover:bg-white/10 transition-colors relative",
              activeMenu === menu && "bg-white text-[#4B4B8B] font-semibold"
            )}
          >
            {menu}
            {activeMenu === menu && (
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#4B4B8B]" />
            )}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-4 text-white/70 text-[11px]">
        <div
          onClick={() => setIsSearchOpen(true)}
          className="flex items-center gap-1 hover:text-white cursor-pointer px-2 py-1 rounded hover:bg-white/10 transition-all group"
        >
          <Lightbulb className="w-3.5 h-3.5 group-hover:text-yellow-300 transition-colors" />
          <span>I want to...</span>
        </div>
      </div>

      {/* Search Modal */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-[10001] flex items-start justify-center pt-20 px-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex items-center px-4 h-14 border-b border-slate-100">
              <Search className="w-5 h-5 text-slate-400 mr-3" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search features (e.g. 'merge', 'watermark', 'crop')..."
                className="flex-1 bg-transparent border-none outline-none text-slate-700 text-sm font-medium placeholder:text-slate-400"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <button
                onClick={() => setIsSearchOpen(false)}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div
              id="search-results-container"
              className="max-h-[60vh] overflow-y-auto p-2 scroll-smooth"
            >
              {filteredFeatures.length > 0 ? (
                <div className="grid grid-cols-1 gap-1">
                  {filteredFeatures.map((feature, index) => (
                    <button
                      key={feature.id}
                      id={`feature-item-${index}`}
                      onClick={() => handleFeatureClick(feature)}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={cn(
                        "flex items-center gap-4 p-3 rounded-lg transition-all group text-left",
                        selectedIndex === index ? "bg-blue-600 shadow-lg shadow-blue-200" : "hover:bg-slate-50"
                      )}
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center transition-colors",
                        selectedIndex === index ? "bg-white/20" : "bg-slate-100 group-hover:bg-blue-100"
                      )}>
                        <feature.icon className={cn(
                          "w-5 h-5",
                          selectedIndex === index ? "text-white" : "text-slate-500 group-hover:text-blue-600"
                        )} />
                      </div>
                      <div className="flex-1">
                        <div className={cn(
                          "text-sm font-bold",
                          selectedIndex === index ? "text-white" : "text-slate-700 group-hover:text-blue-700"
                        )}>{feature.name}</div>
                        <div className={cn(
                          "text-xs line-clamp-1",
                          selectedIndex === index ? "text-white/80" : "text-slate-500 group-hover:text-blue-600/80"
                        )}>{feature.desc}</div>
                      </div>
                      <div className={cn(
                        "text-[10px] font-black uppercase tracking-widest px-2",
                        selectedIndex === index ? "text-white/40" : "text-slate-300 group-hover:text-blue-300"
                      )}>
                        {selectedIndex === index ? 'Selected' : 'Open'}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <Search className="w-12 h-12 mb-3 opacity-20" />
                  <p className="text-sm font-medium">No features matching "{searchQuery}"</p>
                </div>
              )}
            </div>

            <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1"><kbd className="bg-white border border-slate-200 px-1 rounded shadow-sm text-slate-500">ESC</kbd> to close</span>
                <span className="flex items-center gap-1"><kbd className="bg-white border border-slate-200 px-1 rounded shadow-sm text-slate-500">↑↓</kbd> to navigate</span>
                <span className="flex items-center gap-1"><kbd className="bg-white border border-slate-200 px-1 rounded shadow-sm text-slate-500">ENTER</kbd> to select</span>
              </div>
              <div>{filteredFeatures.length} Results</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
