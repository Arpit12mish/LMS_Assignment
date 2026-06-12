// ─── Prompt builder ───────────────────────────────────────────────────────────
// Constructs the exact text sent to Gemini.  All cost controls are applied
// here so calling code does not have to think about them:
//
//   MAX_COURSES_TO_SEND  = 25   (keeps payload small)
//   MAX_DESC_LENGTH      = 80   (truncates long descriptions)
//   goal / query char caps are applied by the caller before reaching here.

import type { Course } from "@/types/lms";
import type { RecommendationInput } from "./ai.types";

const MAX_COURSES_TO_SEND = 25;
const MAX_DESC_LENGTH = 80;

interface CompactCourse {
  id: string;
  title: string;
  description: string;
  category: string;
  level: string;
  rating: number;
}

function compact(course: Course): CompactCourse {
  return {
    id: course.id,
    title: course.title,
    description: course.description.slice(0, MAX_DESC_LENGTH),
    category: course.category,
    level: course.level,
    rating: course.rating,
  };
}

export function buildRecommendationPrompt(
  input: RecommendationInput,
  courses: Course[]
): string {
  const payload = courses.slice(0, MAX_COURSES_TO_SEND).map(compact);

  const bookmarkedTitles =
    courses
      .filter((c) => input.bookmarkedIds.includes(c.id))
      .map((c) => c.title)
      .slice(0, 5)
      .join(", ") || "none";

  const enrolledTitles =
    courses
      .filter((c) => input.enrolledIds.includes(c.id))
      .map((c) => c.title)
      .slice(0, 5)
      .join(", ") || "none";

  return `You are an AI learning advisor for a mobile LMS app. Analyze the learner profile and return ONLY a valid JSON object — no markdown fences, no explanation, nothing outside the JSON.

LEARNER PROFILE:
- Goal: ${input.goal.slice(0, 200)}
- Skill level: ${input.skillLevel}
- Interests: ${input.interests.slice(0, 5).join(", ") || "general learning"}
- Hours per week: ${input.hoursPerWeek}
- Already bookmarked: ${bookmarkedTitles}
- Already enrolled: ${enrolledTitles}

AVAILABLE COURSES:
${JSON.stringify(payload)}

RULES:
- Recommend 3 to 5 courses only.
- Use only courses from the list above (exact id and title values).
- Never recommend courses the learner is already enrolled in.
- Match based on goal, skill level, and interests.
- confidence is an integer 0–100.
- reason must be 100 characters or fewer.

REQUIRED JSON FORMAT:
{
  "recommendations": [
    {
      "courseId": "<exact id from list>",
      "title": "<exact title from list>",
      "reason": "<why this fits the learner, max 100 chars>",
      "confidence": 85,
      "tags": ["tag1", "tag2"]
    }
  ]
}`;
}

export function buildSmartSearchPrompt(query: string, courses: Course[]): string {
  const payload = courses.slice(0, MAX_COURSES_TO_SEND).map(compact);

  return `You are an AI course search engine for a mobile LMS app. Rank the most relevant courses for the search query and return ONLY a valid JSON object — no markdown, no explanation, nothing outside the JSON.

SEARCH QUERY: "${query.slice(0, 300)}"

AVAILABLE COURSES:
${JSON.stringify(payload)}

RULES:
- Return up to 5 most relevant results.
- Use only courses from the list above (exact id and title values).
- Rank by relevance to the query.
- score is an integer 0–100.
- matchReason must be 100 characters or fewer.

REQUIRED JSON FORMAT:
{
  "results": [
    {
      "courseId": "<exact id from list>",
      "title": "<exact title from list>",
      "matchReason": "<why this matches the query, max 100 chars>",
      "score": 92,
      "matchedTopics": ["topic1", "topic2"]
    }
  ]
}`;
}
