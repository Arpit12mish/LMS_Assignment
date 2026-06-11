# HouseEd LMS – React Native Expo Mobile App

[Watch Demo](assets/demo/DemoVideo.mp4)
**[Download APK](https://expo.dev/accounts/arpit12mish/projects/myAssign/builds/c68afcbb-62f0-4c78-ba7a-d6ff3d7120e6)** 

HouseEd is a production-style Mini LMS built with **React Native Expo**, **TypeScript strict mode**, **Expo Router**, **NativeWind**, **Expo SecureStore**, and **AsyncStorage**. It is aligned with the assignment requirements: authentication, course catalog API integration, bookmark persistence, WebView course content, local notifications, offline states, retry handling, optimized lists, downloads, and profile management.

> Built and designed by [Arpit Mishra](https://www.linkedin.com/in/mish12arpit-187075288/)
> Mail : mish12arpit@gmail.com

---

## **Features**

| Feature | Description |
|----------|--------------|
| **Auth** | Login/register through `/api/v1/users` endpoints with tokens stored in Expo SecureStore |
| **Auto-login** | Restores a valid SecureStore session on app restart |
| **Course Catalog** | Fetches random products as courses and random users as instructors from `https://api.freeapi.app` |
| **LegendList** | Optimized course list with stable keys, memoized cards, pull-to-refresh, search, and filters |
| **Bookmarks** | Bookmark toggle persisted through AsyncStorage with a 5+ bookmark local notification |
| **Course Details** | Course hero, instructor, stats, curriculum, enroll/resume state, progress, and download actions |
| **WebView Reader** | Local HTML lesson content with native-to-web context injection and web-to-native progress messages |
| **Native Features** | Expo Notifications, Expo FileSystem downloads, Expo ImagePicker avatar updates, Expo Network offline banner |
| **State Management** | Global React store with SecureStore for sensitive data and AsyncStorage for app data |
| **Error Handling** | API timeout, retry logic, cached fallback, friendly errors, and WebView reload states |

---

## **Design System**

The refreshed mobile LMS visual system uses the short brand name **HouseEd** for **House of Edtech**. The system is aligned with the assignment brief: Expo Router-ready screen anatomy, NativeWind tokens, SecureStore auth states, AsyncStorage bookmark/progress states, WebView reader states, notifications, downloads, and offline handling.

- Visual board: [docs/houseed-design-system.html](docs/houseed-design-system.html)
- Implementation spec: [docs/houseed-design-system.md](docs/houseed-design-system.md)
- Code tokens: [design-system/tokens.ts](design-system/tokens.ts)

---

## **Tech Stack**

| Category | Technology |
|-----------|-------------|
| Framework | Expo SDK 54 / React Native 0.81 |
| Language | TypeScript with `strict: true` |
| Navigation | Expo Router |
| Styling | NativeWind / Tailwind tokens |
| Sensitive Storage | Expo SecureStore |
| App Storage | AsyncStorage |
| Lists | `@legendapp/list` LegendList |
| Web Content | `react-native-webview` |
| Native APIs | Expo Notifications, FileSystem, Network, ImagePicker |

---

## **Project Structure**

```text
app/                    Expo Router routes
app/(auth)/             Login and register
app/(tabs)/             Home, Explore, Saved, Offline, Profile
app/course/[id].tsx     Course detail and enrollment
app/lesson/[id].tsx     WebView lesson reader
components/             NativeWind UI primitives and course cards
services/               API, auth, courses, downloads, notifications, storage
store/                  Global app state provider
types/                  Strict TypeScript domain models
design-system/          Code design tokens
docs/                   Visual and implementation design-system docs
```

---

## **Setup**

```bash
npm install
npm run typecheck
npm start
```

Recommended local runtime: **Node 20 or 22 LTS**. Node 25 can trigger an Expo CLI/freeport startup error before Metro finishes booting.

Environment variables:

```bash
EXPO_PUBLIC_API_BASE_URL=https://api.freeapi.app
```

If the variable is omitted, the app defaults to `https://api.freeapi.app`.

---

## **Key Architecture Decisions**

- SecureStore is used only for auth tokens and sensitive session values.
- AsyncStorage is used for course cache, bookmarks, enrollment, progress, downloads, and preferences.
- API calls use a typed wrapper with timeout, retry, auth header injection, and friendly errors.
- Course catalog uses LegendList with `recycleItems`, stable `keyExtractor`, estimated item size, and memoized cards.
- WebView lessons use injected JavaScript for native-to-web context and `postMessage` for reading progress/completion.
- Offline UX is visible but calm: cached courses remain available and the banner explains the state.

---
