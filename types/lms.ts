export type LessonType = "video" | "article" | "quiz" | "resource";

export interface Instructor {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  headline: string;
}

export interface Lesson {
  id: string;
  courseId: string;
  title: string;
  type: LessonType;
  durationMinutes: number;
  description: string;
  downloadUrl?: string;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  priceLabel: string;
  rating: number;
  level: "Beginner" | "Intermediate" | "Advanced";
  durationMinutes: number;
  category: string;
  instructor: Instructor;
  lessons: Lesson[];
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  username?: string;
  isEmailVerified?: boolean;
}

export interface AuthSession {
  token: string;
  refreshToken?: string;
  user: UserProfile;
}

export interface Preferences {
  notificationsEnabled: boolean;
  darkMode: boolean;
  wifiOnlyDownloads: boolean;
}

export type ProgressMap = Record<string, Record<string, boolean>>;

export interface DownloadRecord {
  lessonId: string;
  courseId: string;
  title: string;
  uri?: string;
  progress: number;
  status: "queued" | "downloading" | "downloaded" | "failed";
  sizeBytes?: number;
  sizeLabel?: string;
  errorMessage?: string;
}
