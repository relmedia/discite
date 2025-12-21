"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Edit, Trash2, Star, Eye, Copy, FileDown, Layout, FormInput, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { certificatesApi, CertificateTemplate, Certificate } from "@/lib/api/certificates";
import { useAuth } from "@/hooks/use-auth";
import { exportCertificateToPDF } from "@/lib/utils/pdf-export";
import { CertificateRenderer } from "@/components/certificates/certificate-renderer";
import { createRoot } from "react-dom/client";
import React from "react";
import { useTranslations } from "@/components/intl-provider";

export default function CertificateTemplatesPage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();
  const t = useTranslations();
  const [templates, setTemplates] = useState<CertificateTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTemplate, setDeleteTemplate] = useState<CertificateTemplate | null>(null);
  const [exportingTemplateId, setExportingTemplateId] = useState<string | null>(null);

  useEffect(() => {
    // Always try to fetch templates after auth loads
    // Backend will handle authorization
    if (!isAuthLoading) {
      fetchTemplates();
    }
  }, [isAuthLoading]);

  const fetchTemplates = async () => {
    try {
      const data = await certificatesApi.getTemplates();
      setTemplates(data);
    } catch (error) {
      toast.error(t("certificates.failedToLoadTemplates"));
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTemplate) return;

    try {
      await certificatesApi.deleteTemplate(deleteTemplate.id);
      toast.success(t("certificates.templateDeleted"));
      fetchTemplates();
    } catch (error: any) {
      toast.error(error.message || t("certificates.failedToDelete"));
    } finally {
      setDeleteTemplate(null);
    }
  };

  const handleSetDefault = async (template: CertificateTemplate) => {
    try {
      await certificatesApi.updateTemplate(template.id, { isDefault: true });
      toast.success(t("certificates.defaultUpdated"));
      fetchTemplates();
    } catch (error) {
      toast.error(t("certificates.failedToUpdateDefault"));
    }
  };

  const handleDuplicate = async (template: CertificateTemplate) => {
    try {
      await certificatesApi.createTemplate({
        name: `${template.name} (Copy)`,
        description: template.description,
        design: template.design,
        titleText: template.titleText,
        bodyTemplate: template.bodyTemplate,
        signatureText: template.signatureText,
        signatureImageUrl: template.signatureImageUrl,
        issuedByText: template.issuedByText,
        isDefault: false,
      });
      toast.success(t("certificates.templateDuplicated"));
      fetchTemplates();
    } catch (error) {
      toast.error(t("certificates.failedToDuplicate"));
    }
  };

  const handleExportPDF = async (template: CertificateTemplate) => {
    setExportingTemplateId(template.id);
    
    try {
      // Create a temporary container for rendering the certificate
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '0';
      tempContainer.style.width = '210mm';
      tempContainer.style.minHeight = '297mm';
      tempContainer.style.opacity = '1';
      tempContainer.style.visibility = 'visible';
      document.body.appendChild(tempContainer);

      // Create mock certificate
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

      // Render certificate using React
      const root = createRoot(tempContainer);
      
      root.render(
        React.createElement(CertificateRenderer, {
          certificate: mockCertificate,
          template: template,
        })
      );

      // Wait for React to render - give it more time
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Find the certificate element - CertificateRenderer renders a div as root
      let certificateElement: HTMLDivElement | null = null;
      
      // Strategy 1: Look for element with data-certificate-element attribute (most reliable)
      certificateElement = tempContainer.querySelector('div[data-certificate-element="true"]') as HTMLDivElement;
      
      // Strategy 2: Look for the first direct child div (CertificateRenderer's root element)
      if (!certificateElement && tempContainer.firstElementChild instanceof HTMLDivElement) {
        certificateElement = tempContainer.firstElementChild as HTMLDivElement;
      }
      
      // Strategy 3: Look for div with width: 210mm in inline style
      if (!certificateElement) {
        certificateElement = tempContainer.querySelector('div[style*="210mm"]') as HTMLDivElement;
      }
      
      // Strategy 3: Find any div with significant dimensions
      if (!certificateElement) {
        const allDivs = Array.from(tempContainer.querySelectorAll('div'));
        for (const div of allDivs) {
          // Check if it has substantial dimensions (certificate should be large)
          if (div.offsetWidth > 400 || div.offsetHeight > 500) {
            certificateElement = div as HTMLDivElement;
            break;
          }
        }
      }
      
      // Strategy 4: Use the largest div found
      if (!certificateElement) {
        const allDivs = Array.from(tempContainer.querySelectorAll('div'));
        let largestDiv: HTMLDivElement | null = null;
        let largestArea = 0;
        
        for (const div of allDivs) {
          const area = div.offsetWidth * div.offsetHeight;
          if (area > largestArea) {
            largestArea = area;
            largestDiv = div as HTMLDivElement;
          }
        }
        
        certificateElement = largestDiv;
      }
      
      // Strategy 5: Use container itself as absolute last resort
      if (!certificateElement) {
        console.warn('Could not find certificate element, using container');
        certificateElement = tempContainer as HTMLDivElement;
      }

      // Verify element exists and has content
      if (!certificateElement || certificateElement.offsetWidth === 0) {
        console.error('Certificate element not found or has no dimensions', {
          container: tempContainer,
          children: Array.from(tempContainer.children),
          html: tempContainer.innerHTML.substring(0, 500)
        });
        root.unmount();
        document.body.removeChild(tempContainer);
        throw new Error('Certificate element was not rendered or has no dimensions');
      }

      const filename = `certificate-template-${template.name.replace(/\s+/g, '-').toLowerCase()}.pdf`;
      await exportCertificateToPDF(certificateElement, filename);
      
      // Cleanup
      root.unmount();
      document.body.removeChild(tempContainer);
      
      toast.success(t("certificates.certificateExported"));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      toast.error(`${t("certificates.failedToExport")}: ${errorMessage}`);
      console.error("PDF export error:", error);
    } finally {
      setExportingTemplateId(null);
    }
  };

  const getLayoutLabel = (layout: string) => {
    const layouts: Record<string, string> = {
      classic: t("certificates.layoutClassic"),
      modern: t("certificates.layoutModern"),
      minimal: t("certificates.layoutMinimal"),
      elegant: t("certificates.layoutElegant"),
      swedish: t("certificates.layoutSwedish"),
      custom: t("certificates.layoutCustom"),
    };
    return layouts[layout] || layout;
  };

  const getBorderLabel = (border: string) => {
    const borders: Record<string, string> = {
      none: t("certificates.borderNone"),
      simple: t("certificates.borderSimple"),
      ornate: t("certificates.borderOrnate"),
      modern: t("certificates.borderModern"),
    };
    return borders[border] || border;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("certificates.templateTitle")}</h1>
          <p className="text-muted-foreground mt-1">
            {t("certificates.templateDescription")}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              {t("certificates.createTemplate")}
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>{t("certificates.chooseEditorType")}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/dashboard/certificates/templates/visual-editor")} className="cursor-pointer">
              <Layout className="mr-2 h-4 w-4" />
              <div>
                <div className="font-medium">{t("certificates.visualEditor")}</div>
                <div className="text-xs text-muted-foreground">{t("certificates.visualEditorDesc")}</div>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/dashboard/certificates/templates/new")} className="cursor-pointer">
              <FormInput className="mr-2 h-4 w-4" />
              <div>
                <div className="font-medium">{t("certificates.formEditor")}</div>
                <div className="text-xs text-muted-foreground">{t("certificates.formEditorDesc")}</div>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {templates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Star className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">{t("certificates.noTemplatesYet")}</h3>
            <p className="text-muted-foreground text-center mb-4">
              {t("certificates.noTemplatesDescription")}
            </p>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  {t("certificates.createTemplate")}
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64">
                <DropdownMenuItem onClick={() => router.push("/dashboard/certificates/templates/visual-editor")} className="cursor-pointer">
                  <Layout className="mr-2 h-4 w-4" />
                  <div>
                    <div className="font-medium">{t("certificates.visualEditor")}</div>
                    <div className="text-xs text-muted-foreground">{t("certificates.visualEditorDesc")}</div>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/dashboard/certificates/templates/new")} className="cursor-pointer">
                  <FormInput className="mr-2 h-4 w-4" />
                  <div>
                    <div className="font-medium">{t("certificates.formEditor")}</div>
                    <div className="text-xs text-muted-foreground">{t("certificates.formEditorDesc")}</div>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Card key={template.id} className="relative group overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {template.name}
                      {template.isDefault && (
                        <Badge variant="secondary" className="text-xs">
                          <Star className="h-3 w-3 mr-1 fill-current" />
                          {t("certificates.defaultBadge")}
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="line-clamp-2">
                      {template.description || t("certificates.noDescription")}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Preview area */}
                <div
                  className="aspect-[1.414/1] rounded-lg border mb-4 flex items-center justify-center overflow-hidden"
                  style={{
                    backgroundColor: template.design.backgroundColor,
                    backgroundImage: template.design.backgroundImageUrl
                      ? `url(${template.design.backgroundImageUrl})`
                      : undefined,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                >
                  <div className="text-center p-4" style={{ color: template.design.primaryColor }}>
                    <p className="text-xs font-semibold">{template.titleText}</p>
                    <p className="text-[8px] mt-1 opacity-70">
                      {getLayoutLabel(template.design.layout)} • {getBorderLabel(template.design.borderStyle)}
                    </p>
                  </div>
                </div>

                {/* Template info */}
                <div className="flex flex-wrap gap-2 mb-4">
                  <Badge variant="outline" className="text-xs">
                    {getLayoutLabel(template.design.layout)}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {getBorderLabel(template.design.borderStyle)}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {template.design.fontFamily}
                  </Badge>
                </div>


                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => router.push(`/dashboard/certificates/templates/${template.id}/preview`)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    {t("certificates.preview")}
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="flex-1">
                        <Edit className="h-4 w-4 mr-1" />
                        {t("common.edit")}
                        <ChevronDown className="ml-1 h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-48">
                      <DropdownMenuItem 
                        onClick={() => router.push(`/dashboard/certificates/templates/${template.id}/visual-editor`)} 
                        className="cursor-pointer"
                      >
                        <Layout className="mr-2 h-4 w-4" />
                        {t("certificates.visualEditor")}
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => router.push(`/dashboard/certificates/templates/${template.id}/edit`)} 
                        className="cursor-pointer"
                      >
                        <FormInput className="mr-2 h-4 w-4" />
                        {t("certificates.formEditor")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleExportPDF(template)}
                    disabled={exportingTemplateId === template.id}
                  >
                    <FileDown className="h-4 w-4 mr-1" />
                    {exportingTemplateId === template.id ? t("certificates.exporting") : "PDF"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDuplicate(template)}
                    title={t("certificates.duplicate")}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  {!template.isDefault && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleSetDefault(template)}
                        title={t("certificates.setAsDefault")}
                      >
                        <Star className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteTemplate(template)}
                        title={t("common.delete")}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteTemplate} onOpenChange={() => setDeleteTemplate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("certificates.deleteTemplate")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("certificates.deleteTemplateConfirm", { name: deleteTemplate?.name || "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

