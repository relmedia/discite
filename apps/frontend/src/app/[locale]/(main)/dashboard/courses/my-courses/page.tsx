"use client";

import { useEffect, useState } from "react";
import { BookOpen, Clock, Users, BarChart3, Loader2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { coursesApi } from "@/lib/api/courses";
import { Course, CourseLevel, EnrollmentStatus } from "@repo/shared";
import { useTranslations } from "@/components/intl-provider";
import { useAuth } from "@/hooks/use-auth";

interface EnrollmentWithCourse {
  id: string;
  courseId: string;
  progressPercentage: number;
  status: EnrollmentStatus;
  enrolledAt: string;
  completedAt?: string;
  course: Course & {
    instructor?: {
      id: string;
      name: string;
    };
  };
}

const levelColors: Record<CourseLevel, string> = {
  [CourseLevel.BEGINNER]: "bg-green-500/10 text-green-700 dark:text-green-400",
  [CourseLevel.INTERMEDIATE]: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  [CourseLevel.ADVANCED]: "bg-red-500/10 text-red-700 dark:text-red-400",
};

export default function MyCoursesPage() {
  const t = useTranslations();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [enrollments, setEnrollments] = useState<EnrollmentWithCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasFetched, setHasFetched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEnrollments = async () => {
      try {
        setLoading(true);
        const data = await coursesApi.getMyEnrollments();
        setEnrollments(data as unknown as EnrollmentWithCourse[]);
      } catch (err) {
        console.error("Failed to fetch enrollments:", err);
        setError(err instanceof Error ? err.message : "Failed to load courses");
      } finally {
        setLoading(false);
      }
    };

    // Wait for authentication before fetching
    if (!authLoading && isAuthenticated && !hasFetched) {
      setHasFetched(true);
      fetchEnrollments();
    }
  }, [authLoading, isAuthenticated, hasFetched]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("courses.myCourses")}</h1>
          <p className="text-muted-foreground mt-2">{t("courses.viewManageEnrolled")}</p>
        </div>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
          <p className="text-destructive">{error}</p>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => window.location.reload()}
          >
            {t("common.tryAgain")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("courses.myCourses")}</h1>
        <p className="text-muted-foreground mt-2">{t("courses.viewManageEnrolled")}</p>
      </div>

      {enrollments.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {enrollments.map((enrollment) => {
            const course = enrollment.course;
            const instructorName = course.instructor?.name || course.instructorName || t("common.unknown");
            
            return (
              <div 
                key={enrollment.id} 
                className="group flex flex-col overflow-hidden rounded-lg border bg-card transition-all hover:shadow-lg"
              >
                {/* Course Thumbnail Image */}
                <div className="relative h-48 w-full overflow-hidden bg-muted">
                  {course.thumbnailUrl ? (
                    <Image
                      src={course.thumbnailUrl}
                      alt={course.title}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-muted">
                      <BookOpen className="h-16 w-16 text-muted-foreground" />
                    </div>
                  )}
                  {/* Status badge */}
                  {enrollment.status === EnrollmentStatus.COMPLETED && (
                    <Badge className="absolute top-2 right-2 bg-green-500 text-white">
                      {t("common.completed")}
                    </Badge>
                  )}
                </div>

                {/* Content */}
                <div className="flex flex-1 flex-col p-6">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <h3 className="line-clamp-2 text-lg font-semibold">{course.title}</h3>
                    <Badge className={levelColors[course.level]} variant="secondary">
                      {course.level}
                    </Badge>
                  </div>

                  <p className="text-muted-foreground mb-4 line-clamp-2 text-sm">{course.description}</p>

                  <div className="text-muted-foreground mb-4 flex flex-wrap gap-4 text-xs">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{course.duration}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      <span>{course.studentsEnrolled} {t("courses.students")}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <BookOpen className="h-3.5 w-3.5" />
                      <span>{course.lessonsCount} {t("courses.lessons")}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <BarChart3 className="h-3.5 w-3.5" />
                      <span>{course.quizzesCount} {t("courses.quizzes")}</span>
                    </div>
                  </div>

                  {/* Progress Section */}
                  <div className="mb-4">
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{t("common.progress")}</span>
                      <span className="font-medium">{enrollment.progressPercentage}%</span>
                    </div>
                    <Progress value={enrollment.progressPercentage} className="h-2" />
                  </div>

                  <div className="mt-auto flex items-center justify-between pt-4">
                    <div className="text-sm">
                      <p className="text-muted-foreground">{t("courses.instructor")}</p>
                      <p className="font-medium">{instructorName}</p>
                    </div>
                    <Button asChild size="sm">
                      <Link href={`/dashboard/courses/${course.slug}`}>
                        {enrollment.status === EnrollmentStatus.COMPLETED ? t("common.review") : t("common.continue")}
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-lg border bg-card p-12 text-center">
          <BookOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="mb-2 text-lg font-semibold">{t("courses.noEnrolledCourses")}</h3>
          <p className="text-muted-foreground text-sm mb-4">
            {t("courses.noEnrolledCoursesDescription")}
          </p>
          <Button asChild>
            <Link href="/dashboard/marketplace">{t("sidebar.browseCourses")}</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
