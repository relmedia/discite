"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Globe,
  CheckCircle2,
  XCircle,
  Copy,
  RefreshCw,
  Trash2,
  ArrowLeft,
  AlertCircle,
  ExternalLink,
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
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
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
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { tenantsApi, Tenant } from "@/lib/api/tenants";
import { useAuth } from "@/hooks/use-auth";
import { DomainVerificationInstructions } from "@repo/shared";

export default function CustomDomainSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const tenantId = params.id as string;
  const { user: currentUser, isLoading: isAuthLoading } = useAuth();

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [customDomain, setCustomDomain] = useState("");
  const [verificationInstructions, setVerificationInstructions] =
    useState<DomainVerificationInstructions | null>(null);
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);

  // Fetch tenant data
  const fetchTenant = async () => {
    try {
      setLoading(true);
      const data = await tenantsApi.getTenantById(tenantId);
      setTenant(data);
      setCustomDomain(data.customDomain || "");

      // Fetch verification instructions if domain is set but not verified
      if (data.customDomain && !data.customDomainVerified) {
        const instructions = await tenantsApi.getVerificationInstructions(tenantId);
        setVerificationInstructions(instructions);
      }
    } catch (error) {
      console.error("Failed to fetch tenant:", error);
      toast.error("Error", {
        description: error instanceof Error ? error.message : "Failed to fetch organization",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthLoading && currentUser && tenantId) {
      fetchTenant();
    }
  }, [isAuthLoading, currentUser, tenantId]);

  // Handle set custom domain
  const handleSetDomain = async () => {
    if (!customDomain.trim()) {
      toast.error("Error", {
        description: "Please enter a domain",
      });
      return;
    }

    try {
      setSaving(true);
      const result = await tenantsApi.setCustomDomain(tenantId, customDomain.toLowerCase());
      setTenant(result.tenant);
      setVerificationInstructions(result.verificationInstructions);
      toast.success("Domain configured", {
        description: "Please add the DNS record to verify ownership.",
      });
    } catch (error) {
      toast.error("Error", {
        description: error instanceof Error ? error.message : "Failed to set domain",
      });
    } finally {
      setSaving(false);
    }
  };

  // Handle verify domain
  const handleVerifyDomain = async () => {
    try {
      setVerifying(true);
      const result = await tenantsApi.verifyCustomDomain(tenantId);
      
      if (result.verified) {
        toast.success("Domain verified!", {
          description: "Your custom domain is now active.",
        });
        setVerificationInstructions(null);
        fetchTenant();
      } else {
        toast.error("Verification failed", {
          description: result.message,
        });
      }
    } catch (error) {
      toast.error("Error", {
        description: error instanceof Error ? error.message : "Failed to verify domain",
      });
    } finally {
      setVerifying(false);
    }
  };

  // Handle remove domain
  const handleRemoveDomain = async () => {
    try {
      await tenantsApi.removeCustomDomain(tenantId);
      setTenant((prev) => prev ? { ...prev, customDomain: null, customDomainVerified: false } : null);
      setCustomDomain("");
      setVerificationInstructions(null);
      setShowRemoveDialog(false);
      toast.success("Domain removed", {
        description: "Custom domain has been removed.",
      });
    } catch (error) {
      toast.error("Error", {
        description: error instanceof Error ? error.message : "Failed to remove domain",
      });
    }
  };

  // Copy to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  // Don't render anything if user is logged out (prevents glitches during logout)
  if (!isAuthLoading && !currentUser) {
    return null;
  }

  // Check access
  if (!isAuthLoading && currentUser && !["SUPERADMIN", "ADMIN"].includes(currentUser.role)) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Access Denied</CardTitle>
            <CardDescription>
              You don't have permission to access this page.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="@container/main flex flex-col gap-6">
        <Skeleton className="h-8 w-64" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-96" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-32" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Not Found</CardTitle>
            <CardDescription>Organization not found.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="@container/main flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Custom Domain Settings</h1>
          <p className="text-muted-foreground">
            Configure a custom domain for <span className="font-medium">{tenant.name}</span>
          </p>
        </div>
      </div>

      {/* Current Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Domain Status
              </CardTitle>
              <CardDescription>
                Current custom domain configuration
              </CardDescription>
            </div>
            {tenant.customDomain && (
              <Badge
                variant={tenant.customDomainVerified ? "default" : "secondary"}
                className="flex items-center gap-1"
              >
                {tenant.customDomainVerified ? (
                  <>
                    <CheckCircle2 className="h-3 w-3" />
                    Verified
                  </>
                ) : (
                  <>
                    <XCircle className="h-3 w-3" />
                    Pending Verification
                  </>
                )}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {tenant.customDomain ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <Globe className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{tenant.customDomain}</p>
                    <p className="text-sm text-muted-foreground">
                      {tenant.customDomainVerified
                        ? "Domain is active and serving traffic"
                        : "Waiting for DNS verification"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {tenant.customDomainVerified && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(`https://${tenant.customDomain}`, "_blank")}
                    >
                      <ExternalLink className="h-4 w-4 mr-1" />
                      Visit
                    </Button>
                  )}
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setShowRemoveDialog(true)}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Remove
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">No custom domain configured.</p>
          )}
        </CardContent>
      </Card>

      {/* DNS Verification Instructions */}
      {tenant.customDomain && !tenant.customDomainVerified && verificationInstructions && (
        <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <AlertCircle className="h-5 w-5" />
              DNS Verification Required
            </CardTitle>
            <CardDescription>
              Add the following DNS record to verify domain ownership
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="text-xs text-muted-foreground">Record Type</Label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="flex-1 px-3 py-2 bg-background rounded border text-sm">
                    {verificationInstructions.type}
                  </code>
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Host / Name</Label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="flex-1 px-3 py-2 bg-background rounded border text-sm truncate">
                    {verificationInstructions.name}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => copyToClipboard(verificationInstructions.name)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Value / Content</Label>
              <div className="flex items-center gap-2 mt-1">
                <code className="flex-1 px-3 py-2 bg-background rounded border text-sm break-all">
                  {verificationInstructions.value}
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => copyToClipboard(verificationInstructions.value)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>DNS Propagation</AlertTitle>
              <AlertDescription>
                DNS changes can take up to 48 hours to propagate. Click verify once you've added the record.
              </AlertDescription>
            </Alert>

            <Button onClick={handleVerifyDomain} disabled={verifying}>
              {verifying ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Verify Domain
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Set New Domain */}
      {!tenant.customDomain && (
        <Card>
          <CardHeader>
            <CardTitle>Configure Custom Domain</CardTitle>
            <CardDescription>
              Enter your custom domain to allow users to access this organization via their own URL.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="domain">Domain</Label>
              <Input
                id="domain"
                placeholder="learn.company.com"
                value={customDomain}
                onChange={(e) => setCustomDomain(e.target.value.toLowerCase())}
              />
              <p className="text-sm text-muted-foreground">
                Enter a subdomain like <code>learn.company.com</code> or <code>training.yourcompany.org</code>
              </p>
            </div>
            <Button onClick={handleSetDomain} disabled={saving || !customDomain.trim()}>
              {saving ? "Saving..." : "Configure Domain"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>How Custom Domains Work</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-primary">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold">
                  1
                </div>
                <h4 className="font-medium">Enter Domain</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                Enter your desired custom domain (e.g., learn.company.com)
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-primary">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold">
                  2
                </div>
                <h4 className="font-medium">Add DNS Record</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                Add the TXT record to your DNS provider to verify ownership
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-primary">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold">
                  3
                </div>
                <h4 className="font-medium">Verify & Go Live</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                Click verify and your custom domain will be active
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Remove Domain Dialog */}
      <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Custom Domain</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove the custom domain <strong>{tenant.customDomain}</strong>?
              Users will no longer be able to access this organization via this domain.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleRemoveDomain}
            >
              Remove Domain
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

