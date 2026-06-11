import { apiFetch } from "@/services/api";
import type { Course, Instructor, Lesson, ProgressMap } from "@/types/lms";

interface ApiEnvelope<T> {
  data?: T | { data?: T };
}

interface ProductPayload {
  id?: number | string;
  _id?: string;
  title?: unknown;
  name?: unknown;
  description?: unknown;
  price?: number;
  category?: unknown;
  thumbnail?: unknown;
  images?: unknown[];
  rating?: number | { rate?: number };
}

interface NameObject {
  title?: string;
  first?: string;
  last?: string;
}

interface UserPayload {
  id?: number | string;
  _id?: string;
  name?: unknown;
  username?: unknown;
  email?: unknown;
  picture?: unknown;
  avatar?: unknown;
  login?: { uuid?: string; username?: string };
  nameObject?: NameObject;
}

const categories = ["Mobile", "Frontend", "Backend", "Design", "Career"];
const levels: Course["level"][] = ["Beginner", "Intermediate", "Advanced"];

const extractNestedArray = <T>(value: unknown, depth = 0): T[] => {
  if (Array.isArray(value)) return value as T[];
  if (!value || typeof value !== "object" || depth > 3) return [];

  const record = value as Record<string, unknown>;
  return extractNestedArray<T>(record.data, depth + 1);
};

const extractArray = <T>(payload: ApiEnvelope<T[]>): T[] => {
  if (Array.isArray(payload.data)) return payload.data;
  if (payload.data && "data" in payload.data && Array.isArray(payload.data.data)) return payload.data.data;
  return extractNestedArray<T>(payload);
};

export function textFromUnknown(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (value && typeof value === "object") {
    const maybeName = value as Partial<NameObject> & { name?: unknown; title?: unknown };
    const fullName = [maybeName.title, maybeName.first, maybeName.last]
      .filter((part): part is string => typeof part === "string" && part.trim().length > 0)
      .join(" ")
      .trim();

    if (fullName) return fullName;
    if (typeof maybeName.name === "string") return maybeName.name;
    if (typeof maybeName.title === "string") return maybeName.title;
  }
  return fallback;
}

function imageFromUnknown(value: unknown): string {
  if (typeof value === "string" && value.trim()) return value;
  if (Array.isArray(value)) {
    return value.map(imageFromUnknown).find(Boolean) ?? "";
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return imageFromUnknown(record.url ?? record.secure_url ?? record.thumbnail ?? record.large ?? record.medium ?? record.picture);
  }
  return "";
}

function clampRating(value: unknown, fallback = 4.5): number {
  const raw = typeof value === "number" ? value : value && typeof value === "object" ? (value as { rate?: unknown }).rate : undefined;
  const parsed = typeof raw === "number" && Number.isFinite(raw) ? raw : fallback;
  return Math.min(5, Math.max(1, parsed));
}

const instructorFromUser = (user: UserPayload | undefined, index: number): Instructor => {
  const resolvedName = textFromUnknown(user?.name);
  const firstLast = user?.nameObject ? `${user.nameObject.first ?? ""} ${user.nameObject.last ?? ""}`.trim() : "";
  const name = resolvedName || firstLast || textFromUnknown(user?.username) || user?.login?.username || `Mentor ${index + 1}`;

  return {
    id: String(user?._id ?? user?.id ?? user?.login?.uuid ?? `instructor-${index}`),
    name,
    email: textFromUnknown(user?.email, undefined),
    avatar: imageFromUnknown(user?.avatar) || imageFromUnknown(user?.picture) || undefined,
    headline: `${categories[index % categories.length]} instructor`,
  };
};

const sampleVideoUrl = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

const lessonsForCourse = (courseId: string, title: string, index: number): Lesson[] => [
  {
    id: `${courseId}-overview`,
    courseId,
    title: `${title} overview`,
    type: "article",
    durationMinutes: 12 + index,
    description: "Set the learning goal, inspect the final outcome, and map the core ideas you will use throughout the course.",
  },
  {
    id: `${courseId}-setup`,
    courseId,
    title: "Project setup and tooling",
    type: "video",
    durationMinutes: 18 + index,
    description: "Prepare the development workflow, organize the folder structure, and configure TypeScript-friendly project conventions.",
    downloadUrl: sampleVideoUrl,
  },
  {
    id: `${courseId}-fundamentals`,
    courseId,
    title: "Core concepts in practice",
    type: "article",
    durationMinutes: 16 + index,
    description: "Break down the important primitives behind this topic and connect them to realistic product decisions.",
  },
  {
    id: `${courseId}-workshop`,
    courseId,
    title: "Guided implementation workshop",
    type: "video",
    durationMinutes: 28 + index,
    description: "Build the main feature flow with completion tracking, offline-ready metadata, and production-focused error handling.",
    downloadUrl: sampleVideoUrl,
  },
  {
    id: `${courseId}-patterns`,
    courseId,
    title: "Reusable architecture patterns",
    type: "article",
    durationMinutes: 14 + index,
    description: "Extract reusable patterns, reduce duplication, and document the tradeoffs behind the implementation.",
  },
  {
    id: `${courseId}-offline`,
    courseId,
    title: "Offline and recovery strategy",
    type: "video",
    durationMinutes: 22 + index,
    description: "Handle failed requests, local persistence, retry states, and offline access without breaking the learner experience.",
    downloadUrl: sampleVideoUrl,
  },
  {
    id: `${courseId}-resources`,
    courseId,
    title: "Reference checklist",
    type: "resource",
    durationMinutes: 10,
    description: "Review a compact checklist covering implementation details, acceptance criteria, and polish points.",
  },
  {
    id: `${courseId}-quiz`,
    courseId,
    title: "Knowledge check",
    type: "quiz",
    durationMinutes: 8,
    description: "A short assessment to reinforce the lesson and confirm readiness to apply the material independently.",
  },
];

const totalLessonMinutes = (lessons: Lesson[]) => lessons.reduce((sum, lesson) => sum + lesson.durationMinutes, 0);

const fallbackCourses: Course[] = ["React Native Foundations", "Secure API Architecture", "Mobile UX Systems", "Offline Learning Patterns"].map(
  (title, index) => {
    const id = `fallback-${index + 1}`;
    return {
      id,
      title,
      description: "Production-focused lessons for building resilient learning apps with Expo.",
      thumbnail: `https://dummyimage.com/800x520/${index % 2 ? "eff6ff" : "dbeafe"}/0f172a&text=${encodeURIComponent(title)}`,
      priceLabel: "Included",
      rating: 4.6 + index / 10,
      level: levels[index % levels.length],
      durationMinutes: totalLessonMinutes(lessonsForCourse(id, title, index)),
      category: categories[index % categories.length],
      instructor: instructorFromUser(undefined, index),
      lessons: lessonsForCourse(id, title, index),
    };
  },
);

export async function fetchCourses(): Promise<Course[]> {
  const [productsPayload, usersPayload] = await Promise.all([
    apiFetch<ApiEnvelope<ProductPayload[]>>("/api/v1/public/randomproducts?limit=20", { retries: 2 }),
    apiFetch<ApiEnvelope<UserPayload[]>>("/api/v1/public/randomusers?limit=20", { retries: 2 }),
  ]);

  const products = extractArray(productsPayload);
  const users = extractArray(usersPayload);

  if (products.length === 0) {
    return fallbackCourses;
  }

  return products.map((product, index) => {
    const id = String(product._id ?? product.id ?? `course-${index}`);
    const title = textFromUnknown(product.title) || textFromUnknown(product.name) || `Course ${index + 1}`;
    const thumbnail =
      imageFromUnknown(product.thumbnail) ||
      imageFromUnknown(product.images) ||
      `https://dummyimage.com/800x520/eff6ff/0f172a&text=${encodeURIComponent(title)}`;

    return {
      id,
      title,
      description: textFromUnknown(product.description, "A practical learning path with native progress and WebView content."),
      thumbnail,
      priceLabel: typeof product.price === "number" ? `$${product.price}` : "Included",
      rating: clampRating(product.rating, 4.5),
      level: levels[index % levels.length],
      durationMinutes: totalLessonMinutes(lessonsForCourse(id, title, index)),
      category: textFromUnknown(product.category, categories[index % categories.length]),
      instructor: instructorFromUser(users[index % Math.max(users.length, 1)], index),
      lessons: lessonsForCourse(id, title, index),
    };
  });
}

export function normalizeCourse(course: Course, index = 0): Course {
  const title = textFromUnknown(course.title, `Course ${index + 1}`);
  const courseId = textFromUnknown(course.id, `course-${index}`);
  const normalizedLessons = course.lessons.length >= 6 ? course.lessons : lessonsForCourse(courseId, title, index);

  return {
    ...course,
    id: courseId,
    title,
    description: textFromUnknown(course.description, "A practical learning path with native progress and WebView content."),
    thumbnail: imageFromUnknown(course.thumbnail) || `https://dummyimage.com/800x520/eff6ff/0f172a&text=${encodeURIComponent(title)}`,
    rating: clampRating(course.rating, 4.5),
    durationMinutes: totalLessonMinutes(normalizedLessons),
    category: textFromUnknown(course.category, categories[index % categories.length]),
    instructor: {
      ...course.instructor,
      id: textFromUnknown(course.instructor?.id, `instructor-${index}`),
      name: textFromUnknown(course.instructor?.name, `Mentor ${index + 1}`),
      email: textFromUnknown(course.instructor?.email) || undefined,
      avatar: imageFromUnknown(course.instructor?.avatar) || undefined,
      headline: textFromUnknown(course.instructor?.headline, `${categories[index % categories.length]} instructor`),
    },
    lessons: normalizedLessons.map((lesson, lessonIndex) => ({
      ...lesson,
      title: textFromUnknown(lesson.title, `Lesson ${lessonIndex + 1}`),
      description: textFromUnknown(lesson.description, "A focused lesson with progress tracking."),
    })),
  };
}

export function calculateCourseProgress(course: Course, progress: ProgressMap): number {
  const complete = course.lessons.filter((lesson) => progress[course.id]?.[lesson.id]).length;
  return course.lessons.length ? Math.round((complete / course.lessons.length) * 100) : 0;
}

export function getNextLesson(course: Course, progress: ProgressMap): Lesson {
  return course.lessons.find((lesson) => !progress[course.id]?.[lesson.id]) ?? course.lessons[0];
}
