"use client";

import Link from "next/link";

import { APP_CONFIG } from "@/config/app-config";
import { useTranslations } from "@/components/intl-provider";
import { LanguageSwitcher } from "@/components/language-switcher";

import { RegisterForm } from "../auth/_components/register-form";
import { GoogleButton, FacebookButton, AppleButton } from "../auth/_components/social-auth";

export default function RegisterPage() {
  const t = useTranslations();
  
  return (
    <>
      <div className="mx-auto flex w-full flex-col justify-center space-y-8 sm:w-[350px]">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-medium">{t("auth.createAccount")}</h1>
          <p className="text-muted-foreground text-sm">{t("auth.enterDetailsRegister")}</p>
        </div>
        <div className="space-y-4">
          <div className="flex flex-col gap-3">
            <GoogleButton className="w-full" />
            <FacebookButton className="w-full" />
            <AppleButton className="w-full" />
          </div>
          <div className="after:border-border relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
            <span className="bg-background text-muted-foreground relative z-10 px-2">{t("auth.orContinueWith")}</span>
          </div>
          <RegisterForm />
        </div>
      </div>

      <div className="absolute top-5 flex w-full justify-end px-10">
        <div className="text-muted-foreground text-sm">
          {t("auth.alreadyHaveAccount")}{" "}
          <Link prefetch={false} className="text-foreground" href="/login">
            {t("common.login")}
          </Link>
        </div>
      </div>

      <div className="absolute bottom-5 flex w-full justify-between px-10">
        <div className="text-sm">{APP_CONFIG.copyright}</div>
        <LanguageSwitcher variant="compact" />
      </div>
    </>
  );
}
