'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Quiz } from '@repo/shared';
import { quizzesApi } from '@/lib/api/quizzes';
import { QuizForm, QuizFormData, QuizQuestion } from '@/components/quizzes/quiz-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

export default function EditQuizPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.courseId as string;
  const quizId = params.quizId as string;
  const { user, isLoading: isAuthLoading } = useAuth();
  
  // Check if current user is a superadmin
  const isSuperAdmin = user?.role === 'SUPERADMIN';

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [isLoading, setIsLoading] = useState(true);
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

  useEffect(() => {
    if (isSuperAdmin) {
      fetchQuiz();
    }
  }, [quizId, isSuperAdmin]);

  const fetchQuiz = async () => {
    try {
      setIsLoading(true);
      const data = await quizzesApi.getQuizById(quizId);
      setQuiz(data);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load quiz');
      router.push(`/dashboard/courses/${courseId}/quizzes`);
    } finally {
      setIsLoading(false);
    }
  };

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

      await quizzesApi.updateQuiz(quizId, {
        title: data.title,
        description: data.description,
        questions: data.questions,
        passingScore: data.passingScore,
        durationMinutes: data.durationMinutes,
        maxAttempts: data.maxAttempts,
      });

      toast.success('Quiz updated successfully');
      router.push(`/dashboard/courses/${courseId}/quizzes`);
    } catch (error: any) {
      console.error('Failed to update quiz:', error);
      toast.error(error.message || 'Failed to update quiz');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push(`/dashboard/courses/${courseId}/quizzes`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Loading quiz...</div>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Quiz not found</div>
      </div>
    );
  }

  // Convert quiz data to form format
  const initialData: QuizFormData = {
    title: quiz.title,
    description: quiz.description || '',
    questions: quiz.questions.map((q) => ({
      id: q.id,
      question: q.question,
      type: q.type as QuizQuestion['type'],
      options: q.options,
      correctAnswer: q.correctAnswer,
      points: q.points,
    })),
    passingScore: quiz.passingScore,
    durationMinutes: quiz.durationMinutes,
    maxAttempts: quiz.maxAttempts || undefined,
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
        <h1 className="text-2xl font-bold">Edit Quiz</h1>
        <p className="text-muted-foreground mt-2">
          Update quiz details and questions
        </p>
      </div>

      <QuizForm
        initialData={initialData}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}

