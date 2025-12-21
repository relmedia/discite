"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Course, CourseStatus } from "@repo/shared";
import { coursesApi } from "@/lib/api/courses";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import {
  Edit,
  Trash2,
  Eye,
  MoreHorizontal,
  Plus,
  Upload,
  Archive,
  BookOpen,
  HelpCircle,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function AllCoursesPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  
  // Check if current user is a superadmin
  const isSuperAdmin = user?.role === 'SUPERADMIN';

  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState<Course | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Redirect non-superadmins (but not if user is logged out)
  useEffect(() => {
    if (!authLoading && !user) {
      return; // Let middleware handle redirect for logged out users
    }
    if (!authLoading && !isSuperAdmin) {
      toast.error('You do not have permission to access this page');
      router.push('/dashboard/courses');
    }
  }, [authLoading, isSuperAdmin, user, router]);

  useEffect(() => {
    if (isSuperAdmin) {
      fetchCourses();
    }
  }, [isSuperAdmin]);

  const fetchCourses = async () => {
    try {
      setIsLoading(true);
      const data = await coursesApi.getCourses();
      setCourses(data);
    } catch (error: any) {
      toast.error(error.message || "Failed to fetch courses");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteClick = (course: Course) => {
    setCourseToDelete(course);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!courseToDelete) return;

    try {
      setIsDeleting(true);
      await coursesApi.deleteCourse(courseToDelete.id);
      toast.success("Course deleted successfully");
      setCourses(courses.filter((c) => c.id !== courseToDelete.id));
      setDeleteDialogOpen(false);
      setCourseToDelete(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to delete course");
      console.error(error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEdit = (courseId: string) => {
    router.push(`/dashboard/courses/edit/${courseId}`);
  };

  const handleView = (courseSlug: string) => {
    router.push(`/dashboard/courses/${courseSlug}`);
  };

  const handleManageLessons = (courseId: string) => {
    router.push(`/dashboard/courses/${courseId}/lessons`);
  };

  const handleManageQuizzes = (courseId: string) => {
    router.push(`/dashboard/courses/${courseId}/quizzes`);
  };

  const handleManageCurriculum = (courseId: string) => {
    router.push(`/dashboard/courses/${courseId}/curriculum`);
  };

  const handlePublish = async (course: Course) => {
    try {
      const updatedCourse = await coursesApi.publishCourse(course.id);
      toast.success("Course published successfully");

      // Update course in the list
      setCourses(courses.map((c) =>
        c.id === course.id ? { ...c, status: updatedCourse.status } : c
      ));
    } catch (error: any) {
      toast.error(error.message || "Failed to publish course");
      console.error(error);
    }
  };

  const handleUnpublish = async (course: Course) => {
    try {
      const updatedCourse = await coursesApi.unpublishCourse(course.id);
      toast.success("Course unpublished successfully");

      // Update course in the list
      setCourses(courses.map((c) =>
        c.id === course.id ? { ...c, status: updatedCourse.status } : c
      ));
    } catch (error: any) {
      toast.error(error.message || "Failed to unpublish course");
      console.error(error);
    }
  };

  const getStatusBadge = (status: CourseStatus) => {
    const statusConfig = {
      [CourseStatus.DRAFT]: { variant: "secondary" as const, label: "Draft" },
      [CourseStatus.PUBLISHED]: { variant: "default" as const, label: "Published" },
      [CourseStatus.ARCHIVED]: { variant: "outline" as const, label: "Archived" },
    };

    const config = statusConfig[status];
    return (
      <Badge variant={config.variant}>
        {config.label}
      </Badge>
    );
  };

  if (authLoading || isLoading) {
    return (
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-4 w-72" />
          </div>
          <Skeleton className="h-10 w-36" />
        </div>

        {/* Table skeleton */}
        <div className="rounded-lg border bg-card">
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
                  <TableCell>
                    <div className="max-w-[300px] space-y-1">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-64" />
                    </div>
                  </TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-8 w-8 rounded ml-auto" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">All Courses</h1>
          <p className="text-muted-foreground mt-2">
            Manage all courses in your organization
          </p>
        </div>
        <Button onClick={() => router.push("/dashboard/courses/create")}>
          <Plus className="mr-2 h-4 w-4" />
          Create Course
        </Button>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Instructor</TableHead>
              <TableHead>Level</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Students</TableHead>
              <TableHead>Lessons</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {courses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12">
                  <div className="text-muted-foreground">
                    No courses found. Create your first course!
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              courses.map((course) => (
                <TableRow key={course.id}>
                  <TableCell className="font-medium">
                    <div className="max-w-[300px]">
                      <div className="truncate">{course.title}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {course.description}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{course.instructorName || "Unknown"}</TableCell>
                  <TableCell>{course.level}</TableCell>
                  <TableCell>{getStatusBadge(course.status)}</TableCell>
                  <TableCell>{course.studentsEnrolled}</TableCell>
                  <TableCell>{course.lessonsCount}</TableCell>
                  <TableCell>
                    {new Date(course.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleView(course.slug)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEdit(course.id)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleManageCurriculum(course.id)}>
                          <Settings className="mr-2 h-4 w-4" />
                          Manage Curriculum
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleManageLessons(course.id)}>
                          <BookOpen className="mr-2 h-4 w-4" />
                          Lessons
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleManageQuizzes(course.id)}>
                          <HelpCircle className="mr-2 h-4 w-4" />
                          Quizzes
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {course.status === CourseStatus.DRAFT && (
                          <DropdownMenuItem onClick={() => handlePublish(course)}>
                            <Upload className="mr-2 h-4 w-4" />
                            Publish
                          </DropdownMenuItem>
                        )}
                        {course.status === CourseStatus.PUBLISHED && (
                          <DropdownMenuItem onClick={() => handleUnpublish(course)}>
                            <Archive className="mr-2 h-4 w-4" />
                            Unpublish
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDeleteClick(course)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the course "{courseToDelete?.title}".
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
