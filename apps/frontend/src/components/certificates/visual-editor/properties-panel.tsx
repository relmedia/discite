"use client";

import { CertificateElement, CertificateElementStyle } from "./types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FONT_OPTIONS, PLACEHOLDER_VARIABLES } from "./types";
import { Lock, Unlock, Eye, EyeOff, Trash2 } from "lucide-react";

interface PropertiesPanelProps {
  selectedElement: CertificateElement | null;
  onUpdate: (updates: Partial<CertificateElement>) => void;
  onStyleChange: (style: Partial<CertificateElementStyle>) => void;
  onDelete: () => void;
}

export function PropertiesPanel({
  selectedElement,
  onUpdate,
  onStyleChange,
  onDelete,
}: PropertiesPanelProps) {
  if (!selectedElement) {
    return (
      <div className="w-72 border-l bg-muted/30 p-4">
        <div className="flex flex-col items-center justify-center h-full text-center">
          <p className="text-sm text-muted-foreground">
            Select an element to edit its properties
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Click on any element on the canvas or add a new one from the left panel
          </p>
        </div>
      </div>
    );
  }

  const { style, type, position, size, content, locked, visible } = selectedElement;
  const isTextElement = type === 'text' || type === 'placeholder';

  return (
    <div className="w-72 border-l bg-muted/30 flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b flex items-center justify-between shrink-0">
        <div>
          <h3 className="font-semibold text-sm capitalize">{type} Properties</h3>
          <p className="text-xs text-muted-foreground">Edit element settings</p>
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onUpdate({ visible: visible === false ? true : false })}
          >
            {visible === false ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onUpdate({ locked: !locked })}
          >
            {locked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="p-4 space-y-6">
          {/* Content Section */}
          <div className="space-y-3">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">Content</Label>
            
            {type === 'placeholder' && (
              <div className="space-y-2">
                <Label className="text-xs">Placeholder Variable</Label>
                <Select
                  value={content}
                  onValueChange={(value) => onUpdate({ content: value })}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PLACEHOLDER_VARIABLES.map((ph) => (
                      <SelectItem key={ph.key} value={ph.key}>
                        {ph.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {type === 'text' && (
              <div className="space-y-2">
                <Label className="text-xs">Text Content</Label>
                <Textarea
                  value={content}
                  onChange={(e) => onUpdate({ content: e.target.value })}
                  className="text-sm min-h-[80px]"
                  placeholder="Enter text..."
                />
              </div>
            )}

            {type === 'image' && (
              <div className="space-y-2">
                <Label className="text-xs">Image URL</Label>
                <Input
                  value={content}
                  onChange={(e) => onUpdate({ content: e.target.value })}
                  className="h-9 text-sm"
                  placeholder="https://example.com/image.png"
                />
                {content && (
                  <div className="border rounded p-2 bg-background">
                    <img src={content} alt="Preview" className="max-w-full h-auto max-h-32 mx-auto" />
                  </div>
                )}
              </div>
            )}
          </div>

          <Separator />

          {/* Position Section */}
          <div className="space-y-3">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">Position</Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">X Position (%)</Label>
                <Input
                  type="number"
                  value={position.x.toFixed(1)}
                  onChange={(e) => onUpdate({ position: { ...position, x: parseFloat(e.target.value) || 0 } })}
                  className="h-9 text-sm"
                  min={0}
                  max={100}
                  step={0.5}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Y Position (%)</Label>
                <Input
                  type="number"
                  value={position.y.toFixed(1)}
                  onChange={(e) => onUpdate({ position: { ...position, y: parseFloat(e.target.value) || 0 } })}
                  className="h-9 text-sm"
                  min={0}
                  max={100}
                  step={0.5}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Size Section */}
          <div className="space-y-3">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">Size</Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Width (px)</Label>
                <Input
                  type="number"
                  value={size.width}
                  onChange={(e) => onUpdate({ size: { ...size, width: parseInt(e.target.value) || 100 } })}
                  className="h-9 text-sm"
                  min={20}
                  max={800}
                />
              </div>
              {(type === 'image' || type === 'shape') && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Height (px)</Label>
                  <Input
                    type="number"
                    value={size.height || 100}
                    onChange={(e) => onUpdate({ size: { ...size, height: parseInt(e.target.value) || 100 } })}
                    className="h-9 text-sm"
                    min={10}
                    max={1200}
                  />
                </div>
              )}
            </div>
          </div>

          {isTextElement && (
            <>
              <Separator />

              {/* Typography Section */}
              <div className="space-y-3">
                <Label className="text-xs font-semibold uppercase text-muted-foreground">Typography</Label>
                
                <div className="space-y-1.5">
                  <Label className="text-xs">Font Family</Label>
                  <Select
                    value={style.fontFamily}
                    onValueChange={(value) => onStyleChange({ fontFamily: value })}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FONT_OPTIONS.map((font) => (
                        <SelectItem key={font.value} value={font.value} style={{ fontFamily: font.value }}>
                          {font.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <Label className="text-xs">Font Size</Label>
                    <span className="text-xs text-muted-foreground">{style.fontSize}px</span>
                  </div>
                  <Slider
                    value={[style.fontSize]}
                    onValueChange={(values) => onStyleChange({ fontSize: values[0] })}
                    min={8}
                    max={120}
                    step={1}
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <Label className="text-xs">Line Height</Label>
                    <span className="text-xs text-muted-foreground">{style.lineHeight}</span>
                  </div>
                  <Slider
                    value={[(style.lineHeight || 1.4) * 10]}
                    onValueChange={(values) => onStyleChange({ lineHeight: values[0] / 10 })}
                    min={8}
                    max={30}
                    step={1}
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <Label className="text-xs">Letter Spacing</Label>
                    <span className="text-xs text-muted-foreground">{style.letterSpacing || 0}px</span>
                  </div>
                  <Slider
                    value={[style.letterSpacing || 0]}
                    onValueChange={(values) => onStyleChange({ letterSpacing: values[0] })}
                    min={-2}
                    max={20}
                    step={0.5}
                  />
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Appearance Section */}
          <div className="space-y-3">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">Appearance</Label>
            
            <div className="space-y-1.5">
              <Label className="text-xs">{isTextElement ? 'Text Color' : 'Color'}</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={style.color}
                  onChange={(e) => onStyleChange({ color: e.target.value })}
                  className="w-12 h-9 p-1 cursor-pointer"
                />
                <Input
                  value={style.color}
                  onChange={(e) => onStyleChange({ color: e.target.value })}
                  className="flex-1 h-9 text-sm"
                />
              </div>
            </div>

            {(type === 'shape' || type === 'line') && (
              <div className="space-y-1.5">
                <Label className="text-xs">Background Color</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={style.backgroundColor || '#e5e7eb'}
                    onChange={(e) => onStyleChange({ backgroundColor: e.target.value })}
                    className="w-12 h-9 p-1 cursor-pointer"
                  />
                  <Input
                    value={style.backgroundColor || '#e5e7eb'}
                    onChange={(e) => onStyleChange({ backgroundColor: e.target.value })}
                    className="flex-1 h-9 text-sm"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <div className="flex justify-between">
                <Label className="text-xs">Opacity</Label>
                <span className="text-xs text-muted-foreground">{Math.round((style.opacity ?? 1) * 100)}%</span>
              </div>
              <Slider
                value={[(style.opacity ?? 1) * 100]}
                onValueChange={(values) => onStyleChange({ opacity: values[0] / 100 })}
                min={10}
                max={100}
                step={5}
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between">
                <Label className="text-xs">Rotation</Label>
                <span className="text-xs text-muted-foreground">{style.rotation || 0}°</span>
              </div>
              <Slider
                value={[style.rotation || 0]}
                onValueChange={(values) => onStyleChange({ rotation: values[0] })}
                min={-180}
                max={180}
                step={1}
              />
            </div>
          </div>

          <Separator />

          {/* Layer Section */}
          <div className="space-y-3">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">Layer</Label>
            <div className="space-y-1.5">
              <Label className="text-xs">Z-Index</Label>
              <Input
                type="number"
                value={selectedElement.zIndex || 0}
                onChange={(e) => onUpdate({ zIndex: parseInt(e.target.value) || 0 })}
                className="h-9 text-sm"
                min={0}
                max={100}
              />
            </div>
          </div>

          <Separator />

          {/* Delete Button */}
          <Button
            variant="destructive"
            className="w-full"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Element
          </Button>
        </div>
      </div>
    </div>
  );
}

