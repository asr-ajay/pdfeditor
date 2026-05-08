import React, { useState } from 'react';
import { 
  Files, 
  Bookmark, 
  Paperclip, 
  Search, 
  MessageSquare,
  Layers,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  ExternalLink,
  MessageCircle,
  Clock,
  User,
  List,
  FileText,
  Type,
  Baseline,
  Underline,
  Strikethrough,
  X,
  MessageSquare as MessageSquareIcon,
  FolderOpen,
  Save,
  Edit2,
  Sparkles
} from 'lucide-react';
import { cn } from '../lib/utils';
import { usePDF } from '../contexts/PDFContext';
import { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export default function Sidebar() {
  const { 
    activeSidebarTab, setActiveSidebarTab,
    isSidebarOpen, setIsSidebarOpen,
    isAddingBookmark, setIsAddingBookmark,
    pages, setPages,
    currentPage, setCurrentPage,
    bookmarks, addBookmark, removeBookmark,
    attachments, addAttachment, removeAttachment, setAttachments,
    searchQuery, setSearchQuery,
    searchMatchCase, setSearchMatchCase,
    removeAnnotation, removeAnnotations, updateAnnotation,
    selectedAnnotationIds, setSelectedAnnotationIds
  } = usePDF();

  const items = [
    { id: 'Thumbnails', icon: Files, label: 'Thumbnails' },
    { id: 'Bookmarks', icon: Bookmark, label: 'Bookmarks' },
    { id: 'Annotations', icon: MessageSquareIcon, label: 'Annotations' },
    { id: 'Attachments', icon: Paperclip, label: 'Attachments' },
    { id: 'Search', icon: Search, label: 'Search' },
  ];

  const [newBookmarkName, setNewBookmarkName] = useState('');
  const [annSortBy, setAnnSortBy] = useState<'page' | 'time' | 'author' | 'type'>('time');
  const [editingAnnotationId, setEditingAnnotationId] = useState<string | null>(null);
  const [editingNote, setEditingNote] = useState('');

  // Clear search query when closing search or switching tabs
  useEffect(() => {
    if (!isSidebarOpen || activeSidebarTab !== 'Search') {
      setSearchQuery('');
    }
  }, [isSidebarOpen, activeSidebarTab, setSearchQuery]);
  const [selectedAttachmentId, setSelectedAttachmentId] = useState<string | null>(null);
  const [editingAttachmentDescId, setEditingAttachmentDescId] = useState<string | null>(null);
  const [attachmentDescValue, setAttachmentDescValue] = useState<string>('');

  const handleAddBookmark = () => {
    if (newBookmarkName.trim()) {
      addBookmark({
        id: crypto.randomUUID(),
        page: currentPage,
        title: newBookmarkName.trim(),
        createdAt: Date.now()
      });
      setNewBookmarkName('');
      setIsAddingBookmark(false);
    }
  };

  const handleAddAttachment = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        addAttachment({
          id: crypto.randomUUID(),
          name: file.name,
          size: (file.size / 1024).toFixed(1) + ' KB',
          file,
          type: file.type
        });
      }
    };
    input.click();
  };

  const handleOpenAttachment = () => {
    if (!selectedAttachmentId) return;
    const attachment = attachments.find(a => a.id === selectedAttachmentId);
    if (!attachment || !attachment.file) return;
    const url = URL.createObjectURL(attachment.file);
    window.open(url, '_blank');
    // Allow time for new window before revoking
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleSaveAttachment = () => {
    if (!selectedAttachmentId) return;
    const attachment = attachments.find(a => a.id === selectedAttachmentId);
    if (!attachment || !attachment.file) return;
    const url = URL.createObjectURL(attachment.file);
    const link = document.createElement('a');
    link.href = url;
    link.download = attachment.name;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDeleteAttachment = () => {
    if (selectedAttachmentId) {
      removeAttachment(selectedAttachmentId);
      setSelectedAttachmentId(null);
    }
  };

  const handleAddDescription = () => {
    if (!selectedAttachmentId) return;
    setEditingAttachmentDescId(selectedAttachmentId);
    const attachment = attachments.find(a => a.id === selectedAttachmentId);
    setAttachmentDescValue(attachment?.description || '');
  };

  const allAnnotations = pages.flatMap((page, pageIdx) => 
    page.annotations.map(ann => ({ ...ann, pageNumber: pageIdx + 1 }))
  ).sort((a, b) => {
    if (annSortBy === 'page') return a.pageNumber - b.pageNumber;
    if (annSortBy === 'time') return (b.createdAt || 0) - (a.createdAt || 0);
    if (annSortBy === 'author') return (a.author || '').localeCompare(b.author || '');
    if (annSortBy === 'type') return (a.type || '').localeCompare(b.type || '');
    return 0;
  });

  const handleDeleteSelected = useCallback(() => {
    if (selectedAnnotationIds.length > 0) {
      removeAnnotations(selectedAnnotationIds);
      setSelectedAnnotationIds([]);
    }
  }, [selectedAnnotationIds, removeAnnotations]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeSidebarTab !== 'Annotations' || !isSidebarOpen) return;
      if (editingAnnotationId) return;

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        handleDeleteSelected();
      } else if (cmdOrCtrl && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setSelectedAnnotationIds(allAnnotations.map(a => a.id));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeSidebarTab, isSidebarOpen, editingAnnotationId, allAnnotations, handleDeleteSelected]);

  const toggleAnnotationSelection = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (e.ctrlKey || e.metaKey) {
      setSelectedAnnotationIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    } else if (e.shiftKey && selectedAnnotationIds.length > 0) {
      const lastId = selectedAnnotationIds[selectedAnnotationIds.length - 1];
      const lastIdx = allAnnotations.findIndex(a => a.id === lastId);
      const currentIdx = allAnnotations.findIndex(a => a.id === id);
      const start = Math.min(lastIdx, currentIdx);
      const end = Math.max(lastIdx, currentIdx);
      const rangeIds = allAnnotations.slice(start, end + 1).map(a => a.id);
      setSelectedAnnotationIds(Array.from(new Set([...selectedAnnotationIds, ...rangeIds])));
    } else {
      setSelectedAnnotationIds([id]);
    }
  };

  const startEditingNote = (ann: any) => {
    setEditingAnnotationId(ann.id);
    setEditingNote(ann.note || '');
  };

  const saveNote = () => {
    if (editingAnnotationId) {
      updateAnnotation(editingAnnotationId, { note: editingNote });
      setEditingAnnotationId(null);
      setEditingNote('');
    }
  };

  const AnnotationIcon = ({ type }: { type: string }) => {
    if (type === 'highlight') return <div className="w-3 h-3 flex items-center justify-center font-black text-[9px] bg-amber-500 text-white rounded-[1px]">H</div>;
    if (type === 'underline') return <Underline className="w-3 h-3" />;
    if (type === 'strikethrough') return <Strikethrough className="w-3 h-3" />;
    if (type === 'squiggly') return <Baseline className="w-3 h-3" />;
    if (type === 'text') return <Type className="w-3 h-3" />;
    if (type === 'caret') return <span className="font-black text-[10px] leading-none mb-[-4px]">^</span>;
    return <FileText className="w-3 h-3" />;
  };

  return (
    <div className="flex h-full select-none no-print">
      {/* Icon Strip */}
      <div className="w-[40px] bg-white border-r border-slate-200 flex flex-col items-center py-4 gap-4">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              if (activeSidebarTab === item.id && isSidebarOpen) {
                setIsSidebarOpen(false);
              } else {
                setActiveSidebarTab(item.id);
                setIsSidebarOpen(true);
              }
            }}
            className={cn(
              "p-2 rounded transition-all group relative",
              activeSidebarTab === item.id && isSidebarOpen ? "text-blue-600 bg-blue-50" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
            )}
            title={item.label}
          >
            <item.icon className="w-5 h-5" />
            {activeSidebarTab === item.id && isSidebarOpen && (
              <div className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-blue-600 rounded-r" />
            )}
          </button>
        ))}
        
        <div className="mt-auto mb-2">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 text-slate-300 hover:text-slate-500 rounded hover:bg-slate-50"
          >
             {isSidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Content Panel */}
      <AnimatePresence mode="wait">
        {isSidebarOpen && (
          <>
            {/* Mobile Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-black/20 z-[60] md:hidden"
            />
            
            <motion.div 
              initial={{ width: 0, opacity: 0 }}
              animate={{ 
                width: window.innerWidth < 768 ? 280 : 250, 
                opacity: 1 
              }}
              exit={{ width: 0, opacity: 0 }}
              className={cn(
                "bg-slate-50 border-r border-slate-200 flex flex-col overflow-hidden z-[8000]",
                "fixed left-[40px] top-12 bottom-0 md:relative md:left-0 md:top-0 h-[calc(100vh-48px)] md:h-auto"
              )}
            >
            {/* Panel Header */}
            <div className="p-3 border-b border-slate-200 bg-white flex items-center justify-between h-10">
               <span className="text-[11px] font-bold text-slate-700">
                 {activeSidebarTab === 'Annotations' ? 'Annotation' : activeSidebarTab}
               </span>
               <div className="flex gap-1">
                 {activeSidebarTab === 'Bookmarks' && (
                   <button onClick={() => setIsAddingBookmark(true)} className="p-1 hover:bg-slate-100 rounded text-slate-500">
                      <Plus className="w-3 h-3" />
                   </button>
                 )}
                 <button 
                   onClick={() => setIsSidebarOpen(false)} 
                   className="p-1 hover:bg-slate-100 rounded text-slate-400"
                 >
                    <X className="w-3 h-3" />
                 </button>
               </div>
            </div>

            {/* Panel Content */}
            <div className="flex-1 overflow-y-auto">
               {activeSidebarTab === 'Thumbnails' && (
                 <div className="p-4 flex flex-col gap-4">
                   {pages.map((page, i) => (
                     <div 
                       key={page.id}
                       onClick={() => setCurrentPage(i + 1)}
                       className={cn(
                         "relative cursor-pointer border rounded bg-white overflow-hidden transition-all",
                         currentPage === i + 1 ? "border-blue-500 ring-1 ring-blue-500/20" : "border-slate-200 hover:border-slate-300"
                       )}
                     >
                       <div className="absolute top-1 left-1 bg-black/60 text-white text-[8px] px-1 py-0.5 rounded-sm font-bold z-10">
                         {i + 1}
                       </div>
                       <img src={page.previewUrl} alt={`Page ${i+1}`} className="w-full h-auto" />
                     </div>
                   ))}
                 </div>
               )}

               {activeSidebarTab === 'Bookmarks' && (
                 <div className="p-2 flex flex-col gap-1">
                   {isAddingBookmark && (
                     <div className="p-2 bg-blue-50/50 rounded border border-blue-100 mb-2">
                        <input 
                          autoFocus
                          type="text" 
                          value={newBookmarkName}
                          onChange={(e) => setNewBookmarkName(e.target.value)}
                          placeholder="Bookmark name..."
                          className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-xs outline-none mb-2"
                          onKeyDown={(e) => e.key === 'Enter' && handleAddBookmark()}
                        />
                        <div className="flex gap-1 justify-end">
                           <button 
                             onClick={() => setIsAddingBookmark(false)}
                             className="px-2 py-1 text-[10px] text-slate-400 hover:text-slate-600 font-bold uppercase"
                           >
                              Cancel
                           </button>
                           <button 
                             onClick={handleAddBookmark}
                             className="px-2 py-1 text-[10px] bg-blue-600 text-white rounded font-bold uppercase"
                           >
                              Save
                           </button>
                        </div>
                     </div>
                   )}
                   {bookmarks.length === 0 && !isAddingBookmark ? (
                     <div className="text-[10px] text-slate-400 text-center mt-10">No bookmarks yet.</div>
                   ) : (
                     bookmarks.map(b => (
                       <div 
                         key={b.id}
                         onClick={() => setCurrentPage(b.page)}
                         className="flex items-center justify-between p-2 hover:bg-blue-50 rounded cursor-pointer group"
                       >
                         <div className="flex flex-col">
                            <span className="text-xs font-medium text-slate-700">{b.title}</span>
                            <span className="text-[9px] text-slate-400">Page {b.page}</span>
                         </div>
                         <button 
                           onClick={(e) => { e.stopPropagation(); removeBookmark(b.id); }}
                           className="p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                         >
                            <Trash2 className="w-3 h-3" />
                         </button>
                       </div>
                     ))
                   )}
                 </div>
               )}

               {activeSidebarTab === 'Annotations' && (
                 <div className="flex flex-col h-full bg-white">
                     <div className="px-3 py-2 border-b border-slate-100 flex items-center gap-1.5 text-[10px] text-slate-500">
                      <span className="mr-auto">Sort by:</span>
                      <button 
                        onClick={() => setAnnSortBy('page')} 
                        className={cn("p-1 rounded hover:bg-slate-100 transition-colors", annSortBy === 'page' && "text-blue-500 bg-blue-50")}
                        title="Sort by Page"
                      >
                         <FileText className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => setAnnSortBy('time')} 
                        className={cn("p-1 rounded hover:bg-slate-100 transition-colors", annSortBy === 'time' && "text-blue-500 bg-blue-50")}
                        title="Sort by Time"
                      >
                         <Clock className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => setAnnSortBy('author')} 
                        className={cn("p-1 rounded hover:bg-slate-100 transition-colors", annSortBy === 'author' && "text-blue-500 bg-blue-50")}
                        title="Sort by Author"
                      >
                         <User className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => setAnnSortBy('type')} 
                        className={cn("p-1 rounded hover:bg-slate-100 transition-colors", annSortBy === 'type' && "text-blue-500 bg-blue-50")}
                        title="Sort by Type"
                      >
                         <List className="w-3.5 h-3.5" />
                      </button>
                      {selectedAnnotationIds.length > 0 && (
                        <button 
                          onClick={handleDeleteSelected}
                          className="p-1 rounded hover:bg-red-50 text-red-500 transition-colors ml-1"
                          title="Delete Selected"
                        >
                           <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    <div className="flex-1 overflow-y-auto" onClick={() => setSelectedAnnotationIds([])}>
                      {allAnnotations.length === 0 ? (
                        <div className="text-[10px] text-slate-400 text-center mt-10">No annotations.</div>
                      ) : (
                        allAnnotations.map((ann) => (
                          <div 
                            key={ann.id}
                            onClick={(e) => { toggleAnnotationSelection(ann.id, e); setCurrentPage(ann.pageNumber); }}
                            onDoubleClick={() => startEditingNote(ann)}
                            className={cn(
                              "p-3 border-b border-slate-50 cursor-pointer group relative transition-colors",
                              selectedAnnotationIds.includes(ann.id) ? "bg-blue-50/50" : "hover:bg-slate-50/80"
                            )}
                          >
                            <div className="flex items-center gap-2 mb-1.5">
                               <div className="p-1 px-1.5 bg-amber-50 text-amber-600 rounded-sm border border-amber-100">
                                  <AnnotationIcon type={ann.type} />
                               </div>
                               <span className="text-xs font-bold text-slate-700">{ann.author || 'Anonymous'}</span>
                            </div>
                            <div className="flex items-center gap-3 text-[9px] text-slate-400 mb-2 font-medium">
                               <span>Page {ann.pageNumber}</span>
                               <span>{ann.createdAt ? new Date(ann.createdAt).toLocaleString(undefined, {
                                 year: 'numeric',
                                 month: '2-digit',
                                 day: '2-digit',
                                 hour: '2-digit',
                                 minute: '2-digit',
                                 second: '2-digit',
                                 hour12: false
                               }).replace(',', '') : 'N/A'}</span>
                            </div>
                            
                            {editingAnnotationId === ann.id ? (
                              <div onClick={e => e.stopPropagation()}>
                                <textarea 
                                  autoFocus
                                  className="w-full text-[11px] text-slate-600 leading-normal border border-blue-200 rounded p-1 outline-none min-h-[60px]"
                                  value={editingNote}
                                  onChange={e => setEditingNote(e.target.value)}
                                  onBlur={saveNote}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) saveNote();
                                    if (e.key === 'Escape') setEditingAnnotationId(null);
                                  }}
                                />
                                <div className="text-[8px] text-slate-400 mt-1">Ctrl+Enter to save</div>
                              </div>
                            ) : (
                              <div className="text-[11px] text-slate-600 leading-normal line-clamp-3">
                                 {ann.note || (ann.type === 'image' ? '[Image Annotation]' : (ann.content || "Double click to note."))}
                              </div>
                            )}
                            
                            <button 
                              onClick={(e) => { e.stopPropagation(); removeAnnotation(ann.id); }}
                              className="absolute top-2 right-2 p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-50 rounded"
                            >
                               <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                 </div>
               )}

               {activeSidebarTab === 'Attachments' && (
                 <div className="flex flex-col h-full">
                    {/* Attachment Toolbar */}
                    <div className="flex items-center gap-2 p-2 border-b border-slate-200">
                       <button 
                         onClick={handleOpenAttachment}
                         disabled={!selectedAttachmentId}
                         title="Open Selected Attachment"
                         className="p-1 text-slate-500 hover:bg-slate-200 hover:text-slate-700 rounded disabled:opacity-30 disabled:hover:bg-transparent"
                       >
                          <FolderOpen className="w-4 h-4" />
                       </button>
                       <button 
                         onClick={handleSaveAttachment}
                         disabled={!selectedAttachmentId}
                         title="Save Attachment file as"
                         className="p-1 text-slate-500 hover:bg-slate-200 hover:text-slate-700 rounded disabled:opacity-30 disabled:hover:bg-transparent"
                       >
                          <Save className="w-4 h-4" />
                       </button>
                       <button 
                         onClick={handleAddAttachment}
                         title="Add Attachment File"
                         className="p-1 text-slate-500 hover:bg-slate-200 hover:text-slate-700 rounded"
                       >
                          <Paperclip className="w-4 h-4" />
                       </button>
                       <button 
                         onClick={handleAddDescription}
                         disabled={!selectedAttachmentId}
                         title="Add Description"
                         className="p-1 text-slate-500 hover:bg-slate-200 hover:text-slate-700 rounded disabled:opacity-30 disabled:hover:bg-transparent"
                       >
                          <Edit2 className="w-4 h-4" />
                       </button>
                       <button 
                         onClick={handleDeleteAttachment}
                         disabled={!selectedAttachmentId}
                         title="Delete Selected Attachment"
                         className="p-1 text-slate-500 hover:bg-slate-200 hover:text-slate-700 rounded disabled:opacity-30 disabled:hover:bg-transparent"
                       >
                          <Trash2 className="w-4 h-4" />
                       </button>
                    </div>
                    {/* Attachments List */}
                    <div className="p-2 flex flex-col gap-2 overflow-y-auto">
                      {attachments.length === 0 ? (
                        <div className="text-[10px] text-slate-400 text-center mt-10">No attachments.</div>
                      ) : (
                        attachments.map(a => (
                          <div 
                            key={a.id}
                            onClick={() => setSelectedAttachmentId(a.id)}
                            className={cn(
                              "flex flex-col p-2 border rounded cursor-pointer group transition-all",
                              selectedAttachmentId === a.id ? "bg-blue-50 border-blue-200" : "bg-white border-slate-200 hover:border-slate-300"
                            )}
                          >
                            <div className="flex items-center gap-2">
                               <FileText className="w-4 h-4 text-red-500" />
                               <div className="flex flex-col overflow-hidden w-full">
                                 <span className="text-xs font-medium text-slate-700 truncate">{a.name}</span>
                                 {editingAttachmentDescId === a.id ? (
                                   <input
                                     autoFocus
                                     value={attachmentDescValue}
                                     onChange={e => setAttachmentDescValue(e.target.value)}
                                     onKeyDown={e => {
                                       if (e.key === 'Enter') {
                                         setAttachments(prev => prev.map(att => att.id === a.id ? { ...att, description: attachmentDescValue } : att));
                                         setEditingAttachmentDescId(null);
                                       }
                                     }}
                                     onBlur={() => {
                                       setAttachments(prev => prev.map(att => att.id === a.id ? { ...att, description: attachmentDescValue } : att));
                                       setEditingAttachmentDescId(null);
                                     }}
                                     className="w-full text-xs text-slate-600 bg-white border border-blue-300 rounded px-1 py-0.5 mt-1 outline-none focus:ring-1 focus:ring-blue-400"
                                     placeholder="Add description..."
                                   />
                                 ) : (
                                   a.description && (
                                     <span className="text-[10px] text-slate-500 truncate mt-0.5">{a.description}</span>
                                   )
                                 )}
                               </div>
                            </div>
                            <div className="flex items-center justify-between mt-2 pl-6">
                               <span className="text-[10px] text-slate-500">
                                 {/* Mock Date as requested by image look */}
                                 {new Date().toLocaleString('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).replace(',', '')}
                               </span>
                               <span className="text-[10px] text-slate-500">{a.size}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                 </div>
               )}

               {activeSidebarTab === 'Search' && (
                 <div className="p-3 flex flex-col gap-4">
                    <div className="relative">
                       <Search className="absolute left-2 top-2.5 w-3 h-3 text-slate-400" />
                       <input 
                         type="text" 
                         value={searchQuery}
                         onChange={(e) => setSearchQuery(e.target.value)}
                         placeholder="Find in document..."
                         className="w-full bg-white border border-slate-200 rounded pl-7 pr-2 py-2 text-xs outline-none focus:border-blue-400"
                       />
                    </div>
                    <div className="flex items-center gap-2 px-1">
                       <input 
                         type="checkbox" 
                         id="matchCase"
                         checked={searchMatchCase}
                         onChange={(e) => setSearchMatchCase(e.target.checked)}
                         className="w-3 h-3 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                       />
                       <label htmlFor="matchCase" className="text-[10px] text-slate-600 font-medium cursor-pointer">
                         Match Case
                       </label>
                    </div>
                    {searchQuery && (
                      <div className="text-[10px] text-slate-400 italic">
                        Searching across {pages.length} pages... (Local metadata matching only)
                      </div>
                    )}
                    {/* Search results from text and annotations */}
                    {searchQuery && pages.map((page, i) => {
                      const query = searchMatchCase ? searchQuery : searchQuery.toLowerCase();
                      const content = searchMatchCase ? (page.textContent || '') : (page.textContent || '').toLowerCase();
                      const containsText = content.includes(query);
                      
                      const matchingAnns = page.annotations.filter(a => {
                        const annContent = searchMatchCase ? (a.content || '') : (a.content || '').toLowerCase();
                        return annContent.includes(query);
                      });
                      
                      if (!containsText && matchingAnns.length === 0) return null;

                      return (
                        <div 
                          key={`res-p-${i}`}
                          onClick={() => setCurrentPage(i + 1)}
                          className="p-2 bg-white border border-slate-100 rounded hover:border-blue-200 cursor-pointer group"
                        >
                           <div className="flex items-center justify-between mb-1">
                              <div className="text-[9px] font-bold text-blue-500">Page {i + 1}</div>
                              <div className="text-[8px] text-slate-300 opacity-0 group-hover:opacity-100">Click to jump</div>
                           </div>
                           {containsText && (
                             <div className="text-xs text-slate-600 line-clamp-2 italic mb-1">
                               ...{(() => {
                                 const text = page.textContent || '';
                                 const idx = searchMatchCase ? text.indexOf(searchQuery) : text.toLowerCase().indexOf(searchQuery.toLowerCase());
                                 return text.substring(
                                   Math.max(0, idx - 20),
                                   Math.min(text.length, idx + 40)
                                 );
                               })()}...
                             </div>
                           )}
                            {matchingAnns.map((ann, idx) => (
                              <div key={`ann-${ann.id || idx}`} className="text-[10px] text-slate-400 pl-2 border-l border-slate-200">
                                Annotation: {ann.content}
                              </div>
                            ))}
                        </div>
                      );
                    })}
                    {searchQuery && !pages.some(p => {
                      const q = searchMatchCase ? searchQuery : searchQuery.toLowerCase();
                      const c = searchMatchCase ? (p.textContent || '') : (p.textContent || '').toLowerCase();
                      const hasText = c.includes(q);
                      const hasAnns = p.annotations.some(a => {
                        const ac = searchMatchCase ? (a.content || '') : (a.content || '').toLowerCase();
                        return ac.includes(q);
                      });
                      return hasText || hasAnns;
                    }) && (
                      <div className="text-[10px] text-slate-400 text-center py-4">No matches found.</div>
                    )}
                 </div>
               )}

            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
    </div>
  );
}
