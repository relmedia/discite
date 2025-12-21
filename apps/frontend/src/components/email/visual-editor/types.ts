import { EmailElement, EmailElementStyle, EmailElementType, EmailDesign } from '@/lib/api/email';

export type { EmailElement, EmailElementStyle, EmailElementType, EmailDesign };

export interface EditorState {
  elements: EmailElement[];
  selectedId: string | null;
  zoom: number;
  showPreview: boolean;
}

export interface EditorAction {
  type: 'ADD_ELEMENT' | 'UPDATE_ELEMENT' | 'DELETE_ELEMENT' | 'SELECT_ELEMENT' | 'MOVE_ELEMENT' | 'REORDER_ELEMENTS' | 'SET_ZOOM' | 'TOGGLE_PREVIEW';
  payload?: any;
}

export const DEFAULT_TEXT_STYLE: EmailElementStyle = {
  fontSize: 16,
  fontFamily: 'Arial, sans-serif',
  fontWeight: 'normal',
  fontStyle: 'normal',
  textDecoration: 'none',
  textAlign: 'left',
  color: '#333333',
  lineHeight: 1.5,
};

export const DEFAULT_HEADING_STYLE: EmailElementStyle = {
  ...DEFAULT_TEXT_STYLE,
  fontSize: 24,
  fontWeight: 'bold',
};

export const DEFAULT_BUTTON_STYLE: EmailElementStyle = {
  ...DEFAULT_TEXT_STYLE,
  fontSize: 16,
  fontWeight: 'bold',
  textAlign: 'center',
  color: '#ffffff',
  backgroundColor: '#007bff',
  borderRadius: 4,
  padding: 12,
};

export const FONT_OPTIONS = [
  { value: 'Arial, sans-serif', label: 'Arial' },
  { value: 'Georgia, serif', label: 'Georgia' },
  { value: 'Times New Roman, serif', label: 'Times New Roman' },
  { value: 'Helvetica, sans-serif', label: 'Helvetica' },
  { value: 'Verdana, sans-serif', label: 'Verdana' },
  { value: 'Trebuchet MS, sans-serif', label: 'Trebuchet MS' },
  { value: 'Courier New, monospace', label: 'Courier New' },
];

export const FONT_SIZE_OPTIONS = [
  { value: 10, label: '10px' },
  { value: 12, label: '12px' },
  { value: 14, label: '14px' },
  { value: 16, label: '16px' },
  { value: 18, label: '18px' },
  { value: 20, label: '20px' },
  { value: 24, label: '24px' },
  { value: 28, label: '28px' },
  { value: 32, label: '32px' },
  { value: 36, label: '36px' },
  { value: 48, label: '48px' },
];

export function createDefaultElement(type: EmailElementType, content: string = '', order: number = 0): EmailElement {
  const id = `el_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  switch (type) {
    case 'heading':
      return {
        id,
        type,
        content: content || 'Heading Text',
        style: { ...DEFAULT_HEADING_STYLE },
        order,
      };
    case 'text':
      return {
        id,
        type,
        content: content || 'Enter your text here. You can use placeholders like {{userName}} that will be replaced when sending.',
        style: { ...DEFAULT_TEXT_STYLE },
        order,
      };
    case 'button':
      return {
        id,
        type,
        content: content || 'Click Here',
        style: { ...DEFAULT_BUTTON_STYLE },
        properties: { url: 'https://example.com' },
        order,
      };
    case 'image':
      return {
        id,
        type,
        content: content || '',
        style: { ...DEFAULT_TEXT_STYLE, textAlign: 'center' },
        properties: { alt: 'Image', width: 'auto' },
        order,
      };
    case 'divider':
      return {
        id,
        type,
        content: '',
        style: { ...DEFAULT_TEXT_STYLE, color: '#e5e5e5' },
        order,
      };
    case 'spacer':
      return {
        id,
        type,
        content: '',
        style: { ...DEFAULT_TEXT_STYLE },
        properties: { height: 20 },
        order,
      };
    case 'footer':
      return {
        id,
        type,
        content: content || '© 2024 Your Company. All rights reserved.\n{{unsubscribeUrl}}',
        style: { ...DEFAULT_TEXT_STYLE, fontSize: 12, color: '#666666', textAlign: 'center' },
        order,
      };
    case 'social':
      return {
        id,
        type,
        content: '',
        style: { ...DEFAULT_TEXT_STYLE, textAlign: 'center' },
        properties: {
          facebook: '',
          twitter: '',
          linkedin: '',
          instagram: '',
        },
        order,
      };
    default:
      return {
        id,
        type: 'text',
        content: content || 'Text',
        style: { ...DEFAULT_TEXT_STYLE },
        order,
      };
  }
}

export function generateElementId(): string {
  return `el_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export const ELEMENT_TYPES: { type: EmailElementType; label: string; icon: string }[] = [
  { type: 'heading', label: 'Heading', icon: 'Heading' },
  { type: 'text', label: 'Text Block', icon: 'Type' },
  { type: 'button', label: 'Button', icon: 'MousePointer' },
  { type: 'image', label: 'Image', icon: 'Image' },
  { type: 'divider', label: 'Divider', icon: 'Minus' },
  { type: 'spacer', label: 'Spacer', icon: 'MoveVertical' },
  { type: 'social', label: 'Social Links', icon: 'Share2' },
  { type: 'footer', label: 'Footer', icon: 'LayoutList' },
];
