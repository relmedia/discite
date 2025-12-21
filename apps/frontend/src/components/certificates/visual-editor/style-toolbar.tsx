"use client";

import { CertificateElement, CertificateElementStyle, FONT_OPTIONS } from "./types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Trash2,
  Lock,
  Unlock,
  Copy,
  ArrowUp,
  ArrowDown,
  Minus,
  Plus,
  RotateCcw,
  Type,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface StyleToolbarProps {
  selectedElement: CertificateElement | null;
  onStyleChange: (style: Partial<CertificateElementStyle>) => void;
  onElementUpdate: (updates: Partial<CertificateElement>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

export function StyleToolbar({
  selectedElement,
  onStyleChange,
  onElementUpdate,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
}: StyleToolbarProps) {
  if (!selectedElement) {
    return (
      <div className="flex items-center justify-center h-14 px-4 border-b bg-muted/30">
        <p className="text-sm text-muted-foreground">Select an element to edit its style</p>
      </div>
    );
  }

  const { style, type, locked } = selectedElement;
  const isTextElement = type === 'text' || type === 'placeholder';

  return (
    <div className="flex items-center gap-2 h-14 px-4 border-b bg-card overflow-x-auto">
      {/* Font Size */}
      {isTextElement && (
        <div className="flex items-center gap-1 border-r pr-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onStyleChange({ fontSize: Math.max(8, style.fontSize - 1) })}
          >
            <Minus className="h-3 w-3" />
          </Button>
          <Input
            type="number"
            value={style.fontSize}
            onChange={(e) => onStyleChange({ fontSize: parseInt(e.target.value) || 16 })}
            className="w-14 h-8 text-center text-sm"
            min={8}
            max={120}
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onStyleChange({ fontSize: Math.min(120, style.fontSize + 1) })}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Font Family */}
      {isTextElement && (
        <div className="border-r pr-3">
          <Select
            value={style.fontFamily}
            onValueChange={(value) => onStyleChange({ fontFamily: value })}
          >
            <SelectTrigger className="w-36 h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FONT_OPTIONS.map((font) => (
                <SelectItem 
                  key={font.value} 
                  value={font.value}
                  style={{ fontFamily: font.value }}
                >
                  {font.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Text Style (Bold, Italic, Underline) */}
      {isTextElement && (
        <div className="flex gap-1 border-r pr-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={style.fontWeight === 'bold' ? 'default' : 'outline'}
                size="icon"
                className="h-8 w-8"
                onClick={() => onStyleChange({ fontWeight: style.fontWeight === 'bold' ? 'normal' : 'bold' })}
              >
                <Bold className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Bold (Ctrl+B)</TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={style.fontStyle === 'italic' ? 'default' : 'outline'}
                size="icon"
                className="h-8 w-8"
                onClick={() => onStyleChange({ fontStyle: style.fontStyle === 'italic' ? 'normal' : 'italic' })}
              >
                <Italic className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Italic (Ctrl+I)</TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={style.textDecoration === 'underline' ? 'default' : 'outline'}
                size="icon"
                className="h-8 w-8"
                onClick={() => onStyleChange({ textDecoration: style.textDecoration === 'underline' ? 'none' : 'underline' })}
              >
                <Underline className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Underline (Ctrl+U)</TooltipContent>
          </Tooltip>
        </div>
      )}

      {/* Text Alignment */}
      {isTextElement && (
        <div className="flex gap-1 border-r pr-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={style.textAlign === 'left' ? 'default' : 'outline'}
                size="icon"
                className="h-8 w-8"
                onClick={() => onStyleChange({ textAlign: 'left' })}
              >
                <AlignLeft className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Align Left</TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={style.textAlign === 'center' ? 'default' : 'outline'}
                size="icon"
                className="h-8 w-8"
                onClick={() => onStyleChange({ textAlign: 'center' })}
              >
                <AlignCenter className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Align Center</TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={style.textAlign === 'right' ? 'default' : 'outline'}
                size="icon"
                className="h-8 w-8"
                onClick={() => onStyleChange({ textAlign: 'right' })}
              >
                <AlignRight className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Align Right</TooltipContent>
          </Tooltip>
        </div>
      )}

      {/* Text Color */}
      <div className="flex items-center gap-2 border-r pr-3">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1">
              <Type className="h-4 w-4 text-muted-foreground" />
              <Input
                type="color"
                value={style.color}
                onChange={(e) => onStyleChange({ color: e.target.value })}
                className="w-8 h-8 p-0.5 cursor-pointer border-2"
              />
            </div>
          </TooltipTrigger>
          <TooltipContent>Text Color</TooltipContent>
        </Tooltip>
      </div>

      {/* Background Color (for shapes) */}
      {(type === 'shape' || type === 'line') && (
        <div className="flex items-center gap-2 border-r pr-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 border rounded" style={{ backgroundColor: style.backgroundColor || '#e5e7eb' }} />
                <Input
                  type="color"
                  value={style.backgroundColor || '#e5e7eb'}
                  onChange={(e) => onStyleChange({ backgroundColor: e.target.value })}
                  className="w-8 h-8 p-0.5 cursor-pointer border-2"
                />
              </div>
            </TooltipTrigger>
            <TooltipContent>Fill Color</TooltipContent>
          </Tooltip>
        </div>
      )}

      {/* Letter Spacing */}
      {isTextElement && (
        <div className="flex items-center gap-2 border-r pr-3">
          <Label className="text-xs text-muted-foreground whitespace-nowrap">Spacing</Label>
          <Slider
            value={[style.letterSpacing || 0]}
            onValueChange={(values) => onStyleChange({ letterSpacing: values[0] })}
            min={-2}
            max={10}
            step={0.5}
            className="w-20"
          />
        </div>
      )}

      {/* Opacity */}
      <div className="flex items-center gap-2 border-r pr-3">
        <Label className="text-xs text-muted-foreground">Opacity</Label>
        <Slider
          value={[(style.opacity ?? 1) * 100]}
          onValueChange={(values) => onStyleChange({ opacity: values[0] / 100 })}
          min={10}
          max={100}
          step={5}
          className="w-20"
        />
        <span className="text-xs w-8">{Math.round((style.opacity ?? 1) * 100)}%</span>
      </div>

      {/* Rotation */}
      <div className="flex items-center gap-2 border-r pr-3">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => onStyleChange({ rotation: 0 })}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Reset Rotation</TooltipContent>
        </Tooltip>
        <Input
          type="number"
          value={style.rotation || 0}
          onChange={(e) => onStyleChange({ rotation: parseInt(e.target.value) || 0 })}
          className="w-16 h-8 text-sm"
          min={-180}
          max={180}
        />
        <span className="text-xs text-muted-foreground">°</span>
      </div>

      {/* Z-index / Layer controls */}
      <div className="flex gap-1 border-r pr-3">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={onMoveUp}>
              <ArrowUp className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Bring Forward</TooltipContent>
        </Tooltip>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={onMoveDown}>
              <ArrowDown className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Send Backward</TooltipContent>
        </Tooltip>
      </div>

      {/* Lock/Unlock */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={locked ? 'default' : 'outline'}
            size="icon"
            className="h-8 w-8"
            onClick={() => onElementUpdate({ locked: !locked })}
          >
            {locked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{locked ? 'Unlock Element' : 'Lock Element'}</TooltipContent>
      </Tooltip>

      {/* Duplicate */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={onDuplicate}>
            <Copy className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Duplicate (Ctrl+D)</TooltipContent>
      </Tooltip>

      {/* Delete */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="destructive"
            size="icon"
            className="h-8 w-8 ml-auto"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Delete (Del)</TooltipContent>
      </Tooltip>
    </div>
  );
}

