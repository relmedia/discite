"use client";

import { siGoogle } from "simple-icons";
import { useState } from "react";
import { signIn } from "next-auth/react";

import { SimpleIcon } from "@/components/simple-icon";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTranslations } from "@/components/intl-provider";

interface GoogleButtonProps extends React.ComponentProps<typeof Button> {}

export function GoogleButton({ className, ...props }: GoogleButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const t = useTranslations();

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      await signIn("google", { callbackUrl: "/dashboard" });
    } catch (error) {
      console.error("Google sign-in error:", error);
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="secondary"
      className={cn(className)}
      onClick={handleGoogleLogin}
      disabled={isLoading}
      {...props}
    >
      <SimpleIcon icon={siGoogle} className="size-4" />
      {isLoading ? t("auth.redirecting") : t("auth.continueWithGoogle")}
    </Button>
  );
}
