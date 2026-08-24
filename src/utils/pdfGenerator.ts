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

// Sanitize string to WinAnsi compatible ASCII with rich character mapping
function sanitizeText(text: string): string {
  return text
    .replace(/[\u201C\u201D\u201E]/g, '"') // Smart double quotes
    .replace(/[\u2018\u2019\u201A]/g, "'") // Smart single quotes
    .replace(/[\u2013\u2014]/g, '-')     // En/em dashes
    .replace(/[\u2022\u2023\u25E6]/g, '*')// Bullets
    .replace(/\u2026/g, '...')            // Ellipsis
    .replace(/\u20AC/g, 'EUR')            // Euro sign
    .replace(/\u00A3/g, 'GBP')            // Pound sign
    .replace(/[\u00E0\u00E1\u00E2\u00E3\u00E4\u00E5]/g, 'a')
    .replace(/[\u00E8\u00E9\u00EA\u00EB]/g, 'e')
    .replace(/[\u00EC\u00ED\u00EE\u00EF]/g, 'i')
    .replace(/[\u00F2\u00F3\u00F4\u00F5\u00F6]/g, 'o')
    .replace(/[\u00F9\u00FA\u00FB\u00FC]/g, 'u')
    .replace(/\u00F1/g, 'n')
    .replace(/\u00E7/g, 'c')
    .replace(/[\u00C0\u00C1\u00C2\u00C3\u00C4\u00C5]/g, 'A')
    .replace(/[\u00C8\u00C9\u00CA\u00CB]/g, 'E')
    .replace(/[\u00CC\u00CD\u00CE\u00CF]/g, 'I')
    .replace(/[\u00D2\u00D3\u00D4\u00D5\u00D6]/g, 'O')
    .replace(/[\u00D9\u00DA\u00DB\u00DC]/g, 'U')
    .replace(/\u00D1/g, 'N')
    .replace(/\u00C7/g, 'C')
    .replace(/[^\x00-\x7F]/g, '?');
}

export async function compilePDFArrayBuffer(
  originalBuffer: ArrayBuffer,
  pageStates: PageState[],
  annotations: AnnotationItem[]
): Promise<ArrayBuffer> {
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

    // Calculate intrinsic, user, and net rotation angles
    const intrinsicRotation = copiedPage.getRotation().angle || 0;
    const userRotation = pState.rotation || 0;
    const netRotation = (intrinsicRotation + userRotation) % 360;

    // Consistently set net rotation on output page
    addedPage.setRotation(degrees(netRotation));

    const mediaSize = addedPage.getSize();
    const isSwapped = (netRotation % 180) === 90;

    // Visual dimensions matching PDF.js editor view
    const visualWidth = isSwapped ? mediaSize.height : mediaSize.width;
    const visualHeight = isSwapped ? mediaSize.width : mediaSize.height;

    // Find annotations for this original page index
    const pageAnnotations = annotations.filter(a => a.pageIndex === pState.originalIndex);

    for (const ann of pageAnnotations) {
      // Map percentage coordinates (0-100) relative to visual viewport into PDF point coordinates
      const normRot = ((netRotation % 360) + 360) % 360;
      let pdfX = 0;
      let pdfY = 0;

      if (normRot === 90) {
        pdfX = (ann.y / 100) * mediaSize.width;
        pdfY = (ann.x / 100) * mediaSize.height;
      } else if (normRot === 180) {
        pdfX = mediaSize.width - (ann.x / 100) * mediaSize.width;
        pdfY = (ann.y / 100) * mediaSize.height;
      } else if (normRot === 270) {
        pdfX = mediaSize.width - (ann.y / 100) * mediaSize.width;
        pdfY = mediaSize.height - (ann.x / 100) * mediaSize.height;
      } else {
        // normRot === 0
        pdfX = (ann.x / 100) * mediaSize.width;
        pdfY = mediaSize.height - (ann.y / 100) * mediaSize.height;
      }

      if (ann.type === 'text') {
        // If editing existing text or redaction is requested, draw whiteout box over original text
        if (ann.isExistingText || ann.whiteoutWidth) {
          const wBox = (ann.whiteoutWidth ? (ann.whiteoutWidth / 100) * visualWidth : 120);
          const hBox = (ann.whiteoutHeight ? (ann.whiteoutHeight / 100) * visualHeight : (ann.fontSize || 16) * 1.3);

          addedPage.drawRectangle({
            x: pdfX,
            y: pdfY - hBox * 1.15,
            width: wBox,
            height: hBox * 1.25,
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
              y: pdfY - fontSize * 0.85 - lineIdx * fontSize * 1.15,
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

        // Calculate exact image width in PDF points based on DOM percentage of visual width
        const imgWidth = (ann.width ? (ann.width / 100) * visualWidth : 150);

        // Calculate imgHeight from intrinsic aspect ratio of embedded image
        const intrinsicRatio = embeddedImg.height / embeddedImg.width;
        const imgHeight = (ann.height && ann.height > 0)
          ? (ann.height / 100) * visualHeight
          : imgWidth * intrinsicRatio;

        const rotDeg = ann.rotation || 0;
        if (rotDeg !== 0) {
          const pdfRotDeg = (360 - (rotDeg % 360)) % 360;
          const rad = (pdfRotDeg * Math.PI) / 180;
          const cos = Math.cos(rad);
          const sin = Math.sin(rad);

          const cx = pdfX + imgWidth / 2;
          const cy = (pdfY - imgHeight) + imgHeight / 2;

          const xNew = cx - (imgWidth / 2) * cos + (imgHeight / 2) * sin;
          const yNew = cy - (imgWidth / 2) * sin - (imgHeight / 2) * cos;

          addedPage.drawImage(embeddedImg, {
            x: xNew,
            y: yNew,
            width: imgWidth,
            height: imgHeight,
            rotate: degrees(pdfRotDeg),
          });
        } else {
          addedPage.drawImage(embeddedImg, {
            x: pdfX,
            y: pdfY - imgHeight,
            width: imgWidth,
            height: imgHeight,
          });
        }
      }
      else if ((ann.type === 'draw' || ann.type === 'highlight') && ann.points && ann.points.length > 1) {
        const color = ann.color ? hexToRgb(ann.color) : (ann.type === 'highlight' ? rgb(1, 1, 0) : rgb(0, 0, 0));
        const strokeWidth = ann.strokeWidth || (ann.type === 'highlight' ? 12 : 2);
        const opacity = ann.opacity ?? (ann.type === 'highlight' ? 0.35 : 1);

        for (let p = 0; p < ann.points.length - 1; p++) {
          const pt1 = ann.points[p];
          const pt2 = ann.points[p + 1];

          const p1Coords = normRot === 90
            ? { x: (pt1.y / 100) * mediaSize.width, y: (pt1.x / 100) * mediaSize.height }
            : normRot === 180
            ? { x: mediaSize.width - (pt1.x / 100) * mediaSize.width, y: (pt1.y / 100) * mediaSize.height }
            : normRot === 270
            ? { x: mediaSize.width - (pt1.y / 100) * mediaSize.width, y: mediaSize.height - (pt1.x / 100) * mediaSize.height }
            : { x: (pt1.x / 100) * mediaSize.width, y: mediaSize.height - (pt1.y / 100) * mediaSize.height };

          const p2Coords = normRot === 90
            ? { x: (pt2.y / 100) * mediaSize.width, y: (pt2.x / 100) * mediaSize.height }
            : normRot === 180
            ? { x: mediaSize.width - (pt2.x / 100) * mediaSize.width, y: (pt2.y / 100) * mediaSize.height }
            : normRot === 270
            ? { x: mediaSize.width - (pt2.y / 100) * mediaSize.width, y: mediaSize.height - (pt2.x / 100) * mediaSize.height }
            : { x: (pt2.x / 100) * mediaSize.width, y: mediaSize.height - (pt2.y / 100) * mediaSize.height };

          addedPage.drawLine({
            start: p1Coords,
            end: p2Coords,
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
  return pdfBytes.buffer.slice(
    pdfBytes.byteOffset,
    pdfBytes.byteOffset + pdfBytes.byteLength
  ) as ArrayBuffer;
}

export async function generatePDFBlob(
  originalBuffer: ArrayBuffer,
  pageStates: PageState[],
  annotations: AnnotationItem[]
): Promise<string> {
  const exactArrayBuffer = await compilePDFArrayBuffer(originalBuffer, pageStates, annotations);
  const blob = new Blob([exactArrayBuffer], { type: 'application/pdf' });
  return URL.createObjectURL(blob);
}

export async function generateAndDownloadPDF(
  originalBuffer: ArrayBuffer,
  pageStates: PageState[],
  annotations: AnnotationItem[],
  filename: string = 'edited_document.pdf'
) {
  const exactArrayBuffer = await compilePDFArrayBuffer(originalBuffer, pageStates, annotations);

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
