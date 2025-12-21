import Link from "next/link";
import Image from "next/image";
import { BookOpen, Clock, Users, BarChart3 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Course, CourseLevel } from "@repo/shared";

interface CourseCardProps {
  course: Course & { progress?: number };
  showProgress?: boolean;
}

export function CourseCard({ course, showProgress = false }: CourseCardProps) {
  const levelColors: Record<CourseLevel, string> = {
    [CourseLevel.BEGINNER]: "bg-green-500/10 text-green-700 dark:text-green-400",
    [CourseLevel.INTERMEDIATE]: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
    [CourseLevel.ADVANCED]: "bg-red-500/10 text-red-700 dark:text-red-400",
  };

  return (
    <div className="group flex flex-col overflow-hidden rounded-lg border bg-card transition-all hover:shadow-lg">
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
            <span>{course.durationHours}h</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            <span>{course.studentsEnrolled} students</span>
          </div>
          <div className="flex items-center gap-1">
            <BookOpen className="h-3.5 w-3.5" />
            <span>{course.lessonsCount} lessons</span>
          </div>
          <div className="flex items-center gap-1">
            <BarChart3 className="h-3.5 w-3.5" />
            <span>{course.quizzesCount} quizzes</span>
          </div>
        </div>

        {showProgress && course.progress !== undefined && (
          <div className="mb-4">
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{course.progress}%</span>
            </div>
            <Progress value={course.progress} className="h-2" />
          </div>
        )}

        <div className="mt-auto flex items-center justify-between pt-4">
          <div className="text-sm">
            <p className="text-muted-foreground">Instructor</p>
            <p className="font-medium">{course.instructorName || "Unknown"}</p>
          </div>
          <Button asChild size="sm">
            <Link href={`/dashboard/courses/${course.slug}`}>View Course</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
