"use client";

import { useEffect, useState } from "react";
import { BookOpen, Users, TrendingUp, Award } from "lucide-react";
import { Course } from "@repo/shared";
import { CourseCard } from "@/components/courses/course-card";
import { coursesApi } from "@/lib/api/courses";
import { toast } from "sonner";
import { useTranslations } from "@/components/intl-provider";
import { useAuth } from "@/hooks/use-auth";

export default function CoursesPage() {
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [enrolledCourses, setEnrolledCourses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasFetched, setHasFetched] = useState(false);
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const t = useTranslations();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);

        // Fetch all courses
        const courses = await coursesApi.getCourses();
        setAllCourses(courses);

        // Fetch enrolled courses
        try {
          const enrolled = await coursesApi.getMyEnrollments();
          setEnrolledCourses(enrolled);
        } catch (error) {
          // Enrollments might fail if not a student, that's okay
          console.log("Could not fetch enrollments:", error);
        }
      } catch (error: any) {
        toast.error(error.message || t("courses.failedToFetch"));
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };

    // Wait for authentication before fetching
    if (!authLoading && isAuthenticated && !hasFetched) {
      setHasFetched(true);
      fetchData();
    }
  }, [authLoading, isAuthenticated, hasFetched, t]);

  const stats = [
    {
      title: t("courses.totalCourses"),
      value: allCourses.length,
      icon: BookOpen,
      description: t("courses.availableCourses"),
    },
    {
      title: t("courses.enrolledCourses"),
      value: enrolledCourses.length,
      icon: Users,
      description: t("courses.yourActiveCourses"),
    },
    {
      title: t("courses.avgProgress"),
      value: enrolledCourses.length > 0
        ? `${Math.round(enrolledCourses.reduce((acc, course) => acc + (course.progress || 0), 0) / enrolledCourses.length)}%`
        : "0%",
      icon: TrendingUp,
      description: t("courses.acrossEnrolledCourses"),
    },
    {
      title: t("courses.coursesFinished"),
      value: enrolledCourses.filter((c) => (c.progress || 0) === 100).length,
      icon: Award,
      description: t("courses.coursesCompleted"),
    },
  ];

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">{t("courses.loadingCourses")}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("courses.title")}</h1>
        <p className="text-muted-foreground mt-2">{t("courses.manageViewCourses")}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.title} className="rounded-lg border bg-card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">{stat.title}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-muted-foreground mt-1 text-xs">{stat.description}</p>
                </div>
                <Icon className="text-muted-foreground h-8 w-8" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Enrolled Courses */}
      {enrolledCourses.length > 0 && (
        <div>
          <h2 className="mb-4 text-xl font-semibold">{t("courses.myEnrolledCourses")}</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {enrolledCourses.map((enrollment) => (
              <CourseCard key={enrollment.id} course={enrollment.course} showProgress />
            ))}
          </div>
        </div>
      )}

      {/* All Courses */}
      <div>
        <h2 className="mb-4 text-xl font-semibold">{t("courses.allAvailableCourses")}</h2>
        {allCourses.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {t("courses.noCoursesYet")}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {allCourses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
