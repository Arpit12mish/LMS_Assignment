import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { ArrowRight, Bookmark, Check, ChevronLeft, CloudOff, Download, RefreshCw } from "lucide-react-native";
import React, { useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import { Button, FullScreenState, ProgressBar } from "@/components/ui";
import { textFromUnknown } from "@/services/courses";
import { escapeHtml } from "@/services/html";
import { useAppStore } from "@/store/app-store";

interface WebPayload {
  type: "reading-progress" | "complete";
  courseId?: string;
  lessonId?: string;
  value?: number;
}

function isValidWebPayload(value: unknown, courseId: string, lessonId: string): value is WebPayload {
  if (!value || typeof value !== "object") return false;

  const payload = value as WebPayload;
  const validType = payload.type === "reading-progress" || payload.type === "complete";
  const validScope = payload.courseId === courseId && payload.lessonId === lessonId;
  const validProgress = payload.type !== "reading-progress" || (typeof payload.value === "number" && payload.value >= 0 && payload.value <= 100);

  return validType && validScope && validProgress;
}

export default function LessonReaderScreen() {
  const router = useRouter();
  const webRef = useRef<WebView>(null);
  const { id, courseId } = useLocalSearchParams<{ id: string; courseId: string }>();
  const { courses, bookmarks, progress: lessonProgress, downloads, isOffline, toggleBookmark, markLessonComplete, downloadLesson, preferences } = useAppStore();
  const isDark = preferences.darkMode;
  const [readingProgress, setReadingProgress] = useState(0);
  const [isCompleting, setIsCompleting] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [loading, setLoading] = useState(true);

  const course = useMemo(() => courses.find((item) => item.id === courseId), [courseId, courses]);
  const lesson = useMemo(() => course?.lessons.find((item) => item.id === id), [course, id]);
  const lessonIndex = course?.lessons.findIndex((item) => item.id === id) ?? -1;
  const saved = course ? bookmarks.includes(course.id) : false;
  const instructorName = textFromUnknown(course?.instructor.name, "HouseEd mentor");

  const nativeHeaders = useMemo(() => {
    if (!course || !lesson) return {};

    return {
      "X-HouseEd-Bridge-Version": "1",
      "X-HouseEd-Course-Id": course.id,
      "X-HouseEd-Lesson-Id": lesson.id,
      "X-HouseEd-Lesson-Type": lesson.type,
      "X-HouseEd-Lesson-Index": String(lessonIndex + 1),
      "X-HouseEd-Total-Lessons": String(course.lessons.length),
      "X-HouseEd-Instructor": instructorName,
      "X-HouseEd-Category": course.category,
    };
  }, [course?.id, course?.category, course?.lessons.length, instructorName, lesson?.id, lesson?.type, lessonIndex]);

  const html = useMemo(
    () =>
      course && lesson
        ? createLessonHtml({
            instructorName,
            courseTitle: course.title,
            lessonTitle: lesson.title,
            lessonDescription: lesson.description ?? "",
            category: course.category,
            level: course.level,
            lessonType: lesson.type,
            lessonNumber: lessonIndex + 1,
            totalLessons: course.lessons.length,
            durationMinutes: lesson.durationMinutes,
            isDark,
          })
        : "",
    [course?.title, course?.category, course?.level, course?.lessons.length, instructorName, isDark, lesson?.title, lesson?.description, lesson?.type, lesson?.durationMinutes, lessonIndex],
  );

  const injectedJavaScriptBeforeContentLoaded = useMemo(() => {
    if (!course || !lesson) return "true;";
    return `
      window.HOUSEED_CONTEXT={
        courseId:${JSON.stringify(course.id)},
        lessonId:${JSON.stringify(lesson.id)},
        courseTitle:${JSON.stringify(course.title)},
        lessonTitle:${JSON.stringify(lesson.title)},
        category:${JSON.stringify(course.category)},
        level:${JSON.stringify(course.level)},
        lessonType:${JSON.stringify(lesson.type)},
        lessonNumber:${lessonIndex + 1},
        totalLessons:${course.lessons.length},
        durationMinutes:${lesson.durationMinutes},
        instructorName:${JSON.stringify(instructorName)},
        theme:${JSON.stringify(isDark ? "dark" : "light")}
      };
      window.HOUSEED_HEADERS=${JSON.stringify(nativeHeaders)};
      true;
    `;
  }, [course?.id, course?.title, course?.category, course?.level, course?.lessons.length, instructorName, isDark, lesson?.id, lesson?.title, lesson?.type, lesson?.durationMinutes, lessonIndex, nativeHeaders]);

  if (!course || !lesson) {
    return (
      <View className={`flex-1 items-center justify-center px-5 ${isDark ? "bg-black" : "bg-canvas"}`}>
        <Text className={`text-center text-xl font-extrabold ${isDark ? "text-white" : "text-ink"}`}>Lesson not found</Text>
        <View className="mt-4 w-full">
          <Button label="Back" onPress={() => router.back()} />
        </View>
      </View>
    );
  }

  const isComplete = !!lessonProgress[course.id]?.[lesson.id];
  const nextLesson = lessonIndex >= 0 ? course.lessons[lessonIndex + 1] : undefined;
  const isDownloaded = downloads.some((download) => download.lessonId === lesson.id && download.status === "downloaded");
  const cannotLoadLesson = (isOffline && !isDownloaded) || hasError;
  const displayedProgress = isComplete ? 100 : readingProgress;

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const parsed = JSON.parse(event.nativeEvent.data) as unknown;
      if (!isValidWebPayload(parsed, course.id, lesson.id)) return;

      const payload = parsed;
      if (payload.type === "reading-progress" && typeof payload.value === "number") {
        setReadingProgress(payload.value);
      }
      if (payload.type === "complete") {
        handleMarkComplete().catch(() => undefined);
      }
    } catch {
      setReadingProgress((value) => value);
    }
  };

  const handleMarkComplete = async () => {
    if (isCompleting || isComplete) return;
    setIsCompleting(true);
    setReadingProgress(100);
    try {
      await markLessonComplete(course.id, lesson.id, true);
    } finally {
      setIsCompleting(false);
    }
  };

  const handleNextLesson = async () => {
    if (!isComplete) {
      await handleMarkComplete();
    }

    if (nextLesson) {
      router.replace({ pathname: "/lesson/[id]", params: { id: nextLesson.id, courseId: course.id } });
      return;
    }

    router.replace({ pathname: "/course/[id]", params: { id: course.id } });
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView className={`flex-1 ${isDark ? "bg-black" : "bg-white"}`} edges={["top", "bottom"]}>
        <View className={`border-b ${isDark ? "border-[#242A36] bg-[#0B0D12]" : "border-border bg-white"}`}>
          <View className="min-h-[72px] flex-row items-center gap-2 px-4 pb-2 pt-2">
            <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} className={`h-11 w-11 items-center justify-center rounded-[13px] border ${isDark ? "border-[#242A36] bg-[#0B0D12]" : "border-border bg-white"}`}>
              <ChevronLeft size={23} color={isDark ? "#F1F5F9" : "#0F172A"} strokeWidth={2.4} />
            </Pressable>
            <View className="min-w-0 flex-1 items-center px-1">
              <Text className="text-[11px] font-extrabold uppercase tracking-wide text-primary" numberOfLines={1}>
                Lesson {lessonIndex >= 0 ? lessonIndex + 1 : ""} . {lesson.type}
              </Text>
              <Text className={`text-center text-[15px] font-extrabold leading-5 ${isDark ? "text-white" : "text-ink"}`} numberOfLines={2}>
                {lesson.title}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Save course"
              onPress={() => {
                toggleBookmark(course.id).catch(() => undefined);
              }}
              className={`h-11 w-11 items-center justify-center rounded-[13px] ${isDark ? "bg-[#0B1D45]" : "bg-softBlue"}`}
            >
              <Bookmark size={22} color={saved ? "#2563EB" : isDark ? "#94A3B8" : "#64748B"} fill={saved ? "#2563EB" : "transparent"} strokeWidth={2.4} />
            </Pressable>
            {lesson.downloadUrl ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Download lesson"
                onPress={() => {
                  downloadLesson(lesson).catch(() => undefined);
                }}
                className={`h-11 w-11 items-center justify-center rounded-[13px] border ${isDark ? "border-[#242A36] bg-[#0B0D12]" : "border-border bg-white"}`}
              >
                <Download size={22} color={isDark ? "#F1F5F9" : "#0F172A"} strokeWidth={2.2} />
              </Pressable>
            ) : null}
          </View>
          <ProgressBar value={displayedProgress} />
        </View>

        <View className="flex-1">
          {!cannotLoadLesson ? (
            <WebView
              ref={webRef}
              source={{ html }}
              injectedJavaScriptBeforeContentLoaded={injectedJavaScriptBeforeContentLoaded}
              injectedJavaScript={SCROLL_PROGRESS_JS}
              onMessage={handleMessage}
              onLoadStart={() => {
                setHasError(false);
                setLoading(true);
              }}
              onLoadEnd={() => setLoading(false)}
              onError={() => {
                setHasError(true);
                setLoading(false);
              }}
              onHttpError={() => {
                setHasError(true);
                setLoading(false);
              }}
              javaScriptEnabled
              domStorageEnabled={false}
              originWhitelist={["about:*"]}
              setSupportMultipleWindows={false}
              onShouldStartLoadWithRequest={(request) => request.url.startsWith("about:")}
              style={{ backgroundColor: isDark ? "#000000" : "#FFFFFF" }}
            />
          ) : null}

          {loading && !cannotLoadLesson ? (
            <View className={`absolute inset-0 items-center justify-center ${isDark ? "bg-[#0B0D12]" : "bg-white"}`}>
              <ActivityIndicator color="#2563EB" />
              <Text className={`mt-2 text-[13px] font-bold ${isDark ? "text-[#C8D0DC]" : "text-slate"}`}>Loading lesson</Text>
            </View>
          ) : null}

          {cannotLoadLesson ? (
            <FullScreenState
              icon={CloudOff}
              iconTone="red"
              title="Couldn't load this lesson"
              message={
                isOffline
                  ? "This lesson is not downloaded on this device. Go to Downloads to open available offline lessons."
                  : "The page failed to load. Check your connection and try again."
              }
              primaryAction={
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={isOffline ? "Go to Downloads" : "Reload page"}
                  onPress={() => {
                    if (isOffline) {
                      router.replace("/(tabs)/downloads");
                      return;
                    }
                    setHasError(false);
                    webRef.current?.reload();
                  }}
                  className="h-[48px] flex-row items-center justify-center gap-2 rounded-[13px] bg-primary"
                >
                  {isOffline ? <Download size={16} color="#FFFFFF" strokeWidth={2.3} /> : <RefreshCw size={16} color="#FFFFFF" strokeWidth={2.3} />}
                  <Text className="text-[14px] font-extrabold text-white">{isOffline ? "Go to Downloads" : "Reload page"}</Text>
                </Pressable>
              }
            />
          ) : null}
        </View>

        <View className={`border-t px-5 pb-3 pt-3 ${isDark ? "border-[#242A36] bg-[#0B0D12]" : "border-border bg-white"}`}>
          <View className="flex-row gap-3">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={isComplete ? "Lesson completed" : "Mark complete"}
              accessibilityState={{ disabled: cannotLoadLesson || isComplete || isCompleting, checked: isComplete }}
              disabled={cannotLoadLesson || isComplete || isCompleting}
              onPress={() => {
                handleMarkComplete().catch(() => undefined);
              }}
              className={`h-[52px] flex-1 flex-row items-center justify-center gap-2 rounded-[14px] border ${cannotLoadLesson ? "opacity-50" : ""} ${
                isComplete ? "border-green-100 bg-green-50" : isDark ? "border-[#D1D5DB] bg-[#E5E7EB]" : "border-border bg-white"
              }`}
            >
              <Check size={18} color="#16A34A" strokeWidth={2.5} />
              {isCompleting ? (
                <Text className="text-[16px] font-extrabold text-ink">Saving...</Text>
              ) : (
                <Text className={`text-[16px] font-extrabold ${isComplete ? "text-success" : "text-ink"}`}>
                  {isComplete ? "Completed" : "Mark complete"}
                </Text>
              )}
            </Pressable>
            <Pressable
              disabled={cannotLoadLesson}
              accessibilityRole="button"
              accessibilityLabel={nextLesson ? "Open next lesson" : "Finish course"}
              accessibilityState={{ disabled: cannotLoadLesson }}
              className={`h-[52px] flex-1 flex-row items-center justify-center gap-2 rounded-[14px] bg-primary ${cannotLoadLesson ? "opacity-50" : ""}`}
              onPress={() => {
                handleNextLesson().catch(() => undefined);
              }}
            >
              <Text className="text-[16px] font-extrabold text-white">{nextLesson ? "Next lesson" : "Finish course"}</Text>
              <ArrowRight size={18} color="#FFFFFF" strokeWidth={2.4} />
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </>
  );
}

const SCROLL_PROGRESS_JS = `(function(){function p(type,value){var c=window.HOUSEED_CONTEXT||{};window.ReactNativeWebView.postMessage(JSON.stringify({type:type,value:value,courseId:c.courseId,lessonId:c.lessonId}));}function s(){var t=document.documentElement.scrollTop||document.body.scrollTop;var m=Math.max(1,(document.documentElement.scrollHeight||document.body.scrollHeight)-window.innerHeight);p("reading-progress",Math.min(100,Math.round(t/m*100)));}window.addEventListener("scroll",s);s();})();true;`;

interface LessonHtmlParams {
  instructorName: string;
  courseTitle: string;
  lessonTitle: string;
  lessonDescription: string;
  category: string;
  level: string;
  lessonType: string;
  lessonNumber: number;
  totalLessons: number;
  durationMinutes: number;
  isDark: boolean;
}

function createLessonHtml({
  instructorName,
  courseTitle,
  lessonTitle,
  lessonDescription,
  category,
  level,
  lessonType,
  lessonNumber,
  totalLessons,
  durationMinutes,
  isDark,
}: LessonHtmlParams): string {
  const initials = instructorName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${escapeHtml(lessonTitle)}</title>
  <style>
    *{box-sizing:border-box}
    :root{--ink:${isDark ? "#ffffff" : "#0f172a"};--sl:${isDark ? "#c8d0dc" : "#64748b"};--pr:#2563eb;--bd:${isDark ? "#242a36" : "#e2e8f0"};--cn:${isDark ? "#0b0d12" : "#f8fafc"};--sf:${isDark ? "#0b1d45" : "#eff6ff"};--page:${isDark ? "#000000" : "#ffffff"};--panel:${isDark ? "#0b0d12" : "#ffffff"}}
    body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:var(--page);color:var(--ink)}
    main{padding:24px 22px 56px}
    .row{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:2px}
    .chip{padding:5px 12px;border-radius:999px;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.05em}
    .cb{background:var(--sf);color:var(--pr)}.cg{background:${isDark ? "#1b2230" : "#f1f5f9"};color:var(--sl)}
    .instr{display:flex;align-items:center;gap:10px;margin:16px 0 0}
    .av{width:40px;height:40px;border-radius:50%;background:#4c1d95;color:#fff;display:grid;place-items:center;font-size:13px;font-weight:900;flex-shrink:0}
    .iname{font-size:15px;font-weight:700}.imeta{font-size:12px;font-weight:600;color:var(--sl);margin-top:2px}
    .lnum{margin:10px 0 6px;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:var(--pr)}
    h1{font-size:24px;line-height:1.15;margin:0 0 12px;letter-spacing:-.02em}
    .desc{font-size:16px;line-height:1.65;color:${isDark ? "#d1d5db" : "#334155"};font-weight:500;margin:0 0 4px}
    .course-label{font-size:13px;font-weight:700;color:var(--sl);margin:4px 0 0}
    .bridge{margin:22px 0;border:1.5px solid #bfdbfe;border-radius:16px;overflow:hidden}
    .bh{background:var(--pr);color:#fff;padding:10px 15px;font-size:11px;font-weight:800;letter-spacing:.09em;text-transform:uppercase;display:flex;align-items:center;gap:8px}
    .dot{width:8px;height:8px;border-radius:50%;background:#86efac;flex-shrink:0;animation:pulse 2s ease infinite}
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:.35}}
    .bb{background:var(--sf);padding:10px 15px;display:grid;gap:7px}
    .br{display:flex;justify-content:space-between;align-items:baseline;gap:8px;font-size:11.5px}
    .bk{color:var(--sl);font-weight:700;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;flex-shrink:0}
    .bv{color:var(--ink);font-weight:800;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;text-align:right;word-break:break-all}
    .sl{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:var(--sl);margin:22px 0 10px}
    pre{margin:0 0 18px;border-radius:14px;background:#0b1221;color:#dbeafe;padding:16px;font-size:12.5px;line-height:1.7;white-space:pre-wrap;overflow-x:auto}
    .g{color:#86efac}.y{color:#fde68a}.c{color:#94a3b8}
    .tip{border:1px solid ${isDark ? "#1d4ed8" : "#bfdbfe"};background:var(--sf);border-radius:14px;padding:13px 15px;font-size:14px;font-weight:700;color:${isDark ? "#93c5fd" : "var(--pr)"};line-height:1.5}
    .hint{margin-top:26px;padding:14px;background:var(--cn);border-radius:14px;text-align:center;color:var(--sl);font-size:13px;font-weight:700;border:1px solid var(--bd)}
  </style>
</head>
<body>
<main>
  <div class="row">
    <span class="chip cb">${escapeHtml(category)}</span>
    <span class="chip cg">${escapeHtml(level)}</span>
    <span class="chip cg">${escapeHtml(String(durationMinutes))} min</span>
  </div>

  <div class="instr">
    <div class="av">${escapeHtml(initials || "?")}</div>
    <div>
      <div class="iname">${escapeHtml(instructorName)}</div>
      <div class="imeta">Instructor &middot; Lesson ${escapeHtml(String(lessonNumber))} of ${escapeHtml(String(totalLessons))}</div>
    </div>
  </div>

  <div class="lnum">Lesson ${escapeHtml(String(lessonNumber))} &middot; ${escapeHtml(lessonType)}</div>
  <h1>${escapeHtml(lessonTitle)}</h1>
  <p class="desc">${escapeHtml(lessonDescription)}</p>
  <p class="course-label">From: ${escapeHtml(courseTitle)}</p>

  <div class="bridge">
    <div class="bh"><div class="dot"></div>Native &rarr; WebView bridge</div>
    <div class="bb" id="bb">
      <div class="br"><span class="bk">connecting&hellip;</span><span class="bv"></span></div>
    </div>
  </div>

  <div class="sl">Message protocol</div>
  <pre><code><span class="c">// Scroll progress (injected by native shell)</span>
window.ReactNativeWebView.postMessage(
  JSON.stringify({
    type: <span class="g">"reading-progress"</span>,
    value: <span class="y">scrollPercent</span>,  <span class="c">// 0 – 100</span>
    courseId: context.courseId,
    lessonId: context.lessonId,
  })
);

<span class="c">// Mark lesson complete</span>
window.ReactNativeWebView.postMessage(
  JSON.stringify({
    type: <span class="g">"complete"</span>,
    courseId: context.courseId,
    lessonId: context.lessonId,
  })
);</code></pre>

  <div class="tip">The native shell injects <strong>window.HOUSEED_CONTEXT</strong> and <strong>window.HOUSEED_HEADERS</strong> via <em>injectedJavaScriptBeforeContentLoaded</em> — both objects are available synchronously before any page script runs.</div>

  <div class="hint" id="hint">Scroll to the bottom to finish this lesson &darr;</div>
</main>
<script>
(function(){
  var h=window.HOUSEED_HEADERS||{};
  var c=window.HOUSEED_CONTEXT||{};
  function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
  var rows=[
    ['X-HouseEd-Bridge-Version', h['X-HouseEd-Bridge-Version']],
    ['X-HouseEd-Course-Id', h['X-HouseEd-Course-Id']||c.courseId],
    ['X-HouseEd-Lesson-Id', h['X-HouseEd-Lesson-Id']||c.lessonId],
    ['X-HouseEd-Lesson-Type', h['X-HouseEd-Lesson-Type']||c.lessonType],
    ['X-HouseEd-Lesson-Index', h['X-HouseEd-Lesson-Index']||(c.lessonNumber?String(c.lessonNumber):null)],
    ['X-HouseEd-Total-Lessons', h['X-HouseEd-Total-Lessons']||(c.totalLessons?String(c.totalLessons):null)],
    ['X-HouseEd-Instructor', h['X-HouseEd-Instructor']||c.instructorName],
    ['X-HouseEd-Category', h['X-HouseEd-Category']||c.category],
  ];
  var bb=document.getElementById('bb');
  if(bb){
    bb.innerHTML=rows.map(function(r){
      return '<div class="br"><span class="bk">'+esc(r[0])+'</span><span class="bv">'+(r[1]?esc(r[1]):'<em style="opacity:.4">&mdash;</em>')+'</span></div>';
    }).join('');
  }
})();
</script>
</body>
</html>`;
}
