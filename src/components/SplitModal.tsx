'use client';

import React, { useState } from 'react';
import { PageState } from '../types/pdf';
import { parsePageRangeString } from '../utils/pdfSplitter';
import { X, Scissors, Layers, FileSpreadsheet, Check, Sparkles } from 'lucide-react';

interface SplitModalProps {
  isOpen: boolean;
  onClose: () => void;
  pageStates: PageState[];
  fileName: string | null;
  onSplitSinglePages: () => void;
  onExtractRanges: (rangeStr: string) => void;
  onSplitChunks: (chunkSize: number) => void;
}

export const SplitModal: React.FC<SplitModalProps> = ({
  isOpen,
  onClose,
  pageStates,
  fileName,
  onSplitSinglePages,
  onExtractRanges,
  onSplitChunks,
}) => {
  const [activeTab, setActiveTab] = useState<'single' | 'range' | 'chunk'>('single');
  const [rangeInput, setRangeInput] = useState<string>('1-2');
  const [chunkSizeInput, setChunkSizeInput] = useState<number>(2);

  if (!isOpen) return null;

  const activePages = pageStates.filter(p => !p.deleted);
  const parsedRangeIndices = parsePageRangeString(rangeInput, activePages.length);

  const handleExecuteSplit = () => {
    if (activeTab === 'single') {
      onSplitSinglePages();
    } else if (activeTab === 'range') {
      onExtractRanges(rangeInput);
    } else if (activeTab === 'chunk') {
      onSplitChunks(chunkSizeInput);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto flex flex-col border border-gray-200 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
          <div className="flex items-center gap-2">
            <Scissors className="w-5 h-5 text-acrobat-red" />
            <h3 className="font-bold text-gray-800 text-lg">Split PDF Document</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 bg-gray-100/50 p-1">
          <button
            onClick={() => setActiveTab('single')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-semibold rounded-lg transition-all ${
              activeTab === 'single'
                ? 'bg-white text-acrobat-red shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Single Pages</span>
          </button>

          <button
            onClick={() => setActiveTab('range')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-semibold rounded-lg transition-all ${
              activeTab === 'range'
                ? 'bg-white text-acrobat-red shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Scissors className="w-4 h-4" />
            <span>Custom Ranges</span>
          </button>

          <button
            onClick={() => setActiveTab('chunk')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-semibold rounded-lg transition-all ${
              activeTab === 'chunk'
                ? 'bg-white text-acrobat-red shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Split Chunks</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 flex-1 flex flex-col justify-center">
          {/* TAB 1: SINGLE PAGES */}
          {activeTab === 'single' && (
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="w-14 h-14 bg-red-100 text-acrobat-red rounded-full flex items-center justify-center shadow-inner mb-1">
                <Layers className="w-7 h-7" />
              </div>
              <h4 className="font-bold text-gray-800 text-base">Extract All Pages as Individual PDFs</h4>
              <p className="text-xs text-gray-500 max-w-sm">
                This will split your {activePages.length}-page PDF document into {activePages.length} separate single-page PDF files and download each one.
              </p>
            </div>
          )}

          {/* TAB 2: CUSTOM RANGES */}
          {activeTab === 'range' && (
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-700 mb-1 block">
                  Enter Page Range (e.g. 1-3, 5, 8-10)
                </label>
                <input
                  type="text"
                  value={rangeInput}
                  onChange={(e) => setRangeInput(e.target.value)}
                  placeholder="e.g. 1-2, 4"
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-acrobat-red font-mono"
                />
              </div>

              <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 flex items-center justify-between text-xs text-gray-600 font-medium">
                <span>Selected Pages:</span>
                <span className="font-bold text-acrobat-red">
                  {parsedRangeIndices.length > 0
                    ? parsedRangeIndices.map(i => i + 1).join(', ')
                    : 'None (Invalid range)'}
                </span>
              </div>
            </div>
          )}

          {/* TAB 3: SPLIT CHUNKS */}
          {activeTab === 'chunk' && (
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-700 mb-1 block">
                  Split Document Every N Pages
                </label>
                <input
                  type="number"
                  min={1}
                  max={activePages.length}
                  value={chunkSizeInput}
                  onChange={(e) => setChunkSizeInput(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-acrobat-red font-mono"
                />
              </div>

              <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 text-xs text-gray-600 font-medium">
                Will produce <span className="font-bold text-acrobat-red">{Math.ceil(activePages.length / chunkSizeInput)}</span> PDF files of up to {chunkSizeInput} pages each.
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={handleExecuteSplit}
            disabled={activeTab === 'range' && parsedRangeIndices.length === 0}
            className="flex items-center gap-1.5 px-5 py-2 text-sm font-bold text-white bg-acrobat-red hover:bg-acrobat-darkRed disabled:opacity-40 rounded-xl shadow-md transition-all"
          >
            <Scissors className="w-4 h-4" />
            <span>Split & Download</span>
          </button>
        </div>
      </div>
    </div>
  );
};
