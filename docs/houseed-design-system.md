# HouseEd Mobile LMS Design System

HouseEd is the short product name for House of Edtech inside the mobile LMS UI. The design direction follows the supplied visual reference: a calm near-white system, strong slate text, one confident blue, and red reserved only for meaningful error/offline/destructive states. Dark mode is a first-class product theme, not a tab-bar-only treatment.

## Foundation Tokens

| Token | Value | NativeWind utility | Use |
| --- | --- | --- | --- |
| primary | `#2563EB` | `bg-primary`, `text-primary` | CTAs, active tab, links, progress fill |
| primaryDeep | `#1D4ED8` | `bg-primaryDeep` | Pressed CTA, active states |
| navy | `#0B1221` | `bg-navy`, `text-navy` | Continue-learning card, WebView shell, offline banner |
| ink | `#0F172A` | `text-ink` | Main headings and body text |
| slate | `#64748B` | `text-slate` | Captions, metadata, secondary labels |
| softBlue | `#EFF6FF` | `bg-softBlue` | Selected chips, info tiles, subtle highlights |
| canvas | `#F8FAFC` | `bg-canvas` | App screen background |
| border | `#E2E8F0` | `border-border` | Inputs, cards, separators |
| success | `#16A34A` | `text-success`, `bg-success` | Completed lessons and success badges |
| warning | `#F59E0B` | `text-warning`, `bg-warning` | Pending sync and queued downloads |
| error | `#DC2626` | `text-error`, `bg-error` | Offline failure, validation, logout/delete |
| darkPage | `#000000` | `bg-black` | Dark-mode page and tab background |
| darkSurface | `#0B0D12` | `bg-[#0B0D12]` | Dark-mode cards, sheets, inputs |
| darkRaised | `#111827` | `bg-[#111827]` | Raised dark containers and skeletons |
| darkBorder | `#242A36` | `border-[#242A36]` | Dark-mode card, input, and divider borders |
| darkText | `#FFFFFF` | `text-white` | Primary dark-mode headings/body text |
| darkMuted | `#C8D0DC` | `text-[#C8D0DC]` | Secondary dark-mode labels and metadata |
| darkInactive | `#D1D5DB` | `text-[#D1D5DB]` | Inactive dark-mode icons and tab labels |
| darkInactiveSurface | `#E5E7EB` | `bg-[#E5E7EB]` | Inactive/ghost controls in dark mode |

## Dark Mode Rules

Dark mode is driven by the persisted app preference, not by OS-only styling. The implementation reads `preferences.darkMode` from the app store and applies explicit classes so the whole page changes immediately when the switch is toggled.

- Page and screen backgrounds use true black (`#000000`) for a premium OLED feel.
- Cards, modals, inputs, and tab-adjacent surfaces use `#0B0D12`, with `#242A36` borders to keep hierarchy visible.
- Primary text is white; supporting text is `#C8D0DC`.
- Active controls stay HouseEd blue (`#2563EB`).
- Inactive ghost buttons/chips use light grey surfaces (`#E5E7EB`) with ink text, so they remain readable against black.
- Red remains reserved for destructive, validation, offline failure, and error states.

## Type Scale

Use Plus Jakarta Sans through `expo-font` when the font asset is bundled. Fall back to the native system font if the font cannot load.

| Style | Size/weight | Use |
| --- | --- | --- |
| Display | `30/800` | Auth headings, profile name, screen hero titles |
| Title | `18/800` | Course cards, course detail title blocks |
| Section | `16.5/800` | Section headers |
| Body | `15/600` | Primary readable text |
| Secondary | `13/500` | Captions, instructor name, lesson meta |
| Caption | `11.5/600` | Badges, tab labels, small status text |
| Mono | `10-12/600` | Durations, file sizes, PDF labels |

## NativeWind Theme Extension

```js
// tailwind.config.js
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./features/**/*.{ts,tsx}", "./design-system/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: "#2563EB",
        primaryDeep: "#1D4ED8",
        navy: "#0B1221",
        ink: "#0F172A",
        slate: "#64748B",
        softBlue: "#EFF6FF",
        canvas: "#F8FAFC",
        border: "#E2E8F0",
        success: "#16A34A",
        warning: "#F59E0B",
        error: "#DC2626",
        darkPage: "#000000",
        darkSurface: "#0B0D12",
        darkRaised: "#111827",
        darkBorder: "#242A36",
        darkText: "#FFFFFF",
        darkMuted: "#C8D0DC",
        darkInactive: "#D1D5DB",
        darkInactiveSurface: "#E5E7EB",
      },
      borderRadius: {
        card: "18px",
        control: "14px",
      },
      boxShadow: {
        card: "0 4px 16px rgba(15,23,42,0.05)",
      },
    },
  },
  plugins: [],
};
```

## Core Components

| Component | Variants/props | Assignment purpose |
| --- | --- | --- |
| `Button` | `primary`, `dark`, `ghost`, `soft`, `danger`; `icon`, `loading` | Auth, enroll, retry, logout |
| `CourseCard` | `compact`, `featured`, `saved`; `isBookmarked` | Random products as courses, bookmark state |
| `CourseCover` | `tone`, `height`, `imageUrl`, `fallbackLabel` | Course thumbnails and hero blocks |
| `LessonRow` | `video`, `article`, `quiz`, `resource`; `completed`, `downloaded` | Course curriculum and offline lessons |
| `ProgressBar` | `value`, `track`, `color`, `accessibilityValue` | Course progress, reading progress, downloads |
| `Chip` | `active`, `icon`, `count` | Category filters, saved segments |
| `StatCard` | `icon`, `value`, `label`, `tone` | Home/profile statistics |
| `OfflineBanner` | `offline`, `syncing`, `error` | Network monitoring and retry states |
| `Avatar` | `uri`, `initials`, `editable`, `size` | Profile and instructor identity |
| `SettingsRow` | `switch`, `link`, `danger` | Preferences and logout |
| `Skeleton` | `course`, `detail`, `webview` | Loading states that mirror real layouts |
| `ErrorState` | `title`, `message`, `actionLabel` | API and WebView failures |

## Screen System

### Auth

Routes:

- `app/(auth)/login.tsx`
- `app/(auth)/register.tsx`
- `app/(auth)/forgot-password.tsx`
- `app/(auth)/verify-email.tsx`

Required behavior:

- Login/register through `/api/v1/users` endpoints.
- Store auth token with Expo SecureStore.
- Restore session on app launch.
- Support Google redirect, email verification, forgot password, reset password, refresh token, change password, and logout paths.
- Show validation states without exposing raw API messages.

Classes:

- Light screen: `flex-1 bg-white px-5 justify-center`
- Dark screen: `flex-1 bg-black px-5 justify-center`
- Light input: `h-[50px] rounded-control border-[1.5px] border-border bg-white px-4 text-ink`
- Dark input: `h-[50px] rounded-control border-[1.5px] border-[#242A36] bg-[#0B0D12] px-4 text-white`
- CTA: `h-[52px] rounded-control bg-primary items-center justify-center`

### Home Dashboard

Route: `app/(tabs)/index.tsx`

Content:

- Greeting and avatar.
- Continue learning navy card.
- Enrolled, progress, saved stats.
- Last-opened timestamp and 24-hour reminder status.
- Recommended rail from cached courses.
- Learning snapshot, next lessons, and focus categories.
- Offline banner when `expo-network` reports unavailable connection.

Assignment coverage:

- App state, persistence, offline mode, performance-oriented horizontal list.

### Explore Catalog

Route: `app/(tabs)/explore.tsx`

Content:

- Search input.
- Category chips.
- Course list using LegendList.
- Course data from `/api/v1/public/randomproducts`.
- Instructor data from `/api/v1/public/randomusers`.
- Bookmark icon with AsyncStorage persistence.
- Pull-to-refresh with retry/timeout handling.

Classes:

- Screen: `flex-1 bg-canvas`
- Card: `bg-white rounded-card border border-border p-3`
- Active chip: `px-4 py-2.5 rounded-full bg-ink`
- Inactive chip: `px-4 py-2.5 rounded-full bg-white border border-border`

### Course Detail

Route: `app/course/[id].tsx`

Content:

- Course hero image.
- Instructor row.
- Course stats: level, duration, lessons, rating.
- Enroll/Resume button with visual feedback.
- Bookmark toggle.
- Module and lesson list.

Assignment coverage:

- Complete course information, enrollment state, bookmark local storage, memoized lesson rows.

### WebView Lesson Reader

Route: `app/lesson/[id].tsx`

Content:

- Native header with back, title, bookmark, download.
- Reading progress bar.
- Local HTML template rendered in WebView.
- Native-to-WebView headers for course id, auth state, and theme.
- Web-to-native `postMessage` progress events.
- Retry UI for failed loads.

Implementation notes:

```ts
const injectedJavaScriptBeforeContentLoaded = `
  window.HOUSEED_CONTEXT = {
    courseId: "${courseId}",
    lessonId: "${lessonId}",
    theme: preferences.darkMode ? "dark" : "light"
  };
  window.HOUSEED_HEADERS = {
    "X-HouseEd-Course-Id": "${courseId}",
    "X-HouseEd-Lesson-Id": "${lessonId}"
  };
  true;
`;
```

```ts
const handleMessage = (event: WebViewMessageEvent) => {
  const payload = JSON.parse(event.nativeEvent.data);
  if (payload.type === "reading-progress") {
    setProgress(payload.value);
  }
};
```

### Saved

Route: `app/(tabs)/saved.tsx`

Content:

- Segmented control: courses, lessons, resources.
- Live counts.
- Search toggle for saved courses.
- Empty state leading back to Explore.
- Notification triggered when bookmark count reaches 5 or more.

### Downloads

Route: `app/(tabs)/downloads.tsx`

Content:

- Offline banner.
- Storage meter.
- Wi-Fi-only setting note.
- Download rows with queued, downloading, downloaded, failed states.
- Offline mode shows only downloaded lessons.

Assignment coverage:

- Expo FileSystem, AsyncStorage, network monitoring, retry states.

### Profile

Route: `app/(tabs)/profile.tsx`

Content:

- Avatar update through image/camera flow.
- Name and email.
- Course and progress stats.
- Preferences: notifications, dark mode, Wi-Fi-only downloads.
- Last sync status.
- Settings sheet with token refresh, password change, sync, and 24-hour notification preview tools.
- Logout as red destructive action.

Assignment coverage:

- User profile, native image handling, preferences, SecureStore logout.

## API And State Architecture

Recommended folders:

```text
app/
components/
features/auth/
features/courses/
features/webview/
features/profile/
services/api.ts
services/storage.ts
services/notifications.ts
store/app-store.tsx
types/
```

State ownership:

- SecureStore: auth token and refresh token.
- AsyncStorage/MMKV: bookmarks, enrollment, progress, preferences, downloads, cached course payloads, sync timestamps, reminder preview timestamps.
- React context or lightweight store: hydrated auth state, course state, network state.

API client requirements:

- Base URL: `https://api.freeapi.app`
- Timeout.
- Retry for transient network errors.
- Auth header injection.
- Token refresh hook.
- User-friendly errors.

Dark-mode implementation:

- `DarkModeSync` still informs NativeWind of the selected scheme for compatibility.
- Core screens and shared components read `preferences.darkMode` directly and apply explicit classes.
- The WebView lesson template receives the selected theme through `HOUSEED_CONTEXT` and renders matching page/card/text colors.

## Notification Rules

- Ask permission after login or when the learner first saves a course.
- When bookmarks reach 5, schedule a congratulatory local notification.
- On app background/inactivity, schedule a 24-hour learning reminder.
- Cancel stale reminder on app foreground.

## Accessibility Requirements

- Touch targets are at least `44x44`.
- All icon buttons have `accessibilityLabel`.
- Progress bars expose `accessibilityValue`.
- Toggles use `accessibilityRole="switch"` and checked state.
- Never rely on color alone; pair status color with label or icon.
- WebView screen preserves focus order: native header, content, footer actions.
- Text wraps naturally and supports dynamic font scaling.

## Orientation

Portrait is primary. In landscape:

- Auth forms center in a max-width column.
- Home and Explore can use two-column grids on tablets and wide devices.
- Lesson reader keeps header and footer pinned while WebView expands.
- Bottom tabs can become a left rail on large screens.

## Visual Reference

Open `docs/houseed-design-system.html` to view the foundation board matching the supplied design-system image.
