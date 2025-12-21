"use client";

import { useState, useEffect } from "react";
import { 
  Users, 
  Clock, 
  Calendar, 
  ChevronRight, 
  UserPlus, 
  UserMinus,
  AlertCircle,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { useTranslations } from "@/components/intl-provider";
import { useAuth } from "@/hooks/use-auth";
import { licenseApi } from "@/lib/api/marketplace";
import { usersApi } from "@/lib/api/users";
import {
  TenantCourseLicense,
  UserCourseAccess,
  LicenseType,
  LicenseStatus,
  AccessStatus,
} from "@repo/shared";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface User {
  id: string;
  name: string;
  email: string;
}

export default function PurchasedCoursesPage() {
  const t = useTranslations();
  const { user, isLoading: isAuthLoading } = useAuth();
  
  const [licenses, setLicenses] = useState<TenantCourseLicense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // License detail view
  const [selectedLicense, setSelectedLicense] = useState<TenantCourseLicense | null>(null);
  const [licenseUsers, setLicenseUsers] = useState<UserCourseAccess[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  
  // Assign users dialog
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isAssigning, setIsAssigning] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  
  // Revoke access dialog
  const [accessToRevoke, setAccessToRevoke] = useState<UserCourseAccess | null>(null);
  const [revokeReason, setRevokeReason] = useState("");
  const [isRevoking, setIsRevoking] = useState(false);

  useEffect(() => {
    fetchLicenses();
  }, []);

  useEffect(() => {
    if (selectedLicense) {
      fetchLicenseUsers(selectedLicense.id);
    }
  }, [selectedLicense]);

  const fetchLicenses = async () => {
    try {
      setIsLoading(true);
      const data = await licenseApi.getTenantLicenses();
      setLicenses(data);
    } catch (error) {
      console.error("Failed to fetch licenses:", error);
      toast.error(t("marketplace.failedToLoadLicenses"));
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLicenseUsers = async (licenseId: string) => {
    try {
      setIsLoadingUsers(true);
      const data = await licenseApi.getLicenseUsers(licenseId);
      setLicenseUsers(data);
    } catch (error) {
      console.error("Failed to fetch license users:", error);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const fetchAllUsers = async () => {
    try {
      const data = await usersApi.getAllUsers();
      setAllUsers(data);
    } catch (error) {
      console.error("Failed to fetch users:", error);
    }
  };

  const openAssignDialog = () => {
    setIsAssignDialogOpen(true);
    setSelectedUserIds([]);
    setUserSearchQuery("");
    fetchAllUsers();
  };

  const handleAssignUsers = async () => {
    if (!selectedLicense || selectedUserIds.length === 0) return;

    setIsAssigning(true);
    try {
      await licenseApi.assignUsers(selectedLicense.id, selectedUserIds);
      toast.success(t("marketplace.usersAssigned", { count: selectedUserIds.length }));
      setIsAssignDialogOpen(false);
      fetchLicenseUsers(selectedLicense.id);
      fetchLicenses(); // Refresh to update seat count
    } catch (error: any) {
      console.error("Failed to assign users:", error);
      toast.error(error.message || t("marketplace.failedToAssignUsers"));
    } finally {
      setIsAssigning(false);
    }
  };

  const handleRevokeAccess = async () => {
    if (!accessToRevoke) return;

    setIsRevoking(true);
    try {
      await licenseApi.revokeAccess(accessToRevoke.id, revokeReason);
      toast.success(t("marketplace.accessRevoked"));
      setAccessToRevoke(null);
      setRevokeReason("");
      if (selectedLicense) {
        fetchLicenseUsers(selectedLicense.id);
        fetchLicenses(); // Refresh to update seat count
      }
    } catch (error: any) {
      console.error("Failed to revoke access:", error);
      toast.error(error.message || t("marketplace.failedToRevokeAccess"));
    } finally {
      setIsRevoking(false);
    }
  };

  const getLicenseTypeLabel = (type: LicenseType) => {
    switch (type) {
      case LicenseType.SEAT:
        return t("marketplace.perSeatLicense");
      case LicenseType.UNLIMITED:
        return t("marketplace.unlimitedLicense");
      case LicenseType.TIME_LIMITED:
        return t("marketplace.timeLimitedLicense");
      default:
        return type;
    }
  };

  const getStatusBadge = (status: LicenseStatus) => {
    switch (status) {
      case LicenseStatus.ACTIVE:
        return <Badge className="bg-green-500"><CheckCircle2 className="h-3 w-3 mr-1" />{t("common.active")}</Badge>;
      case LicenseStatus.EXPIRED:
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />{t("common.expired")}</Badge>;
      case LicenseStatus.CANCELLED:
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />{t("common.cancelled")}</Badge>;
      case LicenseStatus.PENDING:
        return <Badge variant="outline"><AlertCircle className="h-3 w-3 mr-1" />{t("common.pending")}</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getAccessStatusBadge = (status: AccessStatus) => {
    switch (status) {
      case AccessStatus.ACTIVE:
        return <Badge className="bg-green-500">{t("common.active")}</Badge>;
      case AccessStatus.REVOKED:
        return <Badge variant="destructive">{t("marketplace.revoked")}</Badge>;
      case AccessStatus.COMPLETED:
        return <Badge className="bg-blue-500">{t("common.completed")}</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString();
  };

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat("sv-SE", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  // Filter users not already assigned
  const filteredUsers = allUsers.filter((u) => {
    const isAlreadyAssigned = licenseUsers.some(
      (lu) => lu.userId === u.id && lu.status === AccessStatus.ACTIVE
    );
    const matchesSearch = u.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearchQuery.toLowerCase());
    return !isAlreadyAssigned && matchesSearch;
  });

  // Check if user has admin access
  const isAdmin = user?.role === "SUPERADMIN" || user?.role === "ADMIN";

  if (isAuthLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <h2 className="text-xl font-semibold">{t("common.accessDenied")}</h2>
        <p className="text-muted-foreground mt-2">{t("common.noPermission")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("marketplace.purchasedCourses")}</h1>
        <p className="text-muted-foreground">{t("marketplace.manageLicenses")}</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("marketplace.totalLicenses")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{licenses.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("marketplace.activeLicenses")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {licenses.filter((l) => l.status === LicenseStatus.ACTIVE).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("marketplace.totalInvestment")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPrice(
                licenses.reduce((sum, l) => sum + Number(l.amountPaid), 0),
                "USD"
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Licenses Table */}
      {isLoading ? (
        <Skeleton className="h-96" />
      ) : licenses.length === 0 ? (
        <Card className="py-12 text-center">
          <CardContent>
            <p className="text-muted-foreground">{t("marketplace.noLicensesYet")}</p>
            <Button className="mt-4" onClick={() => window.location.href = "/dashboard/marketplace"}>
              {t("marketplace.browseMarketplace")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{t("marketplace.yourLicenses")}</CardTitle>
            <CardDescription>{t("marketplace.clickToManage")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("marketplace.course")}</TableHead>
                  <TableHead>{t("marketplace.licenseType")}</TableHead>
                  <TableHead>{t("common.status")}</TableHead>
                  <TableHead>{t("marketplace.seats")}</TableHead>
                  <TableHead>{t("marketplace.validUntil")}</TableHead>
                  <TableHead>{t("marketplace.amountPaid")}</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {licenses.map((license) => (
                  <TableRow 
                    key={license.id} 
                    className="cursor-pointer"
                    onClick={() => setSelectedLicense(license)}
                  >
                    <TableCell className="font-medium">
                      {license.marketplaceCourse?.title || t("marketplace.unknownCourse")}
                    </TableCell>
                    <TableCell>{getLicenseTypeLabel(license.licenseType)}</TableCell>
                    <TableCell>{getStatusBadge(license.status)}</TableCell>
                    <TableCell>
                      {license.licenseType === LicenseType.SEAT ? (
                        <span>
                          {license.seatsUsed} / {license.seatCount}
                        </span>
                      ) : license.licenseType === LicenseType.UNLIMITED ? (
                        t("marketplace.unlimited")
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      {license.validUntil ? formatDate(license.validUntil) : t("marketplace.noExpiration")}
                    </TableCell>
                    <TableCell>{formatPrice(Number(license.amountPaid), license.currency)}</TableCell>
                    <TableCell>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* License Detail Dialog */}
      <Dialog open={!!selectedLicense} onOpenChange={() => setSelectedLicense(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedLicense?.marketplaceCourse?.title}</DialogTitle>
            <DialogDescription>
              {getLicenseTypeLabel(selectedLicense?.licenseType || LicenseType.SEAT)} • 
              {getStatusBadge(selectedLicense?.status || LicenseStatus.PENDING)}
            </DialogDescription>
          </DialogHeader>

          {selectedLicense && (
            <div className="space-y-6">
              {/* License Info */}
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <Label className="text-muted-foreground">{t("marketplace.purchasedOn")}</Label>
                  <p className="font-medium">{formatDate(selectedLicense.purchasedAt)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">{t("marketplace.validUntil")}</Label>
                  <p className="font-medium">
                    {selectedLicense.validUntil 
                      ? formatDate(selectedLicense.validUntil) 
                      : t("marketplace.noExpiration")}
                  </p>
                </div>
                {selectedLicense.licenseType === LicenseType.SEAT && (
                  <div>
                    <Label className="text-muted-foreground">{t("marketplace.seatsUsage")}</Label>
                    <p className="font-medium">
                      {selectedLicense.seatsUsed} / {selectedLicense.seatCount} {t("marketplace.seatsUsed")}
                    </p>
                  </div>
                )}
              </div>

              {/* Users Table */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">{t("marketplace.assignedUsers")}</h3>
                  {selectedLicense.status === LicenseStatus.ACTIVE && (
                    <Button size="sm" onClick={openAssignDialog}>
                      <UserPlus className="h-4 w-4 mr-2" />
                      {t("marketplace.assignUsers")}
                    </Button>
                  )}
                </div>

                {isLoadingUsers ? (
                  <Skeleton className="h-32" />
                ) : licenseUsers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>{t("marketplace.noUsersAssigned")}</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("common.name")}</TableHead>
                        <TableHead>{t("common.email")}</TableHead>
                        <TableHead>{t("common.status")}</TableHead>
                        <TableHead>{t("marketplace.assignedOn")}</TableHead>
                        <TableHead>{t("marketplace.progress")}</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {licenseUsers.map((access) => (
                        <TableRow key={access.id}>
                          <TableCell className="font-medium">{access.userName}</TableCell>
                          <TableCell>{access.userEmail}</TableCell>
                          <TableCell>{getAccessStatusBadge(access.status)}</TableCell>
                          <TableCell>{formatDate(access.assignedAt)}</TableCell>
                          <TableCell>{access.progressPercentage}%</TableCell>
                          <TableCell>
                            {access.status === AccessStatus.ACTIVE && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setAccessToRevoke(access)}
                              >
                                <UserMinus className="h-4 w-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Assign Users Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("marketplace.assignUsers")}</DialogTitle>
            <DialogDescription>
              {t("marketplace.selectUsersToAssign")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Input
              placeholder={t("marketplace.searchUsers")}
              value={userSearchQuery}
              onChange={(e) => setUserSearchQuery(e.target.value)}
            />

            <div className="max-h-64 overflow-y-auto space-y-2">
              {filteredUsers.length === 0 ? (
                <p className="text-center py-4 text-muted-foreground">
                  {t("marketplace.noUsersAvailable")}
                </p>
              ) : (
                filteredUsers.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center space-x-3 rounded-lg border p-3"
                  >
                    <Checkbox
                      id={u.id}
                      checked={selectedUserIds.includes(u.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedUserIds([...selectedUserIds, u.id]);
                        } else {
                          setSelectedUserIds(selectedUserIds.filter((id) => id !== u.id));
                        }
                      }}
                    />
                    <Label htmlFor={u.id} className="flex-1 cursor-pointer">
                      <p className="font-medium">{u.name}</p>
                      <p className="text-sm text-muted-foreground">{u.email}</p>
                    </Label>
                  </div>
                ))
              )}
            </div>

            {selectedLicense?.licenseType === LicenseType.SEAT && (
              <p className="text-sm text-muted-foreground">
                {t("marketplace.seatsRemaining", {
                  remaining: (selectedLicense.seatCount || 0) - selectedLicense.seatsUsed,
                })}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleAssignUsers}
              disabled={isAssigning || selectedUserIds.length === 0}
            >
              {isAssigning ? t("marketplace.assigning") : t("marketplace.assign")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke Access Dialog */}
      <AlertDialog open={!!accessToRevoke} onOpenChange={() => setAccessToRevoke(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("marketplace.revokeAccess")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("marketplace.revokeAccessConfirm", { name: accessToRevoke?.userName })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label>{t("marketplace.reason")} ({t("common.optional")})</Label>
            <Textarea
              value={revokeReason}
              onChange={(e) => setRevokeReason(e.target.value)}
              placeholder={t("marketplace.revokeReasonPlaceholder")}
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevokeAccess}
              disabled={isRevoking}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isRevoking ? t("marketplace.revoking") : t("marketplace.revoke")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

