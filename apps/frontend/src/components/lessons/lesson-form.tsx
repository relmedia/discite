'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { LessonType } from '@repo/shared';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export interface LessonFormData {
  title: string;
  content?: string;
  type: LessonType;
  videoUrl?: string;
  documentUrl?: string;
  durationMinutes?: number;
}

interface LessonFormProps {
  initialData?: Partial<LessonFormData>;
  onSubmit: (data: LessonFormData) => Promise<void>;
  onCancel: () => void;
  isEditing?: boolean;
}

export function LessonForm({ initialData, onSubmit, onCancel, isEditing = false }: LessonFormProps) {
  const [loading, setLoading] = useState(false);

  const form = useForm<LessonFormData>({
    defaultValues: {
      title: initialData?.title || '',
      content: initialData?.content || '',
      type: initialData?.type || LessonType.TEXT,
      videoUrl: initialData?.videoUrl || '',
      documentUrl: initialData?.documentUrl || '',
      durationMinutes: initialData?.durationMinutes || 0,
    },
  });

  const selectedType = form.watch('type');

  const handleSubmit = async (data: LessonFormData) => {
    setLoading(true);
    try {
      await onSubmit(data);
    } finally {
      setLoading(false);
    }
  };

  const showVideoUrl = selectedType === LessonType.VIDEO || selectedType === LessonType.MIXED;
  const showDocumentUrl = selectedType === LessonType.DOCUMENT || selectedType === LessonType.MIXED;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>
              Enter the basic details of the lesson
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              rules={{ required: 'Title is required' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Introduction to TypeScript" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              rules={{ required: 'Type is required' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Lesson Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select lesson type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={LessonType.VIDEO}>Video</SelectItem>
                      <SelectItem value={LessonType.TEXT}>Text</SelectItem>
                      <SelectItem value={LessonType.DOCUMENT}>Document</SelectItem>
                      <SelectItem value={LessonType.MIXED}>Mixed</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Choose the type of content for this lesson
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="durationMinutes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Duration (minutes)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      placeholder="30"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormDescription>
                    Estimated time to complete this lesson
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Content</CardTitle>
            <CardDescription>
              Add the lesson content
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Content (Markdown)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Write your lesson content in Markdown format..."
                      className="min-h-[200px] font-mono"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    You can use Markdown formatting for rich text content
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {showVideoUrl && (
              <FormField
                control={form.control}
                name="videoUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Video URL</FormLabel>
                    <FormControl>
                      <Input
                        type="url"
                        placeholder="https://www.youtube.com/watch?v=..."
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Enter a video URL (YouTube, Vimeo, or direct link)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {showDocumentUrl && (
              <FormField
                control={form.control}
                name="documentUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Document URL</FormLabel>
                    <FormControl>
                      <Input
                        type="url"
                        placeholder="https://example.com/document.pdf"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Enter a document URL (PDF, Google Docs, etc.)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEditing ? 'Update Lesson' : 'Create Lesson'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
