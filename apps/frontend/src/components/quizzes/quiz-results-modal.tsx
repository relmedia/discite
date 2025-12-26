"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Award, RotateCcw } from "lucide-react";
import { QuizResult } from "@repo/shared";

interface QuizResultsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quizTitle: string;
  result: QuizResult;
  passingScore: number;
  onRetake?: () => void;
  canRetake: boolean;
  onNavigateNext?: () => void;
}

export function QuizResultsModal({
  open,
  onOpenChange,
  quizTitle,
  result,
  passingScore,
  onRetake,
  canRetake,
  onNavigateNext,
}: QuizResultsModalProps) {
  const percentage = Math.round(result.score);
  const passed = result.passed;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">{quizTitle}</DialogTitle>
          <DialogDescription>Quiz Results</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Score Display */}
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-primary/10 mb-4">
              {passed ? (
                <CheckCircle2 className="h-12 w-12 text-green-600" />
              ) : (
                <XCircle className="h-12 w-12 text-red-600" />
              )}
            </div>
            <h3 className="text-3xl font-bold mb-2">
              {percentage}%
            </h3>
            <Badge
              variant={passed ? "default" : "destructive"}
              className="text-lg px-4 py-1"
            >
              {passed ? "Passed" : "Failed"}
            </Badge>
            <p className="text-muted-foreground mt-2">
              Passing score: {passingScore}%
            </p>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">
                Correct Answers
              </div>
              <div className="text-2xl font-bold">
                {result.correctAnswers} / {result.totalQuestions}
              </div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">
                Points Earned
              </div>
              <div className="text-2xl font-bold">
                {Math.round((result.score / 100) * result.totalPoints)} / {result.totalPoints}
              </div>
            </div>
          </div>

          {/* Message */}
          <div className={`p-4 rounded-lg ${
            passed
              ? "bg-green-500/10 border border-green-500/20"
              : "bg-red-500/10 border border-red-500/20"
          }`}>
            <p className="text-center">
              {passed ? (
                <>
                  <Award className="inline h-5 w-5 mr-2 text-green-600" />
                  Congratulations! You passed the quiz.
                </>
              ) : (
                <>
                  Don't worry! You can retake this quiz to improve your score.
                </>
              )}
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end">
            {passed && onNavigateNext ? (
              <Button onClick={onNavigateNext} className="bg-green-600 hover:bg-green-700">
                Continue to Next
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Close
                </Button>
                {!passed && canRetake && onRetake && (
                  <Button onClick={onRetake} className="bg-green-600 hover:bg-green-700">
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Retake Quiz
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

