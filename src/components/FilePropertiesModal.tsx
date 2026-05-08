import React, { useState } from 'react';
import { X, FileText, Settings, Lock, Pencil, FileSearch, Info, ShieldCheck, ChevronDown, Monitor, Layout as LayoutIcon, FileStack } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface FilePropertiesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveMetadata?: (metadata: any) => void;
  fileData: {
    name: string;
    size: string;
    type: string;
    lastModified: number;
    pages: number;
    zoom: number;
    rotation: number;
    id: string;
    width?: number; // width in points
    height?: number; // height in points
    metadata: {
      title: string;
      subject: string;
      keywords: string;
      author: string;
      producer: string;
      version: string;
    };
  } | null;
}

type TabType = 'Description';

export default function FilePropertiesModal({ isOpen, onClose, fileData, onSaveMetadata }: FilePropertiesModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('Description');
  
  // Metadata states initialized from props
  const [metadata, setMetadata] = useState({
    title: '',
    subject: '',
    keywords: '',
    author: '',
    producer: '',
    version: ''
  });

  const [editingField, setEditingField] = useState<string | null>(null);

  // Sync state when fileData changes or modal opens
  React.useEffect(() => {
    if (isOpen && fileData) {
      setMetadata(fileData.metadata || {
        title: fileData.name.replace('.pdf', ''),
        subject: 'Add a category',
        keywords: 'Add keywords',
        author: 'Add the author',
        producer: 'Vite PDF Core',
        version: '1.7'
      });
      setEditingField(null);
      setActiveTab('Description');
    }
  }, [isOpen, fileData?.id, fileData?.metadata]);

  if (!fileData) return null;

  const handleOK = () => {
    if (onSaveMetadata) {
      onSaveMetadata(metadata);
    }
    onClose();
  };

  const tabs = [
    { id: 'Description', label: 'Description', icon: FileSearch },
  ];

  const handleMetadataChange = (field: keyof typeof metadata, value: string) => {
    setMetadata(prev => ({ ...prev, [field]: value }));
  };

  const getPageSizeString = () => {
    if (fileData.width && fileData.height) {
      const w = (fileData.width / 72).toFixed(2);
      const h = (fileData.height / 72).toFixed(2);
      return `${w} x ${h} in`;
    }
    return "8.27 x 11.69 in"; // Default
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/20 backdrop-blur-[2px]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 10 }}
            className="relative w-full max-w-[800px] h-[600px] bg-white rounded-lg shadow-2xl overflow-hidden flex"
          >
            {/* Sidebar */}
            <div className="w-[180px] bg-[#F8F9FA] border-r border-[#E0E0E0] flex flex-col pt-4">
              <h2 className="px-5 text-xl text-slate-800 mb-6 font-normal">Properties</h2>
              <div className="flex flex-col gap-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as TabType)}
                    className={cn(
                      "flex items-center gap-3 px-5 py-3 transition-colors text-left",
                      activeTab === tab.id 
                        ? "bg-[#DEE3FF] text-[#1A237E] font-medium border-r-4 border-[#1A237E]" 
                        : "text-slate-600 hover:bg-slate-200"
                    )}
                  >
                    <tab.icon className="w-5 h-5 opacity-70" />
                    <span className="text-sm">{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col">
              {/* Header Close Button (Hidden but functionally there) */}
              <button 
                onClick={onClose}
                className="absolute top-4 right-4 p-1.5 hover:bg-slate-100 rounded-full transition-colors z-10"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>

              <div className="flex-1 overflow-y-auto p-8 pt-10 font-sans">
                {activeTab === 'Description' && (
                  <div className="space-y-8 animate-in fade-in duration-300">
                    <div>
                      <h3 className="text-lg text-slate-700 font-normal mb-1">{fileData.name}</h3>
                    </div>

                    <div className="space-y-6">
                      <section>
                        <h4 className="border-b border-[#E0E0E0] pb-1.5 mb-4 text-slate-700 font-medium">Properties</h4>
                        <div className="space-y-3 pl-1">
                          <PropertyRow label="File Size:" value={fileData.size} />
                          <PropertyRow label="Page Size:" value={getPageSizeString()} />
                          <PropertyRow label="Number of Pages:" value={fileData.pages.toString()} />
                          <PropertyRow 
                            label="Title:" 
                            value={metadata.title} 
                            isEditing={editingField === 'title'}
                            onEdit={() => setEditingField('title')}
                            onSave={(val) => { handleMetadataChange('title', val); setEditingField(null); }}
                            editable 
                          />
                          <PropertyRow 
                            label="Subject:" 
                            value={metadata.subject} 
                            isEditing={editingField === 'subject'}
                            onEdit={() => setEditingField('subject')}
                            onSave={(val) => { handleMetadataChange('subject', val); setEditingField(null); }}
                            editable 
                            color={metadata.subject === 'Add a category' ? 'text-slate-400' : 'text-slate-600'} 
                          />
                          <PropertyRow 
                            label="Keywords:" 
                            value={metadata.keywords} 
                            isEditing={editingField === 'keywords'}
                            onEdit={() => setEditingField('keywords')}
                            onSave={(val) => { handleMetadataChange('keywords', val); setEditingField(null); }}
                            editable 
                            color={metadata.keywords === 'Add keywords' ? 'text-slate-400' : 'text-slate-600'} 
                          />
                        </div>
                      </section>

                      <section>
                        <h4 className="border-b border-[#E0E0E0] pb-1.5 mb-4 text-slate-700 font-medium">Related Dates</h4>
                        <div className="space-y-3 pl-1">
                          <PropertyRow label="Created:" value={new Date(fileData.lastModified - 86400000).toLocaleString()} />
                          <PropertyRow label="Last Modified:" value={new Date(fileData.lastModified).toLocaleString()} />
                        </div>
                      </section>

                      <section>
                        <h4 className="border-b border-[#E0E0E0] pb-1.5 mb-4 text-slate-700 font-medium">Related People</h4>
                        <div className="space-y-3 pl-1">
                          <PropertyRow 
                            label="Author:" 
                            value={metadata.author} 
                            isEditing={editingField === 'author'}
                            onEdit={() => setEditingField('author')}
                            onSave={(val) => { handleMetadataChange('author', val); setEditingField(null); }}
                            editable 
                            color={metadata.author === 'Add the author' ? 'text-slate-400' : 'text-slate-600'} 
                          />
                        </div>
                      </section>

                      <section>
                        <h4 className="border-b border-[#E0E0E0] pb-1.5 mb-4 text-slate-700 font-medium text-sm uppercase tracking-tight">Advanced Properties</h4>
                        <div className="space-y-3 pl-1">
                          <PropertyRow label="PDF Producer:" value={metadata.producer} />
                          <PropertyRow label="PDF Version:" value={metadata.version} />
                          <PropertyRow label="Application:" value="Vite App Core" />
                        </div>
                      </section>
                    </div>
                  </div>
                )}

              </div>

              {/* Footer Actions */}
              <div className="p-6 pt-0 flex justify-end gap-3">
                 <button onClick={onClose} className="px-6 py-1.5 border border-[#4B4B8B] text-[#4B4B8B] rounded text-sm font-medium hover:bg-slate-50 transition-colors">
                    Cancel
                 </button>
                 <button onClick={handleOK} className="px-8 py-1.5 bg-[#4B4B8B] text-white rounded text-sm font-medium hover:brightness-110 transition-all shadow-md active:scale-95">
                    OK
                 </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function PropertyRow({ 
  label, 
  value, 
  editable, 
  color = "text-slate-600",
  isEditing,
  onEdit,
  onSave
}: { 
  label: string, 
  value: string, 
  editable?: boolean, 
  color?: string,
  isEditing?: boolean,
  onEdit?: () => void,
  onSave?: (val: string) => void
}) {
  const [inputValue, setInputValue] = React.useState(value);

  React.useEffect(() => {
    setInputValue(value);
  }, [value]);

  return (
    <div className="flex items-center group min-h-[28px]">
      <span className="w-36 text-slate-400 text-sm shrink-0">{label}</span>
      <div className="flex-1 flex items-center justify-between border-b border-transparent group-hover:border-slate-200 transition-colors py-0.5 relative">
        {isEditing ? (
          <input
            autoFocus
            type="text"
            className="flex-1 bg-white border border-blue-400 rounded px-1.5 py-0.5 text-sm outline-none shadow-[0_0_0_2px_rgba(59,130,246,0.1)]"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onBlur={() => onSave?.(inputValue)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSave?.(inputValue);
              if (e.key === 'Escape') { setInputValue(value); onSave?.(value); }
            }}
          />
        ) : (
          <>
            <span className={cn("text-sm font-normal", color)}>{value}</span>
            {editable && (
              <button 
                onClick={onEdit}
                className="p-1 hover:bg-slate-100 rounded transition-colors opacity-0 group-hover:opacity-100"
              >
                <Pencil className="w-3.5 h-3.5 text-slate-400" />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}


