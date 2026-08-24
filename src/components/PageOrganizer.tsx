'use client';

import React from 'react';
import { PageState } from '../types/pdf';
import { X, RotateCw, Trash2, ArrowLeft, ArrowRight, RefreshCw, Check } from 'lucide-react';

interface PageOrganizerProps {
  isOpen: boolean;
  onClose: () => void;
  pageStates: PageState[];
  thumbnails: Map<number, string>;
  onRotatePage: (index: number) => void;
  onDeletePage: (index: number) => void;
  onMovePage: (fromIndex: number, toIndex: number) => void;
}

export const PageOrganizer: React.FC<PageOrganizerProps> = ({
  isOpen,
  onClose,
  pageStates,
  thumbnails,
  onRotatePage,
  onDeletePage,
  onMovePage,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-md z-50 flex flex-col animate-in fade-in duration-200 select-none">
      {/* Header */}
      <div className="h-16 bg-white border-b border-gray-200 px-3 sm:px-6 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2 sm:gap-3">
          <h2 className="font-bold text-gray-800 text-sm sm:text-lg">Organize Pages</h2>
          <span className="text-[10px] sm:text-xs bg-gray-100 font-semibold px-2 py-0.5 sm:py-1 rounded-full text-gray-600 border border-gray-200">
            {pageStates.filter(p => !p.deleted).length} / {pageStates.length} Active
          </span>
        </div>

        <button
          onClick={onClose}
          className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 bg-acrobat-red text-white font-bold text-xs sm:text-sm rounded-xl shadow hover:bg-acrobat-darkRed transition-colors"
        >
          <Check className="w-4 h-4" />
          <span>Done</span>
        </button>
      </div>

      {/* Main Grid View */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-8">
        <div className="max-w-6xl mx-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {pageStates.map((page, index) => {
            const thumbUrl = thumbnails.get(page.originalIndex);

            return (
              <div
                key={page.id}
                className={`relative border-2 rounded-2xl bg-white p-3 flex flex-col items-center transition-all shadow-md hover:shadow-xl ${
                  page.deleted
                    ? 'opacity-40 border-red-300 bg-red-50'
                    : 'border-gray-200 hover:border-acrobat-red'
                }`}
              >
                {/* Page Number & Controls */}
                <div className="w-full flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full">
                    #{index + 1}
                  </span>

                  <div className="flex items-center gap-1">
                    {/* Move Left */}
                    {index > 0 && !page.deleted && (
                      <button
                        onClick={() => onMovePage(index, index - 1)}
                        className="p-1 rounded hover:bg-gray-100 text-gray-600"
                        title="Move Left"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Move Right */}
                    {index < pageStates.length - 1 && !page.deleted && (
                      <button
                        onClick={() => onMovePage(index, index + 1)}
                        className="p-1 rounded hover:bg-gray-100 text-gray-600"
                        title="Move Right"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Rotate */}
                    {!page.deleted && (
                      <button
                        onClick={() => onRotatePage(index)}
                        className="p-1 rounded hover:bg-gray-100 text-acrobat-red"
                        title="Rotate 90°"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Delete / Restore */}
                    <button
                      onClick={() => onDeletePage(index)}
                      className={`p-1 rounded ${
                        page.deleted
                          ? 'text-green-600 hover:bg-green-100'
                          : 'text-red-500 hover:bg-red-100'
                      }`}
                      title={page.deleted ? "Restore Page" : "Delete Page"}
                    >
                      {page.deleted ? <RefreshCw className="w-3.5 h-3.5" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Page Thumbnail */}
                <div className="w-full min-h-[160px] max-h-[220px] bg-gray-100 rounded-xl overflow-hidden flex items-center justify-center p-2 relative">
                  {thumbUrl ? (
                    <img
                      src={thumbUrl}
                      alt={`Page ${index + 1}`}
                      className="max-h-48 object-contain transition-transform"
                      style={{ transform: `rotate(${page.rotation}deg)` }}
                    />
                  ) : (
                    <div className="text-xs text-gray-400 font-medium animate-pulse">Loading...</div>
                  )}

                  {page.deleted && (
                    <div className="absolute inset-0 bg-red-900/20 backdrop-blur-[2px] flex items-center justify-center font-bold text-red-700 text-sm uppercase tracking-wider">
                      Page Deleted
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
