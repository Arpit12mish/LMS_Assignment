import "@/global.css";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { View } from "react-native";
import { AppProvider, useAppStore } from "@/store/app-store";

export default function RootLayout() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}

function AppShell() {
  const { preferences } = useAppStore();

  return (
    <View className={`flex-1 ${preferences.darkMode ? "dark bg-black" : "bg-white"}`}>
      <StatusBar style={preferences.darkMode ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      />
    </View>
  );
}
