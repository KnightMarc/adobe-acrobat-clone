import * as pdfjsLib from 'pdfjs-dist';
import { AnnotationItem, PageState } from '../types/pdf';
import { compilePDFArrayBuffer } from './pdfGenerator';

// Parse page range string like "1-3, 5, 8-10" into 0-indexed page indices
export function parsePageRangeString(rangeStr: string, totalActivePages: number): number[] {
  const indices = new Set<number>();
  const parts = rangeStr.split(',').map(s => s.trim());

  for (const part of parts) {
    if (part.includes('-')) {
      const [startStr, endStr] = part.split('-').map(s => s.trim());
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);
      if (!isNaN(start) && !isNaN(end)) {
        const min = Math.max(1, Math.min(start, end));
        const max = Math.min(totalActivePages, Math.max(start, end));
        for (let p = min; p <= max; p++) {
          indices.add(p - 1);
        }
      }
    } else {
      const num = parseInt(part, 10);
      if (!isNaN(num) && num >= 1 && num <= totalActivePages) {
        indices.add(num - 1);
      }
    }
  }

  return Array.from(indices).sort((a, b) => a - b);
}

// Download a compiled PDF ArrayBuffer
function downloadBufferAsPDF(buffer: ArrayBuffer, filename: string) {
  const blob = new Blob([buffer], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Split PDF into individual single-page PDFs
export async function splitPDFToSinglePages(
  originalBuffer: ArrayBuffer,
  pageStates: PageState[],
  baseFilename: string = 'document',
  pdfDocProxy?: pdfjsLib.PDFDocumentProxy | null,
  annotations: AnnotationItem[] = []
) {
  const activePageStates = pageStates.filter(p => !p.deleted);
  const cleanBase = baseFilename.replace(/\.pdf$/i, '');

  for (let i = 0; i < activePageStates.length; i++) {
    const singlePageState = [activePageStates[i]];
    const buffer = await compilePDFArrayBuffer(originalBuffer, singlePageState, annotations, pdfDocProxy);
    downloadBufferAsPDF(buffer, `${cleanBase}_page_${i + 1}.pdf`);
  }
}

// Extract custom page ranges into a combined PDF
export async function extractPDFRanges(
  originalBuffer: ArrayBuffer,
  pageStates: PageState[],
  rangeString: string,
  baseFilename: string = 'document',
  pdfDocProxy?: pdfjsLib.PDFDocumentProxy | null,
  annotations: AnnotationItem[] = []
) {
  const activePageStates = pageStates.filter(p => !p.deleted);
  const selectedIndices = parsePageRangeString(rangeString, activePageStates.length);

  if (selectedIndices.length === 0) {
    alert('Invalid page range entered.');
    return;
  }

  const cleanBase = baseFilename.replace(/\.pdf$/i, '');
  const selectedPageStates = selectedIndices.map(idx => activePageStates[idx]);

  const buffer = await compilePDFArrayBuffer(originalBuffer, selectedPageStates, annotations, pdfDocProxy);
  downloadBufferAsPDF(buffer, `${cleanBase}_extracted_pages.pdf`);
}

// Split PDF into equal chunks of N pages
export async function splitPDFChunks(
  originalBuffer: ArrayBuffer,
  pageStates: PageState[],
  chunkSize: number,
  baseFilename: string = 'document',
  pdfDocProxy?: pdfjsLib.PDFDocumentProxy | null,
  annotations: AnnotationItem[] = []
) {
  if (chunkSize <= 0) return;

  const activePageStates = pageStates.filter(p => !p.deleted);
  const cleanBase = baseFilename.replace(/\.pdf$/i, '');

  for (let i = 0; i < activePageStates.length; i += chunkSize) {
    const chunkPageStates = activePageStates.slice(i, i + chunkSize);
    const buffer = await compilePDFArrayBuffer(originalBuffer, chunkPageStates, annotations, pdfDocProxy);
    const chunkNum = Math.floor(i / chunkSize) + 1;
    downloadBufferAsPDF(buffer, `${cleanBase}_part_${chunkNum}.pdf`);
  }
}

