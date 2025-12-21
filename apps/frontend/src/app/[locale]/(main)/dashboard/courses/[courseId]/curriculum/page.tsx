'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
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
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Lesson, Quiz } from '@repo/shared';
import { coursesApi } from '@/lib/api/courses';
import { lessonsApi } from '@/lib/api/lessons';
import { quizzesApi } from '@/lib/api/quizzes';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
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
import {
  ArrowLeft,
  Plus,
  GripVertical,
  BookOpen,
  FileQuestion,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type CurriculumItemType = 'lesson' | 'quiz';

interface CurriculumItem {
  id: string;
  type: CurriculumItemType;
  title: string;
  orderIndex: number;
  isPublished: boolean;
  durationMinutes?: number;
  questionsCount?: number;
}

interface SortableItemProps {
  item: CurriculumItem;
  onEdit: (item: CurriculumItem) => void;
  onDelete: (item: CurriculumItem) => void;
  onTogglePublish: (item: CurriculumItem) => void;
}

function SortableItem({ item, onEdit, onDelete, onTogglePublish }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-3 p-4 border rounded-lg bg-card',
        isDragging && 'opacity-50 shadow-lg ring-2 ring-primary',
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none p-1 hover:bg-muted rounded"
      >
        <GripVertical className="h-5 w-5 text-muted-foreground" />
      </button>

      <div className={cn(
        'flex items-center justify-center h-10 w-10 rounded-lg',
        item.type === 'lesson' ? 'bg-blue-500/10' : 'bg-purple-500/10'
      )}>
        {item.type === 'lesson' ? (
          <BookOpen className={cn('h-5 w-5', 'text-blue-600')} />
        ) : (
          <FileQuestion className={cn('h-5 w-5', 'text-purple-600')} />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{item.title}</span>
          <Badge variant="outline" className="shrink-0">
            {item.type === 'lesson' ? 'Lesson' : 'Quiz'}
          </Badge>
          {!item.isPublished && (
            <Badge variant="secondary" className="shrink-0">Draft</Badge>
          )}
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
          {item.type === 'lesson' && item.durationMinutes !== undefined && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {item.durationMinutes} min
            </span>
          )}
          {item.type === 'quiz' && item.questionsCount !== undefined && (
            <span>{item.questionsCount} questions</span>
          )}
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onEdit(item)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onTogglePublish(item)}>
            {item.isPublished ? (
              <>
                <EyeOff className="mr-2 h-4 w-4" />
                Unpublish
              </>
            ) : (
              <>
                <Eye className="mr-2 h-4 w-4" />
                Publish
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => onDelete(item)}
            className="text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export default function CurriculumPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.courseId as string;
  const { user, isLoading: isAuthLoading } = useAuth();
  
  // Check if current user is a superadmin
  const isSuperAdmin = user?.role === 'SUPERADMIN';

  const [items, setItems] = useState<CurriculumItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<CurriculumItem | null>(null);

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
      fetchCurriculum();
    }
  }, [courseId, isSuperAdmin]);

  const fetchCurriculum = async () => {
    try {
      setIsLoading(true);
      const data = await coursesApi.getCurriculum(courseId);

      // Combine lessons and quizzes into a single sorted list
      const combinedItems: CurriculumItem[] = [
        ...data.lessons.map((lesson: Lesson) => ({
          id: lesson.id,
          type: 'lesson' as const,
          title: lesson.title,
          orderIndex: lesson.orderIndex,
          isPublished: lesson.isPublished,
          durationMinutes: lesson.durationMinutes,
        })),
        ...data.quizzes.map((quiz: Quiz) => ({
          id: quiz.id,
          type: 'quiz' as const,
          title: quiz.title,
          orderIndex: quiz.orderIndex,
          isPublished: quiz.isPublished,
          questionsCount: quiz.questions?.length || 0,
        })),
      ].sort((a, b) => a.orderIndex - b.orderIndex);

      setItems(combinedItems);
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch curriculum');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      // Calculate new items first
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);

      const newItems = arrayMove(items, oldIndex, newIndex).map((item, index) => ({
        ...item,
        orderIndex: index,
      }));

      // Update state immediately for smooth UI
      setItems(newItems);

      // Auto-save
      try {
        setIsSaving(true);
        await coursesApi.reorderCurriculum(
          courseId,
          newItems.map((item) => ({
            id: item.id,
            type: item.type,
            orderIndex: item.orderIndex,
          }))
        );
        // Show brief success indicator
        toast.success('Order saved', { duration: 1500 });
      } catch (error: any) {
        toast.error(error.message || 'Failed to save order');
        // Revert on error
        await fetchCurriculum();
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleEdit = (item: CurriculumItem) => {
    if (item.type === 'lesson') {
      router.push(`/dashboard/courses/${courseId}/lessons/edit/${item.id}`);
    } else {
      router.push(`/dashboard/courses/${courseId}/quizzes/${item.id}/edit`);
    }
  };

  const handleTogglePublish = async (item: CurriculumItem) => {
    try {
      if (item.type === 'lesson') {
        if (item.isPublished) {
          await lessonsApi.unpublishLesson(item.id);
        } else {
          await lessonsApi.publishLesson(item.id);
        }
      } else {
        if (item.isPublished) {
          await quizzesApi.unpublishQuiz(item.id);
        } else {
          await quizzesApi.publishQuiz(item.id);
        }
      }
      toast.success(`${item.type === 'lesson' ? 'Lesson' : 'Quiz'} ${item.isPublished ? 'unpublished' : 'published'}`);
      await fetchCurriculum();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update publish status');
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;

    try {
      if (itemToDelete.type === 'lesson') {
        await lessonsApi.deleteLesson(itemToDelete.id);
      } else {
        await quizzesApi.deleteQuiz(itemToDelete.id);
      }
      toast.success(`${itemToDelete.type === 'lesson' ? 'Lesson' : 'Quiz'} deleted`);
      setDeleteDialogOpen(false);
      setItemToDelete(null);
      await fetchCurriculum();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete item');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Loading curriculum...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="sm">
            <Link href={`/dashboard/courses/${courseId}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Course
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Curriculum</h1>
            <p className="text-muted-foreground">
              Drag and drop to reorder lessons and quizzes
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isSaving && (
            <span className="text-sm text-muted-foreground animate-pulse">
              Saving...
            </span>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Content
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/dashboard/courses/${courseId}/lessons/create`}>
                  <BookOpen className="mr-2 h-4 w-4" />
                  Add Lesson
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/dashboard/courses/${courseId}/quizzes/new`}>
                  <FileQuestion className="mr-2 h-4 w-4" />
                  Add Quiz
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Course Content</span>
            <Badge variant="outline">
              {items.length} item{items.length !== 1 ? 's' : ''}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">No content yet</p>
              <div className="flex gap-2 justify-center">
                <Button asChild variant="outline">
                  <Link href={`/dashboard/courses/${courseId}/lessons/create`}>
                    <BookOpen className="mr-2 h-4 w-4" />
                    Add Lesson
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href={`/dashboard/courses/${courseId}/quizzes/new`}>
                    <FileQuestion className="mr-2 h-4 w-4" />
                    Add Quiz
                  </Link>
                </Button>
              </div>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={items.map((item) => item.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {items.map((item) => (
                    <SortableItem
                      key={item.id}
                      item={item}
                      onEdit={handleEdit}
                      onDelete={(item) => {
                        setItemToDelete(item);
                        setDeleteDialogOpen(true);
                      }}
                      onTogglePublish={handleTogglePublish}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the {itemToDelete?.type} "{itemToDelete?.title}".
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

