import { ReactNode } from "react";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AppSidebar } from "@/app/[locale]/(main)/dashboard/_components/sidebar/app-sidebar";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

import { AccountSwitcher } from "./_components/sidebar/account-switcher";
import { LayoutControls } from "./_components/sidebar/layout-controls";
import { SearchDialog } from "./_components/sidebar/search-dialog";
import { ThemeSwitcher } from "./_components/sidebar/theme-switcher";
import { NotificationBell } from "./_components/sidebar/notification-bell";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ImpersonationBanner } from "@/components/impersonation-banner";

export default async function Layout({ children }: Readonly<{ children: ReactNode }>) {
  const cookieStore = await cookies();

  // Check authentication using Auth.js
  const session = await auth();
  if (!session) {
    redirect("/login");
  }

  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";

  return (
    <>
      <ImpersonationBanner />
      <SidebarProvider defaultOpen={defaultOpen}>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex w-full items-center justify-between px-4 lg:px-6">
              <div className="flex items-center gap-2">
                <SidebarTrigger className="-ml-1" />
                <Separator orientation="vertical" className="mx-2 h-4" />
                <SearchDialog />
              </div>
              <div className="flex items-center gap-2">
                <LayoutControls />
                <ThemeSwitcher />
                <LanguageSwitcher />
                <NotificationBell />
                <AccountSwitcher />
              </div>
            </div>
          </header>
          <div className="flex flex-1 flex-col gap-4 p-4 pt-6 md:gap-8 md:p-6 md:pt-8">
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </>
  );
}
