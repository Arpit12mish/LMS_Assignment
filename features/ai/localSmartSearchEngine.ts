// ─── Local smart search fallback ─────────────────────────────────────────────
// Pure in-memory keyword + alias scoring — no network, no API key required.
// Used when Gemini is unavailable, rate-limited, or the user has no key.

import type { Course } from "@/types/lms";
import type { AiSearchResult } from "./ai.types";

// Domain-aware alias expansion so queries like "mobile app" or "interview prep"
// surface the right categories even when the exact words don't appear in titles.
const ALIASES: Record<string, string[]> = {
  mobile: ["android", "ios", "app", "react native", "flutter", "swift", "kotlin", "native"],
  frontend: ["react", "vue", "angular", "html", "css", "web", "javascript", "js", "typescript", "ts"],
  backend: ["node", "api", "server", "database", "sql", "python", "rest", "graphql", "express"],
  design: ["ux", "figma", "ui", "interface", "prototype", "wireframe", "sketch", "adobe"],
  career: ["interview", "resume", "job", "portfolio", "soft skills", "preparation", "prep", "hiring"],
};

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

function expandTokens(tokens: string[]): Set<string> {
  const expanded = new Set(tokens);
  for (const [category, aliases] of Object.entries(ALIASES)) {
    const matched = aliases.some((alias) =>
      tokens.some((t) => alias.includes(t) || t.includes(alias))
    );
    if (matched) {
      expanded.add(category);
      aliases.forEach((a) => expanded.add(a));
    }
  }
  return expanded;
}

function scoreCourse(
  course: Course,
  expanded: Set<string>
): { score: number; matchedTopics: string[] } {
  const corpus = [
    course.title,
    course.description,
    course.category,
    course.level,
    course.instructor.name,
  ]
    .join(" ")
    .toLowerCase();

  const matched: string[] = [];
  let score = 0;

  for (const token of expanded) {
    if (corpus.includes(token)) {
      matched.push(token);
      // Title hits are worth more than body hits
      score += course.title.toLowerCase().includes(token) ? 22 : 8;
    }
  }

  // Small rating bonus so equally-matched courses surface higher-rated ones
  score += Math.round((course.rating - 4.0) * 6);

  return { score: Math.min(100, Math.max(0, score)), matchedTopics: matched.slice(0, 4) };
}

export function localSmartSearch(query: string, courses: Course[]): AiSearchResult[] {
  if (!query.trim() || courses.length === 0) return [];

  const expanded = expandTokens(tokenize(query));

  return courses
    .map((course) => {
      const { score, matchedTopics } = scoreCourse(course, expanded);
      return { course, score, matchedTopics };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(({ course, score, matchedTopics }) => ({
      courseId: course.id,
      title: course.title,
      matchReason:
        matchedTopics.length > 0
          ? `Matched on: ${matchedTopics.slice(0, 3).join(", ")}.`
          : "Content relevance match.",
      score,
      matchedTopics,
    }));
}
