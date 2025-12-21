"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Award, Eye, Calendar, Clock, GraduationCap, FileDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { certificatesApi, Certificate } from "@/lib/api/certificates";
import { useAuth } from "@/hooks/use-auth";
import { CertificateRenderer } from "@/components/certificates/certificate-renderer";
import { exportCertificateDataToPDF } from "@/lib/utils/pdf-export";
import { useTranslations } from "@/components/intl-provider";

export default function MyCertificatesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCertificate, setSelectedCertificate] = useState<Certificate | null>(null);
  const t = useTranslations();

  useEffect(() => {
    fetchCertificates();
  }, []);

  const fetchCertificates = async () => {
    try {
      const data = await certificatesApi.getMyCertificates();
      // Fetch templates for certificates that don't have them loaded
      const certificatesWithTemplates = await Promise.all(
        data.map(async (cert) => {
          if (!cert.template && cert.templateId) {
            try {
              const template = await certificatesApi.getTemplateById(cert.templateId);
              return { ...cert, template };
            } catch {
              return cert;
            }
          }
          return cert;
        })
      );
      setCertificates(certificatesWithTemplates);
    } catch (error) {
      toast.error(t("certificates.failedToLoad"));
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const isExpired = (expiryDate?: string) => {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
  };

  const activeCertificates = certificates.filter(c => !isExpired(c.expiryDate));
  const expiredCertificates = certificates.filter(c => isExpired(c.expiryDate));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Award className="h-8 w-8" />
          {t("certificates.title")}
        </h1>
        <p className="text-muted-foreground mt-1">
          {t("certificates.viewDownload")}
        </p>
      </div>

      {certificates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="rounded-full bg-muted p-4 mb-4">
              <GraduationCap className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">{t("certificates.noCertificatesYet")}</h3>
            <p className="text-muted-foreground text-center mb-4">
              {t("certificates.completeCourses")}
            </p>
            <Button onClick={() => router.push("/dashboard/marketplace")}>
              {t("certificates.browseCourses")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="active" className="w-full">
          <TabsList>
            <TabsTrigger value="active">
              {t("certificates.active")} ({activeCertificates.length})
            </TabsTrigger>
            <TabsTrigger value="expired">
              {t("certificates.expired")} ({expiredCertificates.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="mt-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {activeCertificates.map((certificate) => (
                <CertificateCard
                  key={certificate.id}
                  certificate={certificate}
                  onView={() => setSelectedCertificate(certificate)}
                />
              ))}
            </div>
            {activeCertificates.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                {t("certificates.noActiveCertificates")}
              </p>
            )}
          </TabsContent>

          <TabsContent value="expired" className="mt-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {expiredCertificates.map((certificate) => (
                <CertificateCard
                  key={certificate.id}
                  certificate={certificate}
                  onView={() => setSelectedCertificate(certificate)}
                  isExpired
                />
              ))}
            </div>
            {expiredCertificates.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                {t("certificates.noExpiredCertificates")}
              </p>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Certificate Detail Modal */}
      {selectedCertificate && (
        <CertificateDetailModal
          certificate={selectedCertificate}
          onClose={() => setSelectedCertificate(null)}
        />
      )}
    </div>
  );
}

function CertificateCard({
  certificate,
  onView,
  isExpired = false,
}: {
  certificate: Certificate;
  onView: () => void;
  isExpired?: boolean;
}) {
  const [exporting, setExporting] = useState(false);
  const t = useTranslations();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const handleExportPDF = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setExporting(true);
    
    try {
      const filename = `certificate-${certificate.certificateNumber}.pdf`;
      await exportCertificateDataToPDF(certificate, filename);
      toast.success(t("certificates.downloadedSuccess"));
    } catch (error) {
      console.error("Failed to export certificate:", error);
      toast.error(t("certificates.failedToDownload"));
    } finally {
      setExporting(false);
    }
  };

  return (
    <Card className={isExpired ? "opacity-60" : ""}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg line-clamp-2">
              {certificate.courseName}
            </CardTitle>
            <CardDescription>
              {t("certificates.issuedOn")} {formatDate(certificate.issueDate)}
            </CardDescription>
          </div>
          <Award className="h-8 w-8 text-yellow-500" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {isExpired ? (
              <Badge variant="destructive">{t("common.expired")}</Badge>
            ) : certificate.expiryDate ? (
              <Badge variant="secondary">
                <Calendar className="h-3 w-3 mr-1" />
                {t("certificates.validUntil")} {formatDate(certificate.expiryDate)}
              </Badge>
            ) : (
              <Badge variant="secondary">
                <Clock className="h-3 w-3 mr-1" />
                {t("certificates.neverExpires")}
              </Badge>
            )}
            {certificate.finalGrade && (
              <Badge variant="outline">
                {t("certificates.grade")}: {certificate.finalGrade}%
              </Badge>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            {t("certificates.certificateNumber")}{certificate.certificateNumber}
          </p>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1" onClick={onView}>
              <Eye className="h-4 w-4 mr-1" />
              {t("common.view")}
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1"
              onClick={handleExportPDF}
              disabled={exporting}
            >
              {exporting ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <FileDown className="h-4 w-4 mr-1" />
              )}
              {exporting ? "..." : "PDF"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CertificateDetailModal({
  certificate,
  onClose,
}: {
  certificate: Certificate;
  onClose: () => void;
}) {
  const t = useTranslations();

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="!max-w-4xl max-h-[90vh] overflow-hidden p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>{t("certificates.certificateDetails")}</DialogTitle>
        </DialogHeader>
        <div className="flex mx-auto dark:bg-gray-800">
          <div 
            style={{ 
              transform: 'scale(0.9)',
              transformOrigin: 'center center',
            }}
          >
            <CertificateRenderer certificate={certificate} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


