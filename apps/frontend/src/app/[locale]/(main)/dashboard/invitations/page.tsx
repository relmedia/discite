"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Send,
  Trash2,
  RefreshCw,
  XCircle,
  CheckCircle,
  Clock,
  Mail,
  Users,
  Copy,
  Link2,
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { invitationsApi, Invitation, CreateInvitationDto } from "@/lib/api/invitations";
import { useAuth } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslations } from "@/components/intl-provider";
import { UserRole } from "@repo/shared";

export default function InvitationsPage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();
  const t = useTranslations();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [deleteInvitation, setDeleteInvitation] = useState<Invitation | null>(null);
  const [sending, setSending] = useState(false);

  // Form state
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>(UserRole.STUDENT);
  const [message, setMessage] = useState("");
  const [bulkEmails, setBulkEmails] = useState("");

  const isSuperAdmin = user?.role === "SUPERADMIN";
  const isAdmin = user?.role === "ADMIN" || isSuperAdmin;

  useEffect(() => {
    // Don't show permission error if user is logged out - let middleware handle redirect
    if (!isAuthLoading && !user) {
      return;
    }
    if (!isAuthLoading && !isAdmin) {
      toast.error(t("common.unauthorized"));
      router.push("/dashboard");
    } else if (!isAuthLoading && isAdmin) {
      fetchInvitations();
    }
  }, [isAuthLoading, isAdmin, user, router, t]);

  const fetchInvitations = async () => {
    try {
      setLoading(true);
      const data = await invitationsApi.getInvitations();
      setInvitations(data || []);
    } catch (error: any) {
      toast.error(error.message || "Failed to load invitations");
      setInvitations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSendInvitation = async () => {
    if (!email.trim()) {
      toast.error("Email is required");
      return;
    }

    setSending(true);
    try {
      const data: CreateInvitationDto = {
        email: email.trim(),
        role,
        message: message.trim() || undefined,
      };
      await invitationsApi.createInvitation(data);
      toast.success("Invitation sent successfully");
      setIsDialogOpen(false);
      setEmail("");
      setMessage("");
      setRole(UserRole.STUDENT);
      fetchInvitations();
    } catch (error: any) {
      toast.error(error.message || "Failed to send invitation");
    } finally {
      setSending(false);
    }
  };

  const handleBulkInvite = async () => {
    const emails = bulkEmails
      .split(/[\n,;]/)
      .map((e) => e.trim())
      .filter((e) => e.length > 0);

    if (emails.length === 0) {
      toast.error("Please enter at least one email");
      return;
    }

    setSending(true);
    try {
      const result = await invitationsApi.bulkInvite({
        emails,
        role,
        message: message.trim() || undefined,
      });

      if (result.sent.length > 0) {
        toast.success(`${result.sent.length} invitation(s) sent`);
      }
      if (result.skipped.length > 0) {
        toast.info(`${result.skipped.length} email(s) skipped (already invited or exists)`);
      }
      if (result.errors.length > 0) {
        toast.error(`${result.errors.length} email(s) failed`);
      }

      setIsBulkDialogOpen(false);
      setBulkEmails("");
      setMessage("");
      setRole(UserRole.STUDENT);
      fetchInvitations();
    } catch (error: any) {
      toast.error(error.message || "Failed to send invitations");
    } finally {
      setSending(false);
    }
  };

  const handleResend = async (invitation: Invitation) => {
    try {
      await invitationsApi.resendInvitation(invitation.id);
      toast.success("Invitation resent");
      fetchInvitations();
    } catch (error: any) {
      toast.error(error.message || "Failed to resend invitation");
    }
  };

  const handleCancel = async (invitation: Invitation) => {
    try {
      await invitationsApi.cancelInvitation(invitation.id);
      toast.success("Invitation cancelled");
      fetchInvitations();
    } catch (error: any) {
      toast.error(error.message || "Failed to cancel invitation");
    }
  };

  const handleDelete = async () => {
    if (!deleteInvitation) return;

    try {
      await invitationsApi.deleteInvitation(deleteInvitation.id);
      toast.success("Invitation deleted");
      fetchInvitations();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete invitation");
    } finally {
      setDeleteInvitation(null);
    }
  };

  const getStatusBadge = (status: Invitation["status"]) => {
    switch (status) {
      case "PENDING":
        return (
          <Badge variant="outline" className="text-yellow-600 border-yellow-600">
            <Clock className="h-3 w-3 mr-1" />
            {t("common.pending")}
          </Badge>
        );
      case "ACCEPTED":
        return (
          <Badge variant="outline" className="text-green-600 border-green-600">
            <CheckCircle className="h-3 w-3 mr-1" />
            {t("common.accepted")}
          </Badge>
        );
      case "EXPIRED":
        return (
          <Badge variant="outline" className="text-gray-500 border-gray-500">
            <Clock className="h-3 w-3 mr-1" />
            {t("common.expired")}
          </Badge>
        );
      case "CANCELLED":
        return (
          <Badge variant="outline" className="text-red-600 border-red-600">
            <XCircle className="h-3 w-3 mr-1" />
            {t("common.cancelled")}
          </Badge>
        );
    }
  };

  const getRoleBadge = (role: UserRole) => {
    const colors: Record<string, string> = {
      SUPERADMIN: "bg-purple-100 text-purple-800",
      ADMIN: "bg-blue-100 text-blue-800",
      TRAINER: "bg-green-100 text-green-800",
      TEAM_LEADER: "bg-orange-100 text-orange-800",
      STUDENT: "bg-gray-100 text-gray-800",
    };
    return (
      <Badge className={colors[role] || colors.STUDENT}>
        {role.replace("_", " ")}
      </Badge>
    );
  };

  if (loading || isAuthLoading) {
    return (
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>

        {/* Stats skeleton */}
        <div className="grid gap-4 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Table skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-56" />
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  {[...Array(6)].map((_, i) => (
                    <TableHead key={i}>
                      <Skeleton className="h-4 w-16" />
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...Array(5)].map((_, rowIndex) => (
                  <TableRow key={rowIndex}>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Skeleton className="h-8 w-8 rounded" />
                        <Skeleton className="h-8 w-8 rounded" />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  }

  const pendingCount = (invitations ?? []).filter((i) => i.status === "PENDING").length;
  const acceptedCount = (invitations ?? []).filter((i) => i.status === "ACCEPTED").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("invitations.title")}</h1>
          <p className="text-muted-foreground mt-1">
            {t("invitations.inviteUsers")}
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Users className="mr-2 h-4 w-4" />
                {t("invitations.bulkInvite")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("invitations.bulkInviteUsers")}</DialogTitle>
                <DialogDescription>
                  {t("invitations.enterMultipleEmails")}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>{t("invitations.emailAddresses")}</Label>
                  <Textarea
                    value={bulkEmails}
                    onChange={(e) => setBulkEmails(e.target.value)}
                    placeholder={t("invitations.enterEmailsSeparated")}
                    rows={5}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("common.role")}</Label>
                  <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={UserRole.STUDENT}>{t("roles.student")}</SelectItem>
                      <SelectItem value={UserRole.TRAINER}>{t("roles.trainer")}</SelectItem>
                      <SelectItem value={UserRole.TEAM_LEADER}>{t("roles.teamLeader")}</SelectItem>
                      {isSuperAdmin && (
                        <SelectItem value={UserRole.ADMIN}>{t("roles.admin")}</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("invitations.message")} ({t("common.optional")})</Label>
                  <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={t("invitations.addPersonalMessage")}
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsBulkDialogOpen(false)}
                >
                  {t("common.cancel")}
                </Button>
                <Button onClick={handleBulkInvite} disabled={sending}>
                  {sending ? t("invitations.sending") : t("invitations.sendInvitations")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                {t("invitations.inviteUser")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("invitations.inviteUser")}</DialogTitle>
                <DialogDescription>
                  {t("invitations.sendInvitationEmail")}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="email">{t("invitations.emailAddress")}</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("common.role")}</Label>
                  <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={UserRole.STUDENT}>{t("roles.student")}</SelectItem>
                      <SelectItem value={UserRole.TRAINER}>{t("roles.trainer")}</SelectItem>
                      <SelectItem value={UserRole.TEAM_LEADER}>{t("roles.teamLeader")}</SelectItem>
                      {isSuperAdmin && (
                        <SelectItem value={UserRole.ADMIN}>{t("roles.admin")}</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message">{t("invitations.message")} ({t("common.optional")})</Label>
                  <Textarea
                    id="message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={t("invitations.addPersonalMessage")}
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  {t("common.cancel")}
                </Button>
                <Button onClick={handleSendInvitation} disabled={sending}>
                  {sending ? (
                    <>{t("invitations.sending")}</>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      {t("invitations.sendInvitation")}
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("invitations.totalInvitations")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{invitations.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("invitations.pending")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("invitations.accepted")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{acceptedCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Invitations Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t("invitations.allInvitations")}</CardTitle>
          <CardDescription>
            {t("invitations.managePending")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {invitations.length === 0 ? (
            <div className="text-center py-12">
              <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">{t("invitations.noInvitationsYet")}</h3>
              <p className="text-muted-foreground mb-4">
                {t("invitations.startInviting")}
              </p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                {t("invitations.inviteUser")}
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("common.email")}</TableHead>
                  <TableHead>{t("common.role")}</TableHead>
                  <TableHead>{t("common.status")}</TableHead>
                  <TableHead>{t("invitations.invitedBy")}</TableHead>
                  <TableHead>{t("common.date")}</TableHead>
                  <TableHead className="text-right">{t("common.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((invitation) => (
                  <TableRow key={invitation.id}>
                    <TableCell className="font-medium">
                      {invitation.email}
                    </TableCell>
                    <TableCell>{getRoleBadge(invitation.role)}</TableCell>
                    <TableCell>{getStatusBadge(invitation.status)}</TableCell>
                    <TableCell>
                      {invitation.invitedBy?.name || t("invitations.system")}
                    </TableCell>
                    <TableCell>
                      {new Date(invitation.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {invitation.status === "PENDING" && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                const inviteUrl = `${window.location.origin}/invite/${invitation.token}`;
                                navigator.clipboard.writeText(inviteUrl);
                                toast.success("Invite link copied to clipboard");
                              }}
                              title="Copy Invite Link"
                            >
                              <Link2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleResend(invitation)}
                              title="Resend"
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleCancel(invitation)}
                              title="Cancel"
                            >
                              <XCircle className="h-4 w-4 text-destructive" />
                            </Button>
                          </>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteInvitation(invitation)}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteInvitation}
        onOpenChange={() => setDeleteInvitation(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("invitations.deleteInvitation")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("invitations.deleteInvitationConfirm")}{" "}
              {deleteInvitation?.email}? {t("invitations.cannotBeUndone")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground"
            >
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

