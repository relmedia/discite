"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { CertificateTemplateForm } from "@/components/certificates/certificate-template-form";
import { certificatesApi, CertificateTemplate } from "@/lib/api/certificates";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { useTranslations } from "@/components/intl-provider";

export default function EditCertificateTemplatePage() {
  const router = useRouter();
  const params = useParams();
  const { user, isLoading: isAuthLoading } = useAuth();
  const t = useTranslations();
  const [template, setTemplate] = useState<CertificateTemplate | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthLoading && user && user.role !== "SUPERADMIN") {
      router.push("/dashboard/courses");
      return;
    }

    const fetchTemplate = async () => {
      try {
        const data = await certificatesApi.getTemplateById(params.templateId as string);
        setTemplate(data);
      } catch (error) {
        toast.error(t("certificates.failedToLoadTemplate"));
        router.push("/dashboard/certificates/templates");
      } finally {
        setLoading(false);
      }
    };

    if (!isAuthLoading && user?.role === "SUPERADMIN" && params.templateId) {
      fetchTemplate();
    }
  }, [params.templateId, user, isAuthLoading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!template) {
    return null;
  }

  return <CertificateTemplateForm template={template} isEditing />;
}

