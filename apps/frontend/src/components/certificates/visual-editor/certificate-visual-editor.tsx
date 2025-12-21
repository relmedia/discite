"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Save,
  Eye,
  EyeOff,
  FileDown,
  ZoomIn,
  ZoomOut,
  Grid3X3,
  Undo,
  Redo,
  Loader2,
} from "lucide-react";

import { StyleToolbar } from "./style-toolbar";
import { ElementPalette } from "./element-palette";
import { PropertiesPanel } from "./properties-panel";
import { DraggableElement } from "./draggable-element";
import {
  CertificateElement,
  CertificateElementStyle,
  A4_WIDTH_PX,
  A4_HEIGHT_PX,
  generateElementId,
} from "./types";
import { CertificateTemplate, CertificateDesign, certificatesApi, CreateCertificateTemplateDto } from "@/lib/api/certificates";
import { exportCertificateToPDF } from "@/lib/utils/pdf-export";

interface CertificateVisualEditorProps {
  template?: CertificateTemplate;
  isEditing?: boolean;
}

export function CertificateVisualEditor({ template, isEditing }: CertificateVisualEditorProps) {
  const router = useRouter();
  const canvasRef = useRef<HTMLDivElement>(null);
  const printCanvasRef = useRef<HTMLDivElement>(null);
  
  // Form state
  const [templateName, setTemplateName] = useState(template?.name || "");
  const [templateDescription, setTemplateDescription] = useState(template?.description || "");
  const [isDefault, setIsDefault] = useState(template?.isDefault || false);
  
  // Canvas state
  const [elements, setElements] = useState<CertificateElement[]>(
    template?.design?.elements || []
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(0.7);
  const [showGrid, setShowGrid] = useState(true);
  const [backgroundColor, setBackgroundColor] = useState(
    template?.design?.backgroundColor || "#FFFFFF"
  );
  const [backgroundImage, setBackgroundImage] = useState(
    template?.design?.backgroundImageUrl || ""
  );
  
  // UI state
  const [saving, setSaving] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [exporting, setExporting] = useState(false);
  
  // History for undo/redo
  const [history, setHistory] = useState<CertificateElement[][]>([elements]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const selectedElement = elements.find((e) => e.id === selectedId) || null;

  // Add to history on element change
  const addToHistory = useCallback((newElements: CertificateElement[]) => {
    setHistory((prev) => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(newElements);
      return newHistory.slice(-50); // Keep last 50 states
    });
    setHistoryIndex((prev) => Math.min(prev + 1, 49));
  }, [historyIndex]);

  // Undo
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setElements(history[historyIndex - 1]);
    }
  }, [history, historyIndex]);

  // Redo
  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setElements(history[historyIndex + 1]);
    }
  }, [history, historyIndex]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z') {
          e.preventDefault();
          if (e.shiftKey) {
            handleRedo();
          } else {
            handleUndo();
          }
        }
        if (e.key === 'd' && selectedElement) {
          e.preventDefault();
          handleDuplicate();
        }
        if (e.key === 's') {
          e.preventDefault();
          handleSave();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo, selectedElement]);

  // Add element
  const handleAddElement = useCallback((element: CertificateElement) => {
    const newElements = [...elements, { ...element, zIndex: elements.length }];
    setElements(newElements);
    addToHistory(newElements);
    setSelectedId(element.id);
  }, [elements, addToHistory]);

  // Update element
  const handleUpdateElement = useCallback((id: string, updates: Partial<CertificateElement>) => {
    const newElements = elements.map((el) =>
      el.id === id ? { ...el, ...updates } : el
    );
    setElements(newElements);
  }, [elements]);

  // Update element with history
  const handleUpdateElementWithHistory = useCallback((id: string, updates: Partial<CertificateElement>) => {
    const newElements = elements.map((el) =>
      el.id === id ? { ...el, ...updates } : el
    );
    setElements(newElements);
    addToHistory(newElements);
  }, [elements, addToHistory]);

  // Update element style
  const handleStyleChange = useCallback((style: Partial<CertificateElementStyle>) => {
    if (!selectedId) return;
    const newElements = elements.map((el) =>
      el.id === selectedId ? { ...el, style: { ...el.style, ...style } } : el
    );
    setElements(newElements);
  }, [elements, selectedId]);

  // Update style with history
  const handleStyleChangeWithHistory = useCallback((style: Partial<CertificateElementStyle>) => {
    if (!selectedId) return;
    const newElements = elements.map((el) =>
      el.id === selectedId ? { ...el, style: { ...el.style, ...style } } : el
    );
    setElements(newElements);
    addToHistory(newElements);
  }, [elements, selectedId, addToHistory]);

  // Delete element
  const handleDeleteElement = useCallback(() => {
    if (!selectedId) return;
    const newElements = elements.filter((el) => el.id !== selectedId);
    setElements(newElements);
    addToHistory(newElements);
    setSelectedId(null);
  }, [elements, selectedId, addToHistory]);

  // Duplicate element
  const handleDuplicate = useCallback(() => {
    if (!selectedElement) return;
    const newElement: CertificateElement = {
      ...selectedElement,
      id: generateElementId(),
      position: {
        x: Math.min(selectedElement.position.x + 3, 95),
        y: Math.min(selectedElement.position.y + 3, 95),
      },
      zIndex: elements.length,
    };
    const newElements = [...elements, newElement];
    setElements(newElements);
    addToHistory(newElements);
    setSelectedId(newElement.id);
  }, [selectedElement, elements, addToHistory]);

  // Move element up (increase z-index)
  const handleMoveUp = useCallback(() => {
    if (!selectedId) return;
    const maxZ = Math.max(...elements.map((e) => e.zIndex || 0));
    handleUpdateElementWithHistory(selectedId, { zIndex: maxZ + 1 });
  }, [selectedId, elements, handleUpdateElementWithHistory]);

  // Move element down (decrease z-index)
  const handleMoveDown = useCallback(() => {
    if (!selectedId) return;
    const currentEl = elements.find((e) => e.id === selectedId);
    if (!currentEl) return;
    handleUpdateElementWithHistory(selectedId, { zIndex: Math.max(0, (currentEl.zIndex || 0) - 1) });
  }, [selectedId, elements, handleUpdateElementWithHistory]);

  // Move element position
  const handleMoveElement = useCallback((id: string, x: number, y: number) => {
    handleUpdateElement(id, { position: { x, y } });
  }, [handleUpdateElement]);

  // Clear selection when clicking on canvas
  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (e.target === canvasRef.current || e.target === printCanvasRef.current) {
      setSelectedId(null);
    }
  }, []);

  // Save template
  const handleSave = async () => {
    if (!templateName.trim()) {
      toast.error("Template name is required");
      setShowSettingsModal(true);
      return;
    }

    setSaving(true);

    try {
      const design: CertificateDesign = {
        backgroundColor,
        primaryColor: "#000000",
        secondaryColor: "#333333",
        fontFamily: "Georgia",
        borderStyle: "none",
        layout: "custom",
        backgroundImageUrl: backgroundImage || undefined,
        elements,
        useVisualEditor: true,
      };

      const data: CreateCertificateTemplateDto = {
        name: templateName,
        description: templateDescription || undefined,
        design,
        titleText: "Certificate",
        bodyTemplate: "Visual Editor Template",
        isDefault,
      };

      if (isEditing && template) {
        await certificatesApi.updateTemplate(template.id, data);
        toast.success("Template updated successfully");
      } else {
        await certificatesApi.createTemplate(data);
        toast.success("Template created successfully");
      }

      router.push("/dashboard/certificates/templates");
    } catch (error: any) {
      toast.error(error.message || "Failed to save template");
    } finally {
      setSaving(false);
    }
  };

  // Export PDF
  const handleExportPDF = async () => {
    if (!printCanvasRef.current) {
      toast.error("Canvas not ready");
      return;
    }

    setExporting(true);
    try {
      const filename = `certificate-${templateName.replace(/\s+/g, '-').toLowerCase()}.pdf`;
      await exportCertificateToPDF(printCanvasRef.current, filename);
      toast.success("Certificate exported successfully");
    } catch (error) {
      toast.error("Failed to export certificate");
      console.error(error);
    } finally {
      setExporting(false);
    }
  };

  // Render canvas content (for both preview and print)
  const renderCanvasContent = (forPrint: boolean = false) => {
    const scale = forPrint ? 1 : zoom;
    
    return (
      <div
        ref={forPrint ? printCanvasRef : canvasRef}
        className="relative shadow-xl"
        style={{
          width: `${A4_WIDTH_PX}px`,
          height: `${A4_HEIGHT_PX}px`,
          backgroundColor,
          backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          transform: forPrint ? undefined : `scale(${scale})`,
          transformOrigin: 'top center',
        }}
        onClick={!forPrint ? handleCanvasClick : undefined}
      >
        {/* Grid overlay */}
        {showGrid && !forPrint && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: `
                linear-gradient(rgba(0,0,0,0.05) 1px, transparent 1px),
                linear-gradient(90deg, rgba(0,0,0,0.05) 1px, transparent 1px)
              `,
              backgroundSize: '20px 20px',
            }}
          />
        )}

        {/* Center guides */}
        {showGrid && !forPrint && (
          <>
            <div
              className="absolute top-0 bottom-0 w-px bg-blue-300/50 pointer-events-none"
              style={{ left: '50%' }}
            />
            <div
              className="absolute left-0 right-0 h-px bg-blue-300/50 pointer-events-none"
              style={{ top: '50%' }}
            />
          </>
        )}

        {/* Elements */}
        {elements
          .filter((el) => el.visible !== false)
          .sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0))
          .map((element) => (
            forPrint ? (
              // Static render for print
              <div
                key={element.id}
                style={{
                  position: 'absolute',
                  left: `${element.position.x}%`,
                  top: `${element.position.y}%`,
                  transform: `translate(-50%, -50%) ${element.style.rotation ? `rotate(${element.style.rotation}deg)` : ''}`,
                  fontSize: `${element.style.fontSize}px`,
                  fontFamily: element.style.fontFamily,
                  fontWeight: element.style.fontWeight,
                  fontStyle: element.style.fontStyle,
                  textDecoration: element.style.textDecoration,
                  textAlign: element.style.textAlign as any,
                  color: element.style.color,
                  backgroundColor: element.style.backgroundColor || 'transparent',
                  letterSpacing: element.style.letterSpacing ? `${element.style.letterSpacing}px` : undefined,
                  lineHeight: element.style.lineHeight,
                  opacity: element.style.opacity ?? 1,
                  width: element.type === 'image' || element.type === 'shape' || element.type === 'line' 
                    ? `${element.size.width}px` 
                    : 'auto',
                  maxWidth: element.type === 'text' || element.type === 'placeholder' ? `${element.size.width}px` : undefined,
                  height: element.size.height ? `${element.size.height}px` : 'auto',
                  zIndex: element.zIndex ?? 0,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {element.type === 'text' || element.type === 'placeholder' ? (
                  element.content
                ) : element.type === 'image' && element.content ? (
                  <img src={element.content} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                ) : element.type === 'shape' ? (
                  <div style={{ width: '100%', height: element.size.height || 50, backgroundColor: element.style.backgroundColor || '#e5e7eb', borderRadius: '4px' }} />
                ) : element.type === 'line' ? (
                  <div style={{ width: '100%', height: element.size.height || 2, backgroundColor: element.style.color || '#000000' }} />
                ) : null}
              </div>
            ) : (
              <DraggableElement
                key={element.id}
                element={element}
                isSelected={selectedId === element.id}
                canvasScale={zoom}
                onSelect={() => setSelectedId(element.id)}
                onMove={(x, y) => handleMoveElement(element.id, x, y)}
                onUpdate={(updates) => handleUpdateElementWithHistory(element.id, updates)}
                onDelete={handleDeleteElement}
              />
            )
          ))}
      </div>
    );
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <TooltipProvider>
        <div className="flex flex-col h-[calc(100vh-100px)]">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b bg-card">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-lg font-semibold">
                  {isEditing ? "Edit Template" : "Create Template"}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {templateName || "Visual Editor"} - Drag and drop elements to design your certificate
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Zoom controls */}
              <div className="flex items-center gap-1 border rounded-md p-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setZoom(Math.max(0.3, zoom - 0.1))}
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-sm w-12 text-center">{Math.round(zoom * 100)}%</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setZoom(Math.min(1.5, zoom + 0.1))}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </div>

              {/* Grid toggle */}
              <Button
                variant={showGrid ? "default" : "outline"}
                size="icon"
                className="h-9 w-9"
                onClick={() => setShowGrid(!showGrid)}
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>

              {/* Undo/Redo */}
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9"
                  onClick={handleUndo}
                  disabled={historyIndex <= 0}
                >
                  <Undo className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9"
                  onClick={handleRedo}
                  disabled={historyIndex >= history.length - 1}
                >
                  <Redo className="h-4 w-4" />
                </Button>
              </div>

              {/* Settings */}
              <Button variant="outline" onClick={() => setShowSettingsModal(true)}>
                Settings
              </Button>

              {/* Export PDF */}
              <Button variant="outline" onClick={handleExportPDF} disabled={exporting}>
                {exporting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <FileDown className="h-4 w-4 mr-2" />
                )}
                Export PDF
              </Button>

              {/* Save */}
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Template
              </Button>
            </div>
          </div>

          {/* Style Toolbar */}
          <StyleToolbar
            selectedElement={selectedElement}
            onStyleChange={handleStyleChange}
            onElementUpdate={(updates) => selectedId && handleUpdateElement(selectedId, updates)}
            onDelete={handleDeleteElement}
            onDuplicate={handleDuplicate}
            onMoveUp={handleMoveUp}
            onMoveDown={handleMoveDown}
          />

          {/* Main editor area */}
          <div className="flex flex-1 overflow-hidden">
            {/* Left sidebar - Element palette */}
            <ElementPalette
              onAddElement={handleAddElement}
              backgroundColor={backgroundColor}
              onBackgroundColorChange={setBackgroundColor}
              backgroundImage={backgroundImage}
              onBackgroundImageChange={setBackgroundImage}
            />

            {/* Canvas area */}
            <div className="flex-1 bg-gray-200 dark:bg-gray-800 overflow-auto p-8 flex items-start justify-center">
              {renderCanvasContent(false)}
            </div>

            {/* Right sidebar - Properties panel */}
            <PropertiesPanel
              selectedElement={selectedElement}
              onUpdate={(updates) => selectedId && handleUpdateElementWithHistory(selectedId, updates)}
              onStyleChange={handleStyleChangeWithHistory}
              onDelete={handleDeleteElement}
            />
          </div>

          {/* Hidden print canvas for PDF export */}
          <div className="fixed -left-[9999px] -top-[9999px]">
            {renderCanvasContent(true)}
          </div>

          {/* Settings Modal */}
          <Dialog open={showSettingsModal} onOpenChange={setShowSettingsModal}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Template Settings</DialogTitle>
                <DialogDescription>
                  Configure basic information about your certificate template
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="templateName">Template Name *</Label>
                  <Input
                    id="templateName"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="e.g., Professional Certificate"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="templateDescription">Description</Label>
                  <Textarea
                    id="templateDescription"
                    value={templateDescription}
                    onChange={(e) => setTemplateDescription(e.target.value)}
                    placeholder="Describe this template..."
                    rows={3}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Set as Default</Label>
                    <p className="text-sm text-muted-foreground">
                      Use this template for new courses by default
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={isDefault}
                    onChange={(e) => setIsDefault(e.target.checked)}
                    className="h-4 w-4"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowSettingsModal(false)}>
                  Cancel
                </Button>
                <Button onClick={() => setShowSettingsModal(false)}>
                  Done
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </TooltipProvider>
    </DndProvider>
  );
}

