import * as pdfjsLib from 'pdfjs-dist';

// Initialize worker source with resilient fallback mechanism
if (typeof window !== 'undefined') {
  const version = pdfjsLib.version || '3.11.174';
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${version}/pdf.worker.min.js`;
}

export async function loadPDFDocument(arrayBuffer: ArrayBuffer, password?: string) {
  try {
    // Clone arrayBuffer slice to prevent WebWorker buffer detachment
    const bufferCopy = arrayBuffer.slice(0);
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(bufferCopy),
      password: password,
    });
    return await loadingTask.promise;
  } catch (error: any) {
    if (error?.name === 'PasswordException') {
      const userPassword = prompt('This PDF is password protected. Please enter password:');
      if (userPassword) {
        return await loadPDFDocument(arrayBuffer, userPassword);
      }
    }
    throw error;
  }
}

export async function renderPDFPage(
  pdfDoc: pdfjsLib.PDFDocumentProxy,
  pageNumber: number,
  canvas: HTMLCanvasElement,
  scale: number = 1.5,
  rotation: number = 0
) {
  // Cancel previous active render task on canvas to prevent concurrency error
  if ((canvas as any)._activeRenderTask) {
    try {
      (canvas as any)._activeRenderTask.cancel();
    } catch {
      // Ignore cancellation exceptions
    }
  }

  const page = await pdfDoc.getPage(pageNumber);
  const viewport = page.getViewport({ scale, rotation });

  const context = canvas.getContext('2d');
  if (!context) return null;

  canvas.height = viewport.height;
  canvas.width = viewport.width;

  const renderContext = {
    canvasContext: context,
    viewport: viewport,
  };

  const renderTask = page.render(renderContext);
  (canvas as any)._activeRenderTask = renderTask;

  try {
    await renderTask.promise;
    (canvas as any)._activeRenderTask = null;
  } catch (error: any) {
    if (error?.name !== 'RenderingCancelledException') {
      console.warn('Canvas rendering warning:', error);
    }
  }

  return {
    width: viewport.width,
    height: viewport.height,
    originalWidth: page.getViewport({ scale: 1 }).width,
    originalHeight: page.getViewport({ scale: 1 }).height,
  };
}

export async function renderPageThumbnail(
  pdfDoc: pdfjsLib.PDFDocumentProxy,
  pageNumber: number,
  rotation: number = 0
): Promise<string> {
  const page = await pdfDoc.getPage(pageNumber);
  const viewport = page.getViewport({ scale: 0.3, rotation });

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) return '';

  canvas.height = viewport.height;
  canvas.width = viewport.width;

  await page.render({
    canvasContext: context,
    viewport: viewport,
  }).promise;

  const dataUrl = canvas.toDataURL('image/png');
  
  // Cleanup temporary thumbnail canvas context
  canvas.width = 0;
  canvas.height = 0;

  return dataUrl;
}
