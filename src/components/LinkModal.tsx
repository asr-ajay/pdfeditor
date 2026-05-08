import React, { useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '../lib/utils';

export interface LinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: any) => void;
  totalPages: number;
  initialConfig?: any;
}

export default function LinkModal({ isOpen, onClose, onSave, totalPages, initialConfig }: LinkModalProps) {
  const [linkType, setLinkType] = useState('Visible rectangle');
  const [highlightStyle, setHighlightStyle] = useState('None');
  const [lineThickness, setLineThickness] = useState('Thin');
  const [color, setColor] = useState('#ffd3d3');
  const [lineStyle, setLineStyle] = useState('Solid');
  const [actionType, setActionType] = useState<'page' | 'web' | 'file'>('page');
  const [targetPage, setTargetPage] = useState('1');
  const [webUrl, setWebUrl] = useState('');
  const [filePath, setFilePath] = useState('');

  React.useEffect(() => {
    if (initialConfig) {
      setLinkType(initialConfig.linkType || 'Visible rectangle');
      setHighlightStyle(initialConfig.highlightStyle || 'None');
      setLineThickness(initialConfig.lineThickness || 'Thin');
      setColor(initialConfig.color || '#ffd3d3');
      setLineStyle(initialConfig.lineStyle || 'Solid');
      setActionType(initialConfig.actionType || 'page');
      setTargetPage(initialConfig.targetPage?.toString() || '1');
      setWebUrl(initialConfig.webUrl || '');
      setFilePath(initialConfig.filePath || '');
    }
  }, [initialConfig, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 p-0 md:p-4 font-sans text-sm">
      <div className="bg-white text-slate-800 shadow-2xl flex flex-col w-full h-full md:h-auto md:w-[600px] md:max-w-full overflow-hidden">
        <div className="bg-[#2D2D5F] text-white px-4 py-3 flex items-center justify-between shrink-0 sticky top-0 z-30">
          <h2 className="text-md font-medium uppercase tracking-wider text-xs">Create Link</h2>
          <button onClick={onClose} className="text-white/80 hover:text-white p-1">
            <X className="w-6 h-6 md:w-5 md:h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-6">
          {/* Appearance Section */}
          <div>
            <h3 className="text-[#2D2D5F] font-bold mb-4 uppercase tracking-wide text-xs">Appearance</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Link Type:</span>
                <select 
                  value={linkType} onChange={e => setLinkType(e.target.value)}
                  className="border border-slate-300 rounded px-2 py-1 w-[160px] outline-none"
                >
                  <option>Visible rectangle</option>
                  <option>Invisible rectangle</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-600">Color:</span>
                <div className="flex items-center border border-slate-300 rounded w-[160px] h-8 px-2 focus-within:ring-1 focus-within:ring-blue-500 bg-white">
                  <input 
                    type="color" 
                    value={color} 
                    onChange={e => setColor(e.target.value)}
                    className="w-4 h-4 cursor-pointer p-0 border-0 bg-transparent"
                  />
                  <span className="ml-2 text-xs text-slate-800 uppercase">{color.replace('#', '')}</span>
                  <div className="ml-auto pointer-events-none">
                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-600">Highlight Style:</span>
                <select 
                  value={highlightStyle} onChange={e => setHighlightStyle(e.target.value)}
                  className="border border-slate-300 rounded px-2 py-1 w-[160px] outline-none"
                >
                  <option>None</option>
                  <option>Invert</option>
                  <option>Push</option>
                  <option>Outline</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-600">Line Style:</span>
                <select 
                  value={lineStyle} onChange={e => setLineStyle(e.target.value)}
                  className="border border-slate-300 rounded px-2 py-1 w-[160px] outline-none disabled:opacity-50"
                  disabled={linkType === 'Invisible rectangle'}
                >
                  <option>Solid</option>
                  <option>Dashed</option>
                  <option>Underline</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-600">Line Thickness:</span>
                <select 
                  value={lineThickness} onChange={e => setLineThickness(e.target.value)}
                  className="border border-slate-300 rounded px-2 py-1 w-[160px] outline-none disabled:opacity-50"
                  disabled={linkType === 'Invisible rectangle'}
                >
                  <option>Thin</option>
                  <option>Medium</option>
                  <option>Thick</option>
                </select>
              </div>
            </div>
          </div>

          {/* Link Action Section */}
          <div>
            <h3 className="text-[#2D2D5F] font-bold mb-4 mt-2 uppercase tracking-wide text-xs border-t border-slate-100 pt-6">Link Action</h3>
            <div className="space-y-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  checked={actionType === 'page'}
                  onChange={() => setActionType('page')}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-slate-600">Go to a page view</span>
                <span className="w-5 h-5 rounded-full border border-slate-300 text-slate-400 flex items-center justify-center text-xs font-bold leading-none cursor-help bg-slate-50" title="Go to a specific page number in this document">!</span>
              </label>

              {actionType === 'page' && (
                <div className="ml-6 flex items-center gap-2 mt-[-8px]">
                  <span className="text-slate-600">Page:</span>
                  <input 
                    type="number" 
                    min="1" max={totalPages}
                    value={targetPage} onChange={e => setTargetPage(e.target.value)}
                    className="border border-slate-300 px-2 py-1 w-16 outline-none text-center rounded-sm"
                  />
                  <span className="text-slate-600">of {totalPages}</span>
                </div>
              )}

              <label className="flex items-center gap-2 mt-4 cursor-pointer">
                <input 
                  type="radio" 
                  checked={actionType === 'web'}
                  onChange={() => setActionType('web')}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-slate-600">Open a web page</span>
              </label>
              <div className="ml-6">
                 <input 
                   disabled={actionType !== 'web'}
                   placeholder="https://example.com"
                   value={webUrl}
                   onChange={e => setWebUrl(e.target.value)}
                   className="w-full bg-slate-100 disabled:bg-slate-200/60 border border-slate-300 outline-none py-1.5 px-2 text-slate-800 h-9 rounded"
                 />
              </div>

            </div>
          </div>
        </div>

        <div className="p-4 flex items-center justify-end gap-3 bg-slate-50 border-t border-slate-200 sticky bottom-0 z-30 shrink-0">
          <button 
            onClick={onClose}
            className="px-8 py-2 border border-slate-300 text-slate-600 hover:bg-slate-100 transition-colors uppercase text-xs min-w-[100px] rounded-sm bg-white font-medium"
          >
            CANCEL
          </button>
          <button 
            onClick={() => {
              onSave({
                linkType,
                highlightStyle,
                color,
                lineStyle,
                lineThickness,
                actionType,
                targetPage: actionType === 'page' ? parseInt(targetPage) : undefined,
                webUrl: actionType === 'web' ? webUrl : undefined,
                filePath: actionType === 'file' ? filePath : undefined
              });
              onClose();
            }} 
            className="px-10 py-2 bg-[#4461FF] text-white hover:bg-blue-700 transition-colors uppercase text-xs min-w-[100px] rounded-sm tracking-wide font-medium"
          >
            Set Link
          </button>
        </div>
      </div>
    </div>
  );
}
