"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Award, CheckCircle, XCircle, Calendar, User, BookOpen } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { certificatesApi, VerificationResult } from "@/lib/api/certificates";

export default function VerifyCertificatePage() {
  const params = useParams();
  const certificateNumber = params.certificateNumber as string;
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    verifyCertificate();
  }, [certificateNumber]);

  const verifyCertificate = async () => {
    try {
      const data = await certificatesApi.verifyCertificate(certificateNumber);
      setResult(data);
    } catch (error) {
      setResult({ valid: false, message: "Failed to verify certificate" });
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            {result?.valid ? (
              <div className="rounded-full bg-green-100 p-4">
                <CheckCircle className="h-12 w-12 text-green-600" />
              </div>
            ) : (
              <div className="rounded-full bg-red-100 p-4">
                <XCircle className="h-12 w-12 text-red-600" />
              </div>
            )}
          </div>
          <CardTitle className="text-2xl">
            {result?.valid ? "Certificate Verified" : "Verification Failed"}
          </CardTitle>
          <CardDescription>
            {result?.valid
              ? "This is a valid certificate issued by our platform"
              : result?.message || "This certificate could not be verified"}
          </CardDescription>
        </CardHeader>

        {result?.valid && result.certificate && (
          <CardContent className="space-y-6">
            {/* Certificate Details */}
            <div className="bg-gradient-to-b from-amber-50 to-white rounded-lg border p-6 text-center">
              <Award className="h-10 w-10 text-yellow-500 mx-auto mb-3" />
              <h3 className="font-serif text-xl font-semibold text-gray-800 mb-1">
                Certificate of Completion
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                #{result.certificate.certificateNumber}
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Recipient</p>
                  <p className="font-medium">{result.certificate.studentName}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <BookOpen className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Course</p>
                  <p className="font-medium">{result.certificate.courseName}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Issued On</p>
                  <p className="font-medium">{formatDate(result.certificate.issueDate)}</p>
                </div>
              </div>

              {result.certificate.expiryDate && (
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Valid Until</p>
                    <p className="font-medium">{formatDate(result.certificate.expiryDate)}</p>
                  </div>
                </div>
              )}

              {result.certificate.instructorName && (
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Instructor</p>
                    <p className="font-medium">{result.certificate.instructorName}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 border-t">
              <Badge variant="secondary" className="w-full justify-center py-2">
                <CheckCircle className="h-4 w-4 mr-2" />
                Authentic Certificate
              </Badge>
            </div>
          </CardContent>
        )}

        {!result?.valid && (
          <CardContent>
            <div className="text-center text-sm text-muted-foreground">
              <p>Certificate Number: {certificateNumber}</p>
              <p className="mt-2">
                If you believe this is an error, please contact support.
              </p>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}

