"use client";

import { QuizQuestion } from "@repo/shared";

// Local enum to avoid runtime issues with shared package exports
enum QuizQuestionType {
  MULTIPLE_CHOICE = 'multiple_choice',
  TRUE_FALSE = 'true_false',
  SHORT_ANSWER = 'short_answer',
}
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface QuizQuestionRendererProps {
  question: QuizQuestion;
  value?: string | string[];
  onChange: (answer: string | string[]) => void;
}

export function QuizQuestionRenderer({
  question,
  value,
  onChange,
}: QuizQuestionRendererProps) {
  switch (question.type) {
    case QuizQuestionType.MULTIPLE_CHOICE:
      // Check if correct answer is an array (multiple correct answers)
      const isMultipleAnswers = Array.isArray(question.correctAnswer);
      
      if (isMultipleAnswers) {
        // Multiple selection (checkbox)
        const selectedAnswers = Array.isArray(value) ? value : [];
        return (
          <div className="space-y-2">
            {question.options?.map((option, index) => (
              <div key={index} className="flex items-center space-x-2 py-2">
                <Checkbox
                  id={`${question.id}-${index}`}
                  checked={selectedAnswers.includes(option)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      onChange([...selectedAnswers, option]);
                    } else {
                      onChange(selectedAnswers.filter((a) => a !== option));
                    }
                  }}
                />
                <Label
                  htmlFor={`${question.id}-${index}`}
                  className="cursor-pointer flex-1"
                >
                  {option}
                </Label>
              </div>
            ))}
          </div>
        );
      } else {
        // Single selection (radio)
        return (
          <RadioGroup
            value={typeof value === "string" ? value : undefined}
            onValueChange={(val) => onChange(val)}
          >
            {question.options?.map((option, index) => (
              <div key={index} className="flex items-center space-x-2 py-2">
                <RadioGroupItem value={option} id={`${question.id}-${index}`} />
                <Label
                  htmlFor={`${question.id}-${index}`}
                  className="cursor-pointer flex-1"
                >
                  {option}
                </Label>
              </div>
            ))}
          </RadioGroup>
        );
      }

    case QuizQuestionType.TRUE_FALSE:
      return (
        <RadioGroup
          value={typeof value === "string" ? value : undefined}
          onValueChange={(val) => onChange(val)}
        >
          {question.options?.map((option, index) => (
            <div key={index} className="flex items-center space-x-2 py-2">
              <RadioGroupItem value={option} id={`${question.id}-${index}`} />
              <Label
                htmlFor={`${question.id}-${index}`}
                className="cursor-pointer flex-1"
              >
                {option}
              </Label>
            </div>
          ))}
        </RadioGroup>
      );

    case QuizQuestionType.SHORT_ANSWER:
      return (
        <Input
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Type your answer here..."
          className="mt-2"
        />
      );

    default:
      return <div>Unknown question type</div>;
  }
}

