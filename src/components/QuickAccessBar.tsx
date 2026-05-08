import React from 'react';
import { RotateCcw, RotateCw, Save, Printer, Info } from 'lucide-react';
import { usePDF } from '../contexts/PDFContext';

export default function QuickAccessBar() {
  const { undo, redo, canUndo, canRedo, activeFileId } = usePDF();

  const handlePrint = () => {
    window.dispatchEvent(new CustomEvent('ribbon-print'));
  };

  const handleProperties = () => {
    window.dispatchEvent(new CustomEvent('ribbon-properties'));
  };

  const handleSave = () => {
    window.dispatchEvent(new CustomEvent('ribbon-save'));
  };

  return (
    <div className="h-7 bg-[#3D3D70] flex items-center px-3 gap-1 select-none no-print border-b border-black/10">
      <div className="flex items-center gap-0.5">
        <button 
          onClick={() => undo()}
          disabled={!canUndo}
          className="p-1 px-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded disabled:opacity-30 transition-colors"
          title="Undo (Ctrl+Z)"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
        <button 
          onClick={() => redo()}
          disabled={!canRedo}
          className="p-1 px-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded disabled:opacity-30 transition-colors"
          title="Redo (Ctrl+Y)"
        >
          <RotateCw className="w-3.5 h-3.5" />
        </button>
        <button 
          onClick={handleSave}
          className="p-1 px-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded transition-colors"
          title="Save"
        >
          <Save className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="w-[1px] h-3 bg-white/20 mx-1" />

      <div className="flex items-center gap-0.5">
        <button 
          onClick={handlePrint}
          className="p-1 px-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded transition-colors"
          title="Print"
        >
          <Printer className="w-3.5 h-3.5" />
        </button>
        <button 
          onClick={handleProperties}
          className="p-1 px-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded transition-colors"
          title="Properties"
        >
          <Info className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex-1 flex justify-center items-center">
        <span className="text-[10px] text-white/40 font-medium tracking-tight">PDF Master Pro</span>
      </div>
      
      {/* Spacer for symmetry/future items */}
      <div className="w-32" />
    </div>
  );
}
