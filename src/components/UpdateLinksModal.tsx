import React from 'react';
import { X, Trash2, Edit, Link2 } from 'lucide-react';
import { Annotation, PageData } from '../contexts/PDFContext';

interface UpdateLinksModalProps {
  isOpen: boolean;
  onClose: () => void;
  pages: PageData[];
  onEdit: (annId: string, pageIndex: number, annotation: Annotation) => void;
  onDelete: (annId: string) => void;
}

export default function UpdateLinksModal({ isOpen, onClose, pages, onEdit, onDelete }: UpdateLinksModalProps) {
  if (!isOpen) return null;

  const allLinks = pages.flatMap((page, pageIndex) => 
    page.annotations.filter(ann => ann.type === 'link').map(ann => ({
      pageIndex,
      ann
    }))
  );

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 backdrop-blur-sm p-0 md:p-4 font-sans">
      <div className="bg-white rounded-none md:rounded-lg shadow-2xl w-full h-full md:h-auto md:w-[500px] flex flex-col md:max-h-[80vh] overflow-hidden">
        <div className="flex justify-between items-center px-4 py-3 border-b border-gray-100 bg-gray-50/50 sticky top-0 z-30">
          <h2 className="text-lg font-medium text-gray-800 flex items-center gap-2">
            <Link2 className="w-5 h-5 text-[#4461FF]" />
            Manage Links
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded text-gray-500 hover:text-gray-700 transition-colors">
            <X className="w-6 h-6 md:w-4 md:h-4" />
          </button>
        </div>

        <div className="flex-1 p-4 overflow-y-auto">
          {allLinks.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              No links found in this document.
            </div>
          ) : (
            <div className="space-y-2">
              {allLinks.map(({ pageIndex, ann }, i) => (
                <div key={ann.id} className="flex items-center justify-between p-3 border border-gray-200 rounded hover:border-blue-300 transition-colors bg-white">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-800">
                      Link on Page {pageIndex + 1}
                    </span>
                    <span className="text-xs text-gray-500 mt-0.5">
                      {ann.linkConfig?.actionType === 'web' 
                        ? `Go to Web: ${ann.linkConfig?.webUrl || 'Empty PDF'}` 
                        : ann.linkConfig?.actionType === 'page' 
                          ? `Go to Page ${ann.linkConfig?.targetPage || 1}` 
                          : 'Unknown action'}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <button 
                      onClick={() => onEdit(ann.id, pageIndex, ann)}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="Edit Link"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => onDelete(ann.id)}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"
                      title="Delete Link"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 px-4 py-3 bg-gray-50 border-t border-gray-100">
          <button 
            type="button" 
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-100 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
