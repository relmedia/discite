"use client";

import { forwardRef } from "react";
import { Certificate, CertificateTemplate, CertificateElement } from "@/lib/api/certificates";

interface CertificateRendererProps {
  certificate: Certificate;
  template?: CertificateTemplate;
}

// A4 dimensions
const A4_WIDTH_PX = 794;
const A4_HEIGHT_PX = 1123;

export const CertificateRenderer = forwardRef<HTMLDivElement, CertificateRendererProps>(
  ({ certificate, template }, ref) => {
  const formatDate = (dateString: string | Date) => {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Use template if provided, otherwise fallback to certificate.template
  const certTemplate = template || certificate.template;

  // Replace placeholders in text content
  const replacePlaceholders = (text: string): string => {
    return text
      .replace(/\{\{studentName\}\}/g, certificate.studentName)
      .replace(/\{\{courseName\}\}/g, certificate.courseName)
      .replace(/\{\{completionDate\}\}/g, formatDate(certificate.completionDate))
      .replace(/\{\{issueDate\}\}/g, formatDate(certificate.issueDate))
      .replace(/\{\{instructorName\}\}/g, certificate.instructorName || "")
      .replace(/\{\{certificateNumber\}\}/g, certificate.certificateNumber)
      .replace(/\{\{personalNumber\}\}/g, certificate.personalNumber || "")
      .replace(/\{\{finalGrade\}\}/g, certificate.finalGrade?.toString() || "")
      .replace(/\{\{expiryDate\}\}/g, certificate.expiryDate ? formatDate(certificate.expiryDate) : "Never");
  };

  // Render visual editor elements
  const renderVisualEditorElement = (element: CertificateElement) => {
    const { style, position, size, content, type, visible } = element;
    
    if (visible === false) return null;

    const processedContent = type === 'text' || type === 'placeholder' 
      ? replacePlaceholders(content) 
      : content;

    const elementStyle: React.CSSProperties = {
      position: 'absolute',
      left: `${position.x}%`,
      top: `${position.y}%`,
      transform: `translate(-50%, -50%) ${style.rotation ? `rotate(${style.rotation}deg)` : ''}`,
      fontSize: `${style.fontSize}px`,
      fontFamily: style.fontFamily,
      fontWeight: style.fontWeight,
      fontStyle: style.fontStyle,
      textDecoration: style.textDecoration,
      textAlign: style.textAlign as any,
      color: style.color,
      backgroundColor: style.backgroundColor || 'transparent',
      letterSpacing: style.letterSpacing ? `${style.letterSpacing}px` : undefined,
      lineHeight: style.lineHeight,
      opacity: style.opacity ?? 1,
      width: type === 'image' || type === 'shape' || type === 'line' 
        ? `${size.width}px` 
        : 'auto',
      maxWidth: type === 'text' || type === 'placeholder' ? `${size.width}px` : undefined,
      height: size.height ? `${size.height}px` : 'auto',
      zIndex: element.zIndex ?? 0,
      whiteSpace: 'pre-wrap',
    };

    switch (type) {
      case 'text':
      case 'placeholder':
        return (
          <div key={element.id} style={elementStyle}>
            {processedContent}
          </div>
        );
      case 'image':
        return content ? (
          <div key={element.id} style={elementStyle}>
            <img 
              src={content} 
              alt="" 
              style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
            />
          </div>
        ) : null;
      case 'shape':
        return (
          <div 
            key={element.id} 
            style={{
              ...elementStyle,
              backgroundColor: style.backgroundColor || '#e5e7eb',
              borderRadius: '4px',
            }}
          />
        );
      case 'line':
        return (
          <div 
            key={element.id} 
            style={{
              ...elementStyle,
              backgroundColor: style.color || '#000000',
            }}
          />
        );
      default:
        return null;
    }
  };

  // Render visual editor template
  const renderVisualEditorTemplate = () => {
    const elements = certTemplate!.design.elements || [];
    const bgColor = certTemplate!.design.backgroundColor || "#FFFFFF";
    const bgImage = certTemplate!.design.backgroundImageUrl;

    return (
      <div
        ref={ref}
        data-certificate-element="true"
        className="relative mx-auto shadow-lg print:shadow-none"
        style={{
          width: `${A4_WIDTH_PX}px`,
          height: `${A4_HEIGHT_PX}px`,
          backgroundColor: bgColor,
          backgroundImage: bgImage ? `url(${bgImage})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {elements
          .filter((el) => el.visible !== false)
          .sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0))
          .map(renderVisualEditorElement)}
      </div>
    );
  };

  if (!certTemplate) {
    // Fallback to basic rendering if no template
    return (
      <div 
        ref={ref}
        data-certificate-element="true"
        className="w-full mx-auto shadow-lg bg-white rounded-lg border-4 border-double border-gray-300 p-8 flex flex-col items-center justify-center text-center print:shadow-none print:rounded-none"
        style={{
          width: '210mm',
          minHeight: '297mm',
          aspectRatio: '210 / 297',
        }}
      >
        <h2 className="text-2xl font-serif font-bold text-gray-800 mb-4">
          Certificate of Completion
        </h2>
        <p className="text-gray-600 mb-2">This certifies that</p>
        <p className="text-xl font-semibold text-gray-800 mb-4">
          {certificate.studentName}
        </p>
        <p className="text-gray-600 mb-2">has successfully completed</p>
        <p className="text-lg font-semibold text-gray-800 mb-4">
          {certificate.courseName}
        </p>
        <p className="text-sm text-gray-500">
          Completed on {formatDate(certificate.completionDate)}
        </p>
      </div>
    );
  }

  // Check if this is a visual editor template
  if (certTemplate.design.useVisualEditor && certTemplate.design.elements && certTemplate.design.elements.length > 0) {
    return renderVisualEditorTemplate();
  }

  const sampleData = {
    studentName: certificate.studentName,
    courseName: certificate.courseName,
    completionDate: formatDate(certificate.completionDate),
    instructorName: certificate.instructorName || certTemplate.signatureText || "",
    certificateNumber: certificate.certificateNumber,
    personalNumber: certificate.personalNumber, // Keep undefined if not provided
  };

  // Replace placeholders - personalNumber stays as {{personalNumber}} if not provided
  let processedBody = certTemplate.bodyTemplate
    .replace(/\{\{studentName\}\}/g, sampleData.studentName)
    .replace(/\{\{courseName\}\}/g, sampleData.courseName)
    .replace(/\{\{completionDate\}\}/g, sampleData.completionDate)
    .replace(/\{\{instructorName\}\}/g, sampleData.instructorName)
    .replace(/\{\{certificateNumber\}\}/g, sampleData.certificateNumber);
  
  // Only replace personalNumber if it has a real value
  if (sampleData.personalNumber) {
    processedBody = processedBody.replace(/\{\{personalNumber\}\}/g, sampleData.personalNumber);
  }

  const getBorderStyle = () => {
    const thickness = certTemplate.design.borderThickness || 4;
    
    if (certTemplate.design.borderStyle === "none") {
      return {};
    }

    const borderColor = certTemplate.design.borderColor || certTemplate.design.primaryColor || "#000000";
    const baseStyle: React.CSSProperties = {
      borderWidth: `${thickness}px`,
      borderColor: borderColor,
    };

    switch (certTemplate.design.borderStyle) {
      case "simple":
        return {
          ...baseStyle,
          borderStyle: "solid",
        };
      case "ornate":
        return {
          ...baseStyle,
          borderStyle: "double",
        };
      case "modern":
        return {
          borderLeftWidth: `${thickness}px`,
          borderLeftColor: borderColor,
          borderLeftStyle: "solid" as const,
        };
      case "all-around":
        return {
          ...baseStyle,
          borderStyle: "solid",
        };
      default:
        return baseStyle;
    }
  };

  const borderStyle = getBorderStyle();

  // Swedish/Professional layout
  if (certTemplate.design.layout === "swedish") {
    return (
      <div
        ref={ref}
        data-certificate-element="true"
        className="w-full mx-auto shadow-lg print:shadow-none"
        style={{
          width: '210mm',
          minHeight: '297mm',
          aspectRatio: '210 / 297',
          backgroundColor: certTemplate.design.backgroundColor || "#FFFFFF",
          backgroundImage: certTemplate.design.backgroundImageUrl ? `url(${certTemplate.design.backgroundImageUrl})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
          fontFamily: certTemplate.design.fontFamily || "serif",
          ...borderStyle,
        }}
      >
        <div className="h-full flex flex-col p-8 md:p-12">
          {/* Logo at top */}
          {certTemplate.design.logoUrl && (
            <div className="text-center mb-6">
              <img
                src={certTemplate.design.logoUrl}
                alt="Logo"
                className="h-16 md:h-20 mx-auto object-contain"
              />
            </div>
          )}

          {/* Header - Title */}
          <div className="text-center mb-8">
            <h1
              className="text-xl md:text-2xl font-bold uppercase tracking-wide mb-2"
              style={{ color: certTemplate.design.primaryColor || "#000000" }}
            >
              {certTemplate.titleText}
            </h1>
          </div>

          {/* Issued By */}
          {certTemplate.issuedByText && (
            <div className="text-center mb-6">
              <p className="text-sm md:text-base" style={{ color: certTemplate.design.secondaryColor || "#333333" }}>
                {certTemplate.issuedByText}
              </p>
            </div>
          )}

          {/* Recipient Name - Large and prominent */}
          <div className="text-center mb-6">
            <p className="text-lg md:text-xl font-semibold" style={{ color: certTemplate.design.primaryColor || "#000000" }}>
              {sampleData.studentName}
            </p>
            {certTemplate.design.showPersonalNumber && sampleData.personalNumber && (
              <p className="text-sm mt-2" style={{ color: certTemplate.design.secondaryColor || "#333333" }}>
                Personal Number: {sampleData.personalNumber}
              </p>
            )}
          </div>

          {/* Body Content */}
          {certTemplate.bodyTemplate && (
            <div
              className="text-center mb-6 text-sm md:text-base leading-relaxed whitespace-pre-line"
              style={{ color: certTemplate.design.secondaryColor || "#333333" }}
            >
              {processedBody}
            </div>
          )}

          {/* Compliance Text */}
          {certTemplate.design.complianceText && (
            <div className="text-center mb-6">
              <p className="text-xs md:text-sm italic" style={{ color: certTemplate.design.secondaryColor || "#666666" }}>
                {certTemplate.design.complianceText}
              </p>
            </div>
          )}

          {/* Issued Date */}
          <div className="text-center mb-6 flex-1 flex items-end justify-center">
            <p className="text-sm md:text-base font-semibold" style={{ color: certTemplate.design.primaryColor || "#000000" }}>
              UTFÄRDAT {sampleData.completionDate}
            </p>
          </div>

          {/* Company Information Footer */}
          {(certTemplate.design.companyName || certTemplate.design.companyAddress || certTemplate.design.companyContact) && (
            <div className="mt-auto pt-6 border-t text-center text-xs md:text-sm" style={{ borderColor: certTemplate.design.secondaryColor || "#CCCCCC", color: certTemplate.design.secondaryColor || "#666666" }}>
              {certTemplate.design.companyName && <p className="font-semibold mb-1">{certTemplate.design.companyName}</p>}
              {certTemplate.design.companyAddress && <p className="mb-1 whitespace-pre-line">{certTemplate.design.companyAddress}</p>}
              {certTemplate.design.companyContact && <p>{certTemplate.design.companyContact}</p>}
            </div>
          )}

          {/* Certificate Number - Small at bottom */}
          <p className="text-xs mt-4 text-center opacity-60" style={{ color: certTemplate.design.secondaryColor || "#999999" }}>
            {sampleData.certificateNumber}
          </p>
        </div>
      </div>
    );
  }

  // Classic/Modern/Minimal/Elegant layouts
  return (
    <div
      ref={ref}
      data-certificate-element="true"
      className="w-full mx-auto rounded-lg shadow-lg print:shadow-none print:rounded-none"
      style={{
        width: '210mm',
        minHeight: '297mm',
        aspectRatio: '210 / 297',
        backgroundColor: certTemplate.design.backgroundColor || "#FFFFFF",
        backgroundImage: certTemplate.design.backgroundImageUrl ? `url(${certTemplate.design.backgroundImageUrl})` : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
        fontFamily: certTemplate.design.fontFamily || "serif",
        ...borderStyle,
      }}
    >
      <div className="h-full flex flex-col items-center p-8 md:p-12 text-center">
        {/* Logo */}
        {certTemplate.design.logoUrl && (
          <img
            src={certTemplate.design.logoUrl}
            alt="Logo"
            className="h-16 md:h-20 mb-6 object-contain"
          />
        )}

        {/* Title */}
        <h1
          className="text-3xl md:text-4xl font-bold mb-6 tracking-wide"
          style={{ color: certTemplate.design.primaryColor || "#000000" }}
        >
          {certTemplate.titleText}
        </h1>

        {/* Body */}
        <div
          className="text-base md:text-lg leading-relaxed whitespace-pre-line max-w-2xl mb-6 flex-1 flex items-center"
          style={{ color: certTemplate.design.secondaryColor || "#333333" }}
        >
          <div>{processedBody}</div>
        </div>

        {/* Compliance Text */}
        {certTemplate.design.complianceText && (
          <div className="mb-6">
            <p
              className="text-xs md:text-sm italic"
              style={{ color: certTemplate.design.secondaryColor || "#666666" }}
            >
              {certTemplate.design.complianceText}
            </p>
          </div>
        )}

        {/* Completion Date */}
        <div className="mb-6">
          <p
            className="text-sm md:text-base"
            style={{ color: certTemplate.design.primaryColor || "#000000" }}
          >
            Completed on {sampleData.completionDate}
          </p>
        </div>

        {/* Signature */}
        {certTemplate.signatureText && (
          <div className="mb-6">
            {certTemplate.signatureImageUrl && (
              <img
                src={certTemplate.signatureImageUrl}
                alt="Signature"
                className="h-12 md:h-16 mx-auto mb-2 object-contain"
              />
            )}
            <div
              className="border-t pt-3 px-12 text-sm md:text-base"
              style={{
                borderColor: certTemplate.design.secondaryColor || "#CCCCCC",
                color: certTemplate.design.secondaryColor || "#666666",
              }}
            >
              {certTemplate.signatureText}
            </div>
          </div>
        )}

        {/* Company Information Footer */}
        {(certTemplate.design.companyName || certTemplate.design.companyAddress || certTemplate.design.companyContact) && (
          <div
            className="mt-auto pt-4 border-t w-full text-center text-xs md:text-sm"
            style={{
              borderColor: certTemplate.design.secondaryColor || "#CCCCCC",
              color: certTemplate.design.secondaryColor || "#666666",
            }}
          >
            {certTemplate.design.companyName && <p className="font-semibold mb-1">{certTemplate.design.companyName}</p>}
            {certTemplate.design.companyAddress && <p className="mb-1 whitespace-pre-line">{certTemplate.design.companyAddress}</p>}
            {certTemplate.design.companyContact && <p>{certTemplate.design.companyContact}</p>}
          </div>
        )}

        {/* Certificate Number */}
        <p
          className="mt-4 text-xs opacity-60"
          style={{ color: certTemplate.design.secondaryColor || "#999999" }}
        >
          Certificate #{sampleData.certificateNumber}
        </p>
      </div>
    </div>
  );
  }
);

CertificateRenderer.displayName = "CertificateRenderer";

