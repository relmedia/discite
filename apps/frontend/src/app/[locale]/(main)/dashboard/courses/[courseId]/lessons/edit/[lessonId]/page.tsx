'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { lessonsApi } from '@/lib/api/lessons';
import { LessonForm, LessonFormData } from '@/components/lessons/lesson-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Lesson } from '@repo/shared';
import { useAuth } from '@/hooks/use-auth';

export default function EditLessonPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.courseId as string;
  const lessonId = params.lessonId as string;
  const { user, isLoading: isAuthLoading } = useAuth();
  
  // Check if current user is a superadmin
  const isSuperAdmin = user?.role === 'SUPERADMIN';

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);

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
      loadLesson();
    }
  }, [lessonId, isSuperAdmin]);

  const loadLesson = async () => {
    try {
      setLoading(true);
      const data = await lessonsApi.getLessonById(lessonId);
      setLesson(data);
    } catch (error) {
      toast.error('Failed to load lesson');
      router.push(`/dashboard/courses/${courseId}/lessons`);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (data: LessonFormData) => {
    try {
      // Clean up the data - remove empty strings
      const cleanedData: any = {
        title: data.title,
        type: data.type,
      };

      // Only add optional fields if they have values
      if (data.content && data.content.trim()) {
        cleanedData.content = data.content;
      }
      if (data.videoUrl && data.videoUrl.trim()) {
        cleanedData.videoUrl = data.videoUrl;
      }
      if (data.documentUrl && data.documentUrl.trim()) {
        cleanedData.documentUrl = data.documentUrl;
      }
      if (data.durationMinutes && data.durationMinutes > 0) {
        cleanedData.durationMinutes = data.durationMinutes;
      }

      await lessonsApi.updateLesson(lessonId, cleanedData);

      toast.success('Lesson updated successfully');
      router.push(`/dashboard/courses/${courseId}/lessons`);
    } catch (error: any) {
      console.error('Failed to update lesson:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to update lesson';
      toast.error(errorMessage);
    }
  };

  const handleCancel = () => {
    router.push(`/dashboard/courses/${courseId}/lessons`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Lesson not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/dashboard/courses/${courseId}/lessons`)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Lessons
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold">Edit Lesson</h1>
        <p className="text-muted-foreground mt-2">
          Update the lesson details
        </p>
      </div>

      <LessonForm
        initialData={lesson}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isEditing
      />
    </div>
  );
}
