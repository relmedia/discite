'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { EmailVisualEditor } from '@/components/email/visual-editor';
import { getEmailTemplate, EmailTemplate } from '@/lib/api/email';

export default function EditEmailTemplatePage() {
  const params = useParams();
  const templateId = params.templateId as string;

  const [loading, setLoading] = useState(true);
  const [template, setTemplate] = useState<EmailTemplate | null>(null);

  useEffect(() => {
    async function loadTemplate() {
      try {
        const data = await getEmailTemplate(templateId);
        setTemplate(data);
      } catch (error) {
        console.error('Failed to load template:', error);
      } finally {
        setLoading(false);
      }
    }

    loadTemplate();
  }, [templateId]);

  if (loading) {
    return (
      <div className="h-full p-4 md:p-6">
        <div className="space-y-6">
          <Skeleton className="h-16" />
          <div className="flex gap-4">
            <Skeleton className="w-64 h-[calc(100vh-200px)]" />
            <Skeleton className="flex-1 h-[calc(100vh-200px)]" />
          </div>
        </div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="h-full p-4 md:p-6 flex items-center justify-center">
        <p className="text-muted-foreground">Template not found</p>
      </div>
    );
  }

  return <EmailVisualEditor template={template} isEditing />;
}
