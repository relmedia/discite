import { ReactNode } from "react";
import { notFound } from 'next/navigation';
import { Toaster } from "@/components/ui/sonner";
import { PREFERENCE_DEFAULTS } from "@/lib/preferences/preferences-config";
import { PreferencesStoreProvider } from "@/stores/preferences/preferences-provider";
import { IntlProvider } from "@/components/intl-provider";
import { SessionProvider } from "@/components/providers/session-provider";

const locales = ['en', 'sv'] as const;

async function getMessages(locale: string) {
  try {
    return (await import(`../../../messages/${locale}.json`)).default;
  } catch {
    return (await import(`../../../messages/sv.json`)).default;
  }
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  
  // Ensure the locale is valid
  if (!locales.includes(locale as any)) {
    notFound();
  }

  const messages = await getMessages(locale);
  const { theme_mode, theme_preset, content_layout, navbar_style } =
    PREFERENCE_DEFAULTS;

  return (
    <SessionProvider>
      <IntlProvider locale={locale} messages={messages}>
        <PreferencesStoreProvider
          themeMode={theme_mode}
          themePreset={theme_preset}
          contentLayout={content_layout}
          navbarStyle={navbar_style}
        >
          {children}
          <Toaster />
        </PreferencesStoreProvider>
      </IntlProvider>
    </SessionProvider>
  );
}
