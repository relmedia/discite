"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  Search,
  Building2,
  Plus,
  Users,
  BookOpen,
  CheckCircle2,
  XCircle,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { tenantsApi, Tenant, CreateTenantDto, UpdateTenantDto } from "@/lib/api/tenants";
import { useAuth } from "@/hooks/use-auth";
import { useTranslations } from "@/components/intl-provider";

export default function OrganizationsPage() {
  const router = useRouter();
  const { user: currentUser, isLoading: isAuthLoading } = useAuth();
  const t = useTranslations();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Create dialog state
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createForm, setCreateForm] = useState<CreateTenantDto>({
    name: "",
    subdomain: "",
  });
  const [creating, setCreating] = useState(false);

  // Edit dialog state
  const [editTenant, setEditTenant] = useState<Tenant | null>(null);
  const [editForm, setEditForm] = useState<UpdateTenantDto>({});
  const [saving, setSaving] = useState(false);

  // Delete dialog state
  const [deleteTenant, setDeleteTenant] = useState<Tenant | null>(null);

  // Fetch tenants
  const fetchTenants = async () => {
    try {
      setLoading(true);
      const data = await tenantsApi.getAllTenants();
      setTenants(data);
    } catch (error) {
      console.error("Failed to fetch tenants:", error);
      toast.error(t("common.error"), {
        description: error instanceof Error ? error.message : "Failed to fetch organizations",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthLoading && currentUser) {
      fetchTenants();
    }
  }, [isAuthLoading, currentUser]);

  // Don't render anything if user is logged out (prevents glitches during logout)
  if (!isAuthLoading && !currentUser) {
    return null;
  }

  // Check if user is superadmin (but not if user is logged out)
  if (!isAuthLoading && currentUser && currentUser.role !== "SUPERADMIN") {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">{t("common.accessDenied")}</CardTitle>
            <CardDescription>
              {t("common.noPermission")}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Filter tenants based on search (with safety check)
  const filteredTenants = (tenants || []).filter(
    (tenant) =>
      tenant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tenant.subdomain.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle create tenant
  const handleCreate = async () => {
    if (!createForm.name || !createForm.subdomain) {
      toast.error(t("common.error"), {
        description: "Name and subdomain are required",
      });
      return;
    }

    try {
      setCreating(true);
      await tenantsApi.createTenant(createForm);
      toast.success(t("common.success"), {
        description: "Organization created successfully",
      });
      setShowCreateDialog(false);
      setCreateForm({ name: "", subdomain: "" });
      fetchTenants();
    } catch (error) {
      toast.error(t("common.error"), {
        description: error instanceof Error ? error.message : "Failed to create organization",
      });
    } finally {
      setCreating(false);
    }
  };

  // Handle edit tenant
  const handleEdit = async () => {
    if (!editTenant) return;

    try {
      setSaving(true);
      await tenantsApi.updateTenant(editTenant.id, editForm);
      toast.success(t("common.success"), {
        description: "Organization updated successfully",
      });
      setEditTenant(null);
      setEditForm({});
      fetchTenants();
    } catch (error) {
      toast.error(t("common.error"), {
        description: error instanceof Error ? error.message : "Failed to update organization",
      });
    } finally {
      setSaving(false);
    }
  };

  // Handle delete tenant
  const handleDelete = async () => {
    if (!deleteTenant) return;

    try {
      await tenantsApi.deleteTenant(deleteTenant.id);
      toast.success(t("common.success"), {
        description: "Organization deleted successfully",
      });
      setDeleteTenant(null);
      fetchTenants();
    } catch (error) {
      toast.error(t("common.error"), {
        description: error instanceof Error ? error.message : "Failed to delete organization",
      });
    }
  };

  // Handle toggle active status
  const handleToggleActive = async (tenant: Tenant) => {
    try {
      await tenantsApi.updateTenant(tenant.id, { isActive: !tenant.isActive });
      toast.success(t("common.success"), {
        description: `Organization ${tenant.isActive ? "deactivated" : "activated"} successfully`,
      });
      fetchTenants();
    } catch (error) {
      toast.error(t("common.error"), {
        description: error instanceof Error ? error.message : "Failed to update organization",
      });
    }
  };

  // Open edit dialog
  const openEditDialog = (tenant: Tenant) => {
    setEditTenant(tenant);
    setEditForm({
      name: tenant.name,
      isActive: tenant.isActive,
    });
  };

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("sidebar.organizations")}</h1>
          <p className="text-muted-foreground">
            {t("tenant.manageOrganizations")}
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t("tenant.addOrganization")}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t("tenant.totalOrganizations")}</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(tenants || []).length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t("tenant.activeOrganizations")}</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(tenants || []).filter((t) => t.isActive).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t("tenant.inactiveOrganizations")}</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(tenants || []).filter((t) => !t.isActive).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>{t("tenant.organizationsList")}</CardTitle>
              <CardDescription>
                {t("tenant.organizationsDescription")}
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("common.search")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="overflow-hidden rounded-lg border">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    {[...Array(6)].map((_, i) => (
                      <TableHead key={i}>
                        <Skeleton className="h-4 w-20" />
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...Array(5)].map((_, rowIndex) => (
                    <TableRow key={rowIndex}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-9 w-9 rounded-lg" />
                          <Skeleton className="h-4 w-32" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-4 w-4" />
                          <Skeleton className="h-6 w-24 rounded" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-6 w-20 rounded-full" />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-5 w-9 rounded-full" />
                          <Skeleton className="h-6 w-16 rounded-full" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell className="text-right">
                        <Skeleton className="h-8 w-8 rounded ml-auto" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : filteredTenants.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">{t("tenant.noOrganizations")}</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery ? t("common.noSearchResults") : t("tenant.createFirstOrganization")}
              </p>
              {!searchQuery && (
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  {t("tenant.addOrganization")}
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>{t("tenant.name")}</TableHead>
                    <TableHead>{t("tenant.subdomain")}</TableHead>
                    <TableHead>{t("tenant.type")}</TableHead>
                    <TableHead>{t("common.status")}</TableHead>
                    <TableHead>{t("common.createdAt")}</TableHead>
                    <TableHead className="text-right">{t("common.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTenants.map((tenant) => (
                    <TableRow key={tenant.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                            <Building2 className="h-4 w-4 text-primary" />
                          </div>
                          <span className="font-medium">{tenant.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-muted-foreground" />
                          <code className="text-sm bg-muted px-2 py-0.5 rounded">
                            {tenant.subdomain}
                          </code>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={tenant.type === "INDIVIDUAL" ? "secondary" : "default"}>
                          {tenant.type === "INDIVIDUAL" ? t("tenant.individual") : t("tenant.organization")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={tenant.isActive}
                            onCheckedChange={() => handleToggleActive(tenant)}
                          />
                          <Badge variant={tenant.isActive ? "default" : "secondary"}>
                            {tenant.isActive ? t("common.active") : t("common.inactive")}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(tenant.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">{t("common.openMenu")}</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditDialog(tenant)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              {t("common.edit")}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => router.push(`/dashboard/organizations/${tenant.id}/domain`)}
                            >
                              <Globe className="mr-2 h-4 w-4" />
                              Domain Settings
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => setDeleteTenant(tenant)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              {t("common.delete")}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("tenant.addOrganization")}</DialogTitle>
            <DialogDescription>
              {t("tenant.addOrganizationDescription")}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">{t("tenant.name")}</Label>
              <Input
                id="name"
                placeholder="Acme Corp"
                value={createForm.name}
                onChange={(e) =>
                  setCreateForm({ ...createForm, name: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="subdomain">{t("tenant.subdomain")}</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="subdomain"
                  placeholder="acme"
                  value={createForm.subdomain}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
                    })
                  }
                />
                <span className="text-muted-foreground">.discite.app</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {t("tenant.subdomainHint")}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateDialog(false);
                setCreateForm({ name: "", subdomain: "" });
              }}
            >
              {t("common.cancel")}
            </Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? t("common.creating") : t("common.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editTenant} onOpenChange={(open) => !open && setEditTenant(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("tenant.editOrganization")}</DialogTitle>
            <DialogDescription>
              {t("tenant.editOrganizationDescription")}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">{t("tenant.name")}</Label>
              <Input
                id="edit-name"
                value={editForm.name || ""}
                onChange={(e) =>
                  setEditForm({ ...editForm, name: e.target.value })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="edit-active">{t("common.active")}</Label>
              <Switch
                id="edit-active"
                checked={editForm.isActive}
                onCheckedChange={(checked) =>
                  setEditForm({ ...editForm, isActive: checked })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTenant(null)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleEdit} disabled={saving}>
              {saving ? t("common.saving") : t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTenant} onOpenChange={(open) => !open && setDeleteTenant(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("tenant.deleteOrganization")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("tenant.deleteOrganizationWarning", { name: deleteTenant?.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

