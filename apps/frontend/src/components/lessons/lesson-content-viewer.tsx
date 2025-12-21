"use client";

import ReactMarkdown from "react-markdown";
import { LessonWithAccess, LessonType } from "@repo/shared";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Video, FileIcon } from "lucide-react";

interface LessonContentViewerProps {
  lesson: LessonWithAccess;
}

export function LessonContentViewer({ lesson }: LessonContentViewerProps) {
  const getVideoEmbedUrl = (url: string): string => {
    // YouTube
    const youtubeRegex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/;
    const youtubeMatch = url.match(youtubeRegex);
    if (youtubeMatch) {
      return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
    }

    // Vimeo
    const vimeoRegex = /vimeo\.com\/(\d+)/;
    const vimeoMatch = url.match(vimeoRegex);
    if (vimeoMatch) {
      return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    }

    // Direct video URL
    return url;
  };

  const renderVideoContent = () => {
    if (!lesson.videoUrl) return null;

    const embedUrl = getVideoEmbedUrl(lesson.videoUrl);
    const isDirectVideo = embedUrl === lesson.videoUrl;

    if (isDirectVideo) {
      return (
        <video
          controls
          className="w-full aspect-video rounded-lg bg-black"
          src={embedUrl}
        >
          Your browser does not support the video tag.
        </video>
      );
    }

    return (
      <iframe
        src={embedUrl}
        className="w-full aspect-video rounded-lg"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    );
  };

  const renderTextContent = () => {
    if (!lesson.content) return null;

    return (
      <div className="prose prose-sm max-w-none dark:prose-invert">
        <ReactMarkdown>{lesson.content}</ReactMarkdown>
      </div>
    );
  };

  const renderDocumentContent = () => {
    if (!lesson.documentUrl) return null;

    const isPdf = lesson.documentUrl.toLowerCase().endsWith('.pdf');

    if (isPdf) {
      return (
        <iframe
          src={lesson.documentUrl}
          className="w-full h-[600px] rounded-lg border"
          title={lesson.title}
        />
      );
    }

    // Use Google Docs Viewer for other document types
    return (
      <iframe
        src={`https://docs.google.com/viewer?url=${encodeURIComponent(lesson.documentUrl)}&embedded=true`}
        className="w-full h-[600px] rounded-lg border"
        title={lesson.title}
      />
    );
  };

  const renderMixedContent = () => {
    const hasVideo = !!lesson.videoUrl;
    const hasText = !!lesson.content;
    const hasDocument = !!lesson.documentUrl;

    return (
      <Tabs defaultValue={hasVideo ? "video" : hasText ? "text" : "document"}>
        <TabsList className="grid w-full grid-cols-3">
          {hasVideo && (
            <TabsTrigger value="video" disabled={!hasVideo}>
              <Video className="mr-2 h-4 w-4" />
              Video
            </TabsTrigger>
          )}
          {hasText && (
            <TabsTrigger value="text" disabled={!hasText}>
              <FileText className="mr-2 h-4 w-4" />
              Content
            </TabsTrigger>
          )}
          {hasDocument && (
            <TabsTrigger value="document" disabled={!hasDocument}>
              <FileIcon className="mr-2 h-4 w-4" />
              Document
            </TabsTrigger>
          )}
        </TabsList>

        {hasVideo && (
          <TabsContent value="video" className="mt-4">
            {renderVideoContent()}
          </TabsContent>
        )}

        {hasText && (
          <TabsContent value="text" className="mt-4">
            {renderTextContent()}
          </TabsContent>
        )}

        {hasDocument && (
          <TabsContent value="document" className="mt-4">
            {renderDocumentContent()}
          </TabsContent>
        )}
      </Tabs>
    );
  };

  switch (lesson.type) {
    case LessonType.VIDEO:
      return renderVideoContent();
    case LessonType.TEXT:
      return renderTextContent();
    case LessonType.DOCUMENT:
      return renderDocumentContent();
    case LessonType.MIXED:
      return renderMixedContent();
    default:
      return (
        <div className="text-center text-muted-foreground py-8">
          No content available for this lesson.
        </div>
      );
  }
}
