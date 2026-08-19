export type ActiveTool = 
  | 'select' 
  | 'hand' 
  | 'text'
  | 'edit-text'
  | 'signature' 
  | 'draw' 
  | 'highlight' 
  | 'eraser';

export type AnnotationType = 'text' | 'signature' | 'draw' | 'highlight';

export interface Point {
  x: number;
  y: number;
}

export interface AnnotationItem {
  id: string;
  pageIndex: number;
  type: AnnotationType;
  x: number; // percentage 0-100 relative to page width
  y: number; // percentage 0-100 relative to page height
  width?: number; // percentage or px
  height?: number; // percentage or px
  content?: string; // for text content
  fontSize?: number; // px
  fontFamily?: string;
  color?: string; // hex/rgb
  opacity?: number;
  signatureUrl?: string; // data URI of signature image
  points?: Point[]; // for drawing/highlight path
  strokeWidth?: number;
  
  // PDF Text Editing & Redaction properties
  isExistingText?: boolean;
  whiteoutWidth?: number; // percentage
  whiteoutHeight?: number; // percentage
}

export interface PageState {
  id: string;
  originalIndex: number;
  rotation: number; // 0, 90, 180, 270
  deleted: boolean;
}

export interface SavedSignature {
  id: string;
  dataUrl: string;
  type: 'draw' | 'type' | 'upload';
  name: string;
}

export interface PDFDocumentInfo {
  name: string;
  numPages: number;
  fileBuffer: ArrayBuffer;
}
