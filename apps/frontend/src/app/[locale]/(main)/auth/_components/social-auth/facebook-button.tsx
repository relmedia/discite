"use client";

import { siFacebook } from "simple-icons";
import { useState } from "react";
import { signIn } from "next-auth/react";

import { SimpleIcon } from "@/components/simple-icon";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTranslations } from "@/components/intl-provider";

interface FacebookButtonProps extends React.ComponentProps<typeof Button> {}

export function FacebookButton({ className, ...props }: FacebookButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const t = useTranslations();

  const handleFacebookLogin = async () => {
    setIsLoading(true);
    try {
      await signIn("facebook", { callbackUrl: "/dashboard" });
    } catch (error) {
      console.error("Facebook sign-in error:", error);
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="secondary"
      className={cn("bg-[#1877F2] hover:bg-[#166FE5] text-white", className)}
      onClick={handleFacebookLogin}
      disabled={isLoading}
      {...props}
    >
      <SimpleIcon icon={siFacebook} className="size-4" />
      {isLoading ? t("auth.redirecting") : t("auth.continueWithFacebook")}
    </Button>
  );
}

