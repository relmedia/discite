"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  RotateCcw,
  Search,
  UserCircle,
  ChevronDown,
  ChevronRight,
  BookOpen,
  Clock,
  CheckCircle2,
  XCircle,
  UserCheck,
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
import { Progress } from "@/components/ui/progress";
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
import { toast } from "sonner";
import { usersApi, User, UpdateUserDto, UserEnrollment } from "@/lib/api/users";
import { useAuth } from "@/hooks/use-auth";
import { useTranslations } from "@/components/intl-provider";
import { UserRole } from "@repo/shared";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";

export default function UsersPage() {
  const router = useRouter();
  const { user: currentUser, isLoading: isAuthLoading, switchToUser } = useAuth();
  const t = useTranslations();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Expandable rows state
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [userEnrollments, setUserEnrollments] = useState<Record<string, UserEnrollment[]>>({});
  const [loadingEnrollments, setLoadingEnrollments] = useState<Set<string>>(new Set());

  // Edit dialog state
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState<UpdateUserDto>({});
  const [saving, setSaving] = useState(false);

  // Delete dialog state
  const [deleteUser, setDeleteUser] = useState<User | null>(null);

  // Reset course data dialog state
  const [resetUser, setResetUser] = useState<User | null>(null);
  const [resetUserEnrollments, setResetUserEnrollments] = useState<UserEnrollment[]>([]);
  const [selectedCoursesToReset, setSelectedCoursesToReset] = useState<Set<string>>(new Set());
  const [deleteCertificates, setDeleteCertificates] = useState(false);
  const [loadingResetEnrollments, setLoadingResetEnrollments] = useState(false);
  const [resetting, setResetting] = useState(false);

  const isSuperAdmin = currentUser?.role === "SUPERADMIN";
  const isAdmin = currentUser?.role === "ADMIN" || isSuperAdmin;

  useEffect(() => {
    // Don't show permission error if user is logged out - let middleware handle redirect
    if (!isAuthLoading && !currentUser) {
      return;
    }
    if (!isAuthLoading && !isAdmin) {
      toast.error(t("common.unauthorized"));
      router.push("/dashboard");
    } else if (!isAuthLoading && isAdmin) {
      fetchUsers();
    }
  }, [isAuthLoading, isAdmin, currentUser, router, t]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await usersApi.getUsers();
      setUsers(data);
    } catch (error: any) {
      toast.error(error.message || "Failed to load users");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleUserExpansion = async (userId: string) => {
    const newExpanded = new Set(expandedUsers);
    
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId);
    } else {
      newExpanded.add(userId);
      // Fetch enrollments if not already loaded
      if (!userEnrollments[userId]) {
        await fetchUserEnrollments(userId);
      }
    }
    
    setExpandedUsers(newExpanded);
  };

  const fetchUserEnrollments = async (userId: string) => {
    setLoadingEnrollments(prev => new Set(prev).add(userId));
    try {
      const enrollments = await usersApi.getUserEnrollments(userId);
      setUserEnrollments(prev => ({ ...prev, [userId]: enrollments }));
    } catch (error: any) {
      toast.error(error.message || "Failed to load enrollments");
    } finally {
      setLoadingEnrollments(prev => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  };

  const handleEditClick = (user: User) => {
    setEditUser(user);
    setEditForm({
      name: user.name,
      email: user.email,
      role: user.role,
      groupId: user.groupId,
    });
  };

  const handleSaveEdit = async () => {
    if (!editUser) return;

    setSaving(true);
    try {
      await usersApi.updateUser(editUser.id, editForm);
      toast.success("User updated successfully");
      setEditUser(null);
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message || "Failed to update user");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteUser) return;

    try {
      await usersApi.deleteUser(deleteUser.id);
      toast.success("User deleted successfully");
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete user");
    } finally {
      setDeleteUser(null);
    }
  };

  const openResetModal = async (user: User) => {
    setResetUser(user);
    setSelectedCoursesToReset(new Set());
    setDeleteCertificates(false);
    setLoadingResetEnrollments(true);
    
    try {
      // Use cached enrollments if available, otherwise fetch
      if (userEnrollments[user.id]) {
        setResetUserEnrollments(userEnrollments[user.id]);
      } else {
        const enrollments = await usersApi.getUserEnrollments(user.id);
        setResetUserEnrollments(enrollments);
        setUserEnrollments(prev => ({ ...prev, [user.id]: enrollments }));
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to load enrollments");
      setResetUserEnrollments([]);
    } finally {
      setLoadingResetEnrollments(false);
    }
  };

  const toggleCourseSelection = (courseId: string) => {
    setSelectedCoursesToReset(prev => {
      const next = new Set(prev);
      if (next.has(courseId)) {
        next.delete(courseId);
      } else {
        next.add(courseId);
      }
      return next;
    });
  };

  const selectAllCourses = () => {
    setSelectedCoursesToReset(new Set(resetUserEnrollments.map(e => e.courseId)));
  };

  const deselectAllCourses = () => {
    setSelectedCoursesToReset(new Set());
  };

  const handleResetCourseData = async () => {
    if (!resetUser || selectedCoursesToReset.size === 0) return;

    setResetting(true);
    try {
      await usersApi.resetUserCourseData(
        resetUser.id, 
        Array.from(selectedCoursesToReset),
        deleteCertificates
      );
      toast.success(t("users.courseDataResetSuccess"));
      // Clear cached enrollments for this user
      setUserEnrollments(prev => {
        const next = { ...prev };
        delete next[resetUser.id];
        return next;
      });
      setResetUser(null);
      setResetUserEnrollments([]);
      setSelectedCoursesToReset(new Set());
      setDeleteCertificates(false);
    } catch (error: any) {
      toast.error(error.message || t("users.failedToReset"));
    } finally {
      setResetting(false);
    }
  };

  const handleSwitchToUser = async (user: User) => {
    try {
      const success = await switchToUser(user.id);
      if (success) {
        toast.success(t("users.switchedToUser", { name: user.name }));
        router.push("/dashboard");
      } else {
        toast.error(t("users.switchFailed"));
      }
    } catch (error: any) {
      toast.error(error.message || t("users.switchFailed"));
    }
  };

  const getRoleBadge = (role: UserRole) => {
    const colors: Record<string, string> = {
      SUPERADMIN: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
      ADMIN: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      TRAINER: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      TEAM_LEADER: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
      STUDENT: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
    };
    return (
      <Badge className={colors[role] || colors.STUDENT}>
        {role.replace("_", " ")}
      </Badge>
    );
  };

  const getStatusBadge = (enrollment: UserEnrollment) => {
    // Check if completed based on status, progress, or completedAt date
    const isCompleted = 
      enrollment.status === 'COMPLETED' || 
      enrollment.progressPercentage === 100 || 
      !!enrollment.completedAt;
    
    if (isCompleted) {
      return (
        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Completed
        </Badge>
      );
    }
    
    if (enrollment.status === 'DROPPED') {
      return (
        <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
          <XCircle className="h-3 w-3 mr-1" />
          Dropped
        </Badge>
      );
    }
    
    return (
      <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
        <Clock className="h-3 w-3 mr-1" />
        In Progress
      </Badge>
    );
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString();
  };

  const getTotalTimeSpent = (enrollment: UserEnrollment) => {
    const totalMinutes = enrollment.lessonProgress.reduce(
      (acc, lp) => acc + (lp.timeSpentMinutes || 0),
      0
    );
    if (totalMinutes < 60) return `${totalMinutes}m`;
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return `${hours}h ${mins}m`;
  };

  const filteredUsers = users.filter((user) => {
    const query = searchQuery.toLowerCase();
    return (
      user.name.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query) ||
      user.role.toLowerCase().includes(query)
    );
  });

  if (loading || isAuthLoading) {
    return (
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>

        {/* Stats skeleton */}
        <div className="grid gap-4 md:grid-cols-5">
          {[...Array(5)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
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
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-48" />
              </div>
              <Skeleton className="h-10 w-64" />
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  {[...Array(8)].map((_, i) => (
                    <TableHead key={i}>
                      <Skeleton className="h-4 w-16" />
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...Array(5)].map((_, rowIndex) => (
                  <TableRow key={rowIndex}>
                    <TableCell><Skeleton className="h-6 w-6" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-8 rounded ml-auto" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  }

  const adminCount = users.filter((u) => u.role === "ADMIN" || u.role === "SUPERADMIN").length;
  const studentCount = users.filter((u) => u.role === "STUDENT").length;
  const trainerCount = users.filter((u) => u.role === "TRAINER" || u.role === "TEAM_LEADER").length;
  const publicCount = users.filter((u) => u.tenant?.type === "PUBLIC").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("users.title")}</h1>
          <p className="text-muted-foreground mt-1">
            {t("users.manageUsers")}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("users.totalUsers")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("users.administrators")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{adminCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("users.trainersLeaders")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{trainerCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("users.students")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{studentCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("users.publicUsers")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-cyan-600">{publicCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t("users.allUsers")}</CardTitle>
              <CardDescription>
                {t("users.clickToView")}
              </CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("users.searchUsers")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <UserCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {searchQuery ? t("users.noUsersFound") : t("users.noUsersYet")}
              </h3>
              <p className="text-muted-foreground">
                {searchQuery
                  ? t("users.tryDifferentSearch")
                  : t("users.inviteToStart")}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>{t("common.name")}</TableHead>
                  <TableHead>{t("common.email")}</TableHead>
                  <TableHead>{t("common.role")}</TableHead>
                  <TableHead>{t("users.tenant")}</TableHead>
                  <TableHead>{t("users.group")}</TableHead>
                  <TableHead>{t("users.joined")}</TableHead>
                  <TableHead className="text-right">{t("common.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <React.Fragment key={user.id}>
                    <TableRow 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => toggleUserExpansion(user.id)}
                    >
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                          {expandedUsers.has(user.id) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{getRoleBadge(user.role)}</TableCell>
                      <TableCell>
                        {user.tenant?.type === 'PUBLIC' ? (
                          <Badge variant="outline" className="text-cyan-600 border-cyan-600">
                            {t("users.public")}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">
                            {user.tenant?.name || t("users.organization")}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {user.group?.name || (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {formatDate(user.createdAt)}
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditClick(user)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              {t("users.editUser")}
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleSwitchToUser(user)}
                              disabled={user.id === currentUser?.id || user.role === "SUPERADMIN"}
                            >
                              <UserCheck className="h-4 w-4 mr-2" />
                              {t("users.switchToUser")}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openResetModal(user)}>
                              <RotateCcw className="h-4 w-4 mr-2" />
                              {t("users.resetCourseData")}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setDeleteUser(user)}
                              className="text-destructive focus:text-destructive"
                              disabled={user.id === currentUser?.id}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              {t("users.deleteUser")}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                    
                    {/* Expandable Content */}
                    {expandedUsers.has(user.id) && (
                      <TableRow className="bg-muted/30 hover:bg-muted/30">
                        <TableCell colSpan={8} className="p-0">
                          <div className="px-8 py-4">
                            {loadingEnrollments.has(user.id) ? (
                              <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                  <Skeleton className="h-4 w-4" />
                                  <Skeleton className="h-4 w-40" />
                                </div>
                                <div className="grid gap-3">
                                  {[...Array(2)].map((_, i) => (
                                    <div key={i} className="bg-background rounded-lg border p-4 space-y-3">
                                      <div className="flex items-start justify-between">
                                        <div className="space-y-2">
                                          <Skeleton className="h-5 w-48" />
                                          <Skeleton className="h-4 w-64" />
                                        </div>
                                        <Skeleton className="h-6 w-24 rounded-full" />
                                      </div>
                                      <div className="flex items-center gap-4">
                                        <div className="flex-1 space-y-2">
                                          <Skeleton className="h-3 w-full" />
                                          <Skeleton className="h-2 w-full rounded-full" />
                                        </div>
                                        <Skeleton className="h-4 w-16" />
                                        <Skeleton className="h-4 w-20" />
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : userEnrollments[user.id]?.length === 0 ? (
                              <div className="text-center py-4 text-muted-foreground">
                                <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                <p>{t("users.noCourseEnrollments")}</p>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                <h4 className="font-semibold text-sm flex items-center gap-2">
                                  <BookOpen className="h-4 w-4" />
                                  {t("users.courseEnrollments")} ({userEnrollments[user.id]?.length || 0})
                                </h4>
                                <div className="grid gap-3">
                                  {userEnrollments[user.id]?.map((enrollment) => (
                                    <div
                                      key={enrollment.id}
                                      className="bg-background rounded-lg border p-4 space-y-3"
                                    >
                                      <div className="flex items-start justify-between">
                                        <div>
                                          <h5 className="font-medium">{enrollment.course.title}</h5>
                                          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                                            <span>{t("users.started")}: {formatDate(enrollment.enrolledAt)}</span>
                                            {enrollment.completedAt && (
                                              <span>{t("common.completed")}: {formatDate(enrollment.completedAt)}</span>
                                            )}
                                            {enrollment.lastAccessedAt && (
                                              <span>{t("users.lastAccessed")}: {formatDate(enrollment.lastAccessedAt)}</span>
                                            )}
                                          </div>
                                        </div>
                                        {getStatusBadge(enrollment)}
                                      </div>
                                      
                                        <div className="flex items-center gap-4">
                                        <div className="flex-1">
                                          <div className="flex items-center justify-between text-sm mb-1">
                                            <span>{t("users.progress")}</span>
                                            <span className="font-medium">{enrollment.progressPercentage}%</span>
                                          </div>
                                          <Progress value={enrollment.progressPercentage} className="h-2" />
                                        </div>
                                        
                                        <div className="flex items-center gap-4 text-sm">
                                          <div className="flex items-center gap-1">
                                            <Clock className="h-4 w-4 text-muted-foreground" />
                                            <span>{getTotalTimeSpent(enrollment)}</span>
                                          </div>
                                          
                                          <div className="text-muted-foreground">
                                            {enrollment.lessonProgress.filter(lp => lp.completed).length}/
                                            {enrollment.lessonProgress.length} lessons
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editUser} onOpenChange={() => setEditUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("users.editUser")}</DialogTitle>
            <DialogDescription>
              {t("users.updateUserInfo")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">{t("common.name")}</Label>
              <Input
                id="edit-name"
                value={editForm.name || ""}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                placeholder={t("users.userName")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">{t("common.email")}</Label>
              <Input
                id="edit-email"
                type="email"
                value={editForm.email || ""}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                placeholder="user@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label>{t("common.role")}</Label>
              <Select
                value={editForm.role || ""}
                onValueChange={(v) => setEditForm({ ...editForm, role: v as UserRole })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UserRole.STUDENT}>{t("roles.student")}</SelectItem>
                  <SelectItem value={UserRole.TRAINER}>{t("roles.trainer")}</SelectItem>
                  <SelectItem value={UserRole.TEAM_LEADER}>{t("roles.teamLeader")}</SelectItem>
                  <SelectItem value={UserRole.ADMIN}>{t("roles.admin")}</SelectItem>
                  {isSuperAdmin && (
                    <SelectItem value={UserRole.SUPERADMIN}>{t("roles.superadmin")}</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving ? t("users.saving") : t("users.saveChanges")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteUser} onOpenChange={() => setDeleteUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("users.deleteUser")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("users.deleteConfirm")} <strong>{deleteUser?.name}</strong> ({deleteUser?.email})?
              {t("users.deleteWarning")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("users.deleteUser")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Course Data Dialog */}
      <Dialog open={!!resetUser} onOpenChange={(open) => {
        if (!open) {
          setResetUser(null);
          setResetUserEnrollments([]);
          setSelectedCoursesToReset(new Set());
          setDeleteCertificates(false);
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("users.resetCourseData")}</DialogTitle>
            <DialogDescription>
              {t("users.selectCoursesToReset")} <strong>{resetUser?.name}</strong>
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            {/* Course selection */}
            {loadingResetEnrollments ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-48 mb-4" />
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg border">
                    <Skeleton className="h-4 w-4 rounded" />
                    <div className="flex-1 min-w-0 space-y-2">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </div>
                ))}
              </div>
            ) : resetUserEnrollments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>{t("users.noCourseEnrollments")}</p>
              </div>
            ) : (
              <>
                {/* Select all / Deselect all */}
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="text-sm font-medium">
                    {t("users.selectCourses")} ({selectedCoursesToReset.size}/{resetUserEnrollments.length})
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={selectAllCourses}
                      className="h-7 text-xs"
                    >
                      {t("users.selectAll")}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={deselectAllCourses}
                      className="h-7 text-xs"
                    >
                      {t("users.deselectAll")}
                    </Button>
                  </div>
                </div>

                {/* Course list */}
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {resetUserEnrollments.map((enrollment) => (
                    <div
                      key={enrollment.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedCoursesToReset.has(enrollment.courseId)
                          ? "border-primary bg-primary/5"
                          : "hover:bg-muted/50"
                      }`}
                      onClick={() => toggleCourseSelection(enrollment.courseId)}
                    >
                      <Checkbox
                        checked={selectedCoursesToReset.has(enrollment.courseId)}
                        onCheckedChange={() => toggleCourseSelection(enrollment.courseId)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{enrollment.course.title}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{t("users.progress")}: {enrollment.progressPercentage}%</span>
                          <span>•</span>
                          <span>{enrollment.lessonProgress.filter(lp => lp.completed).length}/{enrollment.lessonProgress.length} {t("courses.lessons").toLowerCase()}</span>
                        </div>
                      </div>
                      {getStatusBadge(enrollment)}
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Delete certificates option */}
            {resetUserEnrollments.length > 0 && selectedCoursesToReset.size > 0 && (
              <div className="pt-2 border-t">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="delete-certificates"
                    checked={deleteCertificates}
                    onCheckedChange={(checked) => setDeleteCertificates(checked === true)}
                  />
                  <label
                    htmlFor="delete-certificates"
                    className="text-sm font-medium leading-none cursor-pointer"
                  >
                    {t("users.alsoDeleteCertificates")}
                  </label>
                </div>
                {deleteCertificates && (
                  <p className="text-sm text-destructive mt-2">
                    {t("users.certificatesWillBeDeleted")}
                  </p>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setResetUser(null)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleResetCourseData}
              disabled={selectedCoursesToReset.size === 0 || resetting}
              className="bg-orange-600 text-white hover:bg-orange-700"
            >
              {resetting ? t("common.loading") : t("users.resetSelected")} ({selectedCoursesToReset.size})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
