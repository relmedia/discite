import {
  CircleGauge,
  BookOpen,
  Library,
  PlusCircle,
  Award,
  FileText,
  UserPlus,
  Users,
  Users2,
  Building2,
  ShoppingBag,
  Store,
  Receipt,
  MessageCircle,
  Mail,
  Settings,
  BarChart3,
  type LucideIcon,
} from "lucide-react";

// Roles that can access an item (if undefined, all roles can access)
export type AllowedRole = 'SUPERADMIN' | 'ADMIN' | 'TRAINER' | 'TEAM_LEADER' | 'STUDENT';

export interface NavSubItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  comingSoon?: boolean;
  newTab?: boolean;
  isNew?: boolean;
  allowedRoles?: AllowedRole[];
}

export interface NavMainItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  subItems?: NavSubItem[];
  comingSoon?: boolean;
  newTab?: boolean;
  isNew?: boolean;
  allowedRoles?: AllowedRole[];
}

export interface NavGroup {
  id: number;
  label?: string;
  items: NavMainItem[];
  allowedRoles?: AllowedRole[];
}

export const sidebarItems: NavGroup[] = [
  // Dashboard - standalone at the top
  {
    id: 0,
    items: [
      {
        title: "Dashboard",
        url: "/dashboard",
        icon: CircleGauge,
      },
    ],
  },
  // Learning section - for all users
  {
    id: 1,
    label: "Learning",
    items: [
      {
        title: "My Courses",
        url: "/dashboard/courses/my-courses",
        icon: Library,
      },
      {
        title: "Messages",
        url: "/dashboard/messages",
        icon: MessageCircle,
      },
      {
        title: "My Certificates",
        url: "/dashboard/certificates",
        icon: Award,
      },
      {
        title: "My Invoices",
        url: "/dashboard/invoices",
        icon: Receipt,
      },
    ],
  },
  // Content Management - for superadmin only (only superadmin can create courses)
  {
    id: 2,
    label: "Content Management",
    allowedRoles: ['SUPERADMIN'],
    items: [
      {
        title: "All Courses",
        url: "/dashboard/courses/all",
        icon: BookOpen,
        allowedRoles: ['SUPERADMIN'],
      },
      {
        title: "Create Course",
        url: "/dashboard/courses/create",
        icon: PlusCircle,
        allowedRoles: ['SUPERADMIN'],
      },
      {
        title: "Certificate Templates",
        url: "/dashboard/certificates/templates",
        icon: FileText,
        allowedRoles: ['SUPERADMIN'],
      },
    ],
  },
  // Marketplace - browse courses for all users, purchases for admins
  {
    id: 3,
    label: "Marketplace",
    items: [
      {
        title: "Browse Courses",
        url: "/dashboard/marketplace",
        icon: Store,
      },
      {
        title: "Purchased Courses",
        url: "/dashboard/marketplace/purchases",
        icon: ShoppingBag,
        allowedRoles: ['SUPERADMIN', 'ADMIN'],
      },
    ],
  },
  // Administration - for admins only
  {
    id: 4,
    label: "Administration",
    allowedRoles: ['SUPERADMIN', 'ADMIN'],
    items: [
      {
        title: "Analytics",
        url: "/dashboard/analytics",
        icon: BarChart3,
        allowedRoles: ['SUPERADMIN', 'ADMIN'],
      },
      {
        title: "Users",
        url: "/dashboard/users",
        icon: Users,
        allowedRoles: ['SUPERADMIN', 'ADMIN'],
      },
      {
        title: "Groups",
        url: "/dashboard/groups",
        icon: Users2,
        allowedRoles: ['SUPERADMIN', 'ADMIN'],
      },
      {
        title: "Invitations",
        url: "/dashboard/invitations",
        icon: UserPlus,
        allowedRoles: ['SUPERADMIN', 'ADMIN'],
      },
      {
        title: "Email Settings",
        url: "/dashboard/settings/email",
        icon: Mail,
        allowedRoles: ['SUPERADMIN', 'ADMIN'],
      },
    ],
  },
  // Platform - for superadmin only
  {
    id: 5,
    label: "Platform",
    allowedRoles: ['SUPERADMIN'],
    items: [
      {
        title: "Organizations",
        url: "/dashboard/organizations",
        icon: Building2,
        allowedRoles: ['SUPERADMIN'],
      },
      {
        title: "Invoice Insights",
        url: "/dashboard/invoices/insights",
        icon: Receipt,
        allowedRoles: ['SUPERADMIN'],
      },
    ],
  },
];
