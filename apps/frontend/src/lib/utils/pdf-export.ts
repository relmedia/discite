import { jsPDF } from 'jspdf';

/**
 * Export certificate to PDF
 * Tries multiple methods to handle various browser/CSS compatibility issues
 */
export async function exportCertificateToPDF(
  element: HTMLElement,
  filename: string = 'certificate.pdf'
): Promise<void> {
  if (!element) {
    throw new Error('Certificate element not found');
  }

  // Get element dimensions
  const rect = element.getBoundingClientRect();
  const width = rect.width || 794;
  const height = rect.height || 1123;

  // Try Method 1: SVG foreignObject (best quality, no external deps)
  try {
    const canvas = await elementToCanvas(element, width, height);
    const pdf = createPDFFromCanvas(canvas);
    pdf.save(filename);
    return;
  } catch (error) {
    console.warn('SVG foreignObject method failed, trying html2canvas...', error);
  }

  // Try Method 2: html2canvas with aggressive preprocessing
  try {
    const canvas = await captureWithHtml2Canvas(element, width, height);
    const pdf = createPDFFromCanvas(canvas);
    pdf.save(filename);
    return;
  } catch (error) {
    console.warn('html2canvas method failed, trying simple capture...', error);
  }

  // Try Method 3: Simple canvas capture
  try {
    const canvas = await simpleCanvasCapture(element, width, height);
    const pdf = createPDFFromCanvas(canvas);
    pdf.save(filename);
    return;
  } catch (error) {
    console.error('All export methods failed:', error);
    throw new Error('Failed to export certificate to PDF. Please try using your browser\'s print function (Ctrl+P).');
  }
}

/**
 * Convert HTML element to canvas using SVG foreignObject
 */
async function elementToCanvas(element: HTMLElement, width: number, height: number): Promise<HTMLCanvasElement> {
  // Clone the element
  const clone = element.cloneNode(true) as HTMLElement;
  
  // Apply inline styles with RGB colors
  applyInlineStyles(clone);
  
  // Serialize the HTML
  const serializer = new XMLSerializer();
  let htmlString = serializer.serializeToString(clone);
  
  // Escape special characters for SVG
  htmlString = htmlString
    .replace(/&(?!amp;|lt;|gt;|quot;|apos;)/g, '&amp;')
    .replace(/#/g, '%23');

  // Create SVG with foreignObject
  const scale = 2; // Higher quality
  const scaledWidth = width * scale;
  const scaledHeight = height * scale;
  
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${scaledWidth}" height="${scaledHeight}">
      <foreignObject width="100%" height="100%" style="transform: scale(${scale}); transform-origin: top left;">
        <div xmlns="http://www.w3.org/1999/xhtml" style="width: ${width}px; height: ${height}px; background: white;">
          ${htmlString}
        </div>
      </foreignObject>
    </svg>
  `;

  // Convert SVG to image
  const img = new Image();
  const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Failed to load SVG'));
    img.src = url;
  });

  // Draw to canvas
  const canvas = document.createElement('canvas');
  canvas.width = scaledWidth;
  canvas.height = scaledHeight;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }
  
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, scaledWidth, scaledHeight);
  ctx.drawImage(img, 0, 0);
  
  URL.revokeObjectURL(url);
  
  return canvas;
}

/**
 * Apply inline styles with converted RGB colors
 */
function applyInlineStyles(element: HTMLElement): void {
  const computed = window.getComputedStyle(element);
  
  // Color properties to convert
  const colorProps = [
    'color', 'background-color', 'border-color',
    'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color',
  ];

  // Layout properties to preserve
  const layoutProps = [
    'display', 'position', 'width', 'height', 'min-width', 'min-height',
    'max-width', 'max-height', 'padding', 'margin', 'border', 'border-radius',
    'font-size', 'font-family', 'font-weight', 'line-height', 'text-align',
    'flex-direction', 'justify-content', 'align-items', 'gap', 'flex',
    'background', 'box-sizing', 'overflow', 'white-space', 'text-transform',
    'letter-spacing', 'vertical-align', 'opacity'
  ];

  // Convert colors using canvas
  colorProps.forEach(prop => {
    const value = computed.getPropertyValue(prop);
    if (value && value !== 'transparent' && value !== 'rgba(0, 0, 0, 0)') {
      const rgb = colorToRgb(value);
      element.style.setProperty(prop, rgb, 'important');
    }
  });

  // Copy layout properties
  layoutProps.forEach(prop => {
    const value = computed.getPropertyValue(prop);
    if (value && value !== 'none' && value !== 'normal' && value !== 'auto') {
      // Convert any colors in compound properties like background
      const convertedValue = convertColorsInValue(value);
      element.style.setProperty(prop, convertedValue);
    }
  });

  // Process children
  Array.from(element.children).forEach(child => {
    if (child instanceof HTMLElement) {
      applyInlineStyles(child);
    }
  });
}

/**
 * Convert a color value to RGB using canvas - works with ANY color format
 */
function colorToRgb(color: string): string {
  if (!color || color === 'transparent' || color === 'none' || color === 'inherit' || color === 'initial') {
    return 'transparent';
  }

  // Already simple format
  if (color.startsWith('rgb(') || color.startsWith('rgba(') || color.startsWith('#')) {
    return color;
  }

  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      ctx.fillStyle = '#000000'; // Reset
      ctx.fillStyle = color; // This triggers browser color conversion
      ctx.fillRect(0, 0, 1, 1);
      const data = ctx.getImageData(0, 0, 1, 1).data;
      
      if (data[3] === 0) return 'transparent';
      if (data[3] === 255) return `rgb(${data[0]}, ${data[1]}, ${data[2]})`;
      return `rgba(${data[0]}, ${data[1]}, ${data[2]}, ${(data[3] / 255).toFixed(3)})`;
    }
  } catch {
    // Fallback
  }

  return '#000000';
}

/**
 * Convert colors in compound CSS values (like background with gradients)
 */
function convertColorsInValue(value: string): string {
  // Match color functions: lab(), lch(), oklch(), oklab(), color()
  const colorFunctionRegex = /(lab|lch|oklch|oklab|color)\([^)]+\)/gi;
  
  return value.replace(colorFunctionRegex, (match) => {
    return colorToRgb(match);
  });
}

/**
 * Method 2: Capture using html2canvas with preprocessing
 */
async function captureWithHtml2Canvas(element: HTMLElement, width: number, height: number): Promise<HTMLCanvasElement> {
  // Create a deep clone
  const clone = element.cloneNode(true) as HTMLElement;
  
  // Create container
  const container = document.createElement('div');
  container.style.cssText = `
    position: fixed;
    left: -10000px;
    top: 0;
    width: ${width}px;
    height: ${height}px;
    background: white;
    z-index: -9999;
  `;
  container.appendChild(clone);
  document.body.appendChild(container);

  try {
    // Convert all colors to RGB
    convertAllColors(clone);
    
    // Wait for styles
    await new Promise(resolve => setTimeout(resolve, 100));

    const html2canvas = (await import('html2canvas')).default;
    
    const canvas = await html2canvas(clone, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: '#ffffff',
      width: width,
      height: height,
      onclone: (clonedDoc) => {
        // Remove all style tags to avoid CSS parsing
        clonedDoc.querySelectorAll('style').forEach(s => s.remove());
        clonedDoc.querySelectorAll('link[rel="stylesheet"]').forEach(s => s.remove());
      },
    });

    return canvas;
  } finally {
    document.body.removeChild(container);
  }
}

/**
 * Method 3: Simple canvas capture using drawImage
 */
async function simpleCanvasCapture(element: HTMLElement, width: number, height: number): Promise<HTMLCanvasElement> {
  const scale = 2;
  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get canvas context');
  
  ctx.scale(scale, scale);
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, width, height);

  // Draw background
  const computed = window.getComputedStyle(element);
  const bgColor = colorToRgb(computed.backgroundColor);
  if (bgColor && bgColor !== 'transparent') {
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);
  }

  // Draw border if any
  const borderWidth = parseInt(computed.borderWidth) || 0;
  if (borderWidth > 0) {
    ctx.strokeStyle = colorToRgb(computed.borderColor) || '#000000';
    ctx.lineWidth = borderWidth;
    ctx.strokeRect(borderWidth / 2, borderWidth / 2, width - borderWidth, height - borderWidth);
  }

  // Draw text content
  ctx.fillStyle = colorToRgb(computed.color) || '#000000';
  ctx.font = `${computed.fontWeight} ${computed.fontSize} ${computed.fontFamily}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // Get text content
  const title = element.querySelector('h1, h2, [class*="title"]')?.textContent || '';
  const body = element.querySelector('p, [class*="body"]')?.textContent || '';
  
  if (title) {
    ctx.font = `bold 24px serif`;
    ctx.fillText(title, width / 2, height / 3);
  }
  
  if (body) {
    ctx.font = `16px serif`;
    ctx.fillText(body.substring(0, 100), width / 2, height / 2);
  }

  return canvas;
}

/**
 * Recursively convert all colors in an element tree to RGB
 */
function convertAllColors(element: HTMLElement): void {
  const computed = window.getComputedStyle(element);
  
  const colorProps = [
    'color', 'background-color', 'border-color',
    'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color',
    'outline-color', 'text-decoration-color'
  ];

  colorProps.forEach(prop => {
    const value = computed.getPropertyValue(prop);
    if (value && value !== 'transparent' && value !== 'rgba(0, 0, 0, 0)' && value !== 'none') {
      const rgb = colorToRgb(value);
      if (rgb) {
        element.style.setProperty(prop, rgb, 'important');
      }
    }
  });

  // Handle background (might have gradients)
  const bg = computed.getPropertyValue('background');
  if (bg && bg.includes('lab(') || bg.includes('oklch(')) {
    element.style.setProperty('background', colorToRgb(computed.backgroundColor) || 'white', 'important');
  }

  Array.from(element.children).forEach(child => {
    if (child instanceof HTMLElement) {
      convertAllColors(child);
    }
  });
}

/**
 * Create PDF from canvas
 */
function createPDFFromCanvas(canvas: HTMLCanvasElement): jsPDF {
  const a4Width = 210;
  const a4Height = 297;

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Calculate dimensions to fit A4
  const imgWidth = a4Width;
  const imgHeight = (canvas.height * a4Width) / canvas.width;

  let finalWidth = imgWidth;
  let finalHeight = imgHeight;
  
  if (imgHeight > a4Height) {
    finalHeight = a4Height;
    finalWidth = (canvas.width * a4Height) / canvas.height;
  }

  const xOffset = (a4Width - finalWidth) / 2;
  const yOffset = (a4Height - finalHeight) / 2;

  const imgData = canvas.toDataURL('image/png', 1.0);
  pdf.addImage(imgData, 'PNG', xOffset, yOffset, finalWidth, finalHeight);

  return pdf;
}

/**
 * Render certificate from data and export to PDF
 */
export async function exportCertificateDataToPDF(
  certificateData: {
    studentName: string;
    courseName: string;
    completionDate: string;
    instructorName?: string;
    certificateNumber: string;
    template?: {
      name: string;
      design?: {
        layout?: string;
        primaryColor?: string;
        secondaryColor?: string;
        fontFamily?: string;
        borderStyle?: string;
        borderThickness?: number;
        borderColor?: string;
        logoUrl?: string;
        companyName?: string;
        companyAddress?: string;
        companyContact?: string;
      };
      titleText?: string;
      bodyTemplate?: string;
      signatureText?: string;
      signatureImageUrl?: string;
      issuedByText?: string;
    };
  },
  filename: string = 'certificate.pdf'
): Promise<void> {
  // Create a temporary container
  const container = document.createElement('div');
  container.style.cssText = `
    position: fixed;
    left: -10000px;
    top: 0;
    width: 210mm;
    min-height: 297mm;
    background: white;
    z-index: -1;
  `;
  document.body.appendChild(container);

  try {
    const React = await import('react');
    const { createRoot } = await import('react-dom/client');
    const { CertificateRenderer } = await import('@/components/certificates/certificate-renderer');

    // Render the certificate
    await new Promise<void>((resolve) => {
      const root = createRoot(container);
      root.render(
        React.createElement(CertificateRenderer, {
          certificate: certificateData as any,
        })
      );
      setTimeout(resolve, 500);
    });

    // Find the rendered certificate element
    let certificateElement = container.querySelector('[data-certificate-element="true"]') as HTMLElement;
    
    if (!certificateElement) {
      certificateElement = container.firstElementChild as HTMLElement;
    }
    
    if (!certificateElement) {
      throw new Error('Certificate element not found after render');
    }

    await exportCertificateToPDF(certificateElement, filename);

  } finally {
    document.body.removeChild(container);
  }
}

/**
 * Export certificate as PNG image
 */
export async function exportCertificateAsImage(
  element: HTMLElement,
  filename: string = 'certificate.png'
): Promise<void> {
  try {
    if (!element) {
      throw new Error('Certificate element not found');
    }

    const rect = element.getBoundingClientRect();
    const canvas = await elementToCanvas(element, rect.width, rect.height);

    const link = document.createElement('a');
    link.download = filename;
    link.href = canvas.toDataURL('image/png', 1.0);
    link.click();

  } catch (error) {
    console.error('Error exporting certificate as image:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`Failed to export certificate as image: ${errorMessage}`);
  }
}
