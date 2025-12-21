'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  Save,
  Eye,
  ZoomIn,
  ZoomOut,
  Undo,
  Redo,
  Loader2,
  Plus,
  Trash2,
  GripVertical,
  MoveUp,
  MoveDown,
  Heading,
  Type,
  MousePointer,
  Image as ImageIcon,
  Minus,
  MoveVertical,
  Share2,
  LayoutList,
  Settings,
  Palette,
  Code,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  EmailElement,
  EmailElementStyle,
  EmailElementType,
  EmailDesign,
  createDefaultElement,
  FONT_OPTIONS,
  FONT_SIZE_OPTIONS,
  DEFAULT_TEXT_STYLE,
  ELEMENT_TYPES,
} from './types';
import {
  EmailTemplate,
  EmailTemplateType,
  createEmailTemplate,
  updateEmailTemplate,
  EMAIL_TEMPLATE_TYPE_LABELS,
  EMAIL_PLACEHOLDER_VARIABLES,
  DEFAULT_EMAIL_DESIGN,
} from '@/lib/api/email';

const ELEMENT_ICONS: Record<EmailElementType, any> = {
  heading: Heading,
  text: Type,
  button: MousePointer,
  image: ImageIcon,
  divider: Minus,
  spacer: MoveVertical,
  social: Share2,
  footer: LayoutList,
  columns: LayoutList,
};

interface EmailVisualEditorProps {
  template?: EmailTemplate;
  isEditing?: boolean;
}

export function EmailVisualEditor({ template, isEditing }: EmailVisualEditorProps) {
  const router = useRouter();

  // Form state
  const [templateName, setTemplateName] = useState(template?.name || '');
  const [templateDescription, setTemplateDescription] = useState(template?.description || '');
  const [templateType, setTemplateType] = useState<EmailTemplateType>(template?.type || EmailTemplateType.CUSTOM);
  const [subject, setSubject] = useState(template?.subject || '');
  const [previewText, setPreviewText] = useState(template?.previewText || '');
  const [isDefault, setIsDefault] = useState(template?.isDefault || false);

  // Design state
  const [backgroundColor, setBackgroundColor] = useState(template?.design?.backgroundColor || '#f4f4f4');
  const [contentBackgroundColor, setContentBackgroundColor] = useState(template?.design?.contentBackgroundColor || '#ffffff');
  const [contentWidth, setContentWidth] = useState(template?.design?.contentWidth || 600);
  const [fontFamily, setFontFamily] = useState(template?.design?.fontFamily || 'Arial, sans-serif');
  const [showHeader, setShowHeader] = useState(template?.design?.showHeader ?? true);
  const [logoUrl, setLogoUrl] = useState(template?.design?.logoUrl || '');
  const [showFooter, setShowFooter] = useState(template?.design?.showFooter ?? true);
  const [footerText, setFooterText] = useState(template?.design?.footerText || '© 2024 Your Company. All rights reserved.');
  const [showUnsubscribe, setShowUnsubscribe] = useState(template?.design?.unsubscribeLink ?? true);

  // Elements state
  const [elements, setElements] = useState<EmailElement[]>(template?.design?.elements || []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);

  // UI state
  const [saving, setSaving] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(!isEditing);
  const [showPreview, setShowPreview] = useState(false);
  const [activeTab, setActiveTab] = useState<'elements' | 'style' | 'properties'>('elements');

  // History for undo/redo
  const [history, setHistory] = useState<EmailElement[][]>([elements]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const selectedElement = elements.find((e) => e.id === selectedId) || null;

  // Add to history
  const addToHistory = useCallback((newElements: EmailElement[]) => {
    setHistory((prev) => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(newElements);
      return newHistory.slice(-50);
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

  // Add element
  const handleAddElement = useCallback((type: EmailElementType) => {
    const newElement = createDefaultElement(type, '', elements.length);
    const newElements = [...elements, newElement];
    setElements(newElements);
    addToHistory(newElements);
    setSelectedId(newElement.id);
    setActiveTab('properties');
  }, [elements, addToHistory]);

  // Update element
  const handleUpdateElement = useCallback((id: string, updates: Partial<EmailElement>) => {
    const newElements = elements.map((el) =>
      el.id === id ? { ...el, ...updates } : el
    );
    setElements(newElements);
    addToHistory(newElements);
  }, [elements, addToHistory]);

  // Update element style
  const handleStyleChange = useCallback((id: string, style: Partial<EmailElementStyle>) => {
    const newElements = elements.map((el) =>
      el.id === id ? { ...el, style: { ...el.style, ...style } } : el
    );
    setElements(newElements);
    addToHistory(newElements);
  }, [elements, addToHistory]);

  // Delete element
  const handleDeleteElement = useCallback((id: string) => {
    const newElements = elements.filter((el) => el.id !== id);
    setElements(newElements);
    addToHistory(newElements);
    if (selectedId === id) setSelectedId(null);
  }, [elements, selectedId, addToHistory]);

  // Move element up/down
  const handleMoveElement = useCallback((id: string, direction: 'up' | 'down') => {
    const index = elements.findIndex((el) => el.id === id);
    if (index === -1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= elements.length) return;

    const newElements = [...elements];
    [newElements[index], newElements[newIndex]] = [newElements[newIndex], newElements[index]];
    // Update order values
    newElements.forEach((el, i) => (el.order = i));

    setElements(newElements);
    addToHistory(newElements);
  }, [elements, addToHistory]);

  // Save template
  const handleSave = async () => {
    if (!templateName.trim()) {
      toast.error('Template name is required');
      setShowSettingsModal(true);
      return;
    }

    if (!subject.trim()) {
      toast.error('Email subject is required');
      setShowSettingsModal(true);
      return;
    }

    setSaving(true);

    try {
      const design: EmailDesign = {
        backgroundColor,
        contentBackgroundColor,
        contentWidth,
        fontFamily,
        showHeader,
        logoUrl: logoUrl || undefined,
        showFooter,
        footerText,
        unsubscribeLink: showUnsubscribe,
        elements,
        useVisualEditor: true,
      };

      const data = {
        name: templateName,
        description: templateDescription || undefined,
        type: templateType,
        subject,
        previewText: previewText || undefined,
        design,
        isDefault,
      };

      if (isEditing && template) {
        await updateEmailTemplate(template.id, data);
        toast.success('Template updated successfully');
      } else {
        await createEmailTemplate(data);
        toast.success('Template created successfully');
      }

      router.push('/dashboard/settings/email/templates');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  // Render element in canvas
  const renderElement = (element: EmailElement) => {
    const isSelected = selectedId === element.id;
    const style = element.style;

    const baseStyle: React.CSSProperties = {
      fontSize: `${style.fontSize}px`,
      fontFamily: style.fontFamily,
      fontWeight: style.fontWeight,
      fontStyle: style.fontStyle,
      textDecoration: style.textDecoration,
      textAlign: style.textAlign as any,
      color: style.color,
      backgroundColor: style.backgroundColor,
      padding: style.padding ? `${style.padding}px` : undefined,
      borderRadius: style.borderRadius ? `${style.borderRadius}px` : undefined,
      lineHeight: style.lineHeight,
    };

    let content: React.ReactNode;

    switch (element.type) {
      case 'heading':
        content = <h2 style={baseStyle}>{element.content}</h2>;
        break;
      case 'text':
        content = <p style={{ ...baseStyle, whiteSpace: 'pre-wrap' }}>{element.content}</p>;
        break;
      case 'button':
        content = (
          <div style={{ textAlign: style.textAlign as any }}>
            <a
              href="#"
              style={{
                ...baseStyle,
                display: 'inline-block',
                textDecoration: 'none',
                padding: `${style.padding || 12}px ${(style.padding || 12) * 2}px`,
              }}
            >
              {element.content}
            </a>
          </div>
        );
        break;
      case 'image':
        content = element.content ? (
          <div style={{ textAlign: style.textAlign as any }}>
            <img src={element.content} alt={element.properties?.alt || ''} style={{ maxWidth: '100%' }} />
          </div>
        ) : (
          <div className="border-2 border-dashed border-gray-300 p-8 text-center text-gray-500">
            <ImageIcon className="h-8 w-8 mx-auto mb-2" />
            <p>Click to add image URL</p>
          </div>
        );
        break;
      case 'divider':
        content = <hr style={{ border: 'none', borderTop: `1px solid ${style.color}`, margin: '15px 0' }} />;
        break;
      case 'spacer':
        content = <div style={{ height: `${element.properties?.height || 20}px` }} />;
        break;
      case 'footer':
        content = (
          <div style={{ ...baseStyle, padding: '20px 0' }}>
            {element.content.split('\n').map((line, i) => (
              <p key={i} style={{ margin: '5px 0' }}>{line}</p>
            ))}
          </div>
        );
        break;
      case 'social':
        content = (
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <p className="text-sm text-gray-500">[Social Links]</p>
          </div>
        );
        break;
      default:
        content = <div>{element.content}</div>;
    }

    return (
      <div
        key={element.id}
        className={cn(
          'relative group cursor-pointer transition-all',
          isSelected && 'ring-2 ring-blue-500 ring-offset-2'
        )}
        onClick={() => {
          setSelectedId(element.id);
          setActiveTab('properties');
        }}
      >
        {/* Drag handle and actions */}
        <div className={cn(
          'absolute -left-10 top-0 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity',
          isSelected && 'opacity-100'
        )}>
          <Button variant="ghost" size="icon" className="h-6 w-6" disabled>
            <GripVertical className="h-4 w-4" />
          </Button>
        </div>
        <div className={cn(
          'absolute -right-10 top-0 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity',
          isSelected && 'opacity-100'
        )}>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation();
              handleMoveElement(element.id, 'up');
            }}
          >
            <MoveUp className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation();
              handleMoveElement(element.id, 'down');
            }}
          >
            <MoveDown className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteElement(element.id);
            }}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>

        {content}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-100px)]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-card">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold">
              {isEditing ? 'Edit Email Template' : 'Create Email Template'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {templateName || 'Visual Editor'} - Drag and drop elements to design your email
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
              onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
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

          {/* Preview */}
          <Button variant="outline" onClick={() => setShowPreview(!showPreview)}>
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>

          {/* Settings */}
          <Button variant="outline" onClick={() => setShowSettingsModal(true)}>
            <Settings className="h-4 w-4 mr-2" />
            Settings
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

      {/* Main editor area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar - Element palette */}
        <div className="w-64 border-r bg-card p-4 overflow-auto">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="w-full">
              <TabsTrigger value="elements" className="flex-1">
                <Plus className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger value="style" className="flex-1">
                <Palette className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger value="properties" className="flex-1">
                <Settings className="h-4 w-4" />
              </TabsTrigger>
            </TabsList>

            {/* Elements Tab */}
            <TabsContent value="elements" className="mt-4 space-y-2">
              <p className="text-sm font-medium mb-3">Add Elements</p>
              {ELEMENT_TYPES.map((item) => {
                const Icon = ELEMENT_ICONS[item.type];
                return (
                  <Button
                    key={item.type}
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => handleAddElement(item.type)}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {item.label}
                  </Button>
                );
              })}
            </TabsContent>

            {/* Style Tab */}
            <TabsContent value="style" className="mt-4 space-y-4">
              <p className="text-sm font-medium">Email Design</p>
              
              <div className="space-y-2">
                <Label>Background Color</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    className="w-12 h-9 p-1"
                  />
                  <Input
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Content Background</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={contentBackgroundColor}
                    onChange={(e) => setContentBackgroundColor(e.target.value)}
                    className="w-12 h-9 p-1"
                  />
                  <Input
                    value={contentBackgroundColor}
                    onChange={(e) => setContentBackgroundColor(e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Content Width</Label>
                <Input
                  type="number"
                  value={contentWidth}
                  onChange={(e) => setContentWidth(parseInt(e.target.value) || 600)}
                  min={400}
                  max={800}
                />
              </div>

              <div className="space-y-2">
                <Label>Font Family</Label>
                <Select value={fontFamily} onValueChange={setFontFamily}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FONT_OPTIONS.map((font) => (
                      <SelectItem key={font.value} value={font.value}>
                        {font.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <Label>Show Header</Label>
                <Switch checked={showHeader} onCheckedChange={setShowHeader} />
              </div>

              {showHeader && (
                <div className="space-y-2">
                  <Label>Logo URL</Label>
                  <Input
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="https://..."
                  />
                </div>
              )}

              <div className="flex items-center justify-between">
                <Label>Show Footer</Label>
                <Switch checked={showFooter} onCheckedChange={setShowFooter} />
              </div>

              <div className="flex items-center justify-between">
                <Label>Unsubscribe Link</Label>
                <Switch checked={showUnsubscribe} onCheckedChange={setShowUnsubscribe} />
              </div>
            </TabsContent>

            {/* Properties Tab */}
            <TabsContent value="properties" className="mt-4 space-y-4">
              {selectedElement ? (
                <>
                  <p className="text-sm font-medium">Element Properties</p>

                  {/* Content */}
                  {(selectedElement.type === 'heading' || selectedElement.type === 'text' || selectedElement.type === 'button' || selectedElement.type === 'footer') && (
                    <div className="space-y-2">
                      <Label>Content</Label>
                      <Textarea
                        value={selectedElement.content}
                        onChange={(e) => handleUpdateElement(selectedElement.id, { content: e.target.value })}
                        rows={selectedElement.type === 'text' || selectedElement.type === 'footer' ? 4 : 2}
                      />
                    </div>
                  )}

                  {/* URL for buttons */}
                  {selectedElement.type === 'button' && (
                    <div className="space-y-2">
                      <Label>Button URL</Label>
                      <Input
                        value={selectedElement.properties?.url || ''}
                        onChange={(e) => handleUpdateElement(selectedElement.id, {
                          properties: { ...selectedElement.properties, url: e.target.value }
                        })}
                        placeholder="https://..."
                      />
                    </div>
                  )}

                  {/* Image URL */}
                  {selectedElement.type === 'image' && (
                    <div className="space-y-2">
                      <Label>Image URL</Label>
                      <Input
                        value={selectedElement.content}
                        onChange={(e) => handleUpdateElement(selectedElement.id, { content: e.target.value })}
                        placeholder="https://..."
                      />
                    </div>
                  )}

                  {/* Spacer height */}
                  {selectedElement.type === 'spacer' && (
                    <div className="space-y-2">
                      <Label>Height (px)</Label>
                      <Input
                        type="number"
                        value={selectedElement.properties?.height || 20}
                        onChange={(e) => handleUpdateElement(selectedElement.id, {
                          properties: { ...selectedElement.properties, height: parseInt(e.target.value) || 20 }
                        })}
                        min={10}
                        max={200}
                      />
                    </div>
                  )}

                  {/* Style options */}
                  {(selectedElement.type === 'heading' || selectedElement.type === 'text' || selectedElement.type === 'button' || selectedElement.type === 'footer') && (
                    <>
                      <div className="space-y-2">
                        <Label>Font Size</Label>
                        <Select
                          value={selectedElement.style.fontSize.toString()}
                          onValueChange={(v) => handleStyleChange(selectedElement.id, { fontSize: parseInt(v) })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {FONT_SIZE_OPTIONS.map((size) => (
                              <SelectItem key={size.value} value={size.value.toString()}>
                                {size.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Text Color</Label>
                        <div className="flex gap-2">
                          <Input
                            type="color"
                            value={selectedElement.style.color}
                            onChange={(e) => handleStyleChange(selectedElement.id, { color: e.target.value })}
                            className="w-12 h-9 p-1"
                          />
                          <Input
                            value={selectedElement.style.color}
                            onChange={(e) => handleStyleChange(selectedElement.id, { color: e.target.value })}
                            className="flex-1"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Alignment</Label>
                        <Select
                          value={selectedElement.style.textAlign}
                          onValueChange={(v) => handleStyleChange(selectedElement.id, { textAlign: v as any })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="left">Left</SelectItem>
                            <SelectItem value="center">Center</SelectItem>
                            <SelectItem value="right">Right</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center justify-between">
                        <Label>Bold</Label>
                        <Switch
                          checked={selectedElement.style.fontWeight === 'bold'}
                          onCheckedChange={(v) => handleStyleChange(selectedElement.id, { fontWeight: v ? 'bold' : 'normal' })}
                        />
                      </div>
                    </>
                  )}

                  {/* Button specific */}
                  {selectedElement.type === 'button' && (
                    <div className="space-y-2">
                      <Label>Button Color</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={selectedElement.style.backgroundColor || '#007bff'}
                          onChange={(e) => handleStyleChange(selectedElement.id, { backgroundColor: e.target.value })}
                          className="w-12 h-9 p-1"
                        />
                        <Input
                          value={selectedElement.style.backgroundColor || '#007bff'}
                          onChange={(e) => handleStyleChange(selectedElement.id, { backgroundColor: e.target.value })}
                          className="flex-1"
                        />
                      </div>
                    </div>
                  )}

                  {/* Divider color */}
                  {selectedElement.type === 'divider' && (
                    <div className="space-y-2">
                      <Label>Divider Color</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={selectedElement.style.color}
                          onChange={(e) => handleStyleChange(selectedElement.id, { color: e.target.value })}
                          className="w-12 h-9 p-1"
                        />
                        <Input
                          value={selectedElement.style.color}
                          onChange={(e) => handleStyleChange(selectedElement.id, { color: e.target.value })}
                          className="flex-1"
                        />
                      </div>
                    </div>
                  )}

                  {/* Placeholder variables */}
                  <div className="space-y-2">
                    <Label>Insert Variable</Label>
                    <ScrollArea className="h-32">
                      <div className="space-y-1">
                        {EMAIL_PLACEHOLDER_VARIABLES.map((variable) => (
                          <Button
                            key={variable.key}
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start text-xs"
                            onClick={() => {
                              if (selectedElement.type === 'heading' || selectedElement.type === 'text' || selectedElement.type === 'button' || selectedElement.type === 'footer') {
                                handleUpdateElement(selectedElement.id, {
                                  content: selectedElement.content + ' ' + variable.key
                                });
                              }
                            }}
                          >
                            <Code className="h-3 w-3 mr-2" />
                            {variable.label}
                          </Button>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>

                  {/* Delete button */}
                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={() => handleDeleteElement(selectedElement.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Element
                  </Button>
                </>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  <Settings className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Select an element to edit its properties</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Canvas area */}
        <div
          className="flex-1 overflow-auto p-8"
          style={{ backgroundColor: '#e5e5e5' }}
          onClick={() => setSelectedId(null)}
        >
          <div
            className="mx-auto shadow-xl"
            style={{
              width: `${contentWidth}px`,
              transform: `scale(${zoom})`,
              transformOrigin: 'top center',
              backgroundColor,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            {showHeader && logoUrl && (
              <div style={{ backgroundColor: contentBackgroundColor, padding: '20px', textAlign: 'center' }}>
                <img src={logoUrl} alt="Logo" style={{ maxWidth: '150px', height: 'auto' }} />
              </div>
            )}

            {/* Content area */}
            <div
              style={{
                backgroundColor: contentBackgroundColor,
                padding: '30px',
                fontFamily,
                minHeight: '200px',
              }}
            >
              {elements.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <Plus className="h-12 w-12 mx-auto mb-4" />
                  <p>Add elements from the left panel to build your email</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {elements
                    .sort((a, b) => a.order - b.order)
                    .map((element) => renderElement(element))}
                </div>
              )}
            </div>

            {/* Footer */}
            {showFooter && (
              <div
                style={{
                  backgroundColor: contentBackgroundColor,
                  padding: '20px',
                  textAlign: 'center',
                  fontSize: '12px',
                  color: '#666666',
                  borderTop: '1px solid #e5e5e5',
                }}
              >
                <p>{footerText}</p>
                {showUnsubscribe && (
                  <p style={{ marginTop: '10px' }}>
                    <a href="#" style={{ color: '#666666' }}>Unsubscribe</a>
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      <Dialog open={showSettingsModal} onOpenChange={setShowSettingsModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Template Settings</DialogTitle>
            <DialogDescription>
              Configure basic information about your email template
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="templateName">Template Name *</Label>
              <Input
                id="templateName"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="e.g., Welcome Email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="templateType">Template Type</Label>
              <Select value={templateType} onValueChange={(v) => setTemplateType(v as EmailTemplateType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(EMAIL_TEMPLATE_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="subject">Email Subject *</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g., Welcome to {{companyName}}!"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="previewText">Preview Text</Label>
              <Input
                id="previewText"
                value={previewText}
                onChange={(e) => setPreviewText(e.target.value)}
                placeholder="Brief preview shown in email clients..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="templateDescription">Description</Label>
              <Textarea
                id="templateDescription"
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                placeholder="Describe this template..."
                rows={2}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Set as Default</Label>
                <p className="text-sm text-muted-foreground">
                  Use this template as default for its type
                </p>
              </div>
              <Switch checked={isDefault} onCheckedChange={setIsDefault} />
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
  );
}
