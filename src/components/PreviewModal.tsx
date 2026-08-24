'use client';

import React from 'react';
import { X, Download, Eye, ArrowLeft } from 'lucide-react';

interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  previewUrl: string | null;
  fileName: string | null;
  onDownload: () => void;
}

export const PreviewModal: React.FC<PreviewModalProps> = ({
  isOpen,
  onClose,
  previewUrl,
  fileName,
  onDownload,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900/85 backdrop-blur-md z-50 flex flex-col animate-in fade-in duration-200 select-none">
      {/* Top Header */}
      <div className="h-16 bg-white border-b border-gray-200 px-6 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-acrobat-red text-white rounded-lg flex items-center justify-center shadow">
            <Eye className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-gray-800 text-lg leading-tight">PDF Document Preview</h2>
            <p className="text-xs text-gray-500 font-medium">
              {fileName || 'edited_document.pdf'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl border border-gray-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Editing</span>
          </button>

          <button
            onClick={onDownload}
            className="flex items-center gap-2 px-5 py-2 bg-acrobat-red text-white font-bold text-sm rounded-xl shadow-lg hover:bg-acrobat-darkRed transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Download PDF</span>
          </button>
        </div>
      </div>

      {/* Main Preview Body */}
      <div className="flex-1 p-4 md:p-6 overflow-hidden flex justify-center items-center">
        {previewUrl ? (
          <iframe
            src={previewUrl}
            className="w-full h-full max-w-6xl rounded-2xl bg-white shadow-2xl border border-gray-300"
            title="PDF Preview Document"
          />
        ) : (
          <div className="text-white text-base font-semibold animate-pulse flex items-center gap-2">
            Generating document preview...
          </div>
        )}
      </div>
    </div>
  );
};
