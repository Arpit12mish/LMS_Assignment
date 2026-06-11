import { Redirect } from "expo-router";
import React from "react";
import { ActivityIndicator, View } from "react-native";
import { useAppStore } from "@/store/app-store";

export default function IndexRoute() {
  const { isHydrated, session, preferences } = useAppStore();
  const isDark = preferences.darkMode;

  if (!isHydrated) {
    return (
      <View className={`flex-1 items-center justify-center ${isDark ? "bg-black" : "bg-canvas"}`}>
        <ActivityIndicator color="#2563EB" />
      </View>
    );
  }

  return <Redirect href={session ? "/(tabs)" : "/(auth)/login"} />;
}
