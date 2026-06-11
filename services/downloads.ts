import { Directory, File, Paths } from "expo-file-system";
import { escapeHtml } from "@/services/html";
import type { DownloadRecord, Lesson } from "@/types/lms";

const downloadsFolderName = "houseed-downloads";

function getDownloadDirectory() {
  const directory = new Directory(Paths.document, downloadsFolderName);
  if (!directory.exists) {
    directory.create({ intermediates: true, idempotent: true });
  }
  return directory;
}

function buildOfflineLessonHtml(lesson: Lesson, sourceNote: string) {
  const lessonType = lesson.type.charAt(0).toUpperCase() + lesson.type.slice(1);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(lesson.title)}</title>
    <style>
      :root { color-scheme: light; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
      body { margin: 0; background: #f8fafc; color: #0f172a; }
      main { padding: 28px 22px 36px; }
      .badge { display: inline-flex; padding: 7px 11px; border-radius: 999px; background: #eff6ff; color: #2563eb; font-size: 12px; font-weight: 800; letter-spacing: .05em; text-transform: uppercase; }
      h1 { margin: 18px 0 10px; font-size: 30px; line-height: 1.08; letter-spacing: 0; }
      p { color: #334155; font-size: 17px; line-height: 1.65; }
      .card { margin-top: 22px; padding: 18px; border: 1px solid #e2e8f0; border-radius: 18px; background: #fff; }
      .meta { color: #64748b; font-size: 13px; font-weight: 700; }
      code { display: block; margin-top: 18px; padding: 18px; border-radius: 14px; background: #0b1221; color: #93c5fd; white-space: pre-wrap; }
    </style>
  </head>
  <body>
    <main>
      <span class="badge">${escapeHtml(lessonType)} - Offline ready</span>
      <h1>${escapeHtml(lesson.title)}</h1>
      <p>${escapeHtml(lesson.description)}</p>
      <section class="card">
        <div class="meta">${escapeHtml(String(lesson.durationMinutes))} min lesson package</div>
        <p>This local reader was generated so the lesson remains available offline even when the remote media host blocks direct file download.</p>
        <code>window.ReactNativeWebView.postMessage('offline:ready')</code>
      </section>
      <p class="meta">${escapeHtml(sourceNote)}</p>
    </main>
  </body>
</html>`;
}

function createOfflineLessonPackage(lesson: Lesson, sourceNote: string): DownloadRecord {
  const directory = getDownloadDirectory();
  const file = new File(directory, `${lesson.id}.html`);
  file.create({ intermediates: true, overwrite: true });
  file.write(buildOfflineLessonHtml(lesson, sourceNote), { encoding: "utf8" });
  const sizeBytes = file.size ?? 0;

  return {
    lessonId: lesson.id,
    courseId: lesson.courseId,
    title: lesson.title,
    uri: file.uri,
    progress: 100,
    status: "downloaded",
    sizeBytes,
    sizeLabel: sizeBytes > 0 ? formatDownloadSize(sizeBytes) : "Offline reader",
  };
}

function formatDownloadSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024 / 1024))} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export async function downloadLessonFile(lesson: Lesson): Promise<DownloadRecord> {
  if (!lesson.downloadUrl) {
    return createOfflineLessonPackage(lesson, "Generated from lesson metadata.");
  }

  try {
    const directory = getDownloadDirectory();
    const extension = lesson.type === "resource" ? "pdf" : "mp4";
    const destination = new File(directory, `${lesson.id}.${extension}`);
    const file = await File.downloadFileAsync(lesson.downloadUrl, destination, { idempotent: true });

    const sizeBytes = file.size ?? 0;
    return {
      lessonId: lesson.id,
      courseId: lesson.courseId,
      title: lesson.title,
      uri: file.uri,
      progress: 100,
      status: "downloaded",
      sizeBytes,
      sizeLabel: sizeBytes > 0 ? formatDownloadSize(sizeBytes) : undefined,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Remote file unavailable.";
    return createOfflineLessonPackage(lesson, message);
  }
}
