"use client";

import { useEffect, useState } from "react";
import { LessonWithAccess, Quiz } from "@repo/shared";

// Local enum for curriculum item types
enum CurriculumItemType {
  LESSON = 'lesson',
  QUIZ = 'quiz',
}
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Lock,
  Clock,
  X,
  BookOpen,
  FileQuestion,
} from "lucide-react";
import { LessonContentViewer } from "./lesson-content-viewer";
import { lessonsApi } from "@/lib/api/lessons";
import { coursesApi } from "@/lib/api/courses";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Unified curriculum item type for the sidebar
interface CurriculumItem {
  id: string;
  type: CurriculumItemType;
  title: string;
  orderIndex: number;
  durationMinutes?: number;
  questionsCount?: number;
  isCompleted: boolean;
  isLocked: boolean;
}

interface LessonViewerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
  initialLessonId?: string;
  enrollmentId?: string;
  onProgressUpdate?: (lessonId: string, completed: boolean) => void;
  onOpenQuiz?: (quizId: string) => void;
  onNavigateNext?: (lessonId: string) => void;
  onCourseComplete?: () => void;
}

export function LessonViewerModal({
  open,
  onOpenChange,
  courseId,
  initialLessonId,
  enrollmentId,
  onProgressUpdate,
  onOpenQuiz,
  onNavigateNext,
  onCourseComplete,
}: LessonViewerModalProps) {
  const [lessons, setLessons] = useState<LessonWithAccess[]>([]);
  const [curriculumItems, setCurriculumItems] = useState<CurriculumItem[]>([]);
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isMarkingComplete, setIsMarkingComplete] = useState(false);

  const currentLesson = lessons[currentLessonIndex];
  const isFirstLesson = currentLessonIndex === 0;
  const isLastLesson = currentLessonIndex === lessons.length - 1;
  const nextLesson = !isLastLesson ? lessons[currentLessonIndex + 1] : null;

  // Fetch lessons and curriculum when modal opens
  useEffect(() => {
    if (open && courseId) {
      fetchLessonsAndCurriculum();
    }
  }, [open, courseId]);

  // Set initial lesson when lessons are loaded
  useEffect(() => {
    if (lessons.length > 0 && initialLessonId) {
      const index = lessons.findIndex((l) => l.id === initialLessonId);
      if (index !== -1) {
        setCurrentLessonIndex(index);
      }
    }
  }, [lessons, initialLessonId]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return;

      if (e.key === "ArrowLeft" && !isFirstLesson) {
        goToPreviousLesson();
      } else if (e.key === "ArrowRight" && !isLastLesson && !nextLesson?.isLocked) {
        goToNextLesson();
      } else if (e.key === "Escape") {
        onOpenChange(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, currentLessonIndex, lessons, isFirstLesson, isLastLesson, nextLesson, onOpenChange]);

  const fetchLessonsAndCurriculum = async () => {
    try {
      setIsLoading(true);
      
      // Fetch both lessons with access info and curriculum
      const [lessonsData, curriculumData] = await Promise.all([
        lessonsApi.getLessonsByCourse(courseId),
        coursesApi.getCurriculum(courseId),
      ]);
      
      setLessons(lessonsData);
      
      // Build unified curriculum items from lessons and quizzes
      const lessonItems: CurriculumItem[] = lessonsData.map((lesson: LessonWithAccess) => ({
        id: lesson.id,
        type: CurriculumItemType.LESSON,
        title: lesson.title,
        orderIndex: lesson.orderIndex,
        durationMinutes: lesson.durationMinutes,
        isCompleted: lesson.progress?.completed ?? false,
        isLocked: lesson.isLocked,
      }));
      
      const quizItems: CurriculumItem[] = curriculumData.quizzes.map((quiz: Quiz) => ({
        id: quiz.id,
        type: CurriculumItemType.QUIZ,
        title: quiz.title,
        orderIndex: quiz.orderIndex,
        questionsCount: quiz.questions?.length || 0,
        isCompleted: false, // TODO: Get quiz completion status from enrollment
        isLocked: false, // TODO: Check quiz prerequisites
      }));
      
      // Combine and sort by orderIndex
      const combined = [...lessonItems, ...quizItems].sort(
        (a, b) => a.orderIndex - b.orderIndex
      );
      
      setCurriculumItems(combined);
    } catch (error: any) {
      toast.error(error.message || "Failed to load lessons");
    } finally {
      setIsLoading(false);
    }
  };

  const goToPreviousLesson = () => {
    if (!isFirstLesson) {
      setCurrentLessonIndex((prev) => prev - 1);
    }
  };

  const goToNextLesson = () => {
    if (!isLastLesson && !nextLesson?.isLocked) {
      setCurrentLessonIndex((prev) => prev + 1);
    }
  };

  const selectLesson = (lessonId: string) => {
    const index = lessons.findIndex((l) => l.id === lessonId);
    if (index !== -1) {
      const lesson = lessons[index];
      if (!lesson.isLocked) {
        setCurrentLessonIndex(index);
      }
    }
  };

  const handleItemClick = (item: CurriculumItem) => {
    if (item.isLocked) return;
    
    if (item.type === CurriculumItemType.LESSON) {
      selectLesson(item.id);
    } else if (item.type === CurriculumItemType.QUIZ) {
      // Close the lesson modal and open the quiz
      onOpenChange(false);
      if (onOpenQuiz) {
        onOpenQuiz(item.id);
      }
    }
  };

  const markAsComplete = async () => {
    if (!currentLesson || !enrollmentId) return;

    try {
      setIsMarkingComplete(true);

      // Call the progress update API
      await coursesApi.updateLessonProgress(
        enrollmentId,
        currentLesson.id,
        true
      );

      // Update local lessons state
      setLessons((prev) =>
        prev.map((lesson) =>
          lesson.id === currentLesson.id
            ? {
                ...lesson,
                progress: {
                  lessonId: lesson.id,
                  completed: true,
                  completedAt: new Date(),
                  timeSpentMinutes: 0,
                },
              }
            : lesson
        )
      );
      
      // Update curriculum items state
      setCurriculumItems((prev) =>
        prev.map((item) =>
          item.id === currentLesson.id && item.type === CurriculumItemType.LESSON
            ? { ...item, isCompleted: true }
            : item
        )
      );

      // Unlock next lesson if it exists
      if (nextLesson && nextLesson.isLocked) {
        setLessons((prev) =>
          prev.map((lesson, index) =>
            index === currentLessonIndex + 1
              ? { ...lesson, isLocked: false }
              : lesson
          )
        );
        setCurriculumItems((prev) =>
          prev.map((item) =>
            item.id === nextLesson.id && item.type === CurriculumItemType.LESSON
              ? { ...item, isLocked: false }
              : item
          )
        );
      }

      // Notify parent component
      if (onProgressUpdate) {
        onProgressUpdate(currentLesson.id, true);
      }

      toast.success("Lesson marked as complete!");

      // Find current lesson position in curriculum items
      const currentCurriculumIndex = curriculumItems.findIndex(
        (item) => item.id === currentLesson.id && item.type === CurriculumItemType.LESSON
      );

      // Check if there's a next curriculum item (lesson or quiz)
      const nextCurriculumItem = currentCurriculumIndex >= 0 && currentCurriculumIndex < curriculumItems.length - 1
        ? curriculumItems[currentCurriculumIndex + 1]
        : null;

      if (nextCurriculumItem && !nextCurriculumItem.isLocked) {
        // Navigate to next item
        setTimeout(() => {
          if (nextCurriculumItem.type === CurriculumItemType.LESSON) {
            // Navigate to next lesson
            const nextLessonIndex = lessons.findIndex((l) => l.id === nextCurriculumItem.id);
            if (nextLessonIndex !== -1) {
              setCurrentLessonIndex(nextLessonIndex);
            }
          } else if (nextCurriculumItem.type === CurriculumItemType.QUIZ) {
            // Close lesson modal and open quiz
            onOpenChange(false);
            if (onOpenQuiz) {
              onOpenQuiz(nextCurriculumItem.id);
            }
          }
        }, 500);
      } else {
        // This is the last item - course is complete
        setTimeout(() => {
          onOpenChange(false);
          // Trigger course completion callback if provided
          if (onNavigateNext) {
            onNavigateNext(currentLesson.id);
          } else if (onCourseComplete) {
            onCourseComplete();
          } else if (onProgressUpdate) {
            onProgressUpdate(currentLesson.id, true);
          }
        }, 500);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to mark lesson as complete");
    } finally {
      setIsMarkingComplete(false);
    }
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent 
          showCloseButton={false}
          className="!max-w-none !w-screen !h-screen !m-0 !p-0 !rounded-none !fixed !top-0 !left-0 !right-0 !bottom-0 !translate-x-0 !translate-y-0 !grid-cols-1"
        >
          <DialogTitle className="sr-only">Loading lessons</DialogTitle>
          <div className="flex items-center justify-center h-full">
            <div className="text-muted-foreground">Loading lessons...</div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!currentLesson) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent 
          showCloseButton={false}
          className="!max-w-none !w-screen !h-screen !m-0 !p-0 !rounded-none !fixed !top-0 !left-0 !right-0 !bottom-0 !translate-x-0 !translate-y-0 !grid-cols-1"
        >
          <DialogTitle className="sr-only">No lessons available</DialogTitle>
          <div className="flex items-center justify-center h-full">
            <div className="text-muted-foreground">No lessons available</div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const isCompleted = currentLesson.progress?.completed ?? false;
  
  // Find the current item's position in the curriculum
  const currentCurriculumIndex = curriculumItems.findIndex(
    (item) => item.id === currentLesson.id && item.type === CurriculumItemType.LESSON
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        showCloseButton={false}
        className="!max-w-none sm:!max-w-none !w-screen !h-screen !m-0 !p-0 !rounded-none !fixed !top-0 !left-0 !right-0 !bottom-0 !translate-x-0 !translate-y-0 !grid-cols-1 flex flex-col"
      >
        <DialogTitle className="sr-only">{currentLesson.title}</DialogTitle>
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center gap-4">
            <BookOpen className="h-5 w-5 text-muted-foreground" />
            <div>
              <h2 className="text-lg font-semibold">{currentLesson.title}</h2>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span>Lesson {currentLessonIndex + 1} of {lessons.length}</span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {currentLesson.durationMinutes} min
                </span>
                {isCompleted && (
                  <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20">
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    Completed
                  </Badge>
                )}
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

        <div className="flex flex-1 overflow-hidden">
          {/* Left Sidebar - Course Content (Lessons + Quizzes) */}
          <div className="w-80 border-r bg-muted/30 overflow-y-auto">
            <div className="p-4">
              <h3 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-wide">
                Course Content
              </h3>
              <div className="space-y-1">
                {curriculumItems.map((item, index) => {
                  const isActive = item.id === currentLesson.id && item.type === CurriculumItemType.LESSON;
                  const isQuiz = item.type === CurriculumItemType.QUIZ;

                  return (
                    <button
                      key={`${item.type}-${item.id}`}
                      onClick={() => handleItemClick(item)}
                      disabled={item.isLocked}
                      className={cn(
                        "w-full text-left p-3 rounded-lg transition-all border",
                        "hover:bg-muted/50",
                        isActive 
                          ? "bg-primary/5 border-primary/30 shadow-md shadow-primary/10" 
                          : "border-transparent",
                        item.isLocked && "opacity-50 cursor-not-allowed",
                        !item.isLocked && !isActive && "hover:bg-muted"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {item.isCompleted ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                          ) : item.isLocked ? (
                            <Lock className="h-5 w-5 text-muted-foreground" />
                          ) : isQuiz ? (
                            <FileQuestion className={cn(
                              "h-5 w-5",
                              isActive ? "text-primary" : "text-purple-600"
                            )} />
                          ) : (
                            <div className={cn(
                              "h-5 w-5 rounded-full border-2 flex items-center justify-center text-xs font-medium",
                              isActive ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/30"
                            )}>
                              {index + 1}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={cn(
                              "text-sm font-medium line-clamp-2",
                              isActive && "text-primary",
                              !isActive && "text-foreground"
                            )}>
                              {item.title}
                            </p>
                            {isQuiz && (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                                Quiz
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            {isQuiz ? (
                              <span className="text-xs text-muted-foreground">
                                {item.questionsCount} questions
                              </span>
                            ) : (
                              <>
                                <Clock className="h-3 w-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">
                                  {item.durationMinutes} min
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Lesson Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <LessonContentViewer lesson={currentLesson} />
            </div>

            {/* Footer Navigation */}
            <div className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={goToPreviousLesson}
                    disabled={isFirstLesson}
                    size="lg"
                  >
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Previous
                  </Button>

                  <Button
                    variant="outline"
                    onClick={goToNextLesson}
                    disabled={isLastLesson || nextLesson?.isLocked}
                    size="lg"
                  >
                    {nextLesson?.isLocked ? (
                      <>
                        <Lock className="mr-2 h-4 w-4" />
                        Locked
                      </>
                    ) : (
                      <>
                        Next
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>

                {!isCompleted && (
                  <Button
                    onClick={markAsComplete}
                    disabled={isMarkingComplete}
                    className="bg-green-600 hover:bg-green-700"
                    size="lg"
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    {isMarkingComplete ? "Marking..." : "Mark as Complete"}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
