"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useDrag, useDrop } from "react-dnd";
import { CertificateElement } from "./types";
import { Lock, Move, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

interface DraggableElementProps {
  element: CertificateElement;
  isSelected: boolean;
  canvasScale: number;
  onSelect: () => void;
  onMove: (x: number, y: number) => void;
  onUpdate: (updates: Partial<CertificateElement>) => void;
  onDelete: () => void;
}

export function DraggableElement({
  element,
  isSelected,
  canvasScale,
  onSelect,
  onMove,
  onUpdate,
  onDelete,
}: DraggableElementProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(element.content);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, elemX: 0, elemY: 0 });
  const elementRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isSelected) return;
      
      // Check if the event target is an input, textarea, or contenteditable
      // If so, don't handle Delete/Backspace as it's for text editing
      const target = e.target as HTMLElement;
      const isInputElement = 
        target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' || 
        target.isContentEditable;
      
      if (e.key === 'Delete' || e.key === 'Backspace') {
        // Only delete element if not editing and not focused on an input
        if (!isEditing && !isInputElement) {
          e.preventDefault();
          onDelete();
        }
      }
      
      if (e.key === 'Escape') {
        if (isEditing) {
          setIsEditing(false);
          setEditContent(element.content);
        }
      }
      
      if (e.key === 'Enter' && e.ctrlKey) {
        if (isEditing) {
          setIsEditing(false);
          onUpdate({ content: editContent });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSelected, isEditing, editContent, element.content, onDelete, onUpdate]);

  // Focus input when editing
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (element.locked || isEditing) return;
    
    e.preventDefault();
    e.stopPropagation();
    onSelect();
    
    setIsDragging(true);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      elemX: element.position.x,
      elemY: element.position.y,
    });
  }, [element.locked, element.position, isEditing, onSelect]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    
    const dx = (e.clientX - dragStart.x) / canvasScale;
    const dy = (e.clientY - dragStart.y) / canvasScale;
    
    // Convert to percentage
    const canvasWidth = 794; // A4 width in px
    const canvasHeight = 1123; // A4 height in px
    
    const newX = Math.max(0, Math.min(100, dragStart.elemX + (dx / canvasWidth) * 100));
    const newY = Math.max(0, Math.min(100, dragStart.elemY + (dy / canvasHeight) * 100));
    
    onMove(newX, newY);
  }, [isDragging, dragStart, canvasScale, onMove]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleDoubleClick = () => {
    if (element.type === 'text' || element.type === 'placeholder') {
      setIsEditing(true);
      setEditContent(element.content);
    }
  };

  const handleBlur = () => {
    if (isEditing) {
      setIsEditing(false);
      if (editContent !== element.content) {
        onUpdate({ content: editContent });
      }
    }
  };

  const getElementStyle = (): React.CSSProperties => {
    const { style, position, size } = element;
    
    return {
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
      width: element.type === 'image' || element.type === 'shape' || element.type === 'line' 
        ? `${size.width}px` 
        : 'auto',
      maxWidth: element.type === 'text' || element.type === 'placeholder' ? `${size.width}px` : undefined,
      height: size.height ? `${size.height}px` : 'auto',
      cursor: element.locked ? 'not-allowed' : (isDragging ? 'grabbing' : 'grab'),
      userSelect: 'none',
      zIndex: element.zIndex ?? 0,
    };
  };

  const renderContent = () => {
    if (isEditing && (element.type === 'text' || element.type === 'placeholder')) {
      return (
        <textarea
          ref={inputRef}
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          onBlur={handleBlur}
          className="bg-transparent border-none outline-none resize-none w-full min-h-[1.5em] text-inherit font-inherit"
          style={{
            textAlign: element.style.textAlign as any,
            fontSize: 'inherit',
            fontFamily: 'inherit',
            fontWeight: 'inherit',
            fontStyle: 'inherit',
            color: 'inherit',
            lineHeight: 'inherit',
            letterSpacing: 'inherit',
          }}
          rows={Math.max(1, editContent.split('\n').length)}
        />
      );
    }

    switch (element.type) {
      case 'text':
      case 'placeholder':
        return (
          <span style={{ whiteSpace: 'pre-wrap' }}>
            {element.content}
          </span>
        );
      case 'image':
        return element.content ? (
          <img 
            src={element.content} 
            alt="" 
            className="max-w-full h-auto object-contain"
            style={{ width: element.size.width, height: element.size.height }}
            draggable={false}
          />
        ) : (
          <div 
            className="flex items-center justify-center bg-muted border-2 border-dashed border-muted-foreground/30 rounded"
            style={{ width: element.size.width, height: element.size.height || 100 }}
          >
            <span className="text-xs text-muted-foreground">Image</span>
          </div>
        );
      case 'shape':
        return (
          <div 
            className="rounded"
            style={{ 
              width: '100%', 
              height: element.size.height || 50,
              backgroundColor: element.style.backgroundColor || '#e5e7eb',
            }}
          />
        );
      case 'line':
        return (
          <div 
            style={{ 
              width: '100%', 
              height: element.size.height || 2,
              backgroundColor: element.style.color || '#000000',
            }}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div
      ref={elementRef}
      className={cn(
        "group transition-shadow",
        isSelected && "ring-2 ring-blue-500 ring-offset-1",
        isDragging && "opacity-70",
        element.locked && "opacity-60"
      )}
      style={getElementStyle()}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
    >
      {/* Selection handles */}
      {isSelected && !element.locked && (
        <>
          {/* Move handle */}
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-blue-500 text-white px-1.5 py-0.5 rounded text-[10px] flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Move className="h-3 w-3" />
          </div>
          
          {/* Resize handles */}
          <div className="absolute -top-1 -left-1 w-2 h-2 bg-blue-500 rounded-full cursor-nw-resize" />
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full cursor-ne-resize" />
          <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-blue-500 rounded-full cursor-sw-resize" />
          <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-blue-500 rounded-full cursor-se-resize" />
        </>
      )}
      
      {/* Lock indicator */}
      {element.locked && (
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-orange-500 text-white px-1.5 py-0.5 rounded text-[10px] flex items-center gap-1">
          <Lock className="h-3 w-3" />
        </div>
      )}

      {renderContent()}
    </div>
  );
}

