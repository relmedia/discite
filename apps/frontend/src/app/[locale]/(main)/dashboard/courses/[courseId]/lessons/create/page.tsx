'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { lessonsApi } from '@/lib/api/lessons';
import { LessonForm, LessonFormData } from '@/components/lessons/lesson-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

export default function CreateLessonPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.courseId as string;
  const { user, isLoading: isAuthLoading } = useAuth();
  
  // Check if current user is a superadmin
  const isSuperAdmin = user?.role === 'SUPERADMIN';

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

  // Don't render for non-superadmins
  if (isAuthLoading || !isSuperAdmin) {
    return null;
  }

  const handleSubmit = async (data: LessonFormData) => {
    try {
      // Clean up the data - remove empty strings and undefined values
      const cleanedData: any = {
        title: data.title,
        type: data.type,
        courseId,
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

      await lessonsApi.createLesson(cleanedData);

      toast.success('Lesson created successfully');
      router.push(`/dashboard/courses/${courseId}/lessons`);
    } catch (error: any) {
      console.error('Failed to create lesson:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to create lesson';
      toast.error(errorMessage);
    }
  };

  const handleCancel = () => {
    router.push(`/dashboard/courses/${courseId}/lessons`);
  };

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
        <h1 className="text-2xl font-bold">Create New Lesson</h1>
        <p className="text-muted-foreground mt-2">
          Add a new lesson to the course
        </p>
      </div>

      <LessonForm onSubmit={handleSubmit} onCancel={handleCancel} />
    </div>
  );
}
