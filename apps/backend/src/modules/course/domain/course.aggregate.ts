import { CourseLevel, CourseStatus } from '@repo/shared';

export class CourseAggregate {
  constructor(
    public readonly id: string,
    public title: string,
    public slug: string,
    public description: string,
    public instructorId: string,
    public readonly tenantId: string,
    public level: CourseLevel,
    public status: CourseStatus,
    public thumbnailUrl: string | null,
    public durationHours: number,
    public tags: string[],
    public readonly createdAt: Date,
    public updatedAt: Date,
  ) {}

  static create(data: {
    title: string;
    description: string;
    instructorId: string;
    tenantId: string;
    level?: CourseLevel;
    durationHours?: number;
    thumbnailUrl?: string;
    tags?: string[];
  }): {
    title: string;
    slug: string;
    description: string;
    instructorId: string;
    tenantId: string;
    level: CourseLevel;
    status: CourseStatus;
    durationHours: number;
    thumbnailUrl: string | undefined;
    tags: string[];
  } {
    return {
      title: data.title,
      slug: CourseAggregate.generateSlug(data.title),
      description: data.description,
      instructorId: data.instructorId,
      tenantId: data.tenantId,
      level: data.level || CourseLevel.BEGINNER,
      status: CourseStatus.DRAFT,
      durationHours: data.durationHours || 0,
      thumbnailUrl: data.thumbnailUrl || undefined,
      tags: data.tags || [],
    };
  }

  static generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  publish(): void {
    if (this.status === CourseStatus.DRAFT) {
      this.status = CourseStatus.PUBLISHED;
      this.updatedAt = new Date();
    }
  }

  archive(): void {
    this.status = CourseStatus.ARCHIVED;
    this.updatedAt = new Date();
  }

  updateContent(data: {
    title?: string;
    description?: string;
    level?: CourseLevel;
    durationHours?: number;
    thumbnailUrl?: string;
    tags?: string[];
  }): void {
    if (data.title && data.title !== this.title) {
      this.title = data.title;
      this.slug = CourseAggregate.generateSlug(data.title);
    }
    if (data.description) this.description = data.description;
    if (data.level) this.level = data.level;
    if (data.durationHours !== undefined) this.durationHours = data.durationHours;
    if (data.thumbnailUrl !== undefined) this.thumbnailUrl = data.thumbnailUrl;
    if (data.tags) this.tags = data.tags;
    this.updatedAt = new Date();
  }
}
