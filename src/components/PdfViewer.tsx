'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { ActiveTool, AnnotationItem, PageState, Point, SavedSignature } from '../types/pdf';
import { renderPDFPage } from '../utils/pdfRenderer';
import { Trash2, PenTool, Scaling, RotateCw } from 'lucide-react';

interface PdfViewerProps {
  pdfDoc: pdfjsLib.PDFDocumentProxy | null;
  pageStates: PageState[];
  scale: number;
  activeTool: ActiveTool;
  setActiveTool: (tool: ActiveTool) => void;
  annotations: AnnotationItem[];
  setAnnotations: React.Dispatch<React.SetStateAction<AnnotationItem[]>>;
  currentColor: string;
  fontSize: number;
  strokeWidth: number;
  activeSignature: SavedSignature | null;
  activePageIndex: number;
  setActivePageIndex: (index: number) => void;
}

export const PdfViewer: React.FC<PdfViewerProps> = ({
  pdfDoc,
  pageStates,
  scale,
  activeTool,
  setActiveTool,
  annotations,
  setAnnotations,
  currentColor,
  fontSize,
  strokeWidth,
  activeSignature,
  activePageIndex,
  setActivePageIndex,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<Point[]>([]);
  const [drawingPageIndex, setDrawingPageIndex] = useState<number | null>(null);

  // Dragging annotation state
  const [draggingAnnId, setDraggingAnnId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<Point>({ x: 0, y: 0 });

  // Resizing annotation state
  const [resizingAnnId, setResizingAnnId] = useState<string | null>(null);
  const [resizeStartWidth, setResizeStartWidth] = useState<number>(25);
  const [resizeStartX, setResizeStartX] = useState<number>(0);

  // Hand / Pan tool state
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panStart, setPanStart] = useState<Point>({ x: 0, y: 0 });
  const [scrollStart, setScrollStart] = useState<Point>({ x: 0, y: 0 });

  // Selected annotation for editing/resizing
  const [selectedAnnId, setSelectedAnnId] = useState<string | null>(null);

  // Render PDF pages on canvas when pdfDoc, pageStates, or scale changes
  useEffect(() => {
    if (!pdfDoc) return;

    pageStates.forEach((page, index) => {
      if (page.deleted) return;

      const canvas = document.getElementById(`pdf-canvas-${index}`) as HTMLCanvasElement;
      if (canvas) {
        renderPDFPage(pdfDoc, page.originalIndex + 1, canvas, scale, page.rotation);
      }
    });
  }, [pdfDoc, pageStates, scale]);

  // Global window mousemove & mouseup listeners for fluid dragging & resizing anywhere on screen
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      // Handle Hand/Pan scrolling
      if (isPanning && containerRef.current) {
        const deltaX = e.clientX - panStart.x;
        const deltaY = e.clientY - panStart.y;
        containerRef.current.scrollLeft = scrollStart.x - deltaX;
        containerRef.current.scrollTop = scrollStart.y - deltaY;
        return;
      }

      // Handle Annotation Dragging
      if (draggingAnnId) {
        const pageEl = document.getElementById(`page-wrapper-${activePageIndex}`);
        if (pageEl) {
          const rect = pageEl.getBoundingClientRect();
          const newX = Math.max(0, Math.min(95, ((e.clientX - rect.left) / rect.width) * 100 - dragOffset.x));
          const newY = Math.max(0, Math.min(95, ((e.clientY - rect.top) / rect.height) * 100 - dragOffset.y));

          setAnnotations(prev =>
            prev.map(ann => (ann.id === draggingAnnId ? { ...ann, x: newX, y: newY } : ann))
          );
        }
      }

      // Handle Signature Resizing
      if (resizingAnnId) {
        const pageEl = document.getElementById(`page-wrapper-${activePageIndex}`);
        const pageWidth = pageEl?.clientWidth || 800;
        const deltaX = ((e.clientX - resizeStartX) / pageWidth) * 100;
        const newW = Math.max(5, Math.min(80, resizeStartWidth + deltaX));

        setAnnotations(prev =>
          prev.map(ann => {
            if (ann.id === resizingAnnId) {
              return { ...ann, width: newW, height: undefined };
            }
            return ann;
          })
        );
      }
    };

    const handleGlobalMouseUp = () => {
      setIsPanning(false);
      setDraggingAnnId(null);
      setResizingAnnId(null);
    };

    if (isPanning || draggingAnnId || resizingAnnId) {
      window.addEventListener('mousemove', handleGlobalMouseMove);
      window.addEventListener('mouseup', handleGlobalMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isPanning, draggingAnnId, resizingAnnId, panStart, scrollStart, dragOffset, activePageIndex, resizeStartX, resizeStartWidth]);

  if (!pdfDoc) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-acrobat-bg select-none">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-gray-200 shadow-xl text-center flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-red-100 text-acrobat-red rounded-full flex items-center justify-center shadow-inner">
            <PenTool className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-gray-800">No Document Uploaded</h3>
          <p className="text-sm text-gray-500">
            Upload a PDF file using the top menu bar to view, edit, sign, split, and download your document.
          </p>
        </div>
      </div>
    );
  }

  // Pan tool mouse down
  const handlePanMouseDown = (e: React.MouseEvent) => {
    if (activeTool === 'hand' && containerRef.current) {
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      setScrollStart({ x: containerRef.current.scrollLeft, y: containerRef.current.scrollTop });
    }
  };

  // Handle page click to place text, signature, or edit existing PDF text
  const handlePageClick = async (e: React.MouseEvent<HTMLDivElement>, originalPageIndex: number) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const xPercent = ((e.clientX - rect.left) / rect.width) * 100;
    const yPercent = ((e.clientY - rect.top) / rect.height) * 100;

    if (activeTool === 'text') {
      const newAnn: AnnotationItem = {
        id: 'ann-' + Date.now(),
        pageIndex: originalPageIndex,
        type: 'text',
        x: Math.max(0, Math.min(90, xPercent)),
        y: Math.max(0, Math.min(95, yPercent)),
        content: 'Type text here',
        fontSize: fontSize,
        color: currentColor,
      };

      setAnnotations(prev => [...prev, newAnn]);
      setSelectedAnnId(newAnn.id);
    } else if (activeTool === 'edit-text') {
      // Interactive PDF Text Editing & Redaction
      let targetContent = 'Edited text';
      let fontSz = fontSize;
      let whiteoutW = 20;
      let whiteoutH = 3;
      let matchX = Math.max(0, Math.min(85, xPercent));
      let matchY = Math.max(0, Math.min(95, yPercent));

      if (pdfDoc) {
        try {
          const page = await pdfDoc.getPage(originalPageIndex + 1);
          const textContent = await page.getTextContent();
          const viewport = page.getViewport({ scale: 1 });

          // Find text item containing click coordinates
          const clickPdfX = (xPercent / 100) * viewport.width;
          const clickPdfY = (1 - yPercent / 100) * viewport.height;

          for (const item of textContent.items as any[]) {
            if (item.str && item.transform) {
              const itemX = item.transform[4];
              const itemY = item.transform[5];
              const itemWidth = item.width || 50;
              const itemHeight = Math.abs(item.transform[0] || item.transform[3] || 12);

              if (
                clickPdfX >= itemX - 5 &&
                clickPdfX <= itemX + itemWidth + 10 &&
                clickPdfY >= itemY - 5 &&
                clickPdfY <= itemY + itemHeight + 10
              ) {
                targetContent = item.str;
                fontSz = Math.round(itemHeight);
                whiteoutW = Math.max(10, (itemWidth / viewport.width) * 100 + 2);
                whiteoutH = Math.max(2, (itemHeight / viewport.height) * 100 + 1);
                
                // Align exact position over PDF text
                matchX = (itemX / viewport.width) * 100;
                matchY = (1 - (itemY + itemHeight) / viewport.height) * 100;
                break;
              }
            }
          }
        } catch {
          // Fallback if text extraction fails
        }
      }

      const newAnn: AnnotationItem = {
        id: 'ann-' + Date.now(),
        pageIndex: originalPageIndex,
        type: 'text',
        isExistingText: true,
        whiteoutWidth: whiteoutW,
        whiteoutHeight: whiteoutH,
        x: matchX,
        y: matchY,
        content: targetContent,
        fontSize: fontSz,
        color: currentColor,
      };

      setAnnotations(prev => [...prev, newAnn]);
      setSelectedAnnId(newAnn.id);
      setActiveTool('select');
    } else if (activeTool === 'signature' && activeSignature) {
      const newAnn: AnnotationItem = {
        id: 'ann-' + Date.now(),
        pageIndex: originalPageIndex,
        type: 'signature',
        x: Math.max(0, Math.min(75, xPercent - 12)),
        y: Math.max(0, Math.min(90, yPercent - 5)),
        width: 25,
        signatureUrl: activeSignature.dataUrl,
      };

      setAnnotations(prev => [...prev, newAnn]);
      setSelectedAnnId(newAnn.id);
      setActiveTool('select');
    }
  };

  // Freehand drawing handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>, originalPageIndex: number) => {
    if (activeTool === 'draw' || activeTool === 'highlight') {
      setIsDrawing(true);
      setDrawingPageIndex(originalPageIndex);
      const rect = e.currentTarget.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      setCurrentPath([{ x, y }]);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>, originalPageIndex: number) => {
    if (isDrawing && drawingPageIndex === originalPageIndex) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      setCurrentPath(prev => [...prev, { x, y }]);
    }
  };

  const handleMouseUp = () => {
    if (isDrawing && drawingPageIndex !== null && currentPath.length > 1) {
      const newAnn: AnnotationItem = {
        id: 'ann-' + Date.now(),
        pageIndex: drawingPageIndex,
        type: activeTool === 'highlight' ? 'highlight' : 'draw',
        x: 0,
        y: 0,
        points: currentPath,
        color: activeTool === 'highlight' ? '#EAB308' : currentColor,
        strokeWidth: strokeWidth,
        opacity: activeTool === 'highlight' ? 0.35 : 1,
      };

      setAnnotations(prev => [...prev, newAnn]);
    }

    setIsDrawing(false);
    setCurrentPath([]);
    setDrawingPageIndex(null);
  };

  // Start dragging annotation
  const startDragAnnotation = (e: React.MouseEvent, ann: AnnotationItem) => {
    e.stopPropagation();
    e.preventDefault();
    if (activeTool !== 'select' && ann.type !== 'signature') return;
    
    setDraggingAnnId(ann.id);
    setSelectedAnnId(ann.id);

    const rect = e.currentTarget.parentElement?.getBoundingClientRect();
    if (rect) {
      const clickX = ((e.clientX - rect.left) / rect.width) * 100;
      const clickY = ((e.clientY - rect.top) / rect.height) * 100;
      setDragOffset({ x: clickX - ann.x, y: clickY - ann.y });
    }
  };

  // Start resizing annotation
  const startResizeAnnotation = (e: React.MouseEvent, ann: AnnotationItem) => {
    e.stopPropagation();
    e.preventDefault();
    setResizingAnnId(ann.id);
    setResizeStartWidth(ann.width || 25);
    setResizeStartX(e.clientX);
  };

  // Delete annotation
  const deleteAnnotation = (id: string) => {
    setAnnotations(prev => prev.filter(ann => ann.id !== id));
    if (selectedAnnId === id) setSelectedAnnId(null);
  };

  // Rotate annotation
  const rotateAnnotation = (id: string) => {
    setAnnotations(prev =>
      prev.map(ann => (ann.id === id ? { ...ann, rotation: ((ann.rotation || 0) + 90) % 360 } : ann))
    );
  };

  return (
    <div
      ref={containerRef}
      onMouseDown={handlePanMouseDown}
      onMouseUp={handleMouseUp}
      className={`flex-1 overflow-auto bg-acrobat-bg p-8 flex flex-col items-center gap-8 select-none ${
        activeTool === 'hand' ? (isPanning ? 'cursor-grabbing' : 'cursor-grab') : ''
      }`}
    >
      {pageStates.map((page, index) => {
        if (page.deleted) return null;

        const pageAnns = annotations.filter(a => a.pageIndex === page.originalIndex);

        return (
          <div
            key={page.id}
            id={`page-wrapper-${index}`}
            onClick={() => setActivePageIndex(index)}
            className={`relative bg-white shadow-2xl rounded-lg transition-all border ${
              activePageIndex === index ? 'ring-2 ring-acrobat-red border-transparent' : 'border-gray-200'
            }`}
          >
            {/* Base Render Canvas */}
            <canvas id={`pdf-canvas-${index}`} className="block rounded-lg pointer-events-none" />

            {/* Overlay Layer for Interactivity & Annotations */}
            <div
              onClick={(e) => handlePageClick(e, page.originalIndex)}
              onMouseDown={(e) => handleMouseDown(e, page.originalIndex)}
              onMouseMove={(e) => handleMouseMove(e, page.originalIndex)}
              className="absolute inset-0 z-10 overflow-hidden"
              style={{
                cursor:
                  activeTool === 'text' || activeTool === 'edit-text'
                    ? 'text'
                    : activeTool === 'signature'
                    ? 'crosshair'
                    : activeTool === 'draw' || activeTool === 'highlight'
                    ? 'crosshair'
                    : activeTool === 'eraser'
                    ? 'pointer'
                    : activeTool === 'hand'
                    ? 'grab'
                    : 'default',
              }}
            >
              {/* Render Existing Annotations for this Page */}
              {pageAnns.map((ann) => {
                const isSelected = selectedAnnId === ann.id;

                if (ann.type === 'text') {
                  const inputWidth = Math.max(8, (ann.content?.length || 1) + 2);
                  return (
                    <div
                      key={ann.id}
                      onMouseDown={(e) => startDragAnnotation(e, ann)}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (activeTool === 'eraser') deleteAnnotation(ann.id);
                        else setSelectedAnnId(ann.id);
                      }}
                      style={{
                        left: `${ann.x}%`,
                        top: `${ann.y}%`,
                        fontSize: `${(ann.fontSize || 16) * scale}px`,
                        color: ann.color || '#000000',
                      }}
                      className={`absolute group transition-all flex items-center gap-1 ${
                        ann.isExistingText 
                          ? 'bg-white px-0.5 py-0 border-none outline-none shadow-none z-20' 
                          : isSelected 
                          ? 'ring-2 ring-blue-500 bg-blue-50/70 shadow-sm rounded px-1' 
                          : 'hover:ring-1 hover:ring-gray-300 rounded px-1'
                      }`}
                    >
                      <input
                        type="text"
                        autoFocus={ann.isExistingText}
                        value={ann.content || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setAnnotations(prev =>
                            prev.map(a => (a.id === ann.id ? { ...a, content: val } : a))
                          );
                        }}
                        style={{
                          width: `${inputWidth}ch`,
                          color: ann.color || '#000000',
                          lineHeight: '1.1',
                        }}
                        className="bg-white border-none outline-none font-sans font-medium p-0 m-0 leading-none focus:ring-1 focus:ring-blue-400 rounded-sm"
                      />
                      {isSelected && !ann.isExistingText && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteAnnotation(ann.id);
                          }}
                          className="text-red-500 hover:text-red-700 p-0.5 rounded"
                          title="Delete Text"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                }

                if (ann.type === 'signature' && ann.signatureUrl) {
                  return (
                    <div
                      key={ann.id}
                      onMouseDown={(e) => startDragAnnotation(e, ann)}
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        if (activeTool === 'eraser') deleteAnnotation(ann.id);
                        else setSelectedAnnId(ann.id);
                      }}
                      style={{
                        left: `${ann.x}%`,
                        top: `${ann.y}%`,
                        width: `${ann.width || 25}%`,
                        transform: `rotate(${ann.rotation || 0}deg)`,
                      }}
                      className={`absolute group cursor-move p-1 rounded transition-all ${
                        isSelected ? 'ring-2 ring-blue-500 bg-blue-50/30 shadow-md' : 'hover:ring-1 hover:ring-blue-300'
                      }`}
                    >
                      <img
                        src={ann.signatureUrl}
                        alt="eSignature"
                        className="w-full h-auto object-contain pointer-events-none select-none"
                      />
                      {isSelected && (
                        <>
                          {/* Rotate Handle */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              rotateAnnotation(ann.id);
                            }}
                            className="absolute -top-2 -left-2 bg-blue-600 text-white rounded-full p-1 shadow-md hover:bg-blue-700 hover:scale-110 transition-transform z-20"
                            title="Rotate Signature 90°"
                          >
                            <RotateCw className="w-3 h-3" />
                          </button>
                          {/* Delete Handle */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteAnnotation(ann.id);
                            }}
                            className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 shadow-md hover:bg-red-700 transition-colors z-20"
                            title="Delete Signature"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                          {/* Resize Handle */}
                          <div
                            onMouseDown={(e) => startResizeAnnotation(e, ann)}
                            onClick={(e) => e.stopPropagation()}
                            className="absolute -bottom-1.5 -right-1.5 bg-blue-600 text-white rounded-full p-1 cursor-se-resize shadow-md hover:scale-110 transition-transform z-20"
                            title="Resize Signature"
                          >
                            <Scaling className="w-3 h-3" />
                          </div>
                        </>
                      )}
                    </div>
                  );
                }

                if ((ann.type === 'draw' || ann.type === 'highlight') && ann.points) {
                  return (
                    <svg
                      key={ann.id}
                      onClick={(e) => {
                        if (activeTool === 'eraser') {
                          e.stopPropagation();
                          deleteAnnotation(ann.id);
                        }
                      }}
                      className="absolute inset-0 w-full h-full pointer-events-auto cursor-pointer"
                    >
                      {/* Invisible wider hit-testing polyline for easy erasing */}
                      <polyline
                        points={ann.points.map(p => `${p.x}%,${p.y}%`).join(' ')}
                        fill="none"
                        stroke="transparent"
                        strokeWidth={(ann.strokeWidth || 16) * scale * 2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      {/* Visual polyline */}
                      <polyline
                        points={ann.points.map(p => `${p.x}%,${p.y}%`).join(' ')}
                        fill="none"
                        stroke={ann.color || (ann.type === 'highlight' ? '#EAB308' : '#000000')}
                        strokeWidth={(ann.strokeWidth || 3) * scale}
                        strokeOpacity={ann.opacity ?? (ann.type === 'highlight' ? 0.4 : 1)}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  );
                }

                return null;
              })}

              {/* Active Freehand Drawing Preview */}
              {isDrawing && drawingPageIndex === page.originalIndex && currentPath.length > 1 && (
                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                  <polyline
                    points={currentPath.map(p => `${p.x}%,${p.y}%`).join(' ')}
                    fill="none"
                    stroke={activeTool === 'highlight' ? '#EAB308' : currentColor}
                    strokeWidth={(strokeWidth || 3) * scale}
                    strokeOpacity={activeTool === 'highlight' ? 0.4 : 1}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
