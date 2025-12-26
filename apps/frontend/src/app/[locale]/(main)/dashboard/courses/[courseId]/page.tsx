"use client";

import { useEffect, useState, useRef } from "react";
import { notFound, useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { triggerConfetti as triggerConfettiUtil } from "@/lib/confetti";
import {
  BookOpen,
  Clock,
  Users,
  BarChart3,
  Award,
  PlayCircle,
  CheckCircle2,
  ArrowLeft,
  Star,
  FileQuestion,
  Lock,
  Settings,
  ShoppingCart,
  Check,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { coursesApi } from "@/lib/api/courses";
import { lessonsApi } from "@/lib/api/lessons";
import { quizzesApi } from "@/lib/api/quizzes";
import { marketplaceApi, paymentApi } from "@/lib/api/marketplace";
import { Course, CourseLevel, LessonWithAccess, Enrollment, QuizWithAccess, MarketplaceCourse, LicenseType } from "@repo/shared";
import { toast } from "sonner";
import { LessonViewerModal } from "@/components/lessons/lesson-viewer-modal";
import { QuizViewerModal } from "@/components/quizzes/quiz-viewer-modal";
import { useAuth } from "@/hooks/use-auth";
import { useTranslations } from "@/components/intl-provider";

// Format duration with translation
const formatDuration = (hours: number, t: (key: string) => string) => {
  if (!hours || hours === 0) return "-";
  const rounded = Math.round(hours);
  if (rounded === 1) return `1 ${t("common.hour")}`;
  return `${rounded} ${t("common.hours")}`;
};

export default function CoursePage() {
  const params = useParams();
  const courseSlug = params.courseId as string;
  const { user } = useAuth();
  const t = useTranslations();
  
  // Check if current user is a superadmin
  const isSuperAdmin = user?.role === 'SUPERADMIN';

  const [course, setCourse] = useState<Course | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [courseLessons, setCourseLessons] = useState<LessonWithAccess[]>([]);
  const [courseQuizzes, setCourseQuizzes] = useState<QuizWithAccess[]>([]);
  const [lessonModalOpen, setLessonModalOpen] = useState(false);
  const [quizModalOpen, setQuizModalOpen] = useState(false);
  const [currentLessonId, setCurrentLessonId] = useState<string | undefined>();
  const [currentQuizId, setCurrentQuizId] = useState<string | undefined>();
  const [showConfetti, setShowConfetti] = useState(false);
  const confettiTriggered = useRef(false);
  
  // Purchase dialog state
  const [showPurchaseDialog, setShowPurchaseDialog] = useState(false);
  const [marketplaceCourse, setMarketplaceCourse] = useState<MarketplaceCourse | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);

  useEffect(() => {
    fetchCourse();
  }, [courseSlug]);

  // Check if course is completed when enrollment is loaded
  useEffect(() => {
    if (enrollment && enrollment.progressPercentage === 100 && !confettiTriggered.current) {
      // Small delay to ensure page is rendered
      setTimeout(() => {
        triggerConfetti();
      }, 500);
    }
  }, [enrollment]);

  const fetchCourse = async () => {
    try {
      setIsLoading(true);
      
      // Try to fetch course directly by ID first
      let foundCourse: Course | null = null;
      try {
        foundCourse = await coursesApi.getCourseById(courseSlug);
      } catch (error) {
        // If direct fetch fails, try to find in all courses (for slug support)
        const courses = await coursesApi.getCourses();
        foundCourse = courses.find(c => c.slug === courseSlug || c.id === courseSlug) || null;
      }

      if (!foundCourse) {
        notFound();
      }

      setCourse(foundCourse);

      // Check if user is already enrolled
      try {
        const enrollments = await coursesApi.getMyEnrollments();
        const existingEnrollment = enrollments.find((e: any) => e.courseId === foundCourse.id);

        if (existingEnrollment) {
          setEnrollment(existingEnrollment);
          setIsEnrolled(true);

          // Fetch lessons and quizzes for enrolled users
          const [lessonsData, quizzesData] = await Promise.all([
            lessonsApi.getLessonsByCourse(foundCourse.id),
            quizzesApi.getQuizzesByCourse(foundCourse.id),
          ]);
          setCourseLessons(lessonsData);
          setCourseQuizzes(quizzesData);
        } else {
          setIsEnrolled(false);
          
          // Check if this is a paid course in the marketplace
          try {
            const catalogResponse = await marketplaceApi.getPublishedCourses({ search: foundCourse.title });
            const matchingCourse = catalogResponse.courses.find(
              c => c.sourceCourseId === foundCourse.id
            );
            if (matchingCourse) {
              setMarketplaceCourse(matchingCourse);
            }
          } catch (marketplaceError) {
            // Course not in marketplace, that's fine - it may be free
            console.log("Course not found in marketplace (may be free):", marketplaceError);
          }
        }
      } catch (error) {
        console.error("Failed to check enrollment:", error);
        setIsEnrolled(false);
      }
    } catch (error) {
      console.error("Failed to fetch course:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnroll = async () => {
    if (!course) return;

    try {
      setIsEnrolling(true);
      const enrollmentData = await coursesApi.enrollInCourse(course.id);
      setEnrollment(enrollmentData);
      setIsEnrolled(true);

      // Fetch lessons after enrollment
      await fetchLessons();

      toast.success(t("courses.successfullyEnrolled"));
    } catch (error: any) {
      // If already enrolled, fetch the existing enrollment instead of showing an error
      if (error.message?.toLowerCase().includes("already enrolled")) {
        try {
          // Fetch existing enrollments to get the enrollment data
          const enrollments = await coursesApi.getMyEnrollments();
          const existingEnrollment = enrollments.find((e: any) => e.courseId === course.id);

          if (existingEnrollment) {
            setEnrollment(existingEnrollment);
            setIsEnrolled(true);
            await fetchLessons();
            toast.success(t("courses.welcomeBack"));
          } else {
            toast.error(t("courses.failedToEnroll"));
          }
        } catch (fetchError) {
          toast.error(t("courses.failedToEnroll"));
          console.error("Fetch enrollment error:", fetchError);
        }
      } else if (error.message?.toLowerCase().includes("paid course") || 
                 error.message?.toLowerCase().includes("contact your administrator")) {
        // This is a paid course - fetch marketplace info and show purchase dialog
        try {
          const catalogResponse = await marketplaceApi.getPublishedCourses({ search: course.title });
          const matchingCourse = catalogResponse.courses.find(
            c => c.sourceCourseId === course.id
          );
          if (matchingCourse) {
            setMarketplaceCourse(matchingCourse);
            setShowPurchaseDialog(true);
          } else {
            toast.error(t("marketplace.paidCourseAccessDenied"));
          }
        } catch (marketplaceError) {
          toast.error(t("marketplace.paidCourseAccessDenied"));
          console.error("Failed to fetch marketplace course:", marketplaceError);
        }
      } else {
        toast.error(error.message || t("courses.failedToEnroll"));
        console.error("Enrollment error:", error);
      }
    } finally {
      setIsEnrolling(false);
    }
  };

  const handlePurchase = async () => {
    if (!marketplaceCourse) return;

    setIsPurchasing(true);
    try {
      const response = await paymentApi.createCheckoutSession({
        marketplaceCourseId: marketplaceCourse.id,
        licenseType: LicenseType.SEAT,
        seatCount: 1,
      });

      if (response.isFree) {
        toast.success(t("marketplace.freeCourseAdded"));
        setShowPurchaseDialog(false);
        // Try enrolling again
        await handleEnroll();
        return;
      }

      // Redirect to Stripe Checkout
      if (response.url) {
        window.location.href = response.url;
      }
    } catch (error: any) {
      console.error("Failed to create checkout:", error);
      toast.error(error.message || t("marketplace.purchaseFailed"));
    } finally {
      setIsPurchasing(false);
    }
  };

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat("sv-SE", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const fetchLessons = async () => {
    if (!course) return;

    try {
      const [lessonsData, quizzesData] = await Promise.all([
        lessonsApi.getLessonsByCourse(course.id),
        quizzesApi.getQuizzesByCourse(course.id),
      ]);
      console.log('Fetched lessons from API:', lessonsData);
      console.log('Fetched quizzes from API:', quizzesData);
      setCourseLessons(lessonsData);
      setCourseQuizzes(quizzesData);
    } catch (error: any) {
      console.error("Failed to fetch content:", error);
    }
  };

  const calculateProgress = () => {
    // Use enrollment progressPercentage if available (more reliable)
    if (enrollment?.progressPercentage !== undefined) {
      return enrollment.progressPercentage;
    }
    
    // Fallback to calculating from lessons if enrollment data not available
    if (courseLessons.length === 0) return 0;
    const completedCount = courseLessons.filter(
      (lesson) => lesson.progress?.completed
    ).length;
    const progress = Math.round((completedCount / courseLessons.length) * 100);

    console.log('Progress Calculation:', {
      enrollmentProgress: enrollment?.progressPercentage,
      totalLessons: courseLessons.length,
      completedLessons: completedCount,
      calculatedProgress: progress,
      lessons: courseLessons.map(l => ({
        id: l.id,
        title: l.title,
        hasProgress: !!l.progress,
        completed: l.progress?.completed
      }))
    });

    return progress;
  };

  const handleOpenLesson = (lessonId?: string) => {
    setCurrentLessonId(lessonId);
    setLessonModalOpen(true);
  };

  const handleOpenQuiz = (quizId: string) => {
    setCurrentQuizId(quizId);
    setQuizModalOpen(true);
  };

  const handleQuizComplete = async (quizId: string, passed: boolean) => {
    await handleProgressUpdate();
    
    // Check if course is completed after quiz
    if (passed) {
      const updatedEnrollments = await coursesApi.getMyEnrollments();
      const updatedEnrollment = updatedEnrollments.find((e: any) => e.courseId === course?.id);
      if (updatedEnrollment && updatedEnrollment.progressPercentage === 100) {
        triggerConfetti();
      }
    }
  };

  const handleCourseComplete = async () => {
    await handleProgressUpdate();
    triggerConfetti();
  };

  const triggerConfetti = async () => {
    if (confettiTriggered.current) return;
    if (typeof window === "undefined") return; // Only run on client side
    
    confettiTriggered.current = true;
    setShowConfetti(true);
    
    const duration = 5000;
    const animationEnd = Date.now() + duration;

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    const interval: NodeJS.Timeout = setInterval(async function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      
      // Left side confetti
      await triggerConfettiUtil({
        particleCount,
        angle: randomInRange(55, 125),
        spread: randomInRange(50, 70),
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        colors: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE'],
        shapes: ['square', 'circle'],
        gravity: randomInRange(0.4, 0.6),
        drift: randomInRange(-0.4, 0.4),
        ticks: 200,
        decay: randomInRange(0.94, 0.99),
        startVelocity: randomInRange(20, 45),
        zIndex: 0,
      });
      
      // Right side confetti
      await triggerConfettiUtil({
        particleCount,
        angle: randomInRange(55, 125),
        spread: randomInRange(50, 70),
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        colors: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE'],
        shapes: ['square', 'circle'],
        gravity: randomInRange(0.4, 0.6),
        drift: randomInRange(-0.4, 0.4),
        ticks: 200,
        decay: randomInRange(0.94, 0.99),
        startVelocity: randomInRange(20, 45),
        zIndex: 0,
      });
    }, 250);

    // Fire confetti from center as well
    setTimeout(async () => {
      await triggerConfettiUtil({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE'],
        shapes: ['square', 'circle'],
        gravity: 0.5,
        ticks: 200,
        decay: 0.95,
        startVelocity: 30,
        zIndex: 0,
      });
    }, 100);

    setTimeout(() => {
      setShowConfetti(false);
      confettiTriggered.current = false;
    }, duration);
  };

  const navigateToNextCurriculumItem = async (currentId: string, currentType: 'lesson' | 'quiz') => {
    // Refresh curriculum items
    await fetchLessons();
    
    // Build curriculum items list
    const allItems: Array<{ id: string; type: 'lesson' | 'quiz'; orderIndex: number }> = [
      ...courseLessons.map(l => ({ id: l.id, type: 'lesson' as const, orderIndex: l.orderIndex })),
      ...courseQuizzes.map(q => ({ id: q.id, type: 'quiz' as const, orderIndex: q.orderIndex })),
    ].sort((a, b) => a.orderIndex - b.orderIndex);

    const currentIndex = allItems.findIndex(item => item.id === currentId && item.type === currentType);
    
    if (currentIndex >= 0 && currentIndex < allItems.length - 1) {
      const nextItem = allItems[currentIndex + 1];
      
      // Close current modal
      if (currentType === 'lesson') {
        setLessonModalOpen(false);
      } else {
        setQuizModalOpen(false);
      }
      
      // Open next item
      setTimeout(() => {
        if (nextItem.type === 'lesson') {
          handleOpenLesson(nextItem.id);
        } else {
          handleOpenQuiz(nextItem.id);
        }
      }, 300);
    } else {
      // Last item - course is complete
      if (currentType === 'lesson') {
        setLessonModalOpen(false);
      } else {
        setQuizModalOpen(false);
      }
      await handleCourseComplete();
    }
  };

  const handleProgressUpdate = async (lessonId?: string, completed?: boolean) => {
    // Refresh lessons and enrollment to update progress
    console.log('Progress update callback called:', { lessonId, completed });
    
    try {
      // Refresh enrollment to get updated progressPercentage
      if (course) {
        const enrollments = await coursesApi.getMyEnrollments();
        const updatedEnrollment = enrollments.find((e: any) => e.courseId === course.id);
        if (updatedEnrollment) {
          setEnrollment(updatedEnrollment);
          console.log('Updated enrollment progress:', updatedEnrollment.progressPercentage);
        }
      }
      
      // Also refresh lessons to update lesson-level progress indicators
      await fetchLessons();
    } catch (error) {
      console.error('Failed to refresh progress:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">{t("courses.loadingCourse")}</div>
      </div>
    );
  }

  if (!course) {
    return notFound();
  }

  const levelColors: Record<CourseLevel, string> = {
    [CourseLevel.BEGINNER]: "bg-green-500/10 text-green-700 dark:text-green-400",
    [CourseLevel.INTERMEDIATE]: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
    [CourseLevel.ADVANCED]: "bg-red-500/10 text-red-700 dark:text-red-400",
  };

  // Combine lessons and quizzes for curriculum display
  type CurriculumItem = {
    id: string;
    title: string;
    type: 'lesson' | 'quiz';
    orderIndex: number;
    durationMinutes?: number;
    isLocked?: boolean;
    progress?: { completed: boolean };
    // Quiz-specific properties
    questionsCount?: number;
    bestScore?: number;
    passingScore?: number;
    canRetake?: boolean;
    attemptsCount?: number;
  };

  const curriculumItems: CurriculumItem[] = isEnrolled
    ? [
        ...courseLessons.map(l => ({ 
          id: l.id, 
          title: l.title, 
          type: 'lesson' as const, 
          orderIndex: l.orderIndex,
          durationMinutes: l.durationMinutes,
          isLocked: l.isLocked,
          progress: l.progress,
        })),
        ...courseQuizzes.map(q => ({ 
          id: q.id, 
          title: q.title, 
          type: 'quiz' as const, 
          orderIndex: q.orderIndex,
          durationMinutes: q.durationMinutes,
          isLocked: q.isLocked,
          questionsCount: q.questions?.length ?? 0,
          bestScore: q.bestScore,
          passingScore: q.passingScore,
          canRetake: q.canRetake,
          attemptsCount: q.attemptsCount,
        })),
      ].sort((a, b) => a.orderIndex - b.orderIndex)
    : [
        { id: "1", title: "Introduction to the Course", durationMinutes: 15, orderIndex: 0, progress: { completed: false }, type: 'lesson' as const },
        { id: "2", title: "Getting Started", durationMinutes: 20, orderIndex: 1, progress: { completed: false }, type: 'lesson' as const },
        { id: "3", title: "Core Concepts", durationMinutes: 30, orderIndex: 2, progress: { completed: false }, type: 'lesson' as const },
        { id: "4", title: "Practical Examples", durationMinutes: 45, orderIndex: 3, progress: { completed: false }, type: 'lesson' as const },
        { id: "5", title: "Advanced Topics", durationMinutes: 35, orderIndex: 4, progress: { completed: false }, type: 'lesson' as const },
      ];

  const reviews = [
    {
      id: 1,
      author: "Alice Johnson",
      rating: 5,
      date: "2024-02-15",
      comment: "Excellent course! Very clear explanations and practical examples.",
    },
    {
      id: 2,
      author: "Bob Smith",
      rating: 4,
      date: "2024-02-10",
      comment: "Great content, but could use more hands-on exercises.",
    },
    {
      id: 3,
      author: "Carol White",
      rating: 5,
      date: "2024-02-05",
      comment: "The instructor is amazing! Learned so much from this course.",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Back Button & Admin Actions */}
      <div className="flex items-center justify-between">
        <Button asChild variant="ghost" size="sm">
          <Link href="/dashboard/courses">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("courses.backToCourses")}
          </Link>
        </Button>
        
        {/* Admin Actions - Only show for superadmins */}
        {isSuperAdmin && (
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/dashboard/courses/${course.id}/curriculum`}>
                <Settings className="mr-2 h-4 w-4" />
                {t("courses.manage")}
              </Link>
            </Button>
          </div>
        )}
      </div>

      {/* Course Header */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Course Image and Quick Info */}
        <div className="lg:col-span-1">
          <div className="sticky top-6 space-y-4">
            <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-muted">
              {course.thumbnailUrl ? (
                <Image
                  src={course.thumbnailUrl}
                  alt={course.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 33vw"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <BookOpen className="h-16 w-16 text-muted-foreground" />
                </div>
              )}
            </div>

            {isEnrolled ? (
              <div className="space-y-3">
                <div>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{t("courses.yourProgress")}</span>
                    <span className="font-semibold">{calculateProgress()}%</span>
                  </div>
                  <Progress value={calculateProgress()} className="h-2" />
                </div>
                <Button
                  className="w-full"
                  size="lg"
                  onClick={() => handleOpenLesson()}
                  disabled={courseLessons.length === 0}
                  variant={calculateProgress() === 100 ? "outline" : "default"}
                >
                  {calculateProgress() === 100 ? (
                    <>
                      <Award className="mr-2 h-5 w-5" />
                      {t("courses.courseCompleted")}
                    </>
                  ) : (
                    <>
                      <PlayCircle className="mr-2 h-5 w-5" />
                      {t("courses.continueLearning")}
                    </>
                  )}
                </Button>
              </div>
            ) : marketplaceCourse && marketplaceCourse.basePrice > 0 ? (
              // Paid course - show Buy button
              <Button
                className="w-full"
                size="lg"
                onClick={() => setShowPurchaseDialog(true)}
              >
                <ShoppingCart className="mr-2 h-5 w-5" />
                {t("marketplace.buyNow")} - {formatPrice(marketplaceCourse.basePrice, marketplaceCourse.currency)}
              </Button>
            ) : (
              // Free course or no marketplace listing - show Enroll button
              <Button
                className="w-full"
                size="lg"
                onClick={handleEnroll}
                disabled={isEnrolling}
              >
                {isEnrolling ? t("courses.enrolling") : t("courses.enrollNow")}
              </Button>
            )}

            <div className="bg-muted rounded-lg p-4 space-y-3">
              <h3 className="font-semibold">{t("courses.courseIncludes")}</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <BookOpen className="text-muted-foreground h-4 w-4" />
                  <span>{course.lessonsCount} {t("courses.lessons")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <BarChart3 className="text-muted-foreground h-4 w-4" />
                  <span>{course.quizzesCount} {t("courses.quizzes")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="text-muted-foreground h-4 w-4" />
                  <span>{formatDuration(course.durationHours, t)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Award className="text-muted-foreground h-4 w-4" />
                  <span>{t("courses.certificate")}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Course Details */}
        <div className="space-y-6 lg:col-span-2">
          {/* Title and Meta */}
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Badge className={levelColors[course.level]} variant="secondary">
                {course.level}
              </Badge>
              {course.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="outline">
                  {tag}
                </Badge>
              ))}
            </div>
            <h1 className="mb-2 text-2xl font-bold">{course.title}</h1>
            <p className="text-muted-foreground text-lg">{course.description}</p>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap gap-6">
            <div className="flex items-center gap-2">
              <Users className="text-muted-foreground h-5 w-5" />
              <div>
                <p className="text-sm font-medium">{course.studentsEnrolled.toLocaleString()}</p>
                <p className="text-muted-foreground text-xs">{t("courses.students")}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
              <div>
                <p className="text-sm font-medium">4.8</p>
                <p className="text-muted-foreground text-xs">{t("courses.rating")}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="text-muted-foreground h-5 w-5" />
              <div>
                <p className="text-sm font-medium">{formatDuration(course.durationHours, t)}</p>
                <p className="text-muted-foreground text-xs">{t("courses.duration")}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Instructor */}
          <div>
            <h3 className="mb-2 font-semibold">{t("courses.instructor")}</h3>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-lg font-semibold text-primary-foreground">
                {(course.instructorName || t("common.unknown"))
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </div>
              <div>
                <p className="font-medium">{course.instructorName || t("common.unknown")}</p>
                <p className="text-muted-foreground text-sm">{t("courses.courseInstructor")}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Tabs */}
          <Tabs defaultValue="curriculum" className="w-full">
            <TabsList>
              <TabsTrigger value="curriculum">{t("courses.curriculum")}</TabsTrigger>
              <TabsTrigger value="overview">{t("courses.overview")}</TabsTrigger>
              <TabsTrigger value="reviews">{t("courses.reviews")}</TabsTrigger>
            </TabsList>

            <TabsContent value="curriculum" className="space-y-4">
              <div className="space-y-2">
                {curriculumItems.map((item, index) => {
                  if (item.type === 'lesson') {
                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50"
                      >
                        <div className="flex items-center gap-3">
                          {item.progress?.completed ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                          ) : item.isLocked ? (
                            <Lock className="h-5 w-5 text-muted-foreground" />
                          ) : (
                            <div className="flex h-5 w-5 items-center justify-center rounded-full border text-xs">
                              {index + 1}
                            </div>
                          )}
                          <div>
                            <p className="font-medium">{item.title}</p>
                            <p className="text-muted-foreground text-sm flex items-center gap-2">
                              <BookOpen className="h-3 w-3" />
                              {t("courses.lesson")} • {item.durationMinutes} {t("courses.min")}
                            </p>
                          </div>
                        </div>
                        {isEnrolled && !item.isLocked && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenLesson(item.id)}
                          >
                            <PlayCircle className="mr-2 h-4 w-4" />
                            {item.progress?.completed ? t("common.review") : t("courses.start")}
                          </Button>
                        )}
                      </div>
                    );
                  } else {
                    const quizPassed = item.bestScore !== undefined && item.passingScore !== undefined && item.bestScore >= item.passingScore;
                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50"
                      >
                        <div className="flex items-center gap-3">
                          {quizPassed ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                          ) : item.isLocked ? (
                            <Lock className="h-5 w-5 text-muted-foreground" />
                          ) : (
                            <div className="flex h-5 w-5 items-center justify-center rounded-full border text-xs">
                              {index + 1}
                            </div>
                          )}
                          <div>
                            <p className="font-medium">{item.title}</p>
                            <p className="text-muted-foreground text-sm flex items-center gap-2">
                              <FileQuestion className="h-3 w-3" />
                              {t("courses.quiz")} • {item.questionsCount ?? 0} {t("courses.questions")}
                              {item.bestScore !== undefined && (
                                <span> • {t("courses.best")}: {item.bestScore}%</span>
                              )}
                            </p>
                          </div>
                        </div>
                        {isEnrolled && !item.isLocked && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenQuiz(item.id)}
                            disabled={!item.canRetake && quizPassed}
                          >
                            <FileQuestion className="mr-2 h-4 w-4" />
                            {quizPassed ? t("common.review") : item.attemptsCount && item.attemptsCount > 0 ? t("courses.retake") : t("courses.takeQuiz")}
                          </Button>
                        )}
                      </div>
                    );
                  }
                })}
              </div>
            </TabsContent>

            <TabsContent value="overview" className="space-y-4">
              <div>
                <h3 className="mb-3 text-lg font-semibold">{t("courses.whatYouWillLearn")}</h3>
                <ul className="space-y-2">
                  <li className="flex gap-2">
                    <CheckCircle2 className="text-primary mt-0.5 h-5 w-5 flex-shrink-0" />
                    <span>Master the fundamental concepts and best practices</span>
                  </li>
                  <li className="flex gap-2">
                    <CheckCircle2 className="text-primary mt-0.5 h-5 w-5 flex-shrink-0" />
                    <span>Build real-world projects from scratch</span>
                  </li>
                  <li className="flex gap-2">
                    <CheckCircle2 className="text-primary mt-0.5 h-5 w-5 flex-shrink-0" />
                    <span>Understand advanced techniques and patterns</span>
                  </li>
                  <li className="flex gap-2">
                    <CheckCircle2 className="text-primary mt-0.5 h-5 w-5 flex-shrink-0" />
                    <span>Prepare for professional certifications</span>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="mb-3 text-lg font-semibold">{t("courses.requirementsTitle")}</h3>
                <ul className="text-muted-foreground list-disc space-y-1 pl-5">
                  <li>Basic understanding of programming concepts</li>
                  <li>A computer with internet connection</li>
                  <li>Willingness to learn and practice</li>
                </ul>
              </div>

              <div>
                <h3 className="mb-3 text-lg font-semibold">{t("courses.description")}</h3>
                <p className="text-muted-foreground">{course.description}</p>
              </div>
            </TabsContent>

            <TabsContent value="reviews" className="space-y-4">
              <div className="mb-6 flex items-center gap-4">
                <div className="text-center">
                  <div className="mb-1 text-4xl font-bold">4.8</div>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-muted-foreground mt-1 text-sm">125 reviews</p>
                </div>
              </div>

              <div className="space-y-4">
                {reviews.map((review) => (
                  <div key={review.id} className="rounded-lg border p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                          {review.author
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </div>
                        <div>
                          <p className="font-medium">{review.author}</p>
                          <p className="text-muted-foreground text-xs">{review.date}</p>
                        </div>
                      </div>
                      <div className="flex gap-0.5">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${
                              i < review.rating
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-muted-foreground"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-muted-foreground text-sm">{review.comment}</p>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Lesson Viewer Modal */}
      {course && enrollment && (
        <LessonViewerModal
          open={lessonModalOpen}
          onOpenChange={setLessonModalOpen}
          courseId={course.id}
          initialLessonId={currentLessonId}
          enrollmentId={enrollment.id}
          onProgressUpdate={handleProgressUpdate}
          onOpenQuiz={handleOpenQuiz}
          onNavigateNext={(lessonId) => {
            navigateToNextCurriculumItem(lessonId, 'lesson');
          }}
          onCourseComplete={handleCourseComplete}
        />
      )}

      {/* Quiz Viewer Modal */}
      {course && enrollment && currentQuizId && (
        <QuizViewerModal
          open={quizModalOpen}
          onOpenChange={setQuizModalOpen}
          quizId={currentQuizId}
          courseId={course.id}
          enrollmentId={enrollment.id}
          onQuizComplete={handleQuizComplete}
          onNavigateNext={(quizId) => {
            navigateToNextCurriculumItem(quizId, 'quiz');
          }}
          onCourseComplete={handleCourseComplete}
        />
      )}

      {/* Purchase Dialog */}
      <Dialog open={showPurchaseDialog} onOpenChange={setShowPurchaseDialog}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>{t("marketplace.purchaseCourse")}</DialogTitle>
            <DialogDescription>
              {marketplaceCourse?.title || course?.title}
            </DialogDescription>
          </DialogHeader>

          {marketplaceCourse && (
            <div className="space-y-6 py-4">
              {/* Course details summary */}
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>{formatDuration(marketplaceCourse.durationHours, t)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <BookOpen className="h-4 w-4" />
                  <span>{marketplaceCourse.lessonsCount} {t("courses.lessons")}</span>
                </div>
                <div className="flex items-center gap-1">
                  <BarChart3 className="h-4 w-4" />
                  <span>{marketplaceCourse.quizzesCount} {t("courses.quizzes")}</span>
                </div>
                {marketplaceCourse.includesCertificate && (
                  <div className="flex items-center gap-1 text-blue-600">
                    <Award className="h-4 w-4" />
                    <span>{t("courses.certificate")}</span>
                  </div>
                )}
              </div>

              {/* Price and benefits */}
              <div className="space-y-4">
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground mb-2">{t("marketplace.personalAccess")}</p>
                  <div className="text-3xl font-bold">
                    {formatPrice(marketplaceCourse.basePrice, marketplaceCourse.currency)}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    {t("marketplace.oneTimePurchase")}
                  </p>
                </div>
                <div className="border-t pt-4">
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      {t("marketplace.fullCourseAccess")}
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      {t("marketplace.lifetimeAccess")}
                    </li>
                    {marketplaceCourse.includesCertificate && (
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500" />
                        {t("marketplace.certificateIncluded")}
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPurchaseDialog(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handlePurchase} disabled={isPurchasing}>
              <ShoppingCart className="h-4 w-4 mr-2" />
              {isPurchasing ? t("marketplace.processing") : t("marketplace.proceedToPayment")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
