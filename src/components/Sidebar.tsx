'use client';

import React from 'react';
import { PageState } from '../types/pdf';
import { RotateCw, Trash2, ArrowUp, ArrowDown, RefreshCw } from 'lucide-react';

interface SidebarProps {
  pageStates: PageState[];
  thumbnails: Map<number, string>;
  activePageIndex: number;
  onSelectPage: (index: number) => void;
  onRotatePage: (index: number) => void;
  onDeletePage: (index: number) => void;
  onMovePage: (fromIndex: number, toIndex: number) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  pageStates,
  thumbnails,
  activePageIndex,
  onSelectPage,
  onRotatePage,
  onDeletePage,
  onMovePage,
}) => {
  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-full select-none shadow-inner">
      <div className="p-3 border-b border-gray-200 flex items-center justify-between bg-gray-50">
        <span className="font-bold text-xs uppercase tracking-wider text-gray-500">
          Pages ({pageStates.filter(p => !p.deleted).length}/{pageStates.length})
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {pageStates.map((page, currentPos) => {
          const thumbUrl = thumbnails.get(page.originalIndex);
          const isActive = currentPos === activePageIndex;

          return (
            <div
              key={page.id}
              className={`group relative border-2 rounded-xl p-2 transition-all flex flex-col items-center bg-white ${
                page.deleted
                  ? 'opacity-40 border-red-300 bg-red-50'
                  : isActive
                  ? 'border-acrobat-red shadow-md ring-2 ring-red-100'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {/* Top controls header */}
              <div className="w-full flex items-center justify-between mb-1.5 px-1">
                <span className="text-xs font-bold text-gray-600">
                  Page {currentPos + 1}
                </span>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {/* Move Up */}
                  {currentPos > 0 && !page.deleted && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onMovePage(currentPos, currentPos - 1);
                      }}
                      className="p-1 text-gray-500 hover:text-black hover:bg-gray-100 rounded"
                      title="Move Page Up"
                    >
                      <ArrowUp className="w-3 h-3" />
                    </button>
                  )}

                  {/* Move Down */}
                  {currentPos < pageStates.length - 1 && !page.deleted && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onMovePage(currentPos, currentPos + 1);
                      }}
                      className="p-1 text-gray-500 hover:text-black hover:bg-gray-100 rounded"
                      title="Move Page Down"
                    >
                      <ArrowDown className="w-3 h-3" />
                    </button>
                  )}

                  {/* Rotate */}
                  {!page.deleted && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRotatePage(currentPos);
                      }}
                      className="p-1 text-gray-500 hover:text-acrobat-red hover:bg-gray-100 rounded"
                      title="Rotate 90° Clockwise"
                    >
                      <RotateCw className="w-3 h-3" />
                    </button>
                  )}

                  {/* Delete / Restore */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeletePage(currentPos);
                    }}
                    className={`p-1 rounded ${
                      page.deleted
                        ? 'text-green-600 hover:bg-green-100'
                        : 'text-red-500 hover:bg-red-100'
                    }`}
                    title={page.deleted ? "Restore Page" : "Delete Page"}
                  >
                    {page.deleted ? <RefreshCw className="w-3 h-3" /> : <Trash2 className="w-3 h-3" />}
                  </button>
                </div>
              </div>

              {/* Thumbnail Display Canvas / Image */}
              <div
                onClick={() => !page.deleted && onSelectPage(currentPos)}
                className="w-full flex justify-center items-center bg-gray-100 rounded-lg overflow-hidden cursor-pointer p-1 min-h-[120px] relative"
              >
                {thumbUrl ? (
                  <img
                    src={thumbUrl}
                    alt={`Page ${currentPos + 1}`}
                    className="max-h-36 object-contain shadow-sm transition-transform"
                    style={{ transform: `rotate(${page.rotation}deg)` }}
                  />
                ) : (
                  <div className="text-xs text-gray-400 font-medium animate-pulse">Loading...</div>
                )}

                {page.deleted && (
                  <div className="absolute inset-0 bg-red-900/20 backdrop-blur-[1px] flex items-center justify-center font-bold text-red-700 text-xs uppercase tracking-wide">
                    Deleted
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
};
