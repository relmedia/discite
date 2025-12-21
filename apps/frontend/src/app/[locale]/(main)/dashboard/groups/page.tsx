"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Pencil,
  Trash2,
  Users2,
  UserCircle,
  Search,
  MoreHorizontal,
  ChevronDown,
  ChevronRight,
  UserPlus,
  UserMinus,
  GraduationCap,
  Shield,
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
import { groupsApi, Group, CreateGroupDto, UpdateGroupDto } from "@/lib/api/groups";
import { usersApi, User } from "@/lib/api/users";
import { useAuth } from "@/hooks/use-auth";
import { useTranslations } from "@/components/intl-provider";
import { UserRole } from "@repo/shared";
import { Skeleton } from "@/components/ui/skeleton";

export default function GroupsPage() {
  const router = useRouter();
  const { user: currentUser, isLoading: isAuthLoading } = useAuth();
  const t = useTranslations();
  const [groups, setGroups] = useState<Group[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Expandable rows state
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [groupMembers, setGroupMembers] = useState<Record<string, User[]>>({});
  const [loadingMembers, setLoadingMembers] = useState<Set<string>>(new Set());

  // Create/Edit dialog state
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [formData, setFormData] = useState<CreateGroupDto>({
    name: "",
    description: "",
    leaderId: "",
  });
  const [saving, setSaving] = useState(false);

  // Assign trainer dialog state
  const [assigningTrainer, setAssigningTrainer] = useState<Group | null>(null);
  const [selectedTrainerId, setSelectedTrainerId] = useState<string>("");

  // Add/Remove student dialog state
  const [managingStudents, setManagingStudents] = useState<Group | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");

  // Delete dialog state
  const [deleteGroup, setDeleteGroup] = useState<Group | null>(null);

  const isSuperAdmin = currentUser?.role === "SUPERADMIN";
  const isAdmin = currentUser?.role === "ADMIN" || isSuperAdmin;

  useEffect(() => {
    if (!isAuthLoading && !currentUser) {
      return;
    }
    if (!isAuthLoading && !isAdmin) {
      toast.error(t("common.unauthorized"));
      router.push("/dashboard");
    } else if (!isAuthLoading && isAdmin) {
      fetchData();
    }
  }, [isAuthLoading, isAdmin, currentUser, router, t]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [groupsData, usersData] = await Promise.all([
        groupsApi.getGroups(),
        usersApi.getUsers(),
      ]);
      setGroups(groupsData);
      setUsers(usersData);
    } catch (error: any) {
      toast.error(error.message || "Failed to load data");
      setGroups([]);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleGroupExpansion = async (groupId: string) => {
    const newExpanded = new Set(expandedGroups);

    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
      // Fetch members if not already loaded
      if (!groupMembers[groupId]) {
        await fetchGroupMembers(groupId);
      }
    }

    setExpandedGroups(newExpanded);
  };

  const fetchGroupMembers = async (groupId: string) => {
    setLoadingMembers((prev) => new Set(prev).add(groupId));
    try {
      const members = await groupsApi.getGroupMembers(groupId);
      setGroupMembers((prev) => ({ ...prev, [groupId]: members || [] }));
    } catch (error: any) {
      toast.error(error.message || "Failed to load group members");
    } finally {
      setLoadingMembers((prev) => {
        const next = new Set(prev);
        next.delete(groupId);
        return next;
      });
    }
  };

  const handleCreateGroup = async () => {
    if (!formData.name.trim() || !formData.leaderId) {
      toast.error("Name and leader are required");
      return;
    }

    setSaving(true);
    try {
      await groupsApi.createGroup(formData);
      toast.success("Group created successfully");
      setIsCreateDialogOpen(false);
      setFormData({ name: "", description: "", leaderId: "" });
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to create group");
    } finally {
      setSaving(false);
    }
  };

  const handleEditClick = (group: Group) => {
    setEditingGroup(group);
    setFormData({
      name: group.name,
      description: group.description || "",
      leaderId: group.leaderId,
    });
  };

  const handleUpdateGroup = async () => {
    if (!editingGroup || !formData.name.trim() || !formData.leaderId) {
      toast.error("Name and leader are required");
      return;
    }

    setSaving(true);
    try {
      const updateData: UpdateGroupDto = {
        name: formData.name,
        description: formData.description || undefined,
        leaderId: formData.leaderId,
      };
      await groupsApi.updateGroup(editingGroup.id, updateData);
      toast.success("Group updated successfully");
      setEditingGroup(null);
      setFormData({ name: "", description: "", leaderId: "" });
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to update group");
    } finally {
      setSaving(false);
    }
  };

  const handleAssignTrainer = async () => {
    if (!assigningTrainer || selectedTrainerId === "") {
      return;
    }

    setSaving(true);
    try {
      if (selectedTrainerId === "none") {
        // Remove trainer by updating the group with null trainerId
        await groupsApi.updateGroup(assigningTrainer.id, {
          trainerId: null,
        });
        toast.success("Trainer removed successfully");
      } else {
        await groupsApi.assignTrainer(assigningTrainer.id, selectedTrainerId);
        toast.success("Trainer assigned successfully");
      }
      setAssigningTrainer(null);
      setSelectedTrainerId("");
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to assign trainer");
    } finally {
      setSaving(false);
    }
  };

  const handleAddStudent = async () => {
    if (!managingStudents || !selectedStudentId) {
      return;
    }

    setSaving(true);
    try {
      await groupsApi.addStudent(managingStudents.id, selectedStudentId);
      toast.success("Student added to group successfully");
      setManagingStudents(null);
      setSelectedStudentId("");
      // Refresh members for this group
      if (expandedGroups.has(managingStudents.id)) {
        await fetchGroupMembers(managingStudents.id);
      }
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to add student");
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveStudent = async (groupId: string, studentId: string) => {
    try {
      await groupsApi.removeStudent(groupId, studentId);
      toast.success("Student removed from group successfully");
      // Refresh members for this group
      if (expandedGroups.has(groupId)) {
        await fetchGroupMembers(groupId);
      }
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to remove student");
    }
  };

  const handleDelete = async () => {
    if (!deleteGroup) return;

    try {
      await groupsApi.deleteGroup(deleteGroup.id);
      toast.success("Group deleted successfully");
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete group");
    } finally {
      setDeleteGroup(null);
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

  const formatDate = (dateString?: string) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString();
  };

  const filteredGroups = groups.filter((group) => {
    const query = searchQuery.toLowerCase();
    return (
      group.name.toLowerCase().includes(query) ||
      group.description?.toLowerCase().includes(query) ||
      group.leader?.name.toLowerCase().includes(query) ||
      group.trainer?.name.toLowerCase().includes(query)
    );
  });

  // Filter users by role
  const teamLeaders = users.filter((u) => u.role === UserRole.TEAM_LEADER && !u.groupId);
  const trainers = users.filter((u) => u.role === UserRole.TRAINER);
  const students = users.filter((u) => u.role === UserRole.STUDENT);

  if (loading || isAuthLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
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
                    <TableCell><Skeleton className="h-6 w-6" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
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

  const totalGroups = groups.length;
  const groupsWithTrainers = groups.filter((g) => g.trainerId).length;
  const totalMembers = groups.reduce((sum, g) => sum + (g.members?.length || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Groups</h1>
          <p className="text-muted-foreground mt-1">
            Manage groups and assign leaders, trainers, and students
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Group
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Groups
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalGroups}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Groups with Trainers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{groupsWithTrainers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{totalMembers}</div>
          </CardContent>
        </Card>
      </div>

      {/* Groups Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Groups</CardTitle>
              <CardDescription>
                Click to view members and manage group settings
              </CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search groups..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredGroups.length === 0 ? (
            <div className="text-center py-12">
              <Users2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {searchQuery ? "No groups found" : "No groups yet"}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery
                  ? "Try a different search term"
                  : "Create your first group to get started"}
              </p>
              {!searchQuery && (
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Group
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Leader</TableHead>
                  <TableHead>Trainer</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredGroups.map((group) => (
                  <React.Fragment key={group.id}>
                    <TableRow
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => toggleGroupExpansion(group.id)}
                    >
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                          {expandedGroups.has(group.id) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell className="font-medium">{group.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4 text-orange-600" />
                          <span>{group.leader?.name || "—"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {group.trainer ? (
                          <div className="flex items-center gap-2">
                            <GraduationCap className="h-4 w-4 text-green-600" />
                            <span>{group.trainer.name}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {group.members?.length || 0} members
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(group.createdAt)}</TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditClick(group)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit Group
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setAssigningTrainer(group);
                                setSelectedTrainerId(group.trainerId || "");
                              }}
                            >
                              <GraduationCap className="h-4 w-4 mr-2" />
                              {group.trainerId ? "Change Trainer" : "Assign Trainer"}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setManagingStudents(group);
                                setSelectedStudentId("");
                              }}
                            >
                              <UserPlus className="h-4 w-4 mr-2" />
                              Add Student
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setDeleteGroup(group)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Group
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>

                    {/* Expandable Content */}
                    {expandedGroups.has(group.id) && (
                      <TableRow className="bg-muted/30 hover:bg-muted/30">
                        <TableCell colSpan={7} className="p-0">
                          <div className="px-8 py-4">
                            {loadingMembers.has(group.id) ? (
                              <div className="space-y-3">
                                <Skeleton className="h-4 w-48 mb-4" />
                                {[...Array(3)].map((_, i) => (
                                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg border">
                                    <Skeleton className="h-10 w-10 rounded-full" />
                                    <div className="flex-1 space-y-2">
                                      <Skeleton className="h-4 w-32" />
                                      <Skeleton className="h-3 w-40" />
                                    </div>
                                    <Skeleton className="h-6 w-20 rounded-full" />
                                  </div>
                                ))}
                              </div>
                            ) : groupMembers[group.id]?.length === 0 ? (
                              <div className="text-center py-4 text-muted-foreground">
                                <UserCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                <p>No members in this group</p>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                <h4 className="font-semibold text-sm flex items-center gap-2">
                                  <Users2 className="h-4 w-4" />
                                  Group Members ({groupMembers[group.id]?.length || 0})
                                </h4>
                                <div className="grid gap-2">
                                  {groupMembers[group.id]?.map((member) => (
                                    <div
                                      key={member.id}
                                      className="flex items-center justify-between bg-background rounded-lg border p-3"
                                    >
                                      <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                                          <UserCircle className="h-5 w-5 text-muted-foreground" />
                                        </div>
                                        <div>
                                          <p className="font-medium text-sm">{member.name}</p>
                                          <p className="text-xs text-muted-foreground">{member.email}</p>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-3">
                                        {getRoleBadge(member.role as UserRole)}
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => handleRemoveStudent(group.id, member.id)}
                                          className="h-8 w-8 text-destructive hover:text-destructive"
                                        >
                                          <UserMinus className="h-4 w-4" />
                                        </Button>
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

      {/* Create/Edit Dialog */}
      <Dialog
        open={isCreateDialogOpen || !!editingGroup}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateDialogOpen(false);
            setEditingGroup(null);
            setFormData({ name: "", description: "", leaderId: "" });
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingGroup ? "Edit Group" : "Create Group"}</DialogTitle>
            <DialogDescription>
              {editingGroup
                ? "Update group information"
                : "Create a new group and assign a team leader"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Group Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter group name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter group description (optional)"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Team Leader *</Label>
              <Select
                value={formData.leaderId}
                onValueChange={(v) => setFormData({ ...formData, leaderId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a team leader" />
                </SelectTrigger>
                <SelectContent>
                  {teamLeaders.length === 0 ? (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      No available team leaders
                    </div>
                  ) : (
                    teamLeaders.map((leader) => (
                      <SelectItem key={leader.id} value={leader.id}>
                        {leader.name} ({leader.email})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {teamLeaders.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No team leaders available. Create users with TEAM_LEADER role first.
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateDialogOpen(false);
                setEditingGroup(null);
                setFormData({ name: "", description: "", leaderId: "" });
              }}
            >
              Cancel
            </Button>
            <Button onClick={editingGroup ? handleUpdateGroup : handleCreateGroup} disabled={saving}>
              {saving ? "Saving..." : editingGroup ? "Update Group" : "Create Group"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Trainer Dialog */}
      <Dialog open={!!assigningTrainer} onOpenChange={(open) => !open && setAssigningTrainer(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Trainer</DialogTitle>
            <DialogDescription>
              Assign a trainer to {assigningTrainer?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Trainer</Label>
              <Select value={selectedTrainerId} onValueChange={setSelectedTrainerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a trainer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (Remove trainer)</SelectItem>
                  {trainers.map((trainer) => (
                    <SelectItem key={trainer.id} value={trainer.id}>
                      {trainer.name} ({trainer.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssigningTrainer(null)}>
              Cancel
            </Button>
            <Button onClick={handleAssignTrainer} disabled={saving || selectedTrainerId === ""}>
              {saving ? "Assigning..." : selectedTrainerId === "none" ? "Remove Trainer" : "Assign Trainer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Student Dialog */}
      <Dialog open={!!managingStudents} onOpenChange={(open) => !open && setManagingStudents(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Student to Group</DialogTitle>
            <DialogDescription>
              Add a student to {managingStudents?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Student</Label>
              <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a student" />
                </SelectTrigger>
                <SelectContent>
                  {students
                    .filter((s) => !s.groupId || s.groupId === managingStudents?.id)
                    .map((student) => (
                      <SelectItem key={student.id} value={student.id}>
                        {student.name} ({student.email})
                        {student.groupId && student.groupId !== managingStudents?.id && (
                          <span className="text-muted-foreground"> - Already in another group</span>
                        )}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setManagingStudents(null)}>
              Cancel
            </Button>
            <Button onClick={handleAddStudent} disabled={saving || !selectedStudentId}>
              {saving ? "Adding..." : "Add Student"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteGroup} onOpenChange={() => setDeleteGroup(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Group</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteGroup?.name}</strong>?
              This will remove all members from the group. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Group
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
