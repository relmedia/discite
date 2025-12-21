import { CertificateElement, CertificateElementStyle, CertificateElementType } from "@/lib/api/certificates";

export type { CertificateElement, CertificateElementStyle, CertificateElementType };

export interface EditorState {
  elements: CertificateElement[];
  selectedId: string | null;
  zoom: number;
  showGrid: boolean;
  snapToGrid: boolean;
  gridSize: number;
}

export interface EditorAction {
  type: 'ADD_ELEMENT' | 'UPDATE_ELEMENT' | 'DELETE_ELEMENT' | 'SELECT_ELEMENT' | 'MOVE_ELEMENT' | 'REORDER_ELEMENTS' | 'SET_ZOOM' | 'TOGGLE_GRID' | 'TOGGLE_SNAP';
  payload?: any;
}

export const DEFAULT_TEXT_STYLE: CertificateElementStyle = {
  fontSize: 16,
  fontFamily: 'Georgia',
  fontWeight: 'normal',
  fontStyle: 'normal',
  textDecoration: 'none',
  textAlign: 'center',
  color: '#000000',
  letterSpacing: 0,
  lineHeight: 1.4,
  opacity: 1,
  rotation: 0,
};

export const DEFAULT_TITLE_STYLE: CertificateElementStyle = {
  ...DEFAULT_TEXT_STYLE,
  fontSize: 36,
  fontWeight: 'bold',
  letterSpacing: 2,
};

export const DEFAULT_HEADING_STYLE: CertificateElementStyle = {
  ...DEFAULT_TEXT_STYLE,
  fontSize: 24,
  fontWeight: 'bold',
};

export const DEFAULT_SUBTITLE_STYLE: CertificateElementStyle = {
  ...DEFAULT_TEXT_STYLE,
  fontSize: 14,
  color: '#666666',
};

// A4 dimensions in mm: 210mm x 297mm
// At 96 DPI: 794px x 1123px (portrait)
// We'll use a scaled version for the editor
export const A4_WIDTH_MM = 210;
export const A4_HEIGHT_MM = 297;
export const A4_WIDTH_PX = 794;
export const A4_HEIGHT_PX = 1123;

// Editor canvas scaling
export const EDITOR_SCALE = 0.7; // Scale for viewing in editor
export const CANVAS_WIDTH = A4_WIDTH_PX * EDITOR_SCALE;
export const CANVAS_HEIGHT = A4_HEIGHT_PX * EDITOR_SCALE;

export const PLACEHOLDER_VARIABLES = [
  { key: '{{studentName}}', label: 'Student Name', description: 'Full name of the certificate recipient' },
  { key: '{{courseName}}', label: 'Course Name', description: 'Name of the completed course' },
  { key: '{{completionDate}}', label: 'Completion Date', description: 'Date when the course was completed' },
  { key: '{{issueDate}}', label: 'Issue Date', description: 'Date when the certificate was issued' },
  { key: '{{certificateNumber}}', label: 'Certificate Number', description: 'Unique certificate identifier' },
  { key: '{{instructorName}}', label: 'Instructor Name', description: 'Name of the course instructor' },
  { key: '{{personalNumber}}', label: 'Personal Number', description: 'Swedish personal ID number (personnummer)' },
  { key: '{{finalGrade}}', label: 'Final Grade', description: 'Final grade or score' },
  { key: '{{expiryDate}}', label: 'Expiry Date', description: 'Certificate expiration date' },
];

export const FONT_OPTIONS = [
  { value: 'Georgia', label: 'Georgia' },
  { value: 'serif', label: 'Serif' },
  { value: 'Times New Roman', label: 'Times New Roman' },
  { value: 'Palatino', label: 'Palatino' },
  { value: 'Garamond', label: 'Garamond' },
  { value: 'sans-serif', label: 'Sans Serif' },
  { value: 'Arial', label: 'Arial' },
  { value: 'Helvetica', label: 'Helvetica' },
  { value: 'Verdana', label: 'Verdana' },
  { value: 'Trebuchet MS', label: 'Trebuchet MS' },
  { value: 'monospace', label: 'Monospace' },
  { value: 'Courier New', label: 'Courier New' },
];

export function createDefaultElement(type: CertificateElementType, content: string = ''): Omit<CertificateElement, 'id'> {
  const baseElement = {
    type,
    content,
    position: { x: 50, y: 50 },
    size: { width: 200 },
    style: { ...DEFAULT_TEXT_STYLE },
    locked: false,
    visible: true,
    zIndex: 0,
  };

  switch (type) {
    case 'text':
      return {
        ...baseElement,
        content: content || 'Double click to edit',
        style: { ...DEFAULT_TEXT_STYLE },
      };
    case 'placeholder':
      return {
        ...baseElement,
        content: content || '{{studentName}}',
        style: { ...DEFAULT_HEADING_STYLE },
      };
    case 'image':
      return {
        ...baseElement,
        content: content || '',
        size: { width: 150, height: 100 },
        style: { ...DEFAULT_TEXT_STYLE, opacity: 1 },
      };
    case 'shape':
      return {
        ...baseElement,
        content: 'rectangle',
        size: { width: 100, height: 50 },
        style: { ...DEFAULT_TEXT_STYLE, backgroundColor: '#e5e7eb' },
      };
    case 'line':
      return {
        ...baseElement,
        content: 'horizontal',
        size: { width: 200, height: 2 },
        style: { ...DEFAULT_TEXT_STYLE, backgroundColor: '#000000' },
      };
    default:
      return baseElement;
  }
}

export function generateElementId(): string {
  return `el_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

