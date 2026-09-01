'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  MousePointer, 
  Hand, 
  Type, 
  FilePenLine,
  PenTool, 
  Highlighter, 
  Eraser, 
  Stamp,
  Minus,
  Plus,
  RotateCw,
  RotateCcw,
  Trash2,
  Check,
  ChevronDown
} from 'lucide-react';
import { ActiveTool, SavedSignature } from '../types/pdf';

interface ToolbarProps {
  activeTool: ActiveTool;
  setActiveTool: (tool: ActiveTool) => void;
  currentColor: string;
  setCurrentColor: (color: string) => void;
  fontSize: number;
  setFontSize: (size: number) => void;
  strokeWidth: number;
  setStrokeWidth: (width: number) => void;
  savedSignatures?: SavedSignature[];
  activeSignature?: SavedSignature | null;
  onSelectSignature?: (sig: SavedSignature) => void;
  onDeleteSignature?: (id: string) => void;
  savedSignaturesCount?: number;
  onOpenSignatureModal: () => void;
  onRotateActivePage?: (direction: 'cw' | 'ccw') => void;
}

const PRESET_COLORS = [
  '#000000', // Black
  '#FA0F00', // Red
  '#2563EB', // Blue
  '#16A34A', // Green
  '#EAB308', // Yellow / Gold
  '#9333EA', // Purple
];

export const Toolbar: React.FC<ToolbarProps> = ({
  activeTool,
  setActiveTool,
  currentColor,
  setCurrentColor,
  fontSize,
  setFontSize,
  strokeWidth,
  setStrokeWidth,
  savedSignatures = [],
  activeSignature,
  onSelectSignature,
  onDeleteSignature,
  savedSignaturesCount,
  onOpenSignatureModal,
  onRotateActivePage,
}) => {
  const [isSignatureDropdownOpen, setIsSignatureDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const sigs = savedSignatures;
  const count = savedSignaturesCount ?? sigs.length;

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsSignatureDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="bg-white/90 backdrop-blur-md border border-gray-200 shadow-lg rounded-full px-2.5 sm:px-3 py-1.5 flex items-center gap-0.5 sm:gap-1 z-20 transition-all max-w-[92vw] overflow-visible">
      {/* Select / Move */}
      <button
        onClick={() => setActiveTool('select')}
        className={`p-2 rounded-full transition-all ${
          activeTool === 'select'
            ? 'bg-acrobat-red text-white shadow-md scale-105'
            : 'text-gray-700 hover:bg-gray-100'
        }`}
        title="Select & Move Annotations"
      >
        <MousePointer className="w-4 h-4" />
      </button>

      {/* Hand / Pan */}
      <button
        onClick={() => setActiveTool('hand')}
        className={`p-2 rounded-full transition-all ${
          activeTool === 'hand'
            ? 'bg-acrobat-red text-white shadow-md scale-105'
            : 'text-gray-700 hover:bg-gray-100'
        }`}
        title="Pan Page View"
      >
        <Hand className="w-4 h-4" />
      </button>

      <div className="h-5 w-px bg-gray-300 mx-1" />

      {/* Add New Text */}
      <button
        onClick={() => setActiveTool('text')}
        className={`p-2 rounded-full transition-all ${
          activeTool === 'text'
            ? 'bg-acrobat-red text-white shadow-md scale-105'
            : 'text-gray-700 hover:bg-gray-100'
        }`}
        title="Add New Text Box"
      >
        <Type className="w-4 h-4" />
      </button>

      {/* Edit PDF Text (Redact & Replace) */}
      <button
        onClick={() => setActiveTool('edit-text')}
        className={`p-2 rounded-full transition-all ${
          activeTool === 'edit-text'
            ? 'bg-acrobat-red text-white shadow-md scale-105'
            : 'text-gray-700 hover:bg-gray-100'
        }`}
        title="Edit PDF Text (Click to replace existing text)"
      >
        <FilePenLine className="w-4 h-4" />
      </button>

      {/* eSignature Tool & Dropdown Menu */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => {
            if (sigs.length === 0) {
              onOpenSignatureModal();
            } else {
              setIsSignatureDropdownOpen(prev => !prev);
            }
          }}
          className={`p-2 rounded-full transition-all relative flex items-center gap-1 ${
            activeTool === 'signature'
              ? 'bg-blue-600 text-white shadow-md scale-105'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
          title={sigs.length > 0 ? "Select or Create eSignature" : "Create Signature"}
        >
          <Stamp className="w-4 h-4" />
          {sigs.length > 0 && (
            <span className={`text-[10px] px-1 rounded-full font-bold min-w-[14px] text-center ${
              activeTool === 'signature' ? 'bg-white text-blue-600' : 'bg-blue-600 text-white'
            }`}>
              {sigs.length}
            </span>
          )}
          {sigs.length > 0 && (
            <ChevronDown className={`w-3 h-3 transition-transform ${isSignatureDropdownOpen ? 'rotate-180' : ''}`} />
          )}
        </button>

        {/* Signature Quick Selector Dropdown */}
        {isSignatureDropdownOpen && sigs.length > 0 && (
          <div className="absolute top-12 left-1/2 -translate-x-1/2 w-64 bg-white border border-gray-200 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-100 mb-1">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                Saved Signatures ({sigs.length})
              </span>
              <button
                onClick={() => {
                  setIsSignatureDropdownOpen(false);
                  onOpenSignatureModal();
                }}
                className="text-xs font-bold text-acrobat-red hover:underline flex items-center gap-0.5"
              >
                <Plus className="w-3 h-3" /> New
              </button>
            </div>

            <div className="max-h-48 overflow-y-auto flex flex-col gap-1.5 p-1">
              {sigs.map((sig) => {
                const isActive = activeSignature?.id === sig.id;
                return (
                  <div
                    key={sig.id}
                    onClick={() => {
                      if (onSelectSignature) onSelectSignature(sig);
                      setActiveTool('signature');
                      setIsSignatureDropdownOpen(false);
                    }}
                    className={`group relative flex items-center justify-between p-2 rounded-xl border transition-all cursor-pointer ${
                      isActive
                        ? 'border-blue-500 bg-blue-50/70 shadow-sm'
                        : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="w-14 h-8 bg-white border border-gray-200 rounded flex items-center justify-center p-1 overflow-hidden flex-shrink-0">
                        <img src={sig.dataUrl} alt={sig.name} className="max-h-full max-w-full object-contain" />
                      </div>
                      <span className="text-xs font-semibold text-gray-700 truncate">
                        {sig.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      {isActive && (
                        <span className="text-blue-600 font-bold p-0.5">
                          <Check className="w-4 h-4" />
                        </span>
                      )}
                      {onDeleteSignature && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteSignature(sig.id);
                            if (sigs.length <= 1) {
                              setIsSignatureDropdownOpen(false);
                            }
                          }}
                          className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors opacity-0 group-hover:opacity-100"
                          title="Delete signature"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-1.5 border-t border-gray-100 mt-1">
              <button
                onClick={() => {
                  setIsSignatureDropdownOpen(false);
                  onOpenSignatureModal();
                }}
                className="w-full py-1.5 text-xs font-bold text-acrobat-red bg-red-50 hover:bg-red-100 rounded-xl flex items-center justify-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create / Upload Signature</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Draw / Pen Tool */}
      <button
        onClick={() => setActiveTool('draw')}
        className={`p-2 rounded-full transition-all ${
          activeTool === 'draw'
            ? 'bg-acrobat-red text-white shadow-md scale-105'
            : 'text-gray-700 hover:bg-gray-100'
        }`}
        title="Freehand Ink Pen"
      >
        <PenTool className="w-4 h-4" />
      </button>

      {/* Highlight Tool */}
      <button
        onClick={() => setActiveTool('highlight')}
        className={`p-2 rounded-full transition-all ${
          activeTool === 'highlight'
            ? 'bg-amber-500 text-white shadow-md scale-105'
            : 'text-gray-700 hover:bg-gray-100'
        }`}
        title="Text Highlighter"
      >
        <Highlighter className="w-4 h-4" />
      </button>

      {/* Eraser Tool */}
      <button
        onClick={() => setActiveTool('eraser')}
        className={`p-2 rounded-full transition-all ${
          activeTool === 'eraser'
            ? 'bg-gray-800 text-white shadow-md scale-105'
            : 'text-gray-700 hover:bg-gray-100'
        }`}
        title="Eraser / Delete Annotation"
      >
        <Eraser className="w-4 h-4" />
      </button>

      {/* Direct Page Rotation Tools */}
      {onRotateActivePage && (
        <>
          <div className="h-5 w-px bg-gray-300 mx-1" />

          <button
            onClick={() => onRotateActivePage('ccw')}
            className="p-2 rounded-full text-gray-700 hover:bg-gray-100 transition-all hover:text-acrobat-red"
            title="Rotate Active Page Counter-Clockwise (90°)"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={() => onRotateActivePage('cw')}
            className="p-2 rounded-full text-gray-700 hover:bg-gray-100 transition-all hover:text-acrobat-red"
            title="Rotate Active Page Clockwise (90°)"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </>
      )}

      {/* Contextual Options (Color & Size) */}
      {(activeTool === 'text' || activeTool === 'edit-text' || activeTool === 'draw' || activeTool === 'highlight') && (
        <>
          <div className="h-5 w-px bg-gray-300 mx-1" />

          {/* Color Selector */}
          <div className="flex items-center gap-1 px-1 flex-shrink-0">
            {PRESET_COLORS.map(color => (
              <button
                key={color}
                onClick={() => setCurrentColor(color)}
                className={`w-4 h-4 rounded-full border transition-transform flex-shrink-0 ${
                  currentColor === color ? 'ring-2 ring-acrobat-red scale-110' : 'border-gray-300 hover:scale-105'
                }`}
                style={{ backgroundColor: activeTool === 'highlight' ? '#EAB308' : color }}
                title={`Color ${color}`}
              />
            ))}
          </div>

          {/* Font Size or Stroke Width Adjuster */}
          {activeTool === 'text' || activeTool === 'edit-text' ? (
            <div className="flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded-full text-xs font-semibold">
              <button onClick={() => setFontSize(Math.max(10, fontSize - 2))} className="hover:text-acrobat-red">
                <Minus className="w-3 h-3" />
              </button>
              <span>{fontSize}px</span>
              <button onClick={() => setFontSize(Math.min(72, fontSize + 2))} className="hover:text-acrobat-red">
                <Plus className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded-full text-xs font-semibold">
              <button onClick={() => setStrokeWidth(Math.max(1, strokeWidth - 1))} className="hover:text-acrobat-red">
                <Minus className="w-3 h-3" />
              </button>
              <span>{strokeWidth}pt</span>
              <button onClick={() => setStrokeWidth(Math.min(30, strokeWidth + 2))} className="hover:text-acrobat-red">
                <Plus className="w-3 h-3" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
