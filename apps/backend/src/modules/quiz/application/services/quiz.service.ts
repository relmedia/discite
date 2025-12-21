import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { QuizEntity, QuizQuestion } from '@/infrastructure/database/entities/quiz.entity';
import { CourseEntity } from '@/infrastructure/database/entities/course.entity';
import { EnrollmentEntity } from '@/infrastructure/database/entities/enrollment.entity';
import { QuizAggregate } from '../../domain/quiz.aggregate';
import { CreateQuizDto } from '../../presentation/dto/create-quiz.dto';
import { UpdateQuizDto } from '../../presentation/dto/update-quiz.dto';
import { SubmitQuizDto } from '../../presentation/dto/submit-quiz.dto';
import { NotificationService } from '@/modules/notification/application/services/notification.service';
import { UserRole } from '@repo/shared';

export interface QuizWithAccess extends QuizEntity {
  isLocked: boolean;
  canRetake: boolean;
  bestScore?: number;
  attemptsCount?: number;
}

@Injectable()
export class QuizService {
  constructor(
    @InjectRepository(QuizEntity)
    private readonly quizRepository: Repository<QuizEntity>,
    @InjectRepository(CourseEntity)
    private readonly courseRepository: Repository<CourseEntity>,
    @InjectRepository(EnrollmentEntity)
    private readonly enrollmentRepository: Repository<EnrollmentEntity>,
    private readonly notificationService: NotificationService,
  ) {}

  async createQuiz(dto: CreateQuizDto, tenantId: string): Promise<QuizEntity> {
    // Verify course exists
    const course = await this.courseRepository.findOne({
      where: { id: dto.courseId, tenantId, deletedAt: IsNull() },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Validate questions
    const questions: QuizQuestion[] = dto.questions.map((q, index) => ({
      id: `q-${Date.now()}-${index}`,
      question: q.question,
      type: q.type,
      options: q.options,
      correctAnswer: q.correctAnswer,
      points: q.points,
    }));

    if (!QuizAggregate.validateQuestions(questions)) {
      throw new BadRequestException('Invalid quiz questions');
    }

    // Get max orderIndex for this course
    const maxOrderQuiz = await this.quizRepository.findOne({
      where: { courseId: dto.courseId, deletedAt: IsNull() },
      order: { orderIndex: 'DESC' },
    });

    const quizData = QuizAggregate.create({
      title: dto.title,
      description: dto.description,
      courseId: dto.courseId,
      tenantId,
      questions,
      orderIndex: dto.orderIndex ?? (maxOrderQuiz ? maxOrderQuiz.orderIndex + 1 : 0),
      passingScore: dto.passingScore ?? 60,
      durationMinutes: dto.durationMinutes ?? 60,
      requiredLessonIds: dto.requiredLessonIds || [],
      attachedToLessonId: dto.attachedToLessonId ?? null,
      maxAttempts: dto.maxAttempts ?? null,
    });

    const quiz = this.quizRepository.create(quizData as Partial<QuizEntity>);
    const savedQuiz = await this.quizRepository.save(quiz);

    // Increment course quizzesCount
    await this.courseRepository.increment(
      { id: dto.courseId },
      'quizzesCount',
      1,
    );

    return savedQuiz as QuizEntity;
  }

  async updateQuiz(
    id: string,
    dto: UpdateQuizDto,
    tenantId: string,
  ): Promise<QuizEntity> {
    const quiz = await this.quizRepository.findOne({
      where: { id, tenantId, deletedAt: IsNull() },
    });

    if (!quiz) {
      throw new NotFoundException(`Quiz with ID ${id} not found`);
    }

    // Validate questions if provided
    if (dto.questions) {
      const questions: QuizQuestion[] = dto.questions.map((q, index) => ({
        id: q.id || `q-${Date.now()}-${index}`,
        question: q.question,
        type: q.type,
        options: q.options,
        correctAnswer: q.correctAnswer,
        points: q.points,
      }));

      if (!QuizAggregate.validateQuestions(questions)) {
        throw new BadRequestException('Invalid quiz questions');
      }

      quiz.questions = questions;
    }

    if (dto.title) quiz.title = dto.title.trim();
    if (dto.description !== undefined) quiz.description = dto.description?.trim();
    if (dto.passingScore !== undefined) quiz.passingScore = dto.passingScore;
    if (dto.durationMinutes !== undefined) quiz.durationMinutes = dto.durationMinutes;
    if (dto.requiredLessonIds !== undefined) quiz.requiredLessonIds = dto.requiredLessonIds;
    if (dto.attachedToLessonId !== undefined) quiz.attachedToLessonId = dto.attachedToLessonId;
    if (dto.maxAttempts !== undefined) quiz.maxAttempts = dto.maxAttempts;
    if (dto.orderIndex !== undefined) quiz.orderIndex = dto.orderIndex;

    quiz.updatedAt = new Date();

    return await this.quizRepository.save(quiz);
  }

  async getQuizById(
    id: string,
    tenantId: string,
    _userId?: string,
    userRole?: UserRole,
  ): Promise<QuizEntity> {
    const quiz = await this.quizRepository.findOne({
      where: { id, tenantId, deletedAt: IsNull() },
      relations: ['course'],
    });

    if (!quiz) {
      throw new NotFoundException(`Quiz with ID ${id} not found`);
    }

    // If student, verify enrollment and published status
    if (userRole === UserRole.STUDENT) {
      if (!quiz.isPublished) {
        throw new ForbiddenException('This quiz is not yet published');
      }
    }

    return quiz;
  }

  async getQuizzesByCourse(
    courseId: string,
    tenantId: string,
    userId?: string,
    userRole?: UserRole,
  ): Promise<QuizWithAccess[]> {
    const query = this.quizRepository
      .createQueryBuilder('quiz')
      .where('quiz.courseId = :courseId', { courseId })
      .andWhere('quiz.tenantId = :tenantId', { tenantId })
      .andWhere('quiz.deletedAt IS NULL')
      .orderBy('quiz.orderIndex', 'ASC');

    // Students can only see published quizzes
    if (userRole === UserRole.STUDENT) {
      query.andWhere('quiz.isPublished = :isPublished', {
        isPublished: true,
      });
    }

    const quizzes = await query.getMany();

    // Fetch enrollment to include progress data (if user is enrolled)
    let enrollment: EnrollmentEntity | null = null;
    if (userId) {
      enrollment = await this.enrollmentRepository.findOne({
        where: { courseId, userId, tenantId },
      });
    }

    // Map quizzes to include access and progress info
    const quizzesWithAccess: QuizWithAccess[] = quizzes.map((quiz) => {
      const quizAttempt = enrollment?.quizAttempts?.find(
        (a) => a.quizId === quiz.id,
      );

      const isLocked = this.calculateQuizAccess(quiz, enrollment);
      const canRetake = this.canRetakeQuiz(quiz, quizAttempt);

      return {
        ...quiz,
        isLocked,
        canRetake,
        bestScore: quizAttempt?.bestScore,
        attemptsCount: quizAttempt?.attempts?.length || 0,
      };
    });

    return quizzesWithAccess;
  }

  calculateQuizAccess(
    quiz: QuizEntity,
    enrollment: EnrollmentEntity | null,
  ): boolean {
    // If no enrollment, quiz is locked
    if (!enrollment) {
      return true;
    }

    // If no prerequisites, quiz is unlocked
    if (!quiz.requiredLessonIds || quiz.requiredLessonIds.length === 0) {
      return false;
    }

    // Check if all required lessons are completed
    const completedLessonIds = enrollment.lessonProgress
      .filter((lp) => lp.completed)
      .map((lp) => lp.lessonId);

    // Quiz is locked if NOT all required lessons are completed
    const allPrerequisitesMet = quiz.requiredLessonIds.every((lessonId) =>
      completedLessonIds.includes(lessonId),
    );

    return !allPrerequisitesMet;
  }

  canRetakeQuiz(
    quiz: QuizEntity,
    quizAttempt: { attempts: any[]; bestScore: number } | undefined,
  ): boolean {
    // If no attempts yet, can take
    if (!quizAttempt || !quizAttempt.attempts || quizAttempt.attempts.length === 0) {
      return true;
    }

    // If already passed and unlimited retakes until pass, can retake
    const hasPassed = quizAttempt.attempts.some((a) => a.passed);
    if (hasPassed) {
      return false; // Already passed, no need to retake
    }

    // Check max attempts
    if (quiz.maxAttempts !== null) {
      return quizAttempt.attempts.length < quiz.maxAttempts;
    }

    // Unlimited retakes until pass
    return true;
  }

  async submitQuiz(
    quizId: string,
    dto: SubmitQuizDto,
    userId: string,
    tenantId: string,
  ): Promise<{
    score: number;
    passed: boolean;
    totalPoints: number;
    correctAnswers: number;
    totalQuestions: number;
  }> {
    const quiz = await this.quizRepository.findOne({
      where: { id: quizId, tenantId, deletedAt: IsNull() },
    });

    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    // Find enrollment
    const enrollment = await this.enrollmentRepository.findOne({
      where: {
        courseId: quiz.courseId,
        userId,
        tenantId,
      },
    });

    if (!enrollment) {
      throw new ForbiddenException('You must be enrolled in this course');
    }

    // Check if quiz is accessible
    if (this.calculateQuizAccess(quiz, enrollment)) {
      throw new ForbiddenException('Quiz prerequisites not met');
    }

    // Check if can retake
    const quizAttempt = enrollment.quizAttempts?.find(
      (a) => a.quizId === quizId,
    );
    if (!this.canRetakeQuiz(quiz, quizAttempt)) {
      throw new ForbiddenException('Maximum attempts reached or already passed');
    }

    // Grade the quiz
    const gradingResult = this.gradeQuiz(quiz, dto.answers);

    // Update enrollment with quiz attempt
    const attemptNumber = quizAttempt
      ? quizAttempt.attempts.length + 1
      : 1;

    const newAttempt = {
      attemptNumber,
      score: gradingResult.score,
      totalPoints: gradingResult.totalPoints,
      passed: gradingResult.passed,
      completedAt: new Date(),
    };

    if (quizAttempt) {
      // Update existing quiz attempt
      const attemptIndex = enrollment.quizAttempts.findIndex(
        (a) => a.quizId === quizId,
      );
      enrollment.quizAttempts[attemptIndex].attempts.push(newAttempt);
      enrollment.quizAttempts[attemptIndex].bestScore = Math.max(
        enrollment.quizAttempts[attemptIndex].bestScore,
        gradingResult.score,
      );
    } else {
      // Create new quiz attempt
      if (!enrollment.quizAttempts) {
        enrollment.quizAttempts = [];
      }
      enrollment.quizAttempts.push({
        quizId,
        attempts: [newAttempt],
        bestScore: gradingResult.score,
      });
    }

    // Recalculate progress
    enrollment.progressPercentage = await this.calculateProgressWithCourse(
      enrollment,
    );
    enrollment.lastAccessedAt = new Date();

    await this.enrollmentRepository.save(enrollment);

    // Send notification about quiz result
    try {
      await this.notificationService.notifyQuizResult(
        userId,
        tenantId,
        quiz.title,
        quizId,
        quiz.courseId,
        gradingResult.passed,
        gradingResult.score,
      );
    } catch (error) {
      console.error('Failed to send quiz result notification:', error);
    }

    return gradingResult;
  }

  private gradeQuiz(
    quiz: QuizEntity,
    answers: { questionId: string; answer: string | string[] }[],
  ): {
    score: number;
    passed: boolean;
    totalPoints: number;
    correctAnswers: number;
    totalQuestions: number;
  } {
    let correctAnswers = 0;
    let totalPoints = 0;
    let earnedPoints = 0;

    quiz.questions.forEach((question) => {
      totalPoints += question.points;

      const submittedAnswer = answers.find((a) => a.questionId === question.id);

      if (!submittedAnswer) {
        return; // No answer provided, skip
      }

      const isCorrect = this.compareAnswers(
        question.correctAnswer,
        submittedAnswer.answer,
      );

      if (isCorrect) {
        correctAnswers++;
        earnedPoints += question.points;
      }
    });

    const score = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;
    const passed = score >= quiz.passingScore;

    return {
      score: Math.round(score),
      passed,
      totalPoints,
      correctAnswers,
      totalQuestions: quiz.questions.length,
    };
  }

  private compareAnswers(
    correctAnswer: string | string[],
    submittedAnswer: string | string[],
  ): boolean {
    if (Array.isArray(correctAnswer) && Array.isArray(submittedAnswer)) {
      // For multiple correct answers, check if arrays match
      return (
        correctAnswer.length === submittedAnswer.length &&
        correctAnswer.every((ans) => submittedAnswer.includes(ans))
      );
    }

    if (Array.isArray(correctAnswer)) {
      return correctAnswer.includes(submittedAnswer as string);
    }

    if (Array.isArray(submittedAnswer)) {
      return submittedAnswer.includes(correctAnswer);
    }

    // String comparison (case-insensitive for short answers)
    return (
      String(correctAnswer).toLowerCase().trim() ===
      String(submittedAnswer).toLowerCase().trim()
    );
  }

  private async calculateProgressWithCourse(
    enrollment: EnrollmentEntity,
  ): Promise<number> {
    const course = await this.courseRepository.findOne({
      where: { id: enrollment.courseId },
    });

    if (!course || (course.lessonsCount === 0 && course.quizzesCount === 0)) {
      return 0;
    }

    const completedLessons = enrollment.lessonProgress.filter(
      (l) => l.completed,
    ).length;

    const completedQuizzes =
      enrollment.quizAttempts?.filter((qa) =>
        qa.attempts.some((a) => a.passed),
      ).length || 0;

    const totalItems = course.lessonsCount + course.quizzesCount;
    const completedItems = completedLessons + completedQuizzes;

    return Math.round((completedItems / totalItems) * 100);
  }

  async publishQuiz(id: string, tenantId: string): Promise<QuizEntity> {
    const quiz = await this.getQuizById(id, tenantId);
    QuizAggregate.publish(quiz);
    return await this.quizRepository.save(quiz);
  }

  async unpublishQuiz(id: string, tenantId: string): Promise<QuizEntity> {
    const quiz = await this.getQuizById(id, tenantId);
    QuizAggregate.unpublish(quiz);
    return await this.quizRepository.save(quiz);
  }

  async deleteQuiz(id: string, tenantId: string): Promise<void> {
    const quiz = await this.quizRepository.findOne({
      where: { id, tenantId, deletedAt: IsNull() },
    });

    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    // Soft delete
    quiz.deletedAt = new Date();
    await this.quizRepository.save(quiz);

    // Decrement course quizzesCount
    await this.courseRepository.decrement(
      { id: quiz.courseId },
      'quizzesCount',
      1,
    );
  }
}

