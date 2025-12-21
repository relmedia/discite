"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ChevronRight } from "lucide-react";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { type NavGroup, type NavMainItem, type AllowedRole } from "@/navigation/sidebar/sidebar-items";
import { useTranslations } from "@/components/intl-provider";
import { useAuth } from "@/hooks/use-auth";

interface NavMainProps {
  readonly items: readonly NavGroup[];
}

// Translation map for sidebar items and labels
const titleTranslationKeys: Record<string, string> = {
  // Group labels
  "Learning": "sidebar.learning",
  "Content Management": "sidebar.contentManagement",
  "Administration": "sidebar.administration",
  "Platform": "sidebar.platform",
  "Marketplace": "sidebar.marketplace",
  // Items
  "Dashboards": "sidebar.dashboards",
  "Default": "sidebar.default",
  "Dashboard": "sidebar.dashboard",
  "Home": "sidebar.home",
  "Courses": "sidebar.courses",
  "My Courses": "sidebar.myCourses",
  "Course Catalog": "sidebar.courseCatalog",
  "All Courses": "sidebar.allCourses",
  "Create Course": "sidebar.createCourse",
  "Lessons": "sidebar.lessons",
  "Quizzes": "sidebar.quizzes",
  "Pages": "sidebar.pages",
  "Authentication": "sidebar.authentication",
  "Quick Create": "sidebar.quickCreate",
  "Inbox": "sidebar.inbox",
  "Messages": "sidebar.messages",
  "Certificates": "sidebar.certificates",
  "My Certificates": "sidebar.myCertificates",
  "My Invoices": "sidebar.myInvoices",
  "Certificate Templates": "sidebar.certificateTemplates",
  "Templates": "sidebar.templates",
  "User Management": "sidebar.userManagement",
  "Analytics": "sidebar.analytics",
  "Users": "sidebar.users",
  "Groups": "sidebar.groups",
  "Email Settings": "sidebar.emailSettings",
  "Invoice Insights": "sidebar.invoiceInsights",
  "Invitations": "sidebar.invitations",
  "Organizations": "sidebar.organizations",
  "Settings": "sidebar.settings",
  "Get Help": "sidebar.getHelp",
  "Browse Courses": "sidebar.browseCourses",
  "Purchased Courses": "sidebar.purchasedCourses",
};

export function NavMain({ items }: NavMainProps) {
  const path = usePathname();
  const t = useTranslations();
  const { user } = useAuth();

  const translate = (title: string) => {
    const key = titleTranslationKeys[title];
    return key ? t(key) : title;
  };

  const isItemActive = (url: string, subItems?: NavMainItem["subItems"]) => {
    if (subItems?.length) {
      return subItems.some((sub) => path.startsWith(sub.url));
    }
    return path === url || path.startsWith(url + "/");
  };

  // Check if user has access to an item based on their role
  const hasAccess = (allowedRoles?: AllowedRole[]) => {
    if (!allowedRoles || allowedRoles.length === 0) return true;
    if (!user?.role) return false;
    return allowedRoles.includes(user.role.toUpperCase() as AllowedRole);
  };

  // Filter items based on user role
  const filterItems = (groupItems: NavMainItem[]) => {
    return groupItems.filter(item => hasAccess(item.allowedRoles));
  };

  return (
    <>
      {items.map((group) => {
        // Check if user has access to the group
        if (!hasAccess(group.allowedRoles)) return null;
        
        const filteredGroupItems = filterItems([...group.items]);
        if (filteredGroupItems.length === 0) return null;

        return (
          <SidebarGroup key={group.id}>
            {group.label && (
              <SidebarGroupLabel>{translate(group.label)}</SidebarGroupLabel>
            )}
            <SidebarMenu>
              {filteredGroupItems.map((item) => {
                const isActive = isItemActive(item.url, item.subItems);
                
                // Items with sub-items are collapsible
                if (item.subItems && item.subItems.length > 0) {
                  return (
                    <Collapsible
                      key={item.title}
                      asChild
                      defaultOpen={isActive}
                      className="group/collapsible"
                    >
                      <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton tooltip={translate(item.title)}>
                            {item.icon && <item.icon />}
                            <span>{translate(item.title)}</span>
                            <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenuSub>
                            {item.subItems.map((subItem) => (
                              <SidebarMenuSubItem key={subItem.title}>
                                <SidebarMenuSubButton asChild isActive={path === subItem.url || path.startsWith(subItem.url + "/")}>
                                  <Link href={subItem.url}>
                                    <span>{translate(subItem.title)}</span>
                                  </Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            ))}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </SidebarMenuItem>
                    </Collapsible>
                  );
                }

                // Items without sub-items are simple links
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={translate(item.title)}>
                      <Link href={item.url}>
                        {item.icon && <item.icon />}
                        <span>{translate(item.title)}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
        );
      })}
    </>
  );
}
