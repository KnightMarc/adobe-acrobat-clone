import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';
import { AnnotationItem, PageState } from '../types/pdf';

// Helper to convert hex color string (#RRGGBB) to pdf-lib rgb
function hexToRgb(hex: string) {
  const cleanHex = hex.replace('#', '');
  const bigint = parseInt(cleanHex, 16);
  const r = ((bigint >> 16) & 255) / 255;
  const g = ((bigint >> 8) & 255) / 255;
  const b = (bigint & 255) / 255;
  return rgb(r, g, b);
}

// Sanitize string to WinAnsi compatible ASCII to prevent pdf-lib font encoding errors
function sanitizeText(text: string): string {
  return text.replace(/[^\x00-\x7F]/g, '?');
}

export async function generateAndDownloadPDF(
  originalBuffer: ArrayBuffer,
  pageStates: PageState[],
  annotations: AnnotationItem[],
  filename: string = 'edited_document.pdf'
) {
  // Load source document from cloned buffer
  const srcDoc = await PDFDocument.load(originalBuffer.slice(0));
  
  // Create output document
  const pdfDoc = await PDFDocument.create();
  
  // Embed standard font
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // Cache embedded signature images to avoid duplicate embedding
  const embeddedSignatures = new Map<string, any>();

  // Filter active (non-deleted) pages
  const activePageStates = pageStates.filter(p => !p.deleted);

  for (let i = 0; i < activePageStates.length; i++) {
    const pState = activePageStates[i];
    
    // Copy page from original document
    const [copiedPage] = await pdfDoc.copyPages(srcDoc, [pState.originalIndex]);
    const addedPage = pdfDoc.addPage(copiedPage);

    // Apply rotation
    if (pState.rotation > 0) {
      const currentRotation = addedPage.getRotation().angle;
      addedPage.setRotation(degrees((currentRotation + pState.rotation) % 360));
    }

    const { width: pageWidth, height: pageHeight } = addedPage.getSize();

    // Find annotations for this original page index
    const pageAnnotations = annotations.filter(a => a.pageIndex === pState.originalIndex);

    for (const ann of pageAnnotations) {
      // Convert percentage coordinates to PDF points (Top-left DOM to Bottom-left PDF)
      const pdfX = (ann.x / 100) * pageWidth;
      const pdfY = pageHeight - (ann.y / 100) * pageHeight;

      if (ann.type === 'text') {
        // If editing existing text or redaction is requested, draw whiteout box over original text
        if (ann.isExistingText || ann.whiteoutWidth) {
          const wBox = (ann.whiteoutWidth ? (ann.whiteoutWidth / 100) * pageWidth : 120);
          const hBox = (ann.whiteoutHeight ? (ann.whiteoutHeight / 100) * pageHeight : (ann.fontSize || 16) * 1.4);

          addedPage.drawRectangle({
            x: pdfX,
            y: pdfY - hBox,
            width: wBox,
            height: hBox,
            color: rgb(1, 1, 1), // Solid white background mask
          });
        }

        if (ann.content) {
          const fontSize = ann.fontSize || 16;
          const color = ann.color ? hexToRgb(ann.color) : rgb(0, 0, 0);

          const safeText = sanitizeText(ann.content);
          const lines = safeText.split('\n');

          lines.forEach((line, lineIdx) => {
            addedPage.drawText(line, {
              x: pdfX,
              y: pdfY - fontSize * (lineIdx + 1),
              size: fontSize,
              font: helveticaFont,
              color: color,
            });
          });
        }
      } 
      else if (ann.type === 'signature' && ann.signatureUrl) {
        let embeddedImg = embeddedSignatures.get(ann.signatureUrl);
        if (!embeddedImg) {
          if (ann.signatureUrl.startsWith('data:image/png')) {
            const pngBytes = await fetch(ann.signatureUrl).then(res => res.arrayBuffer());
            embeddedImg = await pdfDoc.embedPng(pngBytes);
          } else {
            const imgBytes = await fetch(ann.signatureUrl).then(res => res.arrayBuffer());
            embeddedImg = await pdfDoc.embedJpg(imgBytes);
          }
          embeddedSignatures.set(ann.signatureUrl, embeddedImg);
        }

        const imgWidth = (ann.width ? (ann.width / 100) * pageWidth : 150);
        const imgHeight = (ann.height ? (ann.height / 100) * pageHeight : 60);

        addedPage.drawImage(embeddedImg, {
          x: pdfX,
          y: pdfY - imgHeight,
          width: imgWidth,
          height: imgHeight,
        });
      }
      else if ((ann.type === 'draw' || ann.type === 'highlight') && ann.points && ann.points.length > 1) {
        const color = ann.color ? hexToRgb(ann.color) : (ann.type === 'highlight' ? rgb(1, 1, 0) : rgb(0, 0, 0));
        const strokeWidth = ann.strokeWidth || (ann.type === 'highlight' ? 12 : 2);
        const opacity = ann.opacity ?? (ann.type === 'highlight' ? 0.35 : 1);

        for (let p = 0; p < ann.points.length - 1; p++) {
          const pt1 = ann.points[p];
          const pt2 = ann.points[p + 1];

          const x1 = (pt1.x / 100) * pageWidth;
          const y1 = pageHeight - (pt1.y / 100) * pageHeight;
          const x2 = (pt2.x / 100) * pageWidth;
          const y2 = pageHeight - (pt2.y / 100) * pageHeight;

          addedPage.drawLine({
            start: { x: x1, y: y1 },
            end: { x: x2, y: y2 },
            thickness: strokeWidth,
            color: color,
            opacity: opacity,
          });
        }
      }
    }
  }

  // Save compiled PDF bytes
  const pdfBytes = await pdfDoc.save();

  // Create byte-exact ArrayBuffer slice to avoid buffer overflow/garbage bytes
  const exactArrayBuffer = pdfBytes.buffer.slice(
    pdfBytes.byteOffset,
    pdfBytes.byteOffset + pdfBytes.byteLength
  ) as ArrayBuffer;

  // Trigger browser download
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
