import { PDFDocument, degrees } from 'pdf-lib';
import { PageState } from '../types/pdf';

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

// Download a compiled PDF Document
async function downloadPDFDoc(pdfDoc: PDFDocument, filename: string) {
  const pdfBytes = await pdfDoc.save();
  const exactArrayBuffer = pdfBytes.buffer.slice(
    pdfBytes.byteOffset,
    pdfBytes.byteOffset + pdfBytes.byteLength
  ) as ArrayBuffer;

  const blob = new Blob([exactArrayBuffer], { type: 'application/pdf' });
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
  baseFilename: string = 'document'
) {
  const srcDoc = await PDFDocument.load(originalBuffer.slice(0));
  const activePageStates = pageStates.filter(p => !p.deleted);
  const cleanBase = baseFilename.replace(/\.pdf$/i, '');

  for (let i = 0; i < activePageStates.length; i++) {
    const pState = activePageStates[i];
    const newDoc = await PDFDocument.create();
    const [copiedPage] = await newDoc.copyPages(srcDoc, [pState.originalIndex]);
    const addedPage = newDoc.addPage(copiedPage);

    if (pState.rotation > 0) {
      const currentRotation = addedPage.getRotation().angle;
      addedPage.setRotation(degrees((currentRotation + pState.rotation) % 360));
    }

    await downloadPDFDoc(newDoc, `${cleanBase}_page_${i + 1}.pdf`);
  }
}

// Extract custom page ranges into a combined PDF
export async function extractPDFRanges(
  originalBuffer: ArrayBuffer,
  pageStates: PageState[],
  rangeString: string,
  baseFilename: string = 'document'
) {
  const srcDoc = await PDFDocument.load(originalBuffer.slice(0));
  const activePageStates = pageStates.filter(p => !p.deleted);
  const selectedIndices = parsePageRangeString(rangeString, activePageStates.length);

  if (selectedIndices.length === 0) {
    alert('Invalid page range entered.');
    return;
  }

  const newDoc = await PDFDocument.create();
  const cleanBase = baseFilename.replace(/\.pdf$/i, '');

  for (const pagePos of selectedIndices) {
    const pState = activePageStates[pagePos];
    const [copiedPage] = await newDoc.copyPages(srcDoc, [pState.originalIndex]);
    const addedPage = newDoc.addPage(copiedPage);

    if (pState.rotation > 0) {
      const currentRotation = addedPage.getRotation().angle;
      addedPage.setRotation(degrees((currentRotation + pState.rotation) % 360));
    }
  }

  await downloadPDFDoc(newDoc, `${cleanBase}_extracted_pages.pdf`);
}

// Split PDF into equal chunks of N pages
export async function splitPDFChunks(
  originalBuffer: ArrayBuffer,
  pageStates: PageState[],
  chunkSize: number,
  baseFilename: string = 'document'
) {
  if (chunkSize <= 0) return;

  const srcDoc = await PDFDocument.load(originalBuffer.slice(0));
  const activePageStates = pageStates.filter(p => !p.deleted);
  const cleanBase = baseFilename.replace(/\.pdf$/i, '');

  for (let i = 0; i < activePageStates.length; i += chunkSize) {
    const newDoc = await PDFDocument.create();
    const chunkPageStates = activePageStates.slice(i, i + chunkSize);

    for (const pState of chunkPageStates) {
      const [copiedPage] = await newDoc.copyPages(srcDoc, [pState.originalIndex]);
      const addedPage = newDoc.addPage(copiedPage);

      if (pState.rotation > 0) {
        const currentRotation = addedPage.getRotation().angle;
        addedPage.setRotation(degrees((currentRotation + pState.rotation) % 360));
      }
    }

    const chunkNum = Math.floor(i / chunkSize) + 1;
    await downloadPDFDoc(newDoc, `${cleanBase}_part_${chunkNum}.pdf`);
  }
}
