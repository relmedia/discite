'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { quizzesApi } from '@/lib/api/quizzes';
import { QuizForm, QuizFormData } from '@/components/quizzes/quiz-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

export default function CreateQuizPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.courseId as string;
  const { user, isLoading: isAuthLoading } = useAuth();
  
  // Check if current user is a superadmin
  const isSuperAdmin = user?.role === 'SUPERADMIN';

  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleSubmit = async (data: QuizFormData) => {
    try {
      setIsSubmitting(true);

      // Validate questions have correct answers
      const invalidQuestions = data.questions.filter(
        (q) => !q.correctAnswer || (Array.isArray(q.correctAnswer) && q.correctAnswer.length === 0)
      );

      if (invalidQuestions.length > 0) {
        toast.error('Please set a correct answer for all questions');
        return;
      }

      await quizzesApi.createQuiz({
        title: data.title,
        description: data.description,
        courseId,
        questions: data.questions,
        passingScore: data.passingScore,
        durationMinutes: data.durationMinutes,
        maxAttempts: data.maxAttempts,
      });

      toast.success('Quiz created successfully');
      router.push(`/dashboard/courses/${courseId}/quizzes`);
    } catch (error: any) {
      console.error('Failed to create quiz:', error);
      toast.error(error.message || 'Failed to create quiz');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push(`/dashboard/courses/${courseId}/quizzes`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/dashboard/courses/${courseId}/quizzes`)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Quizzes
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold">Create New Quiz</h1>
        <p className="text-muted-foreground mt-2">
          Add a new quiz to test student knowledge
        </p>
      </div>

      <QuizForm onSubmit={handleSubmit} onCancel={handleCancel} isSubmitting={isSubmitting} />
    </div>
  );
}

