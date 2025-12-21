"use client";

import { siApple } from "simple-icons";
import { useState } from "react";
import { signIn } from "next-auth/react";

import { SimpleIcon } from "@/components/simple-icon";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTranslations } from "@/components/intl-provider";

interface AppleButtonProps extends React.ComponentProps<typeof Button> {}

export function AppleButton({ className, ...props }: AppleButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const t = useTranslations();

  const handleAppleLogin = async () => {
    setIsLoading(true);
    try {
      await signIn("apple", { callbackUrl: "/dashboard" });
    } catch (error) {
      console.error("Apple sign-in error:", error);
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="secondary"
      className={cn("bg-black hover:bg-gray-900 text-white dark:bg-white dark:text-black dark:hover:bg-gray-100", className)}
      onClick={handleAppleLogin}
      disabled={isLoading}
      {...props}
    >
      <SimpleIcon icon={siApple} className="size-4" />
      {isLoading ? t("auth.redirecting") : t("auth.continueWithApple")}
    </Button>
  );
}

