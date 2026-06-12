// ─── Local recommendation fallback ───────────────────────────────────────────
// Scores every course against the learner profile using level match, interest
// overlap, and goal keyword coverage.  No API key or network required.

import type { Course } from "@/types/lms";
import type { AiRecommendation, RecommendationInput } from "./ai.types";

function scoreForLearner(course: Course, input: RecommendationInput): number {
  // Skip enrolled courses entirely
  if (input.enrolledIds.includes(course.id)) return -1;

  let score = 0;
  const corpus = `${course.title} ${course.category} ${course.description}`.toLowerCase();

  // ── Level match ────────────────────────────────────────────────────────────
  if (course.level === input.skillLevel) {
    score += 25;
  } else if (
    (input.skillLevel === "Intermediate" && course.level === "Beginner") ||
    (input.skillLevel === "Advanced" && course.level === "Intermediate")
  ) {
    // One step below is still useful
    score += 10;
  }

  // ── Interest overlap ───────────────────────────────────────────────────────
  for (const interest of input.interests.slice(0, 5)) {
    const token = interest.trim().toLowerCase();
    if (token.length > 1 && corpus.includes(token)) score += 18;
  }

  // ── Goal keyword coverage ──────────────────────────────────────────────────
  const goalTokens = input.goal
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 3);
  for (const token of goalTokens) {
    if (corpus.includes(token)) score += 6;
  }

  // ── Rating bonus ───────────────────────────────────────────────────────────
  score += Math.round((course.rating - 4.0) * 8);

  // Tiny random variance to break ties between identical-score courses
  score += Math.random() * 2;

  return Math.min(95, Math.max(0, score));
}

export function localRecommend(
  input: RecommendationInput,
  courses: Course[]
): AiRecommendation[] {
  if (courses.length === 0) return [];

  const primaryInterest = input.interests[0] ?? "";

  return courses
    .map((course) => ({ course, score: scoreForLearner(course, input) }))
    .filter(({ score }) => score >= 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(({ course, score }) => ({
      courseId: course.id,
      title: course.title,
      reason: `Matches your ${input.skillLevel.toLowerCase()} level${primaryInterest ? ` and interest in ${primaryInterest}` : ""}.`,
      confidence: Math.round(score),
      tags: [course.level, course.category].filter(Boolean),
    }));
}
