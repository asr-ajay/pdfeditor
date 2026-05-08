import React from 'react';
import { X, Plus, Home } from 'lucide-react';
import { cn } from '../lib/utils';
import { usePDF } from '../contexts/PDFContext';
import { ToolState } from '../types';

export default function TabsBar() {
  const { sharedFiles, activeFileId, setActiveFileId, removeSharedFile, addSharedFiles, setActiveAppTool } = usePDF();

  const handleAddFile = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/pdf';
    input.multiple = true;
    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files) {
        addSharedFiles(Array.from(files));
      }
    };
    input.click();
  };

  return (
    <div className="h-8 bg-[#4B4B8B] flex items-end px-2 gap-1 select-none overflow-hidden no-print">
      <div 
        onClick={() => {
          setActiveFileId(null);
          setActiveAppTool(ToolState.DASHBOARD);
        }}
        className="flex h-7 items-center px-2 text-white/70 hover:text-white cursor-pointer hover:bg-white/10 rounded-t transition-all mb-[1px]"
      >
        <Home className="w-4 h-4" />
      </div>
      
      {sharedFiles.map((file) => (
        <div
          key={file.id}
          onClick={() => setActiveFileId(file.id)}
          className={cn(
            "flex h-[26px] items-center px-3 gap-2 rounded-t transition-all cursor-pointer group min-w-[120px] max-w-[200px] border-x border-t",
            activeFileId === file.id 
              ? "bg-white border-white text-slate-700 font-medium" 
              : "bg-[#5D5D9E] border-transparent text-white/80 hover:bg-[#6A6AB1]"
          )}
        >
          <span className="text-[11px] truncate flex-1">{file.name}</span>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              removeSharedFile(file.id);
            }}
            className="p-0.5 rounded-full hover:bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}

      {sharedFiles.length === 0 && (
        <div className="flex h-[26px] items-center px-3 gap-2 rounded-t transition-all bg-white border-white text-slate-700 font-medium min-w-[120px]">
          <span className="text-[11px] truncate flex-1">Welcome</span>
        </div>
      )}

      <button 
        onClick={handleAddFile}
        className="h-6 w-6 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 rounded ml-1 mb-0.5"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
