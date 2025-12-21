"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Download, Printer, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { certificatesApi, CertificateTemplate, Certificate } from "@/lib/api/certificates";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { CertificateRenderer } from "@/components/certificates/certificate-renderer";
import { exportCertificateToPDF } from "@/lib/utils/pdf-export";
import { useTranslations } from "@/components/intl-provider";

export default function PreviewCertificateTemplatePage() {
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

  const certificateRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = async () => {
    if (!certificateRef.current) {
      toast.error(t("certificates.certificateElementNotFound"));
      return;
    }

    setExporting(true);
    try {
      const filename = `certificate-template-${template?.name.replace(/\s+/g, '-').toLowerCase()}.pdf`;
      await exportCertificateToPDF(certificateRef.current, filename);
      toast.success(t("certificates.certificateExported"));
    } catch (error) {
      toast.error(t("certificates.failedToExport"));
      console.error(error);
    } finally {
      setExporting(false);
    }
  };

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

  // Create a mock certificate for preview
  const mockCertificate: Certificate = {
    id: "preview",
    tenantId: template.tenantId,
    userId: "preview",
    courseId: "preview",
    templateId: template.id,
    certificateNumber: "CERT-2024-001",
    studentName: "John Doe",
    courseName: "Introduction to Web Development",
    instructorName: "Jane Smith",
    completionDate: new Date().toISOString(),
    issueDate: new Date().toISOString(),
    isRevoked: false,
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page {
            size: A4;
            margin: 0;
          }
          body {
            margin: 0;
            padding: 0;
          }
        }
      `}} />
      <div className="space-y-6">
        <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{t("certificates.previewTitle", { name: template.name })}</h1>
            <p className="text-muted-foreground">
              {t("certificates.previewDescription")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            {t("certificates.print")}
          </Button>
          <Button 
            variant="outline" 
            onClick={handleExportPDF}
            disabled={exporting}
          >
            <FileDown className="h-4 w-4 mr-2" />
            {exporting ? t("certificates.exporting") : t("certificates.exportPDF")}
          </Button>
          <Button onClick={() => router.push(`/dashboard/certificates/templates/${template.id}/edit`)}>
            {t("certificates.editTemplate")}
          </Button>
        </div>
      </div>

      <Card className="print:shadow-none print:border-none">
        <CardHeader className="print:hidden">
          <CardTitle>{t("certificates.certificatePreview")}</CardTitle>
        </CardHeader>
        <CardContent className="print:p-0 flex justify-center">
          <CertificateRenderer ref={certificateRef} certificate={mockCertificate} template={template} />
        </CardContent>
      </Card>
      </div>
    </>
  );
}

