import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { usePDF } from './contexts/PDFContext';
import { RotateCcw, RotateCw, Save, Menu, Download } from 'lucide-react';
import { cn } from './lib/utils';
import TopMenuBar from './components/TopMenuBar';
import QuickAccessBar from './components/QuickAccessBar';
import Ribbon from './components/Ribbon';
import TabsBar from './components/TabsBar';
import Sidebar from './components/Sidebar';

import { ToolState } from './types';

// Tool Components
import EditTool from './components/PDFTools/EditTool';
import Dashboard from './components/Dashboard';

export default function App() {
  const { 
    addSharedFiles, currentPage, totalPages, zoom, sharedFiles, activeMenu, setActiveMenu,
    activeTool, setActiveTool, activeFileId, setActiveFileId,
    undo, redo, canUndo, canRedo,
    isSidebarOpen, setIsSidebarOpen,
    activeAppTool, setActiveAppTool
  } = usePDF();

  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [pendingIntent, setPendingIntent] = useState<ToolState | null>(null);

  // Sync activeAppTool with activeFileId
  useEffect(() => {
    if (activeFileId && activeAppTool === ToolState.DASHBOARD) {
      setActiveAppTool(ToolState.EDIT);
    } else if (!activeFileId && !pendingIntent) {
      setActiveAppTool(ToolState.DASHBOARD);
    }
  }, [activeFileId, pendingIntent]);

  // Handle pending intents once a file is loaded
  useEffect(() => {
    if (activeFileId && pendingIntent) {
      switch (pendingIntent) {
        case ToolState.SPLIT:
          setActiveMenu('Page');
          setTimeout(() => window.dispatchEvent(new CustomEvent('open-split-modal')), 100);
          break;
        case ToolState.EXTRACT:
          setActiveMenu('Page');
          setTimeout(() => window.dispatchEvent(new CustomEvent('open-extract-modal')), 100);
          break;
        case ToolState.COMPRESS:
          setActiveMenu('Home');
          setTimeout(() => window.dispatchEvent(new CustomEvent('open-compress-modal')), 100);
          break;
        case ToolState.EDIT:
          setActiveMenu('Edit');
          break;
        case ToolState.ORGANIZE:
          setActiveMenu('Page');
          break;
        case ToolState.PROPERTIES:
          setActiveMenu('Home');
          setTimeout(() => window.dispatchEvent(new CustomEvent('ribbon-properties')), 100);
          break;
        case ToolState.WATERMARK:
          setActiveMenu('Edit');
          setTimeout(() => window.dispatchEvent(new CustomEvent('open-watermark-modal')), 100);
          break;
        case ToolState.BACKGROUND:
          setActiveMenu('Edit');
          setTimeout(() => window.dispatchEvent(new CustomEvent('open-background-modal')), 100);
          break;
        case ToolState.HEADER_FOOTER:
          setActiveMenu('Edit');
          setTimeout(() => window.dispatchEvent(new CustomEvent('open-header-footer-modal')), 100);
          break;
        case ToolState.CROP:
          setActiveMenu('Edit');
          setTimeout(() => window.dispatchEvent(new CustomEvent('open-crop-modal')), 100);
          break;
        case ToolState.PAGE_BOXES:
          setActiveMenu('Page');
          setTimeout(() => window.dispatchEvent(new CustomEvent('open-set-page-box-modal')), 100);
          break;
        case ToolState.INSERT_BLANK:
          setActiveMenu('Page');
          setTimeout(() => window.dispatchEvent(new CustomEvent('open-insert-blank-modal')), 100);
          break;
        case ToolState.INSERT_FILE:
          setActiveMenu('Page');
          setTimeout(() => window.dispatchEvent(new CustomEvent('open-insert-from-file-modal')), 100);
          break;
        case ToolState.REPLACE_PAGES:
          setActiveMenu('Page');
          setTimeout(() => window.dispatchEvent(new CustomEvent('open-replace-modal')), 100);
          break;
        case ToolState.BOOKMARK:
          setActiveMenu('Home');
          setTimeout(() => window.dispatchEvent(new CustomEvent('ribbon-add-bookmark')), 100);
          break;
        case ToolState.ATTACHMENT:
          setActiveMenu('Home');
          setTimeout(() => window.dispatchEvent(new CustomEvent('ribbon-add-attachment')), 100);
          break;
        case ToolState.ROTATE_LEFT:
          setActiveMenu('Page');
          setTimeout(() => window.dispatchEvent(new CustomEvent('ribbon-rotate-left')), 100);
          break;
        case ToolState.ROTATE_RIGHT:
          setActiveMenu('Page');
          setTimeout(() => window.dispatchEvent(new CustomEvent('ribbon-rotate-right')), 100);
          break;
        case ToolState.DELETE_PAGE:
          setActiveMenu('Page');
          setTimeout(() => window.dispatchEvent(new CustomEvent('ribbon-delete-pages')), 100);
          break;
        case ToolState.UPDATE_WATERMARK:
          setActiveMenu('Edit');
          setTimeout(() => window.dispatchEvent(new CustomEvent('ribbon-update-watermark')), 100);
          break;
        case ToolState.REMOVE_WATERMARK:
          setActiveMenu('Edit');
          setTimeout(() => window.dispatchEvent(new CustomEvent('ribbon-remove-watermark')), 100);
          break;
        case ToolState.UPDATE_BACKGROUND:
          setActiveMenu('Edit');
          setTimeout(() => window.dispatchEvent(new CustomEvent('ribbon-update-background')), 100);
          break;
        case ToolState.REMOVE_BACKGROUND:
          setActiveMenu('Edit');
          setTimeout(() => window.dispatchEvent(new CustomEvent('ribbon-remove-background')), 100);
          break;
        case ToolState.UPDATE_HEADER_FOOTER:
          setActiveMenu('Edit');
          setTimeout(() => window.dispatchEvent(new CustomEvent('ribbon-update-header-footer')), 100);
          break;
        case ToolState.REMOVE_HEADER_FOOTER:
          setActiveMenu('Edit');
          setTimeout(() => window.dispatchEvent(new CustomEvent('ribbon-remove-header-footer')), 100);
          break;
        case ToolState.MANAGE_LINKS:
          setActiveMenu('Edit');
          setTimeout(() => window.dispatchEvent(new CustomEvent('open-update-links-modal')), 100);
          break;
      }
      setPendingIntent(null);
    }
  }, [activeFileId, pendingIntent]);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setInstallPrompt(e);
      // Update UI notify the user they can install the PWA
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    
    // Show the install prompt
    installPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await installPrompt.userChoice;
    console.log(`User responded to the install prompt: ${outcome}`);
    
    // Clear the stashed prompt; it can't be used again.
    setInstallPrompt(null);
    setIsInstallable(false);
  };

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      if (cmdOrCtrl) {
        const target = e.target as HTMLElement;
        const isEditable = target.isContentEditable || 
                         target.tagName === 'INPUT' || 
                         target.tagName === 'TEXTAREA' ||
                         target.closest('[contenteditable="true"]');

        // Undo: Ctrl+Z
        if (e.key.toLowerCase() === 'z' && !e.shiftKey) {
          if (isEditable) return; // Allow native undo in inputs
          e.preventDefault();
          if (canUndo) undo();
        }
        // Redo: Ctrl+Y or Ctrl+Shift+Z
        else if (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey)) {
          if (isEditable) return; // Allow native redo in inputs
          e.preventDefault();
          if (canRedo) redo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, canUndo, canRedo]);

  const handleToolSelection = useCallback((tool: ToolState) => {
    const triggerBrowse = (intent: ToolState) => {
      setPendingIntent(intent);
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'application/pdf';
      input.onchange = (e) => {
        const files = (e.target as HTMLInputElement).files;
        if (files && files.length > 0) {
          addSharedFiles(Array.from(files));
        } else {
          setPendingIntent(null);
        }
      };
      input.click();
    };

    switch (tool) {
      case ToolState.MERGE:
        setActiveMenu('Home');
        setActiveAppTool(ToolState.EDIT);
        setTimeout(() => window.dispatchEvent(new CustomEvent('open-combine-modal')), 100);
        break;
      case ToolState.SPLIT:
        if (!activeFileId) triggerBrowse(ToolState.SPLIT);
        else {
          setActiveMenu('Page');
          setActiveAppTool(ToolState.EDIT);
          setTimeout(() => window.dispatchEvent(new CustomEvent('open-split-modal')), 100);
        }
        break;
      case ToolState.EXTRACT:
        if (!activeFileId) triggerBrowse(ToolState.EXTRACT);
        else {
          setActiveMenu('Page');
          setActiveAppTool(ToolState.EDIT);
          setTimeout(() => window.dispatchEvent(new CustomEvent('open-extract-modal')), 100);
        }
        break;
      case ToolState.EDIT:
        if (!activeFileId) triggerBrowse(ToolState.EDIT);
        else {
          setActiveMenu('Edit');
          setActiveAppTool(ToolState.EDIT);
        }
        break;
      case ToolState.ORGANIZE:
        if (!activeFileId) triggerBrowse(ToolState.ORGANIZE);
        else {
          setActiveMenu('Page');
          setActiveAppTool(ToolState.EDIT);
        }
        break;
      case ToolState.COMPRESS:
        if (!activeFileId) triggerBrowse(ToolState.COMPRESS);
        else {
          setActiveMenu('Home');
          setActiveAppTool(ToolState.EDIT);
          setTimeout(() => window.dispatchEvent(new CustomEvent('open-compress-modal')), 100);
        }
        break;
      case ToolState.PROPERTIES:
        if (!activeFileId) triggerBrowse(ToolState.PROPERTIES);
        else window.dispatchEvent(new CustomEvent('ribbon-properties'));
        break;
      case ToolState.WATERMARK:
        if (!activeFileId) triggerBrowse(ToolState.WATERMARK);
        else {
          setActiveMenu('Edit');
          setActiveAppTool(ToolState.EDIT);
          window.dispatchEvent(new CustomEvent('open-watermark-modal'));
        }
        break;
      case ToolState.BACKGROUND:
        if (!activeFileId) triggerBrowse(ToolState.BACKGROUND);
        else {
          setActiveMenu('Edit');
          setActiveAppTool(ToolState.EDIT);
          window.dispatchEvent(new CustomEvent('open-background-modal'));
        }
        break;
      case ToolState.HEADER_FOOTER:
        if (!activeFileId) triggerBrowse(ToolState.HEADER_FOOTER);
        else {
          setActiveMenu('Edit');
          setActiveAppTool(ToolState.EDIT);
          window.dispatchEvent(new CustomEvent('open-header-footer-modal'));
        }
        break;
      case ToolState.CROP:
        if (!activeFileId) triggerBrowse(ToolState.CROP);
        else {
          setActiveMenu('Edit');
          setActiveAppTool(ToolState.EDIT);
          window.dispatchEvent(new CustomEvent('open-crop-modal'));
        }
        break;
      case ToolState.PAGE_BOXES:
        if (!activeFileId) triggerBrowse(ToolState.PAGE_BOXES);
        else {
          setActiveMenu('Page');
          setActiveAppTool(ToolState.EDIT);
          window.dispatchEvent(new CustomEvent('open-set-page-box-modal'));
        }
        break;
      case ToolState.INSERT_BLANK:
        if (!activeFileId) triggerBrowse(ToolState.INSERT_BLANK);
        else {
          setActiveMenu('Page');
          setActiveAppTool(ToolState.EDIT);
          window.dispatchEvent(new CustomEvent('open-insert-blank-modal'));
        }
        break;
      case ToolState.INSERT_FILE:
        if (!activeFileId) triggerBrowse(ToolState.INSERT_FILE);
        else {
          setActiveMenu('Page');
          setActiveAppTool(ToolState.EDIT);
          window.dispatchEvent(new CustomEvent('open-insert-from-file-modal'));
        }
        break;
      case ToolState.REPLACE_PAGES:
        if (!activeFileId) triggerBrowse(ToolState.REPLACE_PAGES);
        else {
          setActiveMenu('Page');
          setActiveAppTool(ToolState.EDIT);
          window.dispatchEvent(new CustomEvent('open-replace-modal'));
        }
        break;
      case ToolState.BOOKMARK:
        if (!activeFileId) triggerBrowse(ToolState.BOOKMARK);
        else window.dispatchEvent(new CustomEvent('ribbon-add-bookmark'));
        break;
      case ToolState.ATTACHMENT:
        if (!activeFileId) triggerBrowse(ToolState.ATTACHMENT);
        else window.dispatchEvent(new CustomEvent('ribbon-add-attachment'));
        break;
      case ToolState.ROTATE_LEFT:
        if (!activeFileId) triggerBrowse(ToolState.ROTATE_LEFT);
        else window.dispatchEvent(new CustomEvent('ribbon-rotate-left'));
        break;
      case ToolState.ROTATE_RIGHT:
        if (!activeFileId) triggerBrowse(ToolState.ROTATE_RIGHT);
        else window.dispatchEvent(new CustomEvent('ribbon-rotate-right'));
        break;
      case ToolState.DELETE_PAGE:
        if (!activeFileId) triggerBrowse(ToolState.DELETE_PAGE);
        else window.dispatchEvent(new CustomEvent('ribbon-delete-pages'));
        break;
      case ToolState.UPDATE_WATERMARK:
        if (!activeFileId) triggerBrowse(ToolState.UPDATE_WATERMARK);
        else window.dispatchEvent(new CustomEvent('ribbon-update-watermark'));
        break;
      case ToolState.REMOVE_WATERMARK:
        if (!activeFileId) triggerBrowse(ToolState.REMOVE_WATERMARK);
        else window.dispatchEvent(new CustomEvent('ribbon-remove-watermark'));
        break;
      case ToolState.UPDATE_BACKGROUND:
        if (!activeFileId) triggerBrowse(ToolState.UPDATE_BACKGROUND);
        else window.dispatchEvent(new CustomEvent('ribbon-update-background'));
        break;
      case ToolState.REMOVE_BACKGROUND:
        if (!activeFileId) triggerBrowse(ToolState.REMOVE_BACKGROUND);
        else window.dispatchEvent(new CustomEvent('ribbon-remove-background'));
        break;
      case ToolState.UPDATE_HEADER_FOOTER:
        if (!activeFileId) triggerBrowse(ToolState.UPDATE_HEADER_FOOTER);
        else window.dispatchEvent(new CustomEvent('ribbon-update-header-footer'));
        break;
      case ToolState.REMOVE_HEADER_FOOTER:
        if (!activeFileId) triggerBrowse(ToolState.REMOVE_HEADER_FOOTER);
        else window.dispatchEvent(new CustomEvent('ribbon-remove-header-footer'));
        break;
      case ToolState.MANAGE_LINKS:
        if (!activeFileId) triggerBrowse(ToolState.MANAGE_LINKS);
        else window.dispatchEvent(new CustomEvent('open-update-links-modal'));
        break;
    }
  }, [activeFileId, addSharedFiles, setActiveMenu, setActiveAppTool]);

  // Add a global listener for search-triggered features
  useEffect(() => {
    const handleGlobalTrigger = (e: any) => {
      const { tool: t } = e.detail;
      handleToolSelection(t);
    };
    window.addEventListener('trigger-app-tool', handleGlobalTrigger);
    return () => window.removeEventListener('trigger-app-tool', handleGlobalTrigger);
  }, [handleToolSelection]);

  const handleBrowseChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addSharedFiles(Array.from(e.target.files));
    }
  };

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="flex flex-col h-screen bg-white text-slate-800 overflow-hidden font-sans">
      <div className="hidden md:block">
        <QuickAccessBar />
        <TopMenuBar />
      </div>
      
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between px-4 h-12 bg-[#3D3D70] border-b border-black/10 no-print z-[9500]">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="text-white/80 p-1 hover:text-white"
          >
            <Menu className="w-6 h-6" />
          </button>
          <span className="text-white font-bold text-sm tracking-tight">PDF Editor</span>
        </div>
        <div className="flex items-center gap-2">
           {isInstallable && (
             <button 
               onClick={handleInstallClick}
               className="text-white bg-blue-500/20 hover:bg-blue-500/40 p-1.5 rounded-lg border border-blue-400/30 flex items-center gap-1.5"
             >
               <Download className="w-4 h-4 text-blue-300" />
               <span className="text-[10px] font-bold uppercase tracking-wider text-blue-100">Install</span>
             </button>
           )}
           {activeFileId && (
              <button 
                onClick={undo} 
                className={cn("text-white/60 p-1", !canUndo && "opacity-30")}
                disabled={!canUndo}
              >
                <RotateCcw className="w-4 h-4" />
              </button>
           )}
           <button 
             onClick={() => window.dispatchEvent(new CustomEvent('ribbon-save'))}
             className="text-white/80 p-1"
           >
              <Save className="w-4 h-4" />
           </button>
        </div>
      </div>

      {/* Mobile Ribbon Selector Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/40 z-[9998] md:hidden"
            />
            <motion.div
              initial={{ y: -100 }}
              animate={{ y: 0 }}
              exit={{ y: -100 }}
              className="fixed top-12 left-0 right-0 bg-white shadow-xl z-[9999] md:hidden p-4 border-b border-slate-200"
            >
              <div className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Tool Categories</div>
              <div className="grid grid-cols-2 gap-2">
                {['Home', 'Edit', 'Page'].map((menu) => (
                  <button
                    key={menu}
                    onClick={() => {
                      setActiveMenu(menu);
                      setIsMobileMenuOpen(false);
                    }}
                    className={cn(
                      "flex items-center justify-between px-4 py-3 rounded-lg border text-sm font-bold transition-all",
                      activeMenu === menu 
                        ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100" 
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    )}
                  >
                    {menu}
                    {activeMenu === menu && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </button>
                ))}
              </div>
              <button 
                onClick={() => {
                  setIsSidebarOpen(!isSidebarOpen);
                  setIsMobileMenuOpen(false);
                }}
                className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 text-sm font-bold"
              >
                 {isSidebarOpen ? 'Close Navigation Panel' : 'Open Navigation Panel'}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <Ribbon activeMenu={activeMenu} onBrowse={handleBrowseChange} />

      <div className="hidden md:block">
        <TabsBar />
      </div>

      <main className="flex-1 flex overflow-hidden">
        {activeFileId && <Sidebar />}
        
        <div className="flex-1 flex flex-col relative overflow-hidden bg-[#808080]">
          <section className="flex-1 overflow-y-auto">
            <div className="p-4 h-full">
              <AnimatePresence mode="wait">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.1 }}
                  className="h-full flex flex-col"
                >
                  {!activeFileId && activeAppTool === ToolState.DASHBOARD ? (
                    <Dashboard onSelectTool={handleToolSelection} />
                  ) : (
                    <EditTool />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </section>
        </div>
      </main>

      {/* Footer / Status Bar */}
      <footer className="h-6 border-t border-slate-300 bg-[#F3F2F1] flex items-center px-4 justify-between text-[10px] text-slate-500 select-none no-print">
        <div className="flex gap-4">
          <span className="flex items-center gap-1.5 font-medium uppercase">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            Ready
          </span>
          {isInstallable && (
            <button 
              onClick={handleInstallClick}
              className="flex items-center gap-1.5 text-blue-600 hover:text-blue-700 font-bold uppercase transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Install App
            </button>
          )}
        </div>
        <div className="flex gap-4 items-center">
          <span>{sharedFiles.length > 0 ? (sharedFiles[0].file.size / 1024).toFixed(1) + ' KB' : '0.0 KB'}</span>
          <span>{currentPage} / {totalPages}</span>
          <span>{zoom}%</span>
        </div>
      </footer>
    </div>
  );
}

