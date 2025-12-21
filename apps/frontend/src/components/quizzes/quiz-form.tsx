'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

export type QuestionType = 'multiple_choice' | 'true_false' | 'short_answer';

export interface QuizQuestion {
  id?: string;
  question: string;
  type: QuestionType;
  options?: string[];
  correctAnswer: string | string[];
  points: number;
}

export interface QuizFormData {
  title: string;
  description?: string;
  questions: QuizQuestion[];
  passingScore: number;
  durationMinutes: number;
  maxAttempts?: number;
}

interface QuizFormProps {
  initialData?: QuizFormData;
  onSubmit: (data: QuizFormData) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

const defaultQuestion: QuizQuestion = {
  question: '',
  type: 'multiple_choice',
  options: ['', '', '', ''],
  correctAnswer: '',
  points: 1,
};

export function QuizForm({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: QuizFormProps) {
  const [formData, setFormData] = useState<QuizFormData>(
    initialData || {
      title: '',
      description: '',
      questions: [{ ...defaultQuestion }],
      passingScore: 60,
      durationMinutes: 30,
    }
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  const handleChange = (field: keyof QuizFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const addQuestion = () => {
    setFormData((prev) => ({
      ...prev,
      questions: [...prev.questions, { ...defaultQuestion }],
    }));
  };

  const removeQuestion = (index: number) => {
    if (formData.questions.length <= 1) return;
    setFormData((prev) => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== index),
    }));
  };

  const updateQuestion = (index: number, field: keyof QuizQuestion, value: any) => {
    setFormData((prev) => ({
      ...prev,
      questions: prev.questions.map((q, i) => {
        if (i !== index) return q;

        const updated = { ...q, [field]: value };

        // Reset options and correctAnswer when type changes
        if (field === 'type') {
          if (value === 'true_false') {
            updated.options = ['True', 'False'];
            updated.correctAnswer = '';
          } else if (value === 'multiple_choice') {
            updated.options = ['', '', '', ''];
            updated.correctAnswer = '';
          } else {
            updated.options = undefined;
            updated.correctAnswer = '';
          }
        }

        return updated;
      }),
    }));
  };

  const updateOption = (questionIndex: number, optionIndex: number, value: string) => {
    setFormData((prev) => ({
      ...prev,
      questions: prev.questions.map((q, i) => {
        if (i !== questionIndex || !q.options) return q;
        const newOptions = [...q.options];
        newOptions[optionIndex] = value;
        return { ...q, options: newOptions };
      }),
    }));
  };

  const addOption = (questionIndex: number) => {
    setFormData((prev) => ({
      ...prev,
      questions: prev.questions.map((q, i) => {
        if (i !== questionIndex || !q.options) return q;
        return { ...q, options: [...q.options, ''] };
      }),
    }));
  };

  const removeOption = (questionIndex: number, optionIndex: number) => {
    setFormData((prev) => ({
      ...prev,
      questions: prev.questions.map((q, i) => {
        if (i !== questionIndex || !q.options || q.options.length <= 2) return q;
        return { ...q, options: q.options.filter((_, oi) => oi !== optionIndex) };
      }),
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>Quiz Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Quiz Title *</Label>
            <Input
              id="title"
              placeholder="e.g., Module 1 Assessment"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe what this quiz covers..."
              value={formData.description || ''}
              onChange={(e) => handleChange('description', e.target.value)}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="passingScore">Passing Score (%)</Label>
              <Input
                id="passingScore"
                type="number"
                min={0}
                max={100}
                value={formData.passingScore}
                onChange={(e) => handleChange('passingScore', parseInt(e.target.value) || 0)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="durationMinutes">Duration (minutes)</Label>
              <Input
                id="durationMinutes"
                type="number"
                min={1}
                value={formData.durationMinutes}
                onChange={(e) => handleChange('durationMinutes', parseInt(e.target.value) || 30)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxAttempts">Max Attempts (optional)</Label>
              <Input
                id="maxAttempts"
                type="number"
                min={1}
                placeholder="Unlimited"
                value={formData.maxAttempts || ''}
                onChange={(e) =>
                  handleChange('maxAttempts', e.target.value ? parseInt(e.target.value) : undefined)
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Questions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Questions</CardTitle>
          <Badge variant="outline">{formData.questions.length} question(s)</Badge>
        </CardHeader>
        <CardContent className="space-y-6">
          {formData.questions.map((question, qIndex) => (
            <div
              key={qIndex}
              className="border rounded-lg p-4 space-y-4 relative"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-2">
                  <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
                  <span className="font-medium text-sm text-muted-foreground">
                    Question {qIndex + 1}
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeQuestion(qIndex)}
                  disabled={formData.questions.length <= 1}
                  className="h-8 w-8 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label>Question Text *</Label>
                  <Textarea
                    placeholder="Enter your question..."
                    value={question.question}
                    onChange={(e) => updateQuestion(qIndex, 'question', e.target.value)}
                    required
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Question Type</Label>
                  <Select
                    value={question.type}
                    onValueChange={(value: QuestionType) => updateQuestion(qIndex, 'type', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                      <SelectItem value="true_false">True / False</SelectItem>
                      <SelectItem value="short_answer">Short Answer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Points</Label>
                  <Input
                    type="number"
                    min={1}
                    value={question.points}
                    onChange={(e) => updateQuestion(qIndex, 'points', parseInt(e.target.value) || 1)}
                  />
                </div>
              </div>

              {/* Options for Multiple Choice */}
              {question.type === 'multiple_choice' && question.options && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Answer Options</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addOption(qIndex)}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add Option
                    </Button>
                  </div>
                  {question.options.map((option, oIndex) => (
                    <div key={oIndex} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={`correct-${qIndex}`}
                        checked={question.correctAnswer === option && option !== ''}
                        onChange={() => updateQuestion(qIndex, 'correctAnswer', option)}
                        className="h-4 w-4"
                        disabled={!option}
                      />
                      <Input
                        placeholder={`Option ${oIndex + 1}`}
                        value={option}
                        onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                        className="flex-1"
                      />
                      {question.options && question.options.length > 2 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeOption(qIndex, oIndex)}
                          className="h-8 w-8"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground">
                    Select the radio button next to the correct answer
                  </p>
                </div>
              )}

              {/* Options for True/False */}
              {question.type === 'true_false' && (
                <div className="space-y-3">
                  <Label>Correct Answer</Label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name={`tf-${qIndex}`}
                        checked={question.correctAnswer === 'True'}
                        onChange={() => updateQuestion(qIndex, 'correctAnswer', 'True')}
                        className="h-4 w-4"
                      />
                      <span>True</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name={`tf-${qIndex}`}
                        checked={question.correctAnswer === 'False'}
                        onChange={() => updateQuestion(qIndex, 'correctAnswer', 'False')}
                        className="h-4 w-4"
                      />
                      <span>False</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Correct Answer for Short Answer */}
              {question.type === 'short_answer' && (
                <div className="space-y-2">
                  <Label>Correct Answer</Label>
                  <Input
                    placeholder="Enter the correct answer..."
                    value={question.correctAnswer as string}
                    onChange={(e) => updateQuestion(qIndex, 'correctAnswer', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Student answers will be matched against this (case-insensitive)
                  </p>
                </div>
              )}
            </div>
          ))}

          <Button type="button" variant="outline" onClick={addQuestion} className="w-full">
            <Plus className="mr-2 h-4 w-4" />
            Add Question
          </Button>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : initialData ? 'Update Quiz' : 'Create Quiz'}
        </Button>
      </div>
    </form>
  );
}

