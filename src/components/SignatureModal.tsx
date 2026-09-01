'use client';

import React, { useState, useRef, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { SavedSignature } from '../types/pdf';
import { loadPDFDocument, renderPDFPage } from '../utils/pdfRenderer';
import { X, PenTool, Type, Upload, FileText, Scissors, Trash2, Check, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';

interface SignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveSignature: (sig: SavedSignature) => void;
  savedSignatures: SavedSignature[];
  onDeleteSignature: (id: string) => void;
}

export const SignatureModal: React.FC<SignatureModalProps> = ({
  isOpen,
  onClose,
  onSaveSignature,
  savedSignatures,
  onDeleteSignature,
}) => {
  const [activeTab, setActiveTab] = useState<'draw' | 'type' | 'upload' | 'pdf'>('draw');
  
  // Draw tab state
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [penColor, setPenColor] = useState('#000000');

  // Type tab state
  const [typedName, setTypedName] = useState('John Doe');
  const [selectedFont, setSelectedFont] = useState<'cursive' | 'serif' | 'monospace'>('cursive');

  // Upload tab state
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);

  // PDF Extraction tab state
  const pdfCanvasRef = useRef<HTMLCanvasElement>(null);
  const pdfContainerRef = useRef<HTMLDivElement>(null);
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [pdfFileName, setPdfFileName] = useState<string | null>(null);
  const [pdfPageNum, setPdfPageNum] = useState<number>(1);
  const [numPdfPages, setNumPdfPages] = useState<number>(1);
  
  // PDF Crop Selection Box State
  const [isSelectingRect, setIsSelectingRect] = useState(false);
  const [cropStart, setCropStart] = useState<{ x: number; y: number } | null>(null);
  const [cropRect, setCropRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [extractedPdfSignature, setExtractedPdfSignature] = useState<string | null>(null);

  // Initialize Canvas dimensions ONCE when modal opens or tab changes
  useEffect(() => {
    if (isOpen && activeTab === 'draw' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const ratio = window.devicePixelRatio || 2;
        canvas.width = 450 * ratio;
        canvas.height = 170 * ratio;
        ctx.scale(ratio, ratio);
        ctx.strokeStyle = penColor;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        setHasDrawn(false);
      }
    }
  }, [isOpen, activeTab]);

  // Dynamically update stroke color without clearing drawn pixels
  useEffect(() => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = penColor;
      }
    }
  }, [penColor]);

  // Render PDF Page when PDF tab active or page number changes
  useEffect(() => {
    if (activeTab === 'pdf' && pdfDoc && pdfCanvasRef.current) {
      renderPDFPage(pdfDoc, pdfPageNum, pdfCanvasRef.current, 1.1);
      setCropRect(null);
    }
  }, [activeTab, pdfDoc, pdfPageNum]);

  if (!isOpen) return null;

  // Drawing pad handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    setHasDrawn(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    const scaleX = 450 / (rect.width || 450);
    const scaleY = 170 / (rect.height || 170);
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    ctx?.beginPath();
    ctx?.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const scaleX = 450 / (rect.width || 450);
    const scaleY = 170 / (rect.height || 170);
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    ctx?.lineTo(x, y);
    ctx?.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  // Convert Typed signature to Data URL with High Resolution
  const generateTypedSignatureDataUrl = (): string => {
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 200;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    ctx.fillStyle = penColor;
    if (selectedFont === 'cursive') {
      ctx.font = 'italic 56px "Brush Script MT", cursive, sans-serif';
    } else if (selectedFont === 'serif') {
      ctx.font = 'italic 50px Georgia, serif';
    } else {
      ctx.font = 'bold 44px "Courier New", monospace';
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(typedName, canvas.width / 2, canvas.height / 2);
    return canvas.toDataURL('image/png');
  };

  // Upload image handler with automatic white-background transparency processing
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return;

          ctx.drawImage(img, 0, 0);
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imgData.data;

          // Convert near-white background pixels to transparent alpha
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            if (r > 220 && g > 220 && b > 220) {
              data[i + 3] = 0; // set alpha = 0
            }
          }

          ctx.putImageData(imgData, 0, 0);
          setUploadedImage(canvas.toDataURL('image/png'));
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  // Handle PDF file upload in PDF tab
  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPdfFileName(file.name);
      try {
        const buffer = await file.arrayBuffer();
        const doc = await loadPDFDocument(buffer);
        setPdfDoc(doc);
        setPdfPageNum(1);
        setNumPdfPages(doc.numPages);
        setCropRect(null);
        setExtractedPdfSignature(null);
      } catch (err) {
        console.error('Failed to load PDF file for signature extraction:', err);
      }
    }
  };

  // PDF Crop Rectangle Handlers
  const handlePdfMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const canvas = pdfCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setIsSelectingRect(true);
    setCropStart({ x, y });
    setCropRect({ x, y, width: 0, height: 0 });
  };

  const handlePdfMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isSelectingRect || !cropStart || !pdfCanvasRef.current) return;
    const canvas = pdfCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const currentX = Math.max(0, Math.min(canvas.width, e.clientX - rect.left));
    const currentY = Math.max(0, Math.min(canvas.height, e.clientY - rect.top));

    const x = Math.min(cropStart.x, currentX);
    const y = Math.min(cropStart.y, currentY);
    const width = Math.abs(currentX - cropStart.x);
    const height = Math.abs(currentY - cropStart.y);

    setCropRect({ x, y, width, height });
  };

  const handlePdfMouseUp = () => {
    setIsSelectingRect(false);
    if (cropRect && (cropRect.width < 10 || cropRect.height < 10)) {
      setCropRect(null);
    } else if (cropRect) {
      cropAndExtractPdfSignature(cropRect);
    }
  };

  // Crop selected area from PDF canvas & apply background transparency
  const cropAndExtractPdfSignature = (rect: { x: number; y: number; width: number; height: number }) => {
    const pdfCanvas = pdfCanvasRef.current;
    if (!pdfCanvas || rect.width < 5 || rect.height < 5) return;

    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = rect.width;
    cropCanvas.height = rect.height;
    const cropCtx = cropCanvas.getContext('2d');
    if (!cropCtx) return;

    // Draw cropped portion of rendered PDF page
    cropCtx.drawImage(
      pdfCanvas,
      rect.x, rect.y, rect.width, rect.height,
      0, 0, rect.width, rect.height
    );

    // Auto-convert white/light paper background to transparent PNG
    const imgData = cropCtx.getImageData(0, 0, cropCanvas.width, cropCanvas.height);
    const data = imgData.data;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      if (r > 215 && g > 215 && b > 215) {
        data[i + 3] = 0; // set alpha = 0
      }
    }

    cropCtx.putImageData(imgData, 0, 0);
    setExtractedPdfSignature(cropCanvas.toDataURL('image/png'));
  };

  const handleSave = () => {
    let dataUrl = '';

    if (activeTab === 'draw') {
      if (!canvasRef.current || !hasDrawn) return;
      dataUrl = canvasRef.current.toDataURL('image/png');
    } else if (activeTab === 'type') {
      if (!typedName.trim()) return;
      dataUrl = generateTypedSignatureDataUrl();
    } else if (activeTab === 'upload') {
      if (!uploadedImage) return;
      dataUrl = uploadedImage;
    } else if (activeTab === 'pdf') {
      if (!extractedPdfSignature) return;
      dataUrl = extractedPdfSignature;
    }

    if (dataUrl) {
      onSaveSignature({
        id: 'sig-' + Date.now(),
        dataUrl,
        type: activeTab === 'pdf' ? 'upload' : activeTab,
        name: activeTab === 'type' ? typedName : `Signature (${activeTab.toUpperCase()})`,
      });
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto flex flex-col border border-gray-200 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-acrobat-red" />
            <h3 className="font-bold text-gray-800 text-base sm:text-lg">Create eSignature</h3>
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
            onClick={() => setActiveTab('draw')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all ${
              activeTab === 'draw'
                ? 'bg-white text-acrobat-red shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <PenTool className="w-4 h-4" />
            <span>Draw</span>
          </button>

          <button
            onClick={() => setActiveTab('type')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all ${
              activeTab === 'type'
                ? 'bg-white text-acrobat-red shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Type className="w-4 h-4" />
            <span>Type</span>
          </button>

          <button
            onClick={() => setActiveTab('upload')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all ${
              activeTab === 'upload'
                ? 'bg-white text-acrobat-red shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Upload</span>
          </button>

          <button
            onClick={() => setActiveTab('pdf')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all ${
              activeTab === 'pdf'
                ? 'bg-white text-acrobat-red shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Extract PDF</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-6 flex-1 flex flex-col justify-center">
          {/* DRAW TAB */}
          {activeTab === 'draw' && (
            <div className="flex flex-col items-center gap-3">
              <div className="w-full h-44 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 relative overflow-hidden flex items-center justify-center cursor-crosshair">
                <canvas
                  ref={canvasRef}
                  style={{ width: '100%', height: '170px', maxWidth: '450px' }}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full h-full"
                />
                {!hasDrawn && (
                  <span className="absolute text-sm text-gray-400 font-medium pointer-events-none">
                    Draw your signature here
                  </span>
                )}
              </div>

              <div className="w-full flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-500">Color:</span>
                  {['#000000', '#1E40AF', '#B91C1C'].map(c => (
                    <button
                      key={c}
                      onClick={() => setPenColor(c)}
                      className={`w-5 h-5 rounded-full border border-gray-300 transition-transform ${
                        penColor === c ? 'scale-125 ring-2 ring-blue-400' : ''
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>

                <button
                  onClick={clearCanvas}
                  className="text-xs text-red-600 font-semibold hover:underline"
                >
                  Clear Pad
                </button>
              </div>
            </div>
          )}

          {/* TYPE TAB */}
          {activeTab === 'type' && (
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Full Name</label>
                <input
                  type="text"
                  value={typedName}
                  onChange={(e) => setTypedName(e.target.value)}
                  placeholder="Enter name..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-acrobat-red"
                />
              </div>

              <div className="w-full h-28 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-center p-4">
                <span 
                  className="text-3xl text-gray-900 transition-all truncate"
                  style={{
                    fontFamily: selectedFont === 'cursive' ? '"Brush Script MT", cursive' : selectedFont === 'serif' ? 'Georgia, serif' : 'monospace',
                    fontStyle: selectedFont !== 'monospace' ? 'italic' : 'normal',
                  }}
                >
                  {typedName || 'Your Signature'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {(['cursive', 'serif', 'monospace'] as const).map(font => (
                  <button
                    key={font}
                    onClick={() => setSelectedFont(font)}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                      selectedFont === font
                        ? 'border-acrobat-red text-acrobat-red bg-red-50'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {font.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* UPLOAD TAB */}
          {activeTab === 'upload' && (
            <div className="flex flex-col items-center gap-3">
              <label className="w-full h-44 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 hover:border-acrobat-red flex flex-col items-center justify-center cursor-pointer transition-colors p-4">
                {uploadedImage ? (
                  <img src={uploadedImage} alt="Uploaded Signature" className="max-h-36 object-contain" />
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-gray-400 mb-2" />
                    <span className="text-sm font-semibold text-gray-700">Click to upload signature image</span>
                    <span className="text-xs text-gray-400 mt-1">White backgrounds auto-converted to transparent PNG</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/png, image/jpeg"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            </div>
          )}

          {/* EXTRACT FROM PDF TAB */}
          {activeTab === 'pdf' && (
            <div className="flex flex-col gap-3">
              {!pdfDoc ? (
                <label className="w-full h-48 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 hover:border-acrobat-red flex flex-col items-center justify-center cursor-pointer transition-colors p-4">
                  <Scissors className="w-8 h-8 text-gray-400 mb-2" />
                  <span className="text-sm font-semibold text-gray-700">Upload PDF to crop out signature</span>
                  <span className="text-xs text-gray-400 mt-1">Drag selection box over any signature area to extract</span>
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={handlePdfUpload}
                    className="hidden"
                  />
                </label>
              ) : (
                <div className="flex flex-col gap-2">
                  {/* Controls header */}
                  <div className="flex items-center justify-between bg-gray-100 px-3 py-1.5 rounded-lg text-xs">
                    <span className="font-semibold text-gray-700 truncate max-w-[180px]">{pdfFileName}</span>
                    
                    <div className="flex items-center gap-2">
                      <button
                        disabled={pdfPageNum <= 1}
                        onClick={() => setPdfPageNum(p => Math.max(1, p - 1))}
                        className="p-1 disabled:opacity-30 hover:bg-gray-200 rounded"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="font-bold text-gray-600">Page {pdfPageNum} of {numPdfPages}</span>
                      <button
                        disabled={pdfPageNum >= numPdfPages}
                        onClick={() => setPdfPageNum(p => Math.min(numPdfPages, p + 1))}
                        className="p-1 disabled:opacity-30 hover:bg-gray-200 rounded"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>

                    <label className="text-acrobat-red font-bold hover:underline cursor-pointer">
                      Change PDF
                      <input type="file" accept="application/pdf" onChange={handlePdfUpload} className="hidden" />
                    </label>
                  </div>

                  <p className="text-xs text-gray-500 font-medium text-center">
                    Drag a rectangle over the signature on the page to crop it:
                  </p>

                  {/* Interactive Crop Canvas Viewport */}
                  <div
                    ref={pdfContainerRef}
                    onMouseDown={handlePdfMouseDown}
                    onMouseMove={handlePdfMouseMove}
                    onMouseUp={handlePdfMouseUp}
                    className="relative border border-gray-300 rounded-xl overflow-auto max-h-[220px] flex justify-center bg-gray-200 cursor-crosshair select-none"
                  >
                    <canvas ref={pdfCanvasRef} className="block shadow-md max-w-full h-auto" />
                    
                    {/* Render active Crop Selection Box */}
                    {cropRect && (
                      <div
                        style={{
                          left: `${cropRect.x}px`,
                          top: `${cropRect.y}px`,
                          width: `${cropRect.width}px`,
                          height: `${cropRect.height}px`,
                        }}
                        className="absolute border-2 border-blue-600 bg-blue-500/20 shadow-lg pointer-events-none"
                      >
                        <span className="absolute -top-5 left-0 bg-blue-600 text-white text-[10px] px-1 rounded font-bold">
                          Signature Area
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Extracted Signature Preview */}
                  {extractedPdfSignature && (
                    <div className="flex items-center gap-3 bg-green-50 border border-green-200 p-2 rounded-xl">
                      <div className="w-20 h-10 bg-white border border-gray-200 rounded flex items-center justify-center p-1 overflow-hidden">
                        <img src={extractedPdfSignature} alt="Extracted Signature" className="max-h-full max-w-full object-contain" />
                      </div>
                      <div className="flex-1">
                        <span className="text-xs font-bold text-green-800 block">Signature Extracted!</span>
                        <span className="text-[11px] text-green-600">Background automatically converted to transparent PNG.</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Existing Saved Signatures List */}
        {savedSignatures.length > 0 && (
          <div className="px-6 pb-4 border-t border-gray-100 pt-3">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">
              Saved Signatures
            </span>
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {savedSignatures.map((sig) => (
                <div
                  key={sig.id}
                  className="group relative flex-shrink-0 bg-gray-50 border border-gray-200 rounded-lg p-2 flex items-center justify-center hover:border-blue-400"
                >
                  <img src={sig.dataUrl} alt={sig.name} className="h-8 object-contain max-w-[100px]" />
                  <button
                    onClick={() => onDeleteSignature(sig.id)}
                    className="absolute -top-1.5 -right-1.5 bg-red-600 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={
              (activeTab === 'draw' && !hasDrawn) ||
              (activeTab === 'type' && !typedName.trim()) ||
              (activeTab === 'upload' && !uploadedImage) ||
              (activeTab === 'pdf' && !extractedPdfSignature)
            }
            className="flex items-center gap-1.5 px-5 py-2 text-sm font-bold text-white bg-acrobat-red hover:bg-acrobat-darkRed disabled:opacity-40 rounded-xl shadow-md transition-all"
          >
            <Check className="w-4 h-4" />
            <span>Create & Apply</span>
          </button>
        </div>
      </div>
    </div>
  );
};
