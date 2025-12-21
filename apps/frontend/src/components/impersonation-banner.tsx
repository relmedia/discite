"use client";

import { AlertTriangle, ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useTranslations } from "@/components/intl-provider";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function ImpersonationBanner() {
  const { isImpersonating, impersonation, stopImpersonation, user } = useAuth();
  const t = useTranslations();

  if (!isImpersonating || !impersonation) {
    return null;
  }

  const handleStopImpersonation = async () => {
    try {
      const success = await stopImpersonation();
      if (success) {
        toast.success(t("users.returnedToOriginal"));
        // Force a full page reload to reset all state
        window.location.href = "/dashboard/users";
      } else {
        toast.error(t("users.returnFailed"));
      }
    } catch (error) {
      toast.error(t("users.returnFailed"));
    }
  };

  return (
    <>
      {/* Spacer to push content down */}
      <div className="h-10 w-full" />
      {/* Fixed banner at absolute top */}
      <div className="fixed top-0 left-0 right-0 z-[9999] bg-orange-500 text-white px-4 py-2 shadow-md">
        <div className="max-w-screen-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm font-medium">
              {t("users.impersonatingAs", { 
                name: user?.name || impersonation.impersonatedUser?.name || "Unknown" 
              })}
            </span>
            <span className="text-sm opacity-80">
              ({t("users.originalUser")}: {impersonation.originalUserEmail})
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleStopImpersonation}
            className="text-white hover:bg-orange-600 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            {t("users.switchBack")}
          </Button>
        </div>
      </div>
    </>
  );
}
