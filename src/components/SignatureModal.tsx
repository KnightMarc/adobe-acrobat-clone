'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { SavedSignature } from '../types/pdf';
import { loadPDFDocument, renderPDFPage } from '../utils/pdfRenderer';
import {
  X,
  PenTool,
  Type,
  Upload,
  Scissors,
  Trash2,
  Check,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RefreshCw,
  CheckCircle2,
  FileSpreadsheet
} from 'lucide-react';

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
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [pdfFileName, setPdfFileName] = useState<string | null>(null);
  const [pdfPageNum, setPdfPageNum] = useState<number>(1);
  const [numPdfPages, setNumPdfPages] = useState<number>(1);
  const [pdfScale, setPdfScale] = useState<number>(1.35);
  const [isRenderingPdf, setIsRenderingPdf] = useState<boolean>(false);

  // PDF Crop Selection Box State
  const [isSelectingRect, setIsSelectingRect] = useState(false);
  const [cropStart, setCropStart] = useState<{ x: number; y: number } | null>(null);
  const [cropRect, setCropRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [extractedPdfSignature, setExtractedPdfSignature] = useState<string | null>(null);

  // PDF Extraction Enhancements
  const [signatureName, setSignatureName] = useState<string>('');
  const [removeBackground, setRemoveBackground] = useState<boolean>(true);
  const [enhanceInk, setEnhanceInk] = useState<boolean>(true);

  // Initialize Drawing Canvas dimensions ONCE when modal opens or tab changes to draw
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

  // Render PDF Page when PDF tab active, page number, or scale changes
  useEffect(() => {
    let isCancelled = false;
    if (isOpen && activeTab === 'pdf' && pdfDoc && pdfCanvasRef.current) {
      setIsRenderingPdf(true);
      renderPDFPage(pdfDoc, pdfPageNum, pdfCanvasRef.current, pdfScale).then(() => {
        if (!isCancelled) {
          setIsRenderingPdf(false);
        }
      });
    }
    return () => {
      isCancelled = true;
    };
  }, [isOpen, activeTab, pdfDoc, pdfPageNum, pdfScale]);

  // Crop selected area from PDF canvas & apply background transparency
  const cropAndExtractPdfSignature = useCallback(
    (rect: { x: number; y: number; width: number; height: number }) => {
      const canvas = pdfCanvasRef.current;
      if (!canvas || rect.width < 5 || rect.height < 5) return;

      const clientRect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / (clientRect.width || 1);
      const scaleY = canvas.height / (clientRect.height || 1);

      const pixelX = Math.round(rect.x * scaleX);
      const pixelY = Math.round(rect.y * scaleY);
      const pixelW = Math.round(rect.width * scaleX);
      const pixelH = Math.round(rect.height * scaleY);

      if (pixelW <= 0 || pixelH <= 0) return;

      const cropCanvas = document.createElement('canvas');
      cropCanvas.width = pixelW;
      cropCanvas.height = pixelH;
      const cropCtx = cropCanvas.getContext('2d');
      if (!cropCtx) return;

      // High-resolution crop from rendered canvas
      cropCtx.drawImage(
        canvas,
        pixelX,
        pixelY,
        pixelW,
        pixelH,
        0,
        0,
        pixelW,
        pixelH
      );

      if (removeBackground) {
        const imgData = cropCtx.getImageData(0, 0, cropCanvas.width, cropCanvas.height);
        const data = imgData.data;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          // Threshold for paper background transparency
          if (r > 215 && g > 215 && b > 215) {
            data[i + 3] = 0; // Alpha transparent
          } else if (enhanceInk) {
            // Sharpen/darken ink stroke
            data[i] = Math.max(0, Math.floor(r * 0.7));
            data[i + 1] = Math.max(0, Math.floor(g * 0.7));
            data[i + 2] = Math.max(0, Math.floor(b * 0.7));
          }
        }
        cropCtx.putImageData(imgData, 0, 0);
      }

      const dataUrl = cropCanvas.toDataURL('image/png');
      setExtractedPdfSignature(dataUrl);

      if (!signatureName && pdfFileName) {
        const baseName = pdfFileName.replace(/\.[^/.]+$/, '');
        setSignatureName(`${baseName} Sig (p.${pdfPageNum})`);
      }
    },
    [removeBackground, enhanceInk, signatureName, pdfFileName, pdfPageNum]
  );

  // Re-extract when options change if crop box is present
  useEffect(() => {
    if (cropRect) {
      cropAndExtractPdfSignature(cropRect);
    }
  }, [removeBackground, enhanceInk, cropAndExtractPdfSignature]);

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
        const baseName = file.name.replace(/\.[^/.]+$/, '');
        setSignatureName(`${baseName} Signature`);
      } catch (err) {
        console.error('Failed to load PDF file for signature extraction:', err);
      }
    }
  };

  // PDF Crop Coordinates Handlers
  const handlePdfMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const canvas = pdfCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const rawX = e.clientX - rect.left;
    const rawY = e.clientY - rect.top;
    const x = Math.max(0, Math.min(rect.width, rawX));
    const y = Math.max(0, Math.min(rect.height, rawY));

    setIsSelectingRect(true);
    setCropStart({ x, y });
    setCropRect({ x, y, width: 0, height: 0 });
  };

  const handlePdfMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isSelectingRect || !cropStart || !pdfCanvasRef.current) return;
    const canvas = pdfCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const currentX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const currentY = Math.max(0, Math.min(rect.height, e.clientY - rect.top));

    const x = Math.min(cropStart.x, currentX);
    const y = Math.min(cropStart.y, currentY);
    const width = Math.abs(currentX - cropStart.x);
    const height = Math.abs(currentY - cropStart.y);

    setCropRect({ x, y, width, height });
  };

  const handlePdfMouseUp = () => {
    if (!isSelectingRect) return;
    setIsSelectingRect(false);
    if (cropRect && (cropRect.width < 10 || cropRect.height < 10)) {
      setCropRect(null);
    } else if (cropRect) {
      cropAndExtractPdfSignature(cropRect);
    }
  };

  // Touch support for PDF crop
  const handlePdfTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const canvas = pdfCanvasRef.current;
    if (!canvas || e.touches.length !== 1) return;
    const rect = canvas.getBoundingClientRect();
    const rawX = e.touches[0].clientX - rect.left;
    const rawY = e.touches[0].clientY - rect.top;
    const x = Math.max(0, Math.min(rect.width, rawX));
    const y = Math.max(0, Math.min(rect.height, rawY));

    setIsSelectingRect(true);
    setCropStart({ x, y });
    setCropRect({ x, y, width: 0, height: 0 });
  };

  const handlePdfTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isSelectingRect || !cropStart || !pdfCanvasRef.current || e.touches.length !== 1) return;
    const canvas = pdfCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const currentX = Math.max(0, Math.min(rect.width, e.touches[0].clientX - rect.left));
    const currentY = Math.max(0, Math.min(rect.height, e.touches[0].clientY - rect.top));

    const x = Math.min(cropStart.x, currentX);
    const y = Math.min(cropStart.y, currentY);
    const width = Math.abs(currentX - cropStart.x);
    const height = Math.abs(currentY - cropStart.y);

    setCropRect({ x, y, width, height });
  };

  const handleSave = () => {
    let dataUrl = '';
    let name = '';

    if (activeTab === 'draw') {
      if (!canvasRef.current || !hasDrawn) return;
      dataUrl = canvasRef.current.toDataURL('image/png');
      name = 'Drawn Signature';
    } else if (activeTab === 'type') {
      if (!typedName.trim()) return;
      dataUrl = generateTypedSignatureDataUrl();
      name = typedName.trim();
    } else if (activeTab === 'upload') {
      if (!uploadedImage) return;
      dataUrl = uploadedImage;
      name = 'Uploaded Signature';
    } else if (activeTab === 'pdf') {
      if (!extractedPdfSignature) return;
      dataUrl = extractedPdfSignature;
      name = signatureName.trim() || `Extracted Signature (p.${pdfPageNum})`;
    }

    if (dataUrl) {
      onSaveSignature({
        id: 'sig-' + Date.now(),
        dataUrl,
        type: activeTab === 'pdf' ? 'upload' : activeTab,
        name,
      });
      onClose();
    }
  };

  const isPdfTabWithDoc = activeTab === 'pdf' && !!pdfDoc;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
      <div
        className={`bg-white rounded-2xl shadow-2xl w-full flex flex-col border border-gray-200 animate-in fade-in zoom-in-95 duration-200 transition-all ${
          isPdfTabWithDoc
            ? 'max-w-6xl w-[96vw] h-[92vh] max-h-[92vh]'
            : 'max-w-xl max-h-[92vh] overflow-y-auto'
        }`}
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-gray-200 flex items-center justify-between bg-gray-50/90 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-red-100 rounded-lg text-acrobat-red">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-base sm:text-lg leading-tight">
                Create & Extract eSignature
              </h3>
              <p className="text-[11px] text-gray-500">
                {activeTab === 'pdf'
                  ? 'Grab signature from another PDF document with precision'
                  : 'Design or upload your personalized signature'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 bg-gray-100/60 p-1.5 flex-shrink-0 gap-1">
          <button
            onClick={() => setActiveTab('draw')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all ${
              activeTab === 'draw'
                ? 'bg-white text-acrobat-red shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
            }`}
          >
            <PenTool className="w-4 h-4" />
            <span>Draw</span>
          </button>

          <button
            onClick={() => setActiveTab('type')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all ${
              activeTab === 'type'
                ? 'bg-white text-acrobat-red shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
            }`}
          >
            <Type className="w-4 h-4" />
            <span>Type</span>
          </button>

          <button
            onClick={() => setActiveTab('upload')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all ${
              activeTab === 'upload'
                ? 'bg-white text-acrobat-red shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Upload</span>
          </button>

          <button
            onClick={() => setActiveTab('pdf')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all ${
              activeTab === 'pdf'
                ? 'bg-white text-acrobat-red shadow-sm ring-1 ring-acrobat-red/20'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
            }`}
          >
            <Scissors className="w-4 h-4 text-acrobat-red" />
            <span>Extract PDF</span>
            <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-red-100 text-acrobat-red">
              PRO
            </span>
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* DRAW TAB */}
          {activeTab === 'draw' && (
            <div className="p-6 flex flex-col items-center gap-4">
              <div className="w-full h-48 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-300 relative overflow-hidden flex items-center justify-center cursor-crosshair shadow-inner">
                <canvas
                  ref={canvasRef}
                  style={{ width: '100%', height: '180px', maxWidth: '480px' }}
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
                  <span className="absolute text-sm text-gray-400 font-medium pointer-events-none select-none">
                    Draw your signature here with your mouse or stylus
                  </span>
                )}
              </div>

              <div className="w-full flex items-center justify-between px-1">
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-bold text-gray-500">Ink Color:</span>
                  {['#000000', '#1E40AF', '#B91C1C'].map((c) => (
                    <button
                      key={c}
                      onClick={() => setPenColor(c)}
                      className={`w-6 h-6 rounded-full border border-gray-300 transition-transform ${
                        penColor === c ? 'scale-125 ring-2 ring-blue-500 shadow' : 'hover:scale-110'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>

                <button
                  onClick={clearCanvas}
                  className="text-xs text-red-600 font-bold hover:text-red-700 hover:underline px-2 py-1"
                >
                  Clear Pad
                </button>
              </div>
            </div>
          )}

          {/* TYPE TAB */}
          {activeTab === 'type' && (
            <div className="p-6 flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold text-gray-700 mb-1.5 block">Full Name</label>
                <input
                  type="text"
                  value={typedName}
                  onChange={(e) => setTypedName(e.target.value)}
                  placeholder="Enter your name..."
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-acrobat-red focus:border-transparent transition-all"
                />
              </div>

              <div className="w-full h-32 bg-gray-50 rounded-2xl border border-gray-200 flex items-center justify-center p-4 shadow-inner">
                <span
                  className="text-3xl text-gray-900 transition-all truncate"
                  style={{
                    fontFamily:
                      selectedFont === 'cursive'
                        ? '"Brush Script MT", cursive'
                        : selectedFont === 'serif'
                        ? 'Georgia, serif'
                        : 'monospace',
                    fontStyle: selectedFont !== 'monospace' ? 'italic' : 'normal',
                  }}
                >
                  {typedName || 'Your Signature'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {(['cursive', 'serif', 'monospace'] as const).map((font) => (
                  <button
                    key={font}
                    onClick={() => setSelectedFont(font)}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-all ${
                      selectedFont === font
                        ? 'border-acrobat-red text-acrobat-red bg-red-50 shadow-sm'
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
            <div className="p-6 flex flex-col items-center gap-3">
              <label className="w-full h-48 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-300 hover:border-acrobat-red flex flex-col items-center justify-center cursor-pointer transition-all p-4 group">
                {uploadedImage ? (
                  <img src={uploadedImage} alt="Uploaded Signature" className="max-h-40 object-contain" />
                ) : (
                  <>
                    <div className="p-3 bg-red-50 text-acrobat-red rounded-full mb-2 group-hover:scale-110 transition-transform">
                      <Upload className="w-6 h-6" />
                    </div>
                    <span className="text-sm font-bold text-gray-800">Click to upload signature image</span>
                    <span className="text-xs text-gray-400 mt-1">PNG, JPG, or JPEG</span>
                    <span className="text-[11px] text-green-600 font-medium mt-1">
                      ✨ White backgrounds automatically converted to transparent PNG
                    </span>
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

          {/* EXTRACT FROM PDF TAB (SIDE-BY-SIDE STUDIO) */}
          {activeTab === 'pdf' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {!pdfDoc ? (
                <div className="p-8 sm:p-12 flex flex-col items-center justify-center h-full">
                  <label className="w-full max-w-xl h-64 bg-gray-50/80 rounded-3xl border-2 border-dashed border-gray-300 hover:border-acrobat-red flex flex-col items-center justify-center cursor-pointer transition-all p-6 group shadow-sm hover:shadow-md">
                    <div className="p-4 bg-red-100/70 text-acrobat-red rounded-2xl mb-3 group-hover:scale-110 transition-transform">
                      <FileSpreadsheet className="w-8 h-8" />
                    </div>
                    <span className="text-base font-bold text-gray-800">
                      Upload Document to Grab Signature
                    </span>
                    <span className="text-xs text-gray-500 mt-1 text-center max-w-sm">
                      Select any PDF contract, letter, or document. You can easily zoom in and crop out any signature with crystal clarity.
                    </span>
                    <div className="mt-4 px-4 py-2 bg-acrobat-red text-white text-xs font-bold rounded-xl shadow group-hover:bg-acrobat-darkRed transition-colors">
                      Browse PDF File
                    </div>
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={handlePdfUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              ) : (
                <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                  {/* LEFT PANE: DOCUMENT VIEWPORT (70% on desktop) */}
                  <div className="flex-1 flex flex-col h-full border-b lg:border-b-0 lg:border-r border-gray-200 overflow-hidden bg-gray-100">
                    {/* Viewport Control Bar */}
                    <div className="px-4 py-2 bg-white border-b border-gray-200 flex flex-wrap items-center justify-between gap-2 z-10">
                      {/* Left: Document Info */}
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="p-1 bg-red-50 text-acrobat-red rounded font-bold text-xs">PDF</span>
                        <span className="text-xs font-bold text-gray-800 truncate max-w-[140px] sm:max-w-[200px]" title={pdfFileName || ''}>
                          {pdfFileName}
                        </span>
                        <label className="text-[11px] text-acrobat-red font-bold hover:underline cursor-pointer ml-1">
                          Change
                          <input type="file" accept="application/pdf" onChange={handlePdfUpload} className="hidden" />
                        </label>
                      </div>

                      {/* Center: Pagination */}
                      <div className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-xl">
                        <button
                          disabled={pdfPageNum <= 1 || isRenderingPdf}
                          onClick={() => setPdfPageNum((p) => Math.max(1, p - 1))}
                          className="p-1 text-gray-600 hover:text-gray-900 disabled:opacity-30 hover:bg-gray-200 rounded-lg transition-colors"
                          title="Previous Page"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-xs font-bold text-gray-700 px-1 select-none">
                          Page {pdfPageNum} / {numPdfPages}
                        </span>
                        <button
                          disabled={pdfPageNum >= numPdfPages || isRenderingPdf}
                          onClick={() => setPdfPageNum((p) => Math.min(numPdfPages, p + 1))}
                          className="p-1 text-gray-600 hover:text-gray-900 disabled:opacity-30 hover:bg-gray-200 rounded-lg transition-colors"
                          title="Next Page"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Right: Zoom Controls */}
                      <div className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-xl">
                        <button
                          onClick={() => setPdfScale((s) => Math.max(0.6, Number((s - 0.2).toFixed(2))))}
                          className="p-1 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-lg transition-colors"
                          title="Zoom Out"
                        >
                          <ZoomOut className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-xs font-bold text-gray-700 min-w-[42px] text-center select-none">
                          {Math.round(pdfScale * 100)}%
                        </span>
                        <button
                          onClick={() => setPdfScale((s) => Math.min(3.0, Number((s + 0.2).toFixed(2))))}
                          className="p-1 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-lg transition-colors"
                          title="Zoom In"
                        >
                          <ZoomIn className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setPdfScale(1.35)}
                          className="ml-1 px-1.5 py-0.5 text-[10px] font-bold text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded transition-colors"
                          title="Reset Zoom"
                        >
                          Fit
                        </button>
                      </div>
                    </div>

                    {/* PDF Canvas Viewport with Precision Overlay */}
                    <div className="flex-1 overflow-auto p-4 flex items-start justify-center relative select-none">
                      {isRenderingPdf && (
                        <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center z-30">
                          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow-lg border border-gray-200">
                            <RefreshCw className="w-4 h-4 animate-spin text-acrobat-red" />
                            <span className="text-xs font-bold text-gray-700">Rendering Document...</span>
                          </div>
                        </div>
                      )}

                      <div
                        className="relative inline-block shadow-2xl rounded-lg overflow-hidden bg-white cursor-crosshair"
                        onMouseDown={handlePdfMouseDown}
                        onMouseMove={handlePdfMouseMove}
                        onMouseUp={handlePdfMouseUp}
                        onTouchStart={handlePdfTouchStart}
                        onTouchMove={handlePdfTouchMove}
                        onTouchEnd={handlePdfMouseUp}
                      >
                        <canvas ref={pdfCanvasRef} className="block pointer-events-none" />

                        {/* Interactive Crop Selection Box */}
                        {cropRect && (
                          <div
                            style={{
                              left: `${cropRect.x}px`,
                              top: `${cropRect.y}px`,
                              width: `${cropRect.width}px`,
                              height: `${cropRect.height}px`,
                            }}
                            className="absolute border-2 border-blue-600 bg-blue-500/20 shadow-xl pointer-events-none rounded-sm"
                          >
                            <div className="absolute -top-6 left-0 bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow whitespace-nowrap flex items-center gap-1">
                              <Scissors className="w-3 h-3" />
                              <span>Signature Area</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Helper Instruction Banner */}
                    <div className="px-4 py-2 bg-white/90 border-t border-gray-200 text-center text-xs text-gray-600 font-medium">
                      💡 <span className="font-semibold text-gray-800">Click and drag</span> a rectangle over any signature on the document page above to grab it.
                    </div>
                  </div>

                  {/* RIGHT PANE: EXTRACTION PREVIEW & STUDIO (30% on desktop) */}
                  <div className="w-full lg:w-84 xl:w-96 bg-white flex flex-col justify-between p-5 overflow-y-auto">
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold uppercase tracking-wider text-gray-500">
                          Extracted Signature Preview
                        </span>
                        {extractedPdfSignature && (
                          <span className="flex items-center gap-1 text-[11px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Captured
                          </span>
                        )}
                      </div>

                      {/* Transparent Checkered Preview Card */}
                      <div className="w-full h-36 rounded-2xl border-2 border-gray-200 flex items-center justify-center p-3 relative overflow-hidden bg-[radial-gradient(#e5e7eb_1.5px,transparent_1.5px)] [background-size:12px_12px] bg-gray-50 shadow-inner">
                        {extractedPdfSignature ? (
                          <img
                            src={extractedPdfSignature}
                            alt="Extracted Signature"
                            className="max-h-full max-w-full object-contain filter drop-shadow"
                          />
                        ) : (
                          <div className="text-center p-4 text-gray-400 flex flex-col items-center gap-1.5">
                            <Scissors className="w-6 h-6 text-gray-300" />
                            <span className="text-xs font-semibold">No signature captured yet</span>
                            <span className="text-[10px] text-gray-400">
                              Drag a box around any signature on the left
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Signature Name Setting */}
                      <div>
                        <label className="text-xs font-bold text-gray-700 mb-1 block">
                          Signature Label
                        </label>
                        <input
                          type="text"
                          value={signatureName}
                          onChange={(e) => setSignatureName(e.target.value)}
                          placeholder="e.g. Contract Signature"
                          className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-acrobat-red focus:border-transparent transition-all"
                        />
                      </div>

                      {/* Extraction Enhancements */}
                      <div className="flex flex-col gap-2.5 pt-2 border-t border-gray-100">
                        <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                          Enhancements
                        </span>

                        <label className="flex items-center justify-between p-2.5 bg-gray-50 hover:bg-gray-100/70 rounded-xl border border-gray-200 cursor-pointer transition-colors">
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-gray-800">Remove White Background</span>
                            <span className="text-[10px] text-gray-500">Converts paper texture to transparent PNG</span>
                          </div>
                          <input
                            type="checkbox"
                            checked={removeBackground}
                            onChange={(e) => setRemoveBackground(e.target.checked)}
                            className="w-4 h-4 text-acrobat-red rounded focus:ring-acrobat-red"
                          />
                        </label>

                        <label className="flex items-center justify-between p-2.5 bg-gray-50 hover:bg-gray-100/70 rounded-xl border border-gray-200 cursor-pointer transition-colors">
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-gray-800">Enhance Ink Contrast</span>
                            <span className="text-[10px] text-gray-500">Darkens and sharpens faint pencil/pen lines</span>
                          </div>
                          <input
                            type="checkbox"
                            checked={enhanceInk}
                            onChange={(e) => setEnhanceInk(e.target.checked)}
                            className="w-4 h-4 text-acrobat-red rounded focus:ring-acrobat-red"
                          />
                        </label>
                      </div>
                    </div>

                    {/* Action in Right Pane for Pro Workflow */}
                    <div className="pt-4 border-t border-gray-100 flex flex-col gap-2">
                      <button
                        onClick={handleSave}
                        disabled={!extractedPdfSignature}
                        className="w-full py-2.5 px-4 bg-acrobat-red hover:bg-acrobat-darkRed disabled:opacity-40 text-white text-xs font-bold rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all"
                      >
                        <Check className="w-4 h-4" />
                        <span>Apply Extracted Signature</span>
                      </button>

                      {extractedPdfSignature && (
                        <button
                          onClick={() => {
                            setCropRect(null);
                            setExtractedPdfSignature(null);
                          }}
                          className="w-full py-1.5 text-[11px] font-bold text-gray-500 hover:text-red-600 transition-colors"
                        >
                          Clear & Grab Another
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Existing Saved Signatures List (Shown for standard tabs or when closed PDF) */}
        {!isPdfTabWithDoc && savedSignatures.length > 0 && (
          <div className="px-6 pb-4 border-t border-gray-100 pt-3 flex-shrink-0">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">
              Saved Signatures
            </span>
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {savedSignatures.map((sig) => (
                <div
                  key={sig.id}
                  className="group relative flex-shrink-0 bg-gray-50 border border-gray-200 rounded-xl p-2 flex items-center justify-center hover:border-blue-400 transition-colors"
                >
                  <img src={sig.dataUrl} alt={sig.name} className="h-8 object-contain max-w-[100px]" />
                  <button
                    onClick={() => onDeleteSignature(sig.id)}
                    className="absolute -top-1.5 -right-1.5 bg-red-600 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer Actions (Standard Tabs) */}
        {!isPdfTabWithDoc && (
          <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-2 flex-shrink-0">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs sm:text-sm font-bold text-gray-600 hover:text-gray-800"
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
              className="flex items-center gap-1.5 px-5 py-2 text-xs sm:text-sm font-bold text-white bg-acrobat-red hover:bg-acrobat-darkRed disabled:opacity-40 rounded-xl shadow-md transition-all"
            >
              <Check className="w-4 h-4" />
              <span>Create & Apply</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

