"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { CertificateVisualEditor } from "@/components/certificates/visual-editor";
import { certificatesApi, CertificateTemplate } from "@/lib/api/certificates";
import { Loader2 } from "lucide-react";

export default function EditVisualEditorPage() {
  const params = useParams();
  const templateId = params.templateId as string;
  const [template, setTemplate] = useState<CertificateTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTemplate = async () => {
      try {
        const data = await certificatesApi.getTemplateById(templateId);
        setTemplate(data);
      } catch (err: any) {
        setError(err.message || "Failed to load template");
      } finally {
        setLoading(false);
      }
    };

    if (templateId) {
      fetchTemplate();
    }
  }, [templateId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-100px)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !template) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-100px)]">
        <div className="text-center">
          <p className="text-destructive">{error || "Template not found"}</p>
        </div>
      </div>
    );
  }

  return <CertificateVisualEditor template={template} isEditing />;
}

