"use client";

import { useEffect, useState } from "react";
import { Quiz, QuizWithAccess, QuizQuestion } from "@repo/shared";

// Local enum to avoid runtime issues with shared package exports
enum QuizQuestionType {
  MULTIPLE_CHOICE = 'multiple_choice',
  TRUE_FALSE = 'true_false',
  SHORT_ANSWER = 'short_answer',
}
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  X,
  BookOpen,
  CheckCircle2,
  Lock,
  AlertCircle,
} from "lucide-react";
import { quizzesApi } from "@/lib/api/quizzes";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { QuizQuestionRenderer } from "./quiz-question-renderer";
import { QuizResultsModal } from "./quiz-results-modal";

interface QuizViewerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quizId: string;
  courseId: string;
  enrollmentId?: string;
  onQuizComplete?: (quizId: string, passed: boolean) => void;
  onNavigateNext?: (quizId: string) => void;
  onCourseComplete?: () => void;
}

export function QuizViewerModal({
  open,
  onOpenChange,
  quizId,
  courseId,
  enrollmentId,
  onQuizComplete,
  onNavigateNext,
  onCourseComplete,
}: QuizViewerModalProps) {
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [quizResult, setQuizResult] = useState<any>(null);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    if (open && quizId) {
      fetchQuiz();
    }
  }, [open, quizId]);

  useEffect(() => {
    if (quiz && quiz.durationMinutes > 0 && startTime) {
      const timer = setInterval(() => {
        const elapsed = Math.floor((new Date().getTime() - startTime.getTime()) / 1000 / 60);
        const remaining = quiz.durationMinutes - elapsed;
        setTimeRemaining(Math.max(0, remaining));

        if (remaining <= 0) {
          clearInterval(timer);
          handleSubmit(true); // Auto-submit when time runs out
        }
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [quiz, startTime]);

  const fetchQuiz = async () => {
    try {
      setIsLoading(true);
      const data = await quizzesApi.getQuizById(quizId);
      setQuiz(data);
      setStartTime(new Date());
      setTimeRemaining(data.durationMinutes);
      setAnswers({});
    } catch (error: any) {
      toast.error(error.message || "Failed to load quiz");
      onOpenChange(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerChange = (questionId: string, answer: string | string[]) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: answer,
    }));
  };

  const handleSubmit = async (autoSubmit = false) => {
    if (!quiz || !enrollmentId) return;

    // Validate all questions are answered
    const unansweredQuestions = quiz.questions.filter(
      (q) => !answers[q.id] || (Array.isArray(answers[q.id]) && answers[q.id].length === 0)
    );

    if (unansweredQuestions.length > 0 && !autoSubmit) {
      toast.error(`Please answer all questions. ${unansweredQuestions.length} question(s) remaining.`);
      return;
    }

    try {
      setIsSubmitting(true);

      const submissionAnswers = quiz.questions.map((q) => ({
        questionId: q.id,
        answer: answers[q.id] || (q.type === QuizQuestionType.MULTIPLE_CHOICE ? [] : ""),
      }));

      const result = await quizzesApi.submitQuiz(quizId, submissionAnswers);

      setQuizResult(result);
      setShowResults(true);

      if (onQuizComplete) {
        onQuizComplete(quizId, result.passed);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to submit quiz");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          showCloseButton={false}
          className="!max-w-none !w-screen !h-screen !m-0 !p-0 !rounded-none !fixed !top-0 !left-0 !right-0 !bottom-0 !translate-x-0 !translate-y-0 !grid-cols-1"
        >
          <DialogTitle className="sr-only">Loading quiz</DialogTitle>
          <div className="flex items-center justify-center h-full">
            <div className="text-muted-foreground">Loading quiz...</div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!quiz) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          showCloseButton={false}
          className="!max-w-none !w-screen !h-screen !m-0 !p-0 !rounded-none !fixed !top-0 !left-0 !right-0 !bottom-0 !translate-x-0 !translate-y-0 !grid-cols-1"
        >
          <DialogTitle className="sr-only">Quiz not found</DialogTitle>
          <div className="flex items-center justify-center h-full">
            <div className="text-muted-foreground">Quiz not found</div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const allAnswered = quiz.questions.every(
    (q) => answers[q.id] && (Array.isArray(answers[q.id]) ? answers[q.id].length > 0 : true)
  );

  return (
    <>
      <Dialog open={open && !showResults} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="!max-w-none !w-screen !h-screen !m-0 !p-0 !rounded-none !fixed !top-0 !left-0 !right-0 !bottom-0 !translate-x-0 !translate-y-0 !grid-cols-1 flex flex-col"
      >
        <DialogTitle className="sr-only">{quiz.title}</DialogTitle>
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center gap-4">
            <BookOpen className="h-5 w-5 text-muted-foreground" />
            <div>
              <h2 className="text-lg font-semibold">{quiz.title}</h2>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span>{quiz.questions.length} questions</span>
                {quiz.durationMinutes > 0 && timeRemaining !== null && (
                  <span className={cn(
                    "flex items-center gap-1",
                    timeRemaining <= 5 && "text-red-600 font-semibold"
                  )}>
                    <Clock className="h-3 w-3" />
                    {Math.floor(timeRemaining)} min remaining
                  </span>
                )}
                <span className="flex items-center gap-1">
                  Passing score: {quiz.passingScore}%
                </span>
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Quiz Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {quiz.description && (
            <div className="mb-6 p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">{quiz.description}</p>
            </div>
          )}

          <div className="space-y-8 max-w-3xl mx-auto">
            {quiz.questions.map((question, index) => (
              <div key={question.id} className="border rounded-lg p-6">
                <div className="mb-4">
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold flex items-center justify-center">
                      {index + 1}
                    </span>
                    <div className="flex-1">
                      <h3 className="text-lg font-medium mb-2">{question.question}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Badge variant="outline">{question.type.replace('_', ' ')}</Badge>
                        <span>{question.points} point{question.points !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <QuizQuestionRenderer
                  question={question}
                  value={answers[question.id]}
                  onChange={(answer) => handleAnswerChange(question.id, answer)}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6 py-4">
          <div className="flex items-center justify-between max-w-3xl mx-auto">
            <div className="text-sm text-muted-foreground">
              {quiz.questions.length - Object.keys(answers).filter(k => answers[k] && (Array.isArray(answers[k]) ? answers[k].length > 0 : true)).length} question(s) remaining
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleSubmit(false)}
                disabled={!allAnswered || isSubmitting || (timeRemaining !== null && timeRemaining <= 0)}
                className="bg-green-600 hover:bg-green-700"
              >
                {isSubmitting ? "Submitting..." : "Submit Quiz"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {quiz && quizResult && (
      <QuizResultsModal
        open={showResults}
        onOpenChange={(open) => {
          setShowResults(open);
          if (!open && !quizResult.passed) {
            // Only close if quiz was not passed
            onOpenChange(false);
          }
        }}
        quizTitle={quiz.title}
        result={quizResult}
        passingScore={quiz.passingScore}
        canRetake={true}
        onRetake={() => {
          setShowResults(false);
          setAnswers({});
          setStartTime(new Date());
          setTimeRemaining(quiz.durationMinutes);
          setQuizResult(null);
        }}
        onNavigateNext={quizResult.passed ? () => {
          // Close results modal
          setShowResults(false);
          
          // Let parent component handle navigation
          if (onNavigateNext) {
            setTimeout(() => {
              onNavigateNext(quizId);
            }, 300);
          } else {
            // Fallback: just close if no navigation handler
            onOpenChange(false);
          }
        } : undefined}
      />
    )}
    </>
  );
}

