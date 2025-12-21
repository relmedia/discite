export interface Course {
  id: string;
  slug: string; // URL-friendly version of title
  title: string;
  description: string;
  instructor: string;
  thumbnailUrl: string; // URL to course thumbnail (can be S3 URL)
  duration: string;
  level: "Beginner" | "Intermediate" | "Advanced";
  studentsEnrolled: number;
  lessonsCount: number;
  quizzesCount: number;
  progress?: number; // For enrolled courses
  tags: string[];
  createdAt: string;
}

export const dummyCourses: Course[] = [
  {
    id: "1",
    slug: "introduction-to-web-development",
    title: "Introduction to Web Development",
    description:
      "Learn the fundamentals of web development including HTML, CSS, and JavaScript. Build your first website from scratch.",
    instructor: "John Doe",
    thumbnailUrl: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&h=600&fit=crop",
    duration: "8 weeks",
    level: "Beginner",
    studentsEnrolled: 1250,
    lessonsCount: 24,
    quizzesCount: 6,
    progress: 65,
    tags: ["HTML", "CSS", "JavaScript", "Web Development"],
    createdAt: "2024-01-15",
  },
  {
    id: "2",
    slug: "advanced-react-patterns",
    title: "Advanced React Patterns",
    description:
      "Master advanced React patterns including hooks, context, performance optimization, and state management with real-world examples.",
    instructor: "Jane Smith",
    thumbnailUrl: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&h=600&fit=crop",
    duration: "6 weeks",
    level: "Advanced",
    studentsEnrolled: 850,
    lessonsCount: 18,
    quizzesCount: 5,
    progress: 30,
    tags: ["React", "JavaScript", "Frontend", "Advanced"],
    createdAt: "2024-02-01",
  },
  {
    id: "3",
    slug: "python-for-data-science",
    title: "Python for Data Science",
    description:
      "Comprehensive guide to Python programming for data science. Learn pandas, numpy, matplotlib, and machine learning basics.",
    instructor: "Dr. Sarah Johnson",
    thumbnailUrl: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&h=600&fit=crop",
    duration: "10 weeks",
    level: "Intermediate",
    studentsEnrolled: 2100,
    lessonsCount: 32,
    quizzesCount: 8,
    tags: ["Python", "Data Science", "Machine Learning", "Analytics"],
    createdAt: "2024-01-20",
  },
  {
    id: "4",
    slug: "nodejs-backend-development",
    title: "Node.js Backend Development",
    description:
      "Build scalable backend applications with Node.js, Express, and MongoDB. Learn REST APIs, authentication, and deployment.",
    instructor: "Michael Chen",
    thumbnailUrl: "https://images.unsplash.com/photo-1627398242454-45a1465c2479?w=800&h=600&fit=crop",
    duration: "8 weeks",
    level: "Intermediate",
    studentsEnrolled: 1520,
    lessonsCount: 28,
    quizzesCount: 7,
    tags: ["Node.js", "Backend", "Express", "MongoDB"],
    createdAt: "2024-02-10",
  },
  {
    id: "5",
    slug: "ui-ux-design-fundamentals",
    title: "UI/UX Design Fundamentals",
    description:
      "Learn the principles of user interface and user experience design. Create beautiful and functional designs using Figma.",
    instructor: "Emily Rodriguez",
    thumbnailUrl: "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800&h=600&fit=crop",
    duration: "6 weeks",
    level: "Beginner",
    studentsEnrolled: 980,
    lessonsCount: 20,
    quizzesCount: 5,
    tags: ["UI/UX", "Design", "Figma", "User Experience"],
    createdAt: "2024-01-25",
  },
  {
    id: "6",
    slug: "devops-with-docker-and-kubernetes",
    title: "DevOps with Docker and Kubernetes",
    description:
      "Master containerization and orchestration with Docker and Kubernetes. Deploy and manage applications at scale.",
    instructor: "David Wilson",
    thumbnailUrl: "https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?w=800&h=600&fit=crop",
    duration: "12 weeks",
    level: "Advanced",
    studentsEnrolled: 650,
    lessonsCount: 36,
    quizzesCount: 9,
    tags: ["DevOps", "Docker", "Kubernetes", "Cloud"],
    createdAt: "2024-02-05",
  },
];

export const enrolledCourseIds = ["1", "2"];

export const getEnrolledCourses = (): Course[] => {
  return dummyCourses.filter((course) => enrolledCourseIds.includes(course.id));
};

export const getAllCourses = (): Course[] => {
  return dummyCourses;
};

export const getCourseById = (id: string): Course | undefined => {
  return dummyCourses.find((course) => course.id === id);
};

export const getCourseBySlug = (slug: string): Course | undefined => {
  return dummyCourses.find((course) => course.slug === slug);
};
