import { QuizEntity, QuizQuestion } from '@/infrastructure/database/entities/quiz.entity';

export class QuizAggregate {
  static create(data: {
    title: string;
    description?: string;
    courseId: string;
    tenantId: string;
    questions: QuizQuestion[];
    orderIndex?: number;
    passingScore?: number;
    durationMinutes?: number;
    requiredLessonIds?: string[];
    attachedToLessonId?: string | null;
    maxAttempts?: number | null;
  }) {
    return {
      title: data.title.trim(),
      description: data.description?.trim(),
      courseId: data.courseId,
      tenantId: data.tenantId,
      questions: data.questions.map((q, index) => ({
        ...q,
        id: q.id || `q-${Date.now()}-${index}`,
      })),
      orderIndex: data.orderIndex || 0,
      passingScore: data.passingScore || 0,
      durationMinutes: data.durationMinutes || 60,
      requiredLessonIds: data.requiredLessonIds || [],
      attachedToLessonId: data.attachedToLessonId ?? null,
      maxAttempts: data.maxAttempts ?? null,
      isPublished: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  static publish(quiz: QuizEntity): void {
    quiz.isPublished = true;
    quiz.updatedAt = new Date();
  }

  static unpublish(quiz: QuizEntity): void {
    quiz.isPublished = false;
    quiz.updatedAt = new Date();
  }

  static validateQuestions(questions: QuizQuestion[]): boolean {
    if (!questions || questions.length === 0) {
      return false;
    }

    return questions.every((q) => {
      if (!q.question || !q.type || !q.correctAnswer || !q.points) {
        return false;
      }

      if (q.type === 'multiple_choice' && (!q.options || q.options.length < 2)) {
        return false;
      }

      if (q.type === 'true_false' && (!q.options || q.options.length !== 2)) {
        return false;
      }

      return true;
    });
  }
}

