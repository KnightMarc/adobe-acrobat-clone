'use client';

import React from 'react';
import { 
  FileText, 
  Upload, 
  Download, 
  ZoomIn, 
  ZoomOut, 
  Grid, 
  PenTool, 
  Scissors,
  Undo2,
  Redo2,
  Eye,
  RotateCw,
  RotateCcw,
  PanelLeft
} from 'lucide-react';

interface NavbarProps {
  fileName: string | null;
  onFileUpload: (file: File) => void;
  scale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  onOpenOrganizer: () => void;
  onOpenSignatureModal: () => void;
  onOpenSplitModal: () => void;
  onDownload: () => void;
  onPreview: () => void;
  onRotateActivePage?: (direction: 'cw' | 'ccw') => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  hasDocument: boolean;
  isMobileSidebarOpen?: boolean;
  onToggleMobileSidebar?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  fileName,
  onFileUpload,
  scale,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onOpenOrganizer,
  onOpenSignatureModal,
  onOpenSplitModal,
  onDownload,
  onPreview,
  onRotateActivePage,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  hasDocument,
  isMobileSidebarOpen,
  onToggleMobileSidebar,
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileUpload(e.target.files[0]);
    }
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 px-3 sm:px-4 flex items-center justify-between select-none shadow-sm z-30 relative gap-2">
      {/* Left: Mobile Sidebar Toggle + Branding & Document Title */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {hasDocument && onToggleMobileSidebar && (
          <button
            onClick={onToggleMobileSidebar}
            className={`p-2 rounded-lg border transition-colors md:hidden ${
              isMobileSidebarOpen
                ? 'bg-red-50 text-acrobat-red border-red-200'
                : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
            }`}
            title="Toggle Page Thumbnails Sidebar"
          >
            <PanelLeft className="w-5 h-5" />
          </button>
        )}

        <div className="flex items-center gap-2 bg-acrobat-red text-white px-2.5 sm:px-3 py-1.5 rounded-lg font-bold text-xs sm:text-sm tracking-wide shadow-md">
          <FileText className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
          <span className="hidden xs:inline sm:inline">Acrobat Studio</span>
        </div>

        {fileName && (
          <div className="hidden lg:flex items-center gap-2 text-xs text-gray-700 bg-gray-100 px-2.5 py-1.5 rounded-md max-w-[160px] xl:max-w-xs truncate border border-gray-200 font-medium">
            <span className="truncate">{fileName}</span>
          </div>
        )}
      </div>

      {/* Middle: Controls (Zoom, Undo, Rotate, Page Organizer, eSign, Split) */}
      {hasDocument && (
        <div className="flex items-center gap-1 sm:gap-2 bg-gray-100 p-1 sm:p-1.5 rounded-lg border border-gray-200 shadow-inner max-w-[45vw] sm:max-w-none overflow-x-auto scrollbar-none flex-shrink">
          {/* Undo / Redo */}
          <button
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            className="p-1 sm:p-1.5 rounded hover:bg-white text-gray-600 disabled:opacity-40 disabled:hover:bg-transparent transition-colors flex-shrink-0"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo (Ctrl+Y)"
            className="p-1 sm:p-1.5 rounded hover:bg-white text-gray-600 disabled:opacity-40 disabled:hover:bg-transparent transition-colors flex-shrink-0"
          >
            <Redo2 className="w-4 h-4" />
          </button>

          <div className="h-4 w-px bg-gray-300 mx-0.5 sm:mx-1 flex-shrink-0" />

          {/* Zoom Controls */}
          <button
            onClick={onZoomOut}
            title="Zoom Out"
            className="p-1 sm:p-1.5 rounded hover:bg-white text-gray-700 transition-colors flex-shrink-0"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <button
            onClick={onZoomReset}
            title="Reset Zoom"
            className="px-1.5 sm:px-2 py-0.5 text-xs font-semibold text-gray-700 hover:bg-white rounded transition-colors flex-shrink-0"
          >
            {Math.round(scale * 100)}%
          </button>

          <button
            onClick={onZoomIn}
            title="Zoom In"
            className="p-1 sm:p-1.5 rounded hover:bg-white text-gray-700 transition-colors flex-shrink-0"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          {/* Quick Rotation Buttons */}
          {onRotateActivePage && (
            <>
              <div className="h-4 w-px bg-gray-300 mx-0.5 sm:mx-1 flex-shrink-0" />
              <button
                onClick={() => onRotateActivePage('ccw')}
                title="Rotate Page Left (90°)"
                className="p-1 sm:p-1.5 rounded hover:bg-white text-gray-700 hover:text-acrobat-red transition-colors flex-shrink-0"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={() => onRotateActivePage('cw')}
                title="Rotate Page Right (90°)"
                className="p-1 sm:p-1.5 rounded hover:bg-white text-gray-700 hover:text-acrobat-red transition-colors flex-shrink-0"
              >
                <RotateCw className="w-4 h-4" />
              </button>
            </>
          )}

          <div className="h-4 w-px bg-gray-300 mx-0.5 sm:mx-1 flex-shrink-0" />

          {/* Page Organizer Button */}
          <button
            onClick={onOpenOrganizer}
            className="flex items-center gap-1 px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-white rounded transition-colors flex-shrink-0"
            title="Organize & Rotate Pages"
          >
            <Grid className="w-4 h-4 text-acrobat-red flex-shrink-0" />
            <span className="hidden md:inline">Organize</span>
          </button>

          {/* Signature Modal Button */}
          <button
            onClick={onOpenSignatureModal}
            className="flex items-center gap-1 px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-white rounded transition-colors flex-shrink-0"
            title="Add eSignature"
          >
            <PenTool className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <span className="hidden md:inline">Sign</span>
          </button>

          {/* Split PDF Modal Button */}
          <button
            onClick={onOpenSplitModal}
            className="flex items-center gap-1 px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-white rounded transition-colors flex-shrink-0"
            title="Split PDF Document"
          >
            <Scissors className="w-4 h-4 text-purple-600 flex-shrink-0" />
            <span className="hidden md:inline">Split</span>
          </button>
        </div>
      )}

      {/* Right: Upload, Preview & Download Buttons */}
      <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="application/pdf"
          className="hidden"
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg border border-gray-300 transition-colors"
          title="Upload or Change PDF Document"
        >
          <Upload className="w-4 h-4 flex-shrink-0" />
          <span className="hidden sm:inline">{hasDocument ? 'Change PDF' : 'Upload PDF'}</span>
        </button>

        {hasDocument && (
          <>
            <button
              onClick={onPreview}
              className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 text-xs sm:text-sm font-bold text-gray-800 bg-gray-100 hover:bg-gray-200 rounded-lg border border-gray-300 shadow-sm transition-all"
              title="Preview PDF Document before downloading"
            >
              <Eye className="w-4 h-4 text-acrobat-red flex-shrink-0" />
              <span className="hidden sm:inline">Preview</span>
            </button>

            <button
              onClick={onDownload}
              className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-bold text-white bg-acrobat-red hover:bg-acrobat-darkRed rounded-lg shadow-md hover:shadow-lg transition-all"
              title="Download PDF Document"
            >
              <Download className="w-4 h-4 flex-shrink-0" />
              <span className="hidden xs:inline">Download</span>
            </button>
          </>
        )}
      </div>
    </header>
  );
};
