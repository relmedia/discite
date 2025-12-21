'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Lesson, LessonType } from '@repo/shared';
import { lessonsApi } from '@/lib/api/lessons';
import { coursesApi } from '@/lib/api/courses';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  GripVertical,
  ArrowLeft,
  Video,
  FileText,
  File,
  Layers,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';

interface SortableRowProps {
  lesson: Lesson;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onTogglePublish: (lesson: Lesson) => void;
}

function SortableRow({ lesson, onEdit, onDelete, onTogglePublish }: SortableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lesson.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getLessonTypeIcon = (type: LessonType) => {
    switch (type) {
      case LessonType.VIDEO:
        return <Video className="h-4 w-4" />;
      case LessonType.TEXT:
        return <FileText className="h-4 w-4" />;
      case LessonType.DOCUMENT:
        return <File className="h-4 w-4" />;
      case LessonType.MIXED:
        return <Layers className="h-4 w-4" />;
      default:
        return null;
    }
  };

  return (
    <TableRow ref={setNodeRef} style={style}>
      <TableCell className="w-[50px]">
        <button
          className="cursor-grab hover:bg-gray-100 p-2 rounded"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4 text-gray-400" />
        </button>
      </TableCell>
      <TableCell className="w-[80px] text-center font-medium">
        {lesson.orderIndex + 1}
      </TableCell>
      <TableCell className="font-medium">{lesson.title}</TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          {getLessonTypeIcon(lesson.type)}
          <span className="capitalize">{lesson.type.toLowerCase()}</span>
        </div>
      </TableCell>
      <TableCell className="text-center">
        {lesson.durationMinutes} min
      </TableCell>
      <TableCell>
        <Badge variant={lesson.isPublished ? 'default' : 'secondary'}>
          {lesson.isPublished ? 'Published' : 'Draft'}
        </Badge>
      </TableCell>
      <TableCell className="text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(lesson.id)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onTogglePublish(lesson)}>
              {lesson.isPublished ? (
                <>
                  <EyeOff className="h-4 w-4 mr-2" />
                  Unpublish
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4 mr-2" />
                  Publish
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDelete(lesson.id)}
              className="text-red-600"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}

export default function LessonsPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.courseId as string;
  const { user, isLoading: isAuthLoading } = useAuth();
  
  // Check if current user is a superadmin
  const isSuperAdmin = user?.role === 'SUPERADMIN';

  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [courseName, setCourseName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [lessonToDelete, setLessonToDelete] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Redirect non-superadmins (but not if user is logged out)
  useEffect(() => {
    if (!isAuthLoading && !user) {
      return; // Let middleware handle redirect for logged out users
    }
    if (!isAuthLoading && !isSuperAdmin) {
      toast.error('You do not have permission to access this page');
      router.push(`/dashboard/courses/${courseId}`);
    }
  }, [isAuthLoading, isSuperAdmin, user, router, courseId]);

  useEffect(() => {
    if (isSuperAdmin) {
      loadLessons();
      loadCourse();
    }
  }, [courseId, isSuperAdmin]);

  const loadLessons = async () => {
    try {
      setLoading(true);
      const data = await lessonsApi.getLessonsByCourse(courseId);
      setLessons(data);
    } catch (error) {
      toast.error('Failed to load lessons');
    } finally {
      setLoading(false);
    }
  };

  const loadCourse = async () => {
    try {
      const course = await coursesApi.getCourseById(courseId);
      setCourseName(course.title);
    } catch (error) {
      console.error('Failed to load course:', error);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = lessons.findIndex((l) => l.id === active.id);
      const newIndex = lessons.findIndex((l) => l.id === over.id);

      const newLessons = arrayMove(lessons, oldIndex, newIndex);

      // Update orderIndex for all lessons
      const updatedLessons = newLessons.map((lesson, index) => ({
        ...lesson,
        orderIndex: index,
      }));

      setLessons(updatedLessons);

      try {
        await lessonsApi.reorderLessons(courseId, {
          lessons: updatedLessons.map((l) => ({ id: l.id, orderIndex: l.orderIndex })),
        });

        toast.success('Lessons reordered successfully');
      } catch (error) {
        toast.error('Failed to reorder lessons');
        // Revert on error
        loadLessons();
      }
    }
  };

  const handleEdit = (lessonId: string) => {
    router.push(`/dashboard/courses/${courseId}/lessons/edit/${lessonId}`);
  };

  const handleDelete = (lessonId: string) => {
    setLessonToDelete(lessonId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!lessonToDelete) return;

    try {
      await lessonsApi.deleteLesson(lessonToDelete);
      toast.success('Lesson deleted successfully');
      loadLessons();
    } catch (error) {
      toast.error('Failed to delete lesson');
    } finally {
      setDeleteDialogOpen(false);
      setLessonToDelete(null);
    }
  };

  const handleTogglePublish = async (lesson: Lesson) => {
    try {
      if (lesson.isPublished) {
        await lessonsApi.unpublishLesson(lesson.id);
        toast.success('Lesson unpublished');
      } else {
        await lessonsApi.publishLesson(lesson.id);
        toast.success('Lesson published');
      }
      loadLessons();
    } catch (error) {
      toast.error(`Failed to ${lesson.isPublished ? 'unpublish' : 'publish'} lesson`);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>

        {/* Card with table skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-56" />
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]"><Skeleton className="h-4 w-4" /></TableHead>
                  <TableHead className="w-[80px]"><Skeleton className="h-4 w-12" /></TableHead>
                  <TableHead><Skeleton className="h-4 w-16" /></TableHead>
                  <TableHead><Skeleton className="h-4 w-12" /></TableHead>
                  <TableHead><Skeleton className="h-4 w-16" /></TableHead>
                  <TableHead><Skeleton className="h-4 w-14" /></TableHead>
                  <TableHead><Skeleton className="h-4 w-16" /></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...Array(5)].map((_, rowIndex) => (
                  <TableRow key={rowIndex}>
                    <TableCell><Skeleton className="h-6 w-6" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-8 mx-auto" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-4 w-4" />
                        <Skeleton className="h-4 w-16" />
                      </div>
                    </TableCell>
                    <TableCell><Skeleton className="h-4 w-16 mx-auto" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/dashboard/courses')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Courses
            </Button>
          </div>
          <h1 className="text-2xl font-bold">Lessons</h1>
          <p className="text-muted-foreground">{courseName}</p>
        </div>
        <Button onClick={() => router.push(`/dashboard/courses/${courseId}/lessons/create`)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Lesson
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lessons ({lessons.length})</CardTitle>
          <p className="text-sm text-muted-foreground">
            Drag and drop to reorder lessons
          </p>
        </CardHeader>
        <CardContent>
          {lessons.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">No lessons yet</p>
              <Button onClick={() => router.push(`/dashboard/courses/${courseId}/lessons/create`)}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Lesson
              </Button>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]"></TableHead>
                    <TableHead className="w-[80px] text-center">Order</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-center">Duration</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <SortableContext
                    items={lessons.map((l) => l.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {lessons.map((lesson) => (
                      <SortableRow
                        key={lesson.id}
                        lesson={lesson}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onTogglePublish={handleTogglePublish}
                      />
                    ))}
                  </SortableContext>
                </TableBody>
              </Table>
            </DndContext>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the lesson.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
