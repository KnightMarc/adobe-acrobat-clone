'use client';

import React from 'react';
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
  Plus
} from 'lucide-react';
import { ActiveTool } from '../types/pdf';

interface ToolbarProps {
  activeTool: ActiveTool;
  setActiveTool: (tool: ActiveTool) => void;
  currentColor: string;
  setCurrentColor: (color: string) => void;
  fontSize: number;
  setFontSize: (size: number) => void;
  strokeWidth: number;
  setStrokeWidth: (width: number) => void;
  savedSignaturesCount: number;
  onOpenSignatureModal: () => void;
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
  savedSignaturesCount,
  onOpenSignatureModal,
}) => {
  const [showColorPicker, setShowColorPicker] = React.useState(false);

  return (
    <div className="bg-white/90 backdrop-blur-md border border-gray-200 shadow-lg rounded-full px-3 py-1.5 flex items-center gap-1 z-20 transition-all">
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

      {/* eSignature Tool */}
      <button
        onClick={() => {
          if (savedSignaturesCount === 0) {
            onOpenSignatureModal();
          } else {
            setActiveTool('signature');
          }
        }}
        className={`p-2 rounded-full transition-all relative ${
          activeTool === 'signature'
            ? 'bg-blue-600 text-white shadow-md scale-105'
            : 'text-gray-700 hover:bg-gray-100'
        }`}
        title={savedSignaturesCount > 0 ? "Stamp Signature" : "Create Signature"}
      >
        <Stamp className="w-4 h-4" />
        {savedSignaturesCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
            {savedSignaturesCount}
          </span>
        )}
      </button>

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

      {/* Contextual Options (Color & Size) */}
      {(activeTool === 'text' || activeTool === 'edit-text' || activeTool === 'draw' || activeTool === 'highlight') && (
        <>
          <div className="h-5 w-px bg-gray-300 mx-1" />

          {/* Color Selector */}
          <div className="relative">
            <button
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="p-1.5 rounded-full hover:bg-gray-100 flex items-center gap-1"
              title="Change Color"
            >
              <div 
                className="w-4 h-4 rounded-full border border-gray-300 shadow-inner" 
                style={{ backgroundColor: activeTool === 'highlight' ? '#EAB308' : currentColor }}
              />
            </button>

            {showColorPicker && (
              <div className="absolute top-10 left-0 bg-white border border-gray-200 shadow-xl rounded-xl p-2 flex items-center gap-1 z-30">
                {PRESET_COLORS.map(color => (
                  <button
                    key={color}
                    onClick={() => {
                      setCurrentColor(color);
                      setShowColorPicker(false);
                    }}
                    className="w-6 h-6 rounded-full border border-gray-200 hover:scale-110 transition-transform"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            )}
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
