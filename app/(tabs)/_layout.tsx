import { Redirect, Tabs } from "expo-router";
import { Bookmark, Compass, Download, Home, UserRound } from "lucide-react-native";
import React from "react";
import { useAppStore } from "@/store/app-store";

const tabLabels: Record<string, string> = {
  index: "Home",
  explore: "Explore",
  saved: "Saved",
  downloads: "Downloads",
  profile: "Profile",
};

const tabIcons = {
  index: Home,
  explore: Compass,
  saved: Bookmark,
  downloads: Download,
  profile: UserRound,
};

export default function TabsLayout() {
  const { session, isHydrated, bookmarks, preferences } = useAppStore();
  const isDark = preferences.darkMode;

  if (isHydrated && !session) return <Redirect href="/(auth)/login" />;

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: "#2563EB",
        tabBarInactiveTintColor: isDark ? "#D1D5DB" : "#64748B",
        tabBarStyle: {
          height: 78,
          paddingBottom: 14,
          paddingTop: 9,
          borderTopColor: isDark ? "#242A36" : "#E2E8F0",
          backgroundColor: isDark ? "#000000" : "#FFFFFF",
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "700",
        },
        tabBarIcon: ({ color, focused }) => {
          const Icon = tabIcons[route.name as keyof typeof tabIcons] ?? Home;
          return <Icon size={22} color={color} strokeWidth={focused ? 2.8 : 2.1} />;
        },
      })}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="explore" options={{ title: "Explore" }} />
      <Tabs.Screen
        name="saved"
        options={{
          title: "Saved",
          tabBarBadge: bookmarks.length || undefined,
          tabBarBadgeStyle: {
            minWidth: 18,
            height: 18,
            borderRadius: 9,
            backgroundColor: "#2563EB",
            color: "#FFFFFF",
            fontSize: 10,
            fontWeight: "800",
          },
        }}
      />
      <Tabs.Screen name="downloads" options={{ title: "Downloads" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}
