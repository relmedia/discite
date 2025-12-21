"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Type,
  Image,
  Square,
  Minus,
  Plus,
  FileText,
  User,
  GraduationCap,
  Calendar,
  Hash,
  Award,
  Clock,
  Percent,
} from "lucide-react";
import { CertificateElementType, PLACEHOLDER_VARIABLES, createDefaultElement, generateElementId, DEFAULT_TITLE_STYLE, DEFAULT_HEADING_STYLE, DEFAULT_SUBTITLE_STYLE, DEFAULT_TEXT_STYLE, CertificateElement } from "./types";

interface ElementPaletteProps {
  onAddElement: (element: CertificateElement) => void;
  backgroundColor: string;
  onBackgroundColorChange: (color: string) => void;
  backgroundImage?: string;
  onBackgroundImageChange: (url: string) => void;
}

export function ElementPalette({
  onAddElement,
  backgroundColor,
  onBackgroundColorChange,
  backgroundImage,
  onBackgroundImageChange,
}: ElementPaletteProps) {
  const handleAddElement = (type: CertificateElementType, content?: string, customStyle?: Partial<CertificateElement['style']>) => {
    const defaultElement = createDefaultElement(type, content);
    const newElement: CertificateElement = {
      ...defaultElement,
      id: generateElementId(),
      style: customStyle ? { ...defaultElement.style, ...customStyle } : defaultElement.style,
    };
    onAddElement(newElement);
  };

  const getPlaceholderIcon = (key: string) => {
    switch (key) {
      case '{{studentName}}':
        return User;
      case '{{courseName}}':
        return GraduationCap;
      case '{{completionDate}}':
      case '{{issueDate}}':
      case '{{expiryDate}}':
        return Calendar;
      case '{{certificateNumber}}':
        return Hash;
      case '{{instructorName}}':
        return Award;
      case '{{personalNumber}}':
        return FileText;
      case '{{finalGrade}}':
        return Percent;
      default:
        return FileText;
    }
  };

  return (
    <div className="w-64 border-r bg-muted/30 flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b shrink-0">
        <h3 className="font-semibold text-sm">Elements</h3>
        <p className="text-xs text-muted-foreground mt-1">Drag or click to add</p>
      </div>
      
      <div className="flex-1 overflow-auto">
        <Accordion type="multiple" defaultValue={["elements", "placeholders", "text-presets", "canvas"]} className="w-full">
          {/* Basic Elements */}
          <AccordionItem value="elements" className="border-b-0">
            <AccordionTrigger className="px-4 py-3 text-sm hover:no-underline">
              Basic Elements
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <div className="grid grid-cols-2 gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      className="flex flex-col h-16 gap-1 hover:bg-primary/10 hover:border-primary"
                      onClick={() => handleAddElement('text')}
                    >
                      <Type className="h-5 w-5" />
                      <span className="text-xs">Text</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Add a text element</TooltipContent>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      className="flex flex-col h-16 gap-1 hover:bg-primary/10 hover:border-primary"
                      onClick={() => handleAddElement('image')}
                    >
                      <Image className="h-5 w-5" />
                      <span className="text-xs">Image</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Add an image</TooltipContent>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      className="flex flex-col h-16 gap-1 hover:bg-primary/10 hover:border-primary"
                      onClick={() => handleAddElement('shape')}
                    >
                      <Square className="h-5 w-5" />
                      <span className="text-xs">Rectangle</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Add a rectangle shape</TooltipContent>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      className="flex flex-col h-16 gap-1 hover:bg-primary/10 hover:border-primary"
                      onClick={() => handleAddElement('line')}
                    >
                      <Minus className="h-5 w-5" />
                      <span className="text-xs">Line</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Add a horizontal line</TooltipContent>
                </Tooltip>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Text Presets */}
          <AccordionItem value="text-presets" className="border-b-0">
            <AccordionTrigger className="px-4 py-3 text-sm hover:no-underline">
              Text Presets
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start h-auto py-2 hover:bg-primary/10 hover:border-primary"
                  onClick={() => handleAddElement('text', 'CERTIFICATE OF COMPLETION', DEFAULT_TITLE_STYLE)}
                >
                  <div className="text-left">
                    <div className="text-lg font-bold">Title</div>
                    <div className="text-xs text-muted-foreground">Large, bold text for headings</div>
                  </div>
                </Button>
                
                <Button
                  variant="outline"
                  className="w-full justify-start h-auto py-2 hover:bg-primary/10 hover:border-primary"
                  onClick={() => handleAddElement('text', 'Section Heading', DEFAULT_HEADING_STYLE)}
                >
                  <div className="text-left">
                    <div className="text-base font-semibold">Heading</div>
                    <div className="text-xs text-muted-foreground">Medium text for sections</div>
                  </div>
                </Button>
                
                <Button
                  variant="outline"
                  className="w-full justify-start h-auto py-2 hover:bg-primary/10 hover:border-primary"
                  onClick={() => handleAddElement('text', 'This is to certify that the above named individual has successfully completed the required course.', DEFAULT_TEXT_STYLE)}
                >
                  <div className="text-left">
                    <div className="text-sm">Body Text</div>
                    <div className="text-xs text-muted-foreground">Regular paragraph text</div>
                  </div>
                </Button>
                
                <Button
                  variant="outline"
                  className="w-full justify-start h-auto py-2 hover:bg-primary/10 hover:border-primary"
                  onClick={() => handleAddElement('text', 'Additional information', DEFAULT_SUBTITLE_STYLE)}
                >
                  <div className="text-left">
                    <div className="text-xs text-muted-foreground">Caption</div>
                    <div className="text-xs text-muted-foreground">Small, subtle text</div>
                  </div>
                </Button>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Placeholders */}
          <AccordionItem value="placeholders" className="border-b-0">
            <AccordionTrigger className="px-4 py-3 text-sm hover:no-underline">
              <div className="flex items-center gap-2">
                Dynamic Fields
                <span className="text-[10px] bg-primary/20 px-1.5 py-0.5 rounded">Auto-fill</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <p className="text-xs text-muted-foreground mb-3">
                These fields are automatically replaced with real data when a certificate is generated.
              </p>
              <div className="space-y-1">
                {PLACEHOLDER_VARIABLES.map((placeholder) => {
                  const Icon = getPlaceholderIcon(placeholder.key);
                  return (
                    <Tooltip key={placeholder.key}>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-xs h-9 hover:bg-primary/10"
                          onClick={() => handleAddElement('placeholder', placeholder.key, DEFAULT_HEADING_STYLE)}
                        >
                          <Icon className="h-3.5 w-3.5 mr-2 text-primary" />
                          <span className="truncate">{placeholder.label}</span>
                          <Plus className="h-3 w-3 ml-auto opacity-50" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-[200px]">
                        <div>
                          <p className="font-semibold">{placeholder.key}</p>
                          <p className="text-xs text-muted-foreground">{placeholder.description}</p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Canvas Settings */}
          <AccordionItem value="canvas" className="border-b-0">
            <AccordionTrigger className="px-4 py-3 text-sm hover:no-underline">
              Canvas Settings
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4 space-y-4">
              <div className="space-y-2">
                <Label className="text-xs">Background Color</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={backgroundColor}
                    onChange={(e) => onBackgroundColorChange(e.target.value)}
                    className="w-12 h-9 p-1 cursor-pointer"
                  />
                  <Input
                    value={backgroundColor}
                    onChange={(e) => onBackgroundColorChange(e.target.value)}
                    className="flex-1 h-9 text-sm"
                    placeholder="#FFFFFF"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-xs">Background Image URL</Label>
                <Input
                  value={backgroundImage || ''}
                  onChange={(e) => onBackgroundImageChange(e.target.value)}
                  className="h-9 text-sm"
                  placeholder="https://example.com/bg.png"
                />
                {backgroundImage && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs h-8"
                    onClick={() => onBackgroundImageChange('')}
                  >
                    Remove Background Image
                  </Button>
                )}
              </div>
              
              <Separator />
              
              <div className="text-xs text-muted-foreground">
                <p className="font-medium mb-1">Canvas Size: A4</p>
                <p>210mm × 297mm (Portrait)</p>
                <p>794px × 1123px at 96 DPI</p>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  );
}

