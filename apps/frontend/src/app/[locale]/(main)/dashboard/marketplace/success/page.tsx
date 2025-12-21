"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { useTranslations } from "@/components/intl-provider";
import { useAuth } from "@/hooks/use-auth";
import { paymentApi } from "@/lib/api/marketplace";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function PaymentSuccessPage() {
  const t = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  
  const [isVerifying, setIsVerifying] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const [courseName, setCourseName] = useState("");
  const [courseId, setCourseId] = useState("");
  
  // Check if user is admin (can manage licenses)
  const isAdmin = user?.role === "SUPERADMIN" || user?.role === "ADMIN";

  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    if (sessionId) {
      verifyPayment(sessionId);
    } else {
      setIsVerifying(false);
    }
  }, [searchParams]);

  const verifyPayment = async (sessionId: string) => {
    try {
      const result = await paymentApi.verifySession(sessionId);
      setIsSuccess(true);
      setCourseName(result?.courseName || "");
      setCourseId(result?.courseId || "");
      toast.success(t("marketplace.purchaseComplete"));
    } catch (error: any) {
      console.error("Failed to verify payment:", error);
      toast.error(error.message || t("marketplace.verificationFailed"));
    } finally {
      setIsVerifying(false);
    }
  };

  if (isVerifying) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-muted-foreground">{t("marketplace.verifyingPayment")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Card className="max-w-lg w-full text-center">
        <CardHeader>
          {isSuccess ? (
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
          ) : null}
          <CardTitle className="mt-4">
            {isSuccess 
              ? t("marketplace.purchaseSuccessful") 
              : t("marketplace.somethingWentWrong")}
          </CardTitle>
          <CardDescription>
            {isSuccess 
              ? (isAdmin 
                  ? t("marketplace.courseAddedToOrganization", { course: courseName })
                  : t("marketplace.courseAddedToAccount", { course: courseName }))
              : t("marketplace.tryAgainLater")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isSuccess && (
            <p className="text-sm text-muted-foreground">
              {isAdmin 
                ? t("marketplace.assignUsersNow")
                : t("marketplace.startLearningNow")}
            </p>
          )}
          <div className="flex flex-wrap gap-2 justify-center">
            <Button variant="outline" onClick={() => router.push("/dashboard/marketplace")}>
              {t("marketplace.browseMore")}
            </Button>
            {isAdmin ? (
              <Button onClick={() => router.push("/dashboard/marketplace/purchases")}>
                {t("marketplace.manageLicenses")}
              </Button>
            ) : (
              <Button onClick={() => router.push(courseId ? `/dashboard/courses/${courseId}` : "/dashboard/courses/my-courses")}>
                {t("marketplace.startCourse")}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

