"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Building2, Check, ChevronsUpDown, Command } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/use-auth";
import { authApi, Tenant } from "@/lib/api/auth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { APP_CONFIG } from "@/config/app-config";
import { useTranslations } from "@/components/intl-provider";

export function TenantSwitcher() {
  const { user, tenant, isLoading, updateTenant } = useAuth();
  const router = useRouter();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoadingTenants, setIsLoadingTenants] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const t = useTranslations();

  // Check if current user is a superadmin
  const isSuperAdmin = user?.role === 'SUPERADMIN';

  const fetchTenants = async () => {
    try {
      setIsLoadingTenants(true);
      const response = await authApi.getTenants();
      if (response.success && response.data) {
        setTenants(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch tenants:', error);
    } finally {
      setIsLoadingTenants(false);
    }
  };

  // Use user.id instead of user object to prevent infinite re-renders
  const userId = user?.id;
  
  useEffect(() => {
    if (isSuperAdmin && !isLoading && userId) {
      fetchTenants();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuperAdmin, isLoading, userId]);

  const handleTenantSwitch = async (selectedTenant: Tenant) => {
    if (selectedTenant.id === tenant?.id) {
      setIsOpen(false);
      return;
    }

    try {
      // Update tenant in Auth.js session
      await updateTenant(selectedTenant.id, selectedTenant.name);
      
      // Also update localStorage for API calls that need tenant context
      if (typeof window !== 'undefined') {
        localStorage.setItem('tenant-id', selectedTenant.id);
        sessionStorage.setItem('tenant-id', selectedTenant.id);
      }

      toast.success(`${t("tenant.switchedTo").replace("{name}", selectedTenant.name)}`);
      setIsOpen(false);
      
      // Reload the page to refresh all data with new tenant context
      router.refresh();
      window.location.reload();
    } catch (error) {
      console.error('Failed to switch tenant:', error);
      toast.error(t("tenant.failedToSwitch"));
    }
  };

  const currentTenant = tenant || tenants.find(t => t.id === user?.tenantId);

  // For non-superadmins, show regular app name link
  if (!isSuperAdmin || isLoading || !user) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton asChild className="data-[slot=sidebar-menu-button]:p-1.5!">
            <Link prefetch={false} href="/dashboard">
              <Command />
              <span className="text-base font-semibold">{APP_CONFIG.name}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  // For superadmins, show tenant switcher
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              className={cn(
                "data-[slot=sidebar-menu-button]:p-1.5! w-full justify-between",
                "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                isOpen && "bg-sidebar-accent text-sidebar-accent-foreground"
              )}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Command className="h-4 w-4 shrink-0" />
                <div className="flex-1 min-w-0 text-left">
                  <div className="text-base font-semibold truncate">
                    {currentTenant?.name || APP_CONFIG.name}
                  </div>
                  {currentTenant?.subdomain && (
                    <div className="text-xs text-muted-foreground truncate">
                      {currentTenant.subdomain}
                    </div>
                  )}
                </div>
              </div>
              <ChevronsUpDown className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-[200px]"
            align="start"
            side="right"
            sideOffset={8}
          >
            <DropdownMenuLabel className="px-2 py-1.5 text-xs font-normal text-muted-foreground">
              {t("tenant.switch")}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {isLoadingTenants ? (
              <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                {t("tenant.loadingTenants")}
              </div>
            ) : tenants.length === 0 ? (
              <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                {t("tenant.noTenants")}
              </div>
            ) : (
              tenants.map((tenantItem) => {
                const isSelected = tenantItem.id === currentTenant?.id;
                return (
                  <DropdownMenuItem
                    key={tenantItem.id}
                    onClick={() => handleTenantSwitch(tenantItem)}
                    className={cn(
                      "px-2 py-2 cursor-pointer",
                      isSelected && "bg-muted"
                    )}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="flex-shrink-0 w-6 h-6 rounded bg-primary/10 flex items-center justify-center">
                        <Building2 className="h-3 w-3 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {tenantItem.name}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {tenantItem.subdomain}
                        </div>
                      </div>
                      {isSelected && (
                        <Check className="h-4 w-4 text-primary flex-shrink-0" />
                      )}
                    </div>
                  </DropdownMenuItem>
                );
              })
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

