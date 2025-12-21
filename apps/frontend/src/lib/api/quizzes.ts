import { apiClient } from './client';
import { Quiz, QuizWithAccess, QuizSubmission, QuizResult } from '@repo/shared';

export interface CreateQuizData {
  title: string;
  description?: string;
  courseId: string;
  questions: Array<{
    question: string;
    type: 'multiple_choice' | 'true_false' | 'short_answer';
    options?: string[];
    correctAnswer: string | string[];
    points: number;
  }>;
  orderIndex?: number;
  passingScore?: number;
  durationMinutes?: number;
  requiredLessonIds?: string[];
  attachedToLessonId?: string;
  maxAttempts?: number;
}

export interface UpdateQuizData {
  title?: string;
  description?: string;
  questions?: Array<{
    id?: string;
    question: string;
    type: 'multiple_choice' | 'true_false' | 'short_answer';
    options?: string[];
    correctAnswer: string | string[];
    points: number;
  }>;
  orderIndex?: number;
  passingScore?: number;
  durationMinutes?: number;
  requiredLessonIds?: string[];
  attachedToLessonId?: string;
  maxAttempts?: number;
}

export const quizzesApi = {
  async createQuiz(data: CreateQuizData): Promise<Quiz> {
    const response = await apiClient.post<Quiz>('/api/quizzes', data);
    if (!response.success) {
      throw new Error(response.error || 'Failed to create quiz');
    }
    return response.data!;
  },

  async getQuizzesByCourse(courseId: string): Promise<QuizWithAccess[]> {
    const response = await apiClient.get<QuizWithAccess[]>(
      `/api/quizzes?courseId=${courseId}`
    );
    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch quizzes');
    }
    return response.data!;
  },

  async getQuizById(id: string): Promise<Quiz> {
    const response = await apiClient.get<Quiz>(`/api/quizzes/${id}`);
    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch quiz');
    }
    return response.data!;
  },

  async updateQuiz(id: string, data: UpdateQuizData): Promise<Quiz> {
    const response = await apiClient.put<Quiz>(`/api/quizzes/${id}`, data);
    if (!response.success) {
      throw new Error(response.error || 'Failed to update quiz');
    }
    return response.data!;
  },

  async publishQuiz(id: string): Promise<Quiz> {
    const response = await apiClient.post<Quiz>(`/api/quizzes/${id}/publish`);
    if (!response.success) {
      throw new Error(response.error || 'Failed to publish quiz');
    }
    return response.data!;
  },

  async unpublishQuiz(id: string): Promise<Quiz> {
    const response = await apiClient.post<Quiz>(`/api/quizzes/${id}/unpublish`);
    if (!response.success) {
      throw new Error(response.error || 'Failed to unpublish quiz');
    }
    return response.data!;
  },

  async deleteQuiz(id: string): Promise<void> {
    const response = await apiClient.delete<void>(`/api/quizzes/${id}`);
    if (!response.success) {
      throw new Error(response.error || 'Failed to delete quiz');
    }
  },

  async submitQuiz(quizId: string, answers: QuizSubmission['answers']): Promise<QuizResult> {
    const response = await apiClient.post<QuizResult>(
      `/api/quizzes/${quizId}/submit`,
      { answers }
    );
    if (!response.success) {
      throw new Error(response.error || 'Failed to submit quiz');
    }
    return response.data!;
  },

  async getQuizAttempts(quizId: string): Promise<any[]> {
    const response = await apiClient.get<any[]>(`/api/quizzes/${quizId}/attempts`);
    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch quiz attempts');
    }
    return response.data!;
  },
};

