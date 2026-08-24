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
  RotateCcw
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
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileUpload(e.target.files[0]);
    }
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 px-4 flex items-center justify-between select-none shadow-sm z-30 relative">
      {/* Left: Branding & Document Title */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-acrobat-red text-white px-3 py-1.5 rounded-lg font-bold text-sm tracking-wide shadow-md">
          <FileText className="w-5 h-5" />
          <span>Acrobat Studio</span>
        </div>

        {fileName && (
          <div className="hidden md:flex items-center gap-2 text-sm text-gray-700 bg-gray-100 px-3 py-1.5 rounded-md max-w-xs truncate border border-gray-200 font-medium">
            <span className="truncate">{fileName}</span>
          </div>
        )}
      </div>

      {/* Middle: Controls (Zoom, Undo, Rotate, Page Organizer, eSign, Split) */}
      {hasDocument && (
        <div className="flex items-center gap-2 bg-gray-100 p-1.5 rounded-lg border border-gray-200 shadow-inner">
          {/* Undo / Redo */}
          <button
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            className="p-1.5 rounded hover:bg-white text-gray-600 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo (Ctrl+Y)"
            className="p-1.5 rounded hover:bg-white text-gray-600 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
          >
            <Redo2 className="w-4 h-4" />
          </button>

          <div className="h-4 w-px bg-gray-300 mx-1" />

          {/* Zoom Controls */}
          <button
            onClick={onZoomOut}
            title="Zoom Out"
            className="p-1.5 rounded hover:bg-white text-gray-700 transition-colors"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <button
            onClick={onZoomReset}
            title="Reset Zoom"
            className="px-2 py-0.5 text-xs font-semibold text-gray-700 hover:bg-white rounded transition-colors"
          >
            {Math.round(scale * 100)}%
          </button>

          <button
            onClick={onZoomIn}
            title="Zoom In"
            className="p-1.5 rounded hover:bg-white text-gray-700 transition-colors"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          {/* Quick Rotation Buttons */}
          {onRotateActivePage && (
            <>
              <div className="h-4 w-px bg-gray-300 mx-1" />
              <button
                onClick={() => onRotateActivePage('ccw')}
                title="Rotate Page Left (90°)"
                className="p-1.5 rounded hover:bg-white text-gray-700 hover:text-acrobat-red transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={() => onRotateActivePage('cw')}
                title="Rotate Page Right (90°)"
                className="p-1.5 rounded hover:bg-white text-gray-700 hover:text-acrobat-red transition-colors"
              >
                <RotateCw className="w-4 h-4" />
              </button>
            </>
          )}

          <div className="h-4 w-px bg-gray-300 mx-1" />

          {/* Page Organizer Button */}
          <button
            onClick={onOpenOrganizer}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-white rounded transition-colors"
            title="Organize & Rotate Pages"
          >
            <Grid className="w-4 h-4 text-acrobat-red" />
            <span className="hidden sm:inline">Organize</span>
          </button>

          {/* Signature Modal Button */}
          <button
            onClick={onOpenSignatureModal}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-white rounded transition-colors"
            title="Add eSignature"
          >
            <PenTool className="w-4 h-4 text-blue-600" />
            <span className="hidden sm:inline">Sign</span>
          </button>

          {/* Split PDF Modal Button */}
          <button
            onClick={onOpenSplitModal}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-white rounded transition-colors"
            title="Split PDF Document"
          >
            <Scissors className="w-4 h-4 text-purple-600" />
            <span className="hidden sm:inline">Split PDF</span>
          </button>
        </div>
      )}

      {/* Right: Upload, Preview & Download Buttons */}
      <div className="flex items-center gap-2">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="application/pdf"
          className="hidden"
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg border border-gray-300 transition-colors"
        >
          <Upload className="w-4 h-4" />
          <span>{hasDocument ? 'Change PDF' : 'Upload PDF'}</span>
        </button>

        {hasDocument && (
          <>
            <button
              onClick={onPreview}
              className="flex items-center gap-2 px-3.5 py-1.5 text-sm font-bold text-gray-800 bg-gray-100 hover:bg-gray-200 rounded-lg border border-gray-300 shadow-sm transition-all"
              title="Preview PDF Document before downloading"
            >
              <Eye className="w-4 h-4 text-acrobat-red" />
              <span>Preview</span>
            </button>

            <button
              onClick={onDownload}
              className="flex items-center gap-2 px-4 py-1.5 text-sm font-bold text-white bg-acrobat-red hover:bg-acrobat-darkRed rounded-lg shadow-md hover:shadow-lg transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Download PDF</span>
            </button>
          </>
        )}
      </div>
    </header>
  );
};
