'use client';

import React, { useState, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { ActiveTool, AnnotationItem, PageState, SavedSignature } from '../types/pdf';
import { loadPDFDocument, renderPageThumbnail } from '../utils/pdfRenderer';
import { generateAndDownloadPDF } from '../utils/pdfGenerator';
import { Navbar } from '../components/Navbar';
import { Toolbar } from '../components/Toolbar';
import { Sidebar } from '../components/Sidebar';
import { PdfViewer } from '../components/PdfViewer';
import { SignatureModal } from '../components/SignatureModal';
import { PageOrganizer } from '../components/PageOrganizer';

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

  // Page Organizer modal
  const [isOrganizerOpen, setIsOrganizerOpen] = useState<boolean>(false);

  // Handle PDF file upload
  const handleFileUpload = async (file: File) => {
    const buffer = await file.arrayBuffer();
    setFileBuffer(buffer);
    setFileName(file.name);

    const doc = await loadPDFDocument(buffer);
    setPdfDoc(doc);

    // Initialize page states
    const initialPages: PageState[] = [];

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

    setPageStates(initialPages);
    setAnnotations([]);
    setHistory([]);
    setHistoryIndex(-1);
    setActivePageIndex(0);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setAnnotations(history[historyIndex - 1]);
    } else if (historyIndex === 0) {
      setHistoryIndex(-1);
      setAnnotations([]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setAnnotations(history[historyIndex + 1]);
    }
  };

  // Global Keyboard Shortcuts (Ctrl+Z, Ctrl+Y, Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore key shortcuts if focused inside an input element
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

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
  };

  // Save new eSignature from modal
  const handleSaveSignature = (sig: SavedSignature) => {
    setSavedSignatures(prev => [...prev, sig]);
    setActiveSignature(sig);
    setActiveTool('signature');
  };

  const handleDeleteSignature = (id: string) => {
    setSavedSignatures(prev => prev.filter(s => s.id !== id));
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
      fileName ? `signed_${fileName}` : 'edited_document.pdf'
    );
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-acrobat-bg select-none">
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
        onDownload={handleDownloadPDF}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={historyIndex >= 0}
        canRedo={historyIndex < history.length - 1}
        hasDocument={!!pdfDoc}
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
              savedSignaturesCount={savedSignatures.length}
              onOpenSignatureModal={() => setIsSignatureModalOpen(true)}
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
          setAnnotations={setAnnotations}
          currentColor={currentColor}
          fontSize={fontSize}
          strokeWidth={strokeWidth}
          activeSignature={activeSignature}
          activePageIndex={activePageIndex}
          setActivePageIndex={setActivePageIndex}
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
    </div>
  );
}
