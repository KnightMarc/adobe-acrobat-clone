'use client';

import React, { useState, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { ActiveTool, AnnotationItem, PageState, SavedSignature } from '../types/pdf';
import { loadPDFDocument, renderPageThumbnail } from '../utils/pdfRenderer';
import { generateAndDownloadPDF, generatePDFBlob } from '../utils/pdfGenerator';
import { splitPDFToSinglePages, extractPDFRanges, splitPDFChunks } from '../utils/pdfSplitter';
import { Navbar } from '../components/Navbar';
import { Toolbar } from '../components/Toolbar';
import { Sidebar } from '../components/Sidebar';
import { PdfViewer } from '../components/PdfViewer';
import { SignatureModal } from '../components/SignatureModal';
import { PageOrganizer } from '../components/PageOrganizer';
import { SplitModal } from '../components/SplitModal';
import { PreviewModal } from '../components/PreviewModal';

export default function Home() {
  const [fileBuffer, setFileBuffer] = useState<ArrayBuffer | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);

  // Document Page state
  const [pageStates, setPageStates] = useState<PageState[]>([]);
  const [thumbnails, setThumbnails] = useState<Map<number, string>>(new Map());
  const [activePageIndex, setActivePageIndex] = useState<number>(0);
  const [scale, setScale] = useState<number>(1.2);

  // Active Tool & Style State
  const [activeTool, setActiveTool] = useState<ActiveTool>('select');
  const [currentColor, setCurrentColor] = useState<string>('#000000');
  const [fontSize, setFontSize] = useState<number>(18);
  const [strokeWidth, setStrokeWidth] = useState<number>(3);

  // Annotations & Undo/Redo history
  const [annotations, setAnnotations] = useState<AnnotationItem[]>([]);
  const [history, setHistory] = useState<AnnotationItem[][]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // eSignature state
  const [savedSignatures, setSavedSignatures] = useState<SavedSignature[]>([]);
  const [activeSignature, setActiveSignature] = useState<SavedSignature | null>(null);
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState<boolean>(false);

  // Load saved signatures from localStorage on initial render
  useEffect(() => {
    try {
      const stored = localStorage.getItem('acrobat_saved_signatures');
      if (stored) {
        const parsed: SavedSignature[] = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSavedSignatures(parsed);
          setActiveSignature(parsed[0]);
        }
      }
    } catch (e) {
      console.error('Failed to load saved signatures from localStorage:', e);
    }
  }, []);

  // Helper to persist signatures array to localStorage
  const saveSignaturesToStorage = (sigs: SavedSignature[]) => {
    try {
      localStorage.setItem('acrobat_saved_signatures', JSON.stringify(sigs));
    } catch (e) {
      console.error('Failed to save signatures to localStorage:', e);
    }
  };

  // Page Organizer modal
  const [isOrganizerOpen, setIsOrganizerOpen] = useState<boolean>(false);

  // Mobile Sidebar Drawer state
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  // PDF Splitter modal
  const [isSplitModalOpen, setIsSplitModalOpen] = useState<boolean>(false);

  // PDF Preview modal & URL
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Clean up Blob URLs on unmount or preview URL update
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Robust Annotations State Setter with Undo/Redo History Recording
  const updateAnnotations: React.Dispatch<React.SetStateAction<AnnotationItem[]>> = (action) => {
    setAnnotations(prev => {
      const nextAnns = typeof action === 'function' ? action(prev) : action;
      setHistory(hPrev => {
        const slicedHistory = hPrev.slice(0, historyIndex + 1);
        const newHistory = [...slicedHistory, nextAnns].slice(-50);
        return newHistory;
      });
      setHistoryIndex(hIdx => Math.min(49, hIdx + 1));
      return nextAnns;
    });
  };

  // Handle PDF file upload
  const handleFileUpload = async (file: File) => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }

    const buffer = await file.arrayBuffer();
    setFileBuffer(buffer);
    setFileName(file.name);

    const doc = await loadPDFDocument(buffer);
    setPdfDoc(doc);

    // Initialize page states & reset thumbnails map
    const initialPages: PageState[] = [];
    setThumbnails(new Map());

    for (let i = 0; i < doc.numPages; i++) {
      initialPages.push({
        id: `page-${i}`,
        originalIndex: i,
        rotation: 0,
        deleted: false,
      });

      // Generate thumbnail preview asynchronously
      renderPageThumbnail(doc, i + 1).then(thumbUrl => {
        setThumbnails(prev => new Map(prev).set(i, thumbUrl));
      });
    }

    // Auto-fit scale on small mobile screens (<640px)
    if (typeof window !== 'undefined' && window.innerWidth < 640) {
      setScale(0.85);
    } else {
      setScale(1.2);
    }

    setPageStates(initialPages);
    setAnnotations([]);
    setHistory([]);
    setHistoryIndex(-1);
    setActivePageIndex(0);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIdx = historyIndex - 1;
      setHistoryIndex(newIdx);
      setAnnotations(history[newIdx]);
    } else if (historyIndex === 0) {
      setHistoryIndex(-1);
      setAnnotations([]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIdx = historyIndex + 1;
      setHistoryIndex(newIdx);
      setAnnotations(history[newIdx]);
    }
  };

  // Global Keyboard Shortcuts (Ctrl+Z, Ctrl+Y, Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      // Ignore key shortcuts if focused inside an editable input element
      if (target?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName)) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        handleRedo();
      } else if (e.key === 'Escape') {
        setActiveTool('select');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyIndex, history]);

  // Page manipulation functions
  const handleRotatePage = (index: number) => {
    setPageStates(prev =>
      prev.map((p, i) => (i === index ? { ...p, rotation: (p.rotation + 90) % 360 } : p))
    );
  };

  const handleRotateActivePage = (direction: 'cw' | 'ccw' = 'cw') => {
    const delta = direction === 'cw' ? 90 : 270;
    setPageStates(prev =>
      prev.map((p, i) => (i === activePageIndex ? { ...p, rotation: (p.rotation + delta) % 360 } : p))
    );
  };

  const handleDeletePage = (index: number) => {
    setPageStates(prev =>
      prev.map((p, i) => (i === index ? { ...p, deleted: !p.deleted } : p))
    );
  };

  const handleMovePage = (fromIndex: number, toIndex: number) => {
    setPageStates(prev => {
      const copy = [...prev];
      const [movedItem] = copy.splice(fromIndex, 1);
      copy.splice(toIndex, 0, movedItem);
      return copy;
    });

    // Synchronize activePageIndex with page position move
    setActivePageIndex(curr => {
      if (curr === fromIndex) return toIndex;
      if (curr > fromIndex && curr <= toIndex) return curr - 1;
      if (curr < fromIndex && curr >= toIndex) return curr + 1;
      return curr;
    });
  };

  // Save new eSignature from modal
  const handleSaveSignature = (sig: SavedSignature) => {
    setSavedSignatures(prev => {
      const next = [...prev, sig];
      saveSignaturesToStorage(next);
      return next;
    });
    setActiveSignature(sig);
    setActiveTool('signature');
  };

  const handleDeleteSignature = (id: string) => {
    setSavedSignatures(prev => {
      const next = prev.filter(s => s.id !== id);
      saveSignaturesToStorage(next);
      return next;
    });
    if (activeSignature?.id === id) {
      setActiveSignature(null);
      if (activeTool === 'signature') setActiveTool('select');
    }
  };

  // Trigger PDF export & download
  const handleDownloadPDF = async () => {
    if (!fileBuffer) return;
    await generateAndDownloadPDF(
      fileBuffer,
      pageStates,
      annotations,
      fileName ? `signed_${fileName}` : 'edited_document.pdf',
      pdfDoc
    );
  };

  // Open Preview Modal with Object URL cleanup
  const handleOpenPreview = async () => {
    if (!fileBuffer) return;
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setIsPreviewOpen(true);
    const blobUrl = await generatePDFBlob(fileBuffer, pageStates, annotations, pdfDoc);
    setPreviewUrl(blobUrl);
  };

  // Split PDF handlers
  const handleSplitSinglePages = async () => {
    if (!fileBuffer) return;
    await splitPDFToSinglePages(fileBuffer, pageStates, fileName || 'document', pdfDoc, annotations);
  };

  const handleExtractRanges = async (rangeStr: string) => {
    if (!fileBuffer) return;
    await extractPDFRanges(fileBuffer, pageStates, rangeStr, fileName || 'document', pdfDoc, annotations);
  };

  const handleSplitChunks = async (chunkSize: number) => {
    if (!fileBuffer) return;
    await splitPDFChunks(fileBuffer, pageStates, chunkSize, fileName || 'document', pdfDoc, annotations);
  };

  return (
    <div className="flex flex-col h-[100dvh] w-screen overflow-hidden bg-acrobat-bg select-none">
      {/* Top Navbar */}
      <Navbar
        fileName={fileName}
        onFileUpload={handleFileUpload}
        scale={scale}
        onZoomIn={() => setScale(s => Math.min(2.5, s + 0.15))}
        onZoomOut={() => setScale(s => Math.max(0.5, s - 0.15))}
        onZoomReset={() => setScale(1.0)}
        onOpenOrganizer={() => setIsOrganizerOpen(true)}
        onOpenSignatureModal={() => setIsSignatureModalOpen(true)}
        onOpenSplitModal={() => setIsSplitModalOpen(true)}
        onDownload={handleDownloadPDF}
        onPreview={handleOpenPreview}
        onRotateActivePage={handleRotateActivePage}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={historyIndex >= 0}
        canRedo={historyIndex < history.length - 1}
        hasDocument={!!pdfDoc}
        isMobileSidebarOpen={isMobileSidebarOpen}
        onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
      />

      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Sidebar (Thumbnails & Page Nav) */}
        {pdfDoc && (
          <Sidebar
            pageStates={pageStates}
            thumbnails={thumbnails}
            activePageIndex={activePageIndex}
            onSelectPage={setActivePageIndex}
            onRotatePage={handleRotatePage}
            onDeletePage={handleDeletePage}
            onMovePage={handleMovePage}
            isOpenMobile={isMobileSidebarOpen}
            onCloseMobile={() => setIsMobileSidebarOpen(false)}
          />
        )}

        {/* Floating Top Tool Palette */}
        {pdfDoc && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30">
            <Toolbar
              activeTool={activeTool}
              setActiveTool={setActiveTool}
              currentColor={currentColor}
              setCurrentColor={setCurrentColor}
              fontSize={fontSize}
              setFontSize={setFontSize}
              strokeWidth={strokeWidth}
              setStrokeWidth={setStrokeWidth}
              savedSignatures={savedSignatures}
              activeSignature={activeSignature}
              onSelectSignature={(sig) => {
                setActiveSignature(sig);
                setActiveTool('signature');
              }}
              onDeleteSignature={handleDeleteSignature}
              onOpenSignatureModal={() => setIsSignatureModalOpen(true)}
              onRotateActivePage={handleRotateActivePage}
            />
          </div>
        )}

        {/* Main PDF Canvas Viewport */}
        <PdfViewer
          pdfDoc={pdfDoc}
          pageStates={pageStates}
          scale={scale}
          activeTool={activeTool}
          setActiveTool={setActiveTool}
          annotations={annotations}
          setAnnotations={updateAnnotations}
          currentColor={currentColor}
          fontSize={fontSize}
          strokeWidth={strokeWidth}
          activeSignature={activeSignature}
          activePageIndex={activePageIndex}
          setActivePageIndex={setActivePageIndex}
          onZoomIn={() => setScale(s => Math.min(2.8, s + 0.15))}
          onZoomOut={() => setScale(s => Math.max(0.4, s - 0.15))}
          onZoomReset={() => setScale(typeof window !== 'undefined' && window.innerWidth < 640 ? 0.85 : 1.0)}
          onSetScale={setScale}
        />
      </div>

      {/* eSignature Modal */}
      <SignatureModal
        isOpen={isSignatureModalOpen}
        onClose={() => setIsSignatureModalOpen(false)}
        onSaveSignature={handleSaveSignature}
        savedSignatures={savedSignatures}
        onDeleteSignature={handleDeleteSignature}
      />

      {/* Page Organizer Modal */}
      <PageOrganizer
        isOpen={isOrganizerOpen}
        onClose={() => setIsOrganizerOpen(false)}
        pageStates={pageStates}
        thumbnails={thumbnails}
        onRotatePage={handleRotatePage}
        onDeletePage={handleDeletePage}
        onMovePage={handleMovePage}
      />

      {/* PDF Splitter Modal */}
      <SplitModal
        isOpen={isSplitModalOpen}
        onClose={() => setIsSplitModalOpen(false)}
        pageStates={pageStates}
        fileName={fileName}
        onSplitSinglePages={handleSplitSinglePages}
        onExtractRanges={handleExtractRanges}
        onSplitChunks={handleSplitChunks}
      />

      {/* PDF Preview Modal */}
      <PreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        previewUrl={previewUrl}
        fileName={fileName}
        onDownload={handleDownloadPDF}
      />
    </div>
  );
}
