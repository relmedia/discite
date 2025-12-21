"use client";

import { useRouter } from "next/navigation";
import { XCircle } from "lucide-react";

import { useTranslations } from "@/components/intl-provider";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function PaymentCancelledPage() {
  const t = useTranslations();
  const router = useRouter();

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Card className="max-w-md w-full text-center">
        <CardHeader>
          <XCircle className="h-16 w-16 text-muted-foreground mx-auto" />
          <CardTitle className="mt-4">
            {t("marketplace.paymentCancelled")}
          </CardTitle>
          <CardDescription>
            {t("marketplace.paymentCancelledDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {t("marketplace.noChargesMade")}
          </p>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={() => router.push("/dashboard")}>
              {t("sidebar.dashboard")}
            </Button>
            <Button onClick={() => router.push("/dashboard/marketplace")}>
              {t("marketplace.backToMarketplace")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

