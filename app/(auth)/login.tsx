import { Link, Redirect, useRouter } from "expo-router";
import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, Text, TextInput, View } from "react-native";
import { Button } from "@/components/ui";
import { ApiError } from "@/services/api";
import { useAppStore } from "@/store/app-store";

export default function LoginScreen() {
  const router = useRouter();
  const { session, login, openGoogleLogin, preferences } = useAppStore();
  const isDark = preferences.darkMode;
  const [email, setEmail] = useState("ash@gmail.com");
  const [password, setPassword] = useState("test@123");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (session) return <Redirect href="/(tabs)" />;

  const submit = async () => {
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await login(email.trim(), password);
      router.replace("/(tabs)");
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401 || err.status === 403) {
          setError("Incorrect email or password. Please try again.");
        } else if (err.status === 400) {
          setError(err.message || "Invalid email or password format.");
        } else if (err.status != null && err.status >= 500) {
          setError("Server error. Please try again in a moment.");
        } else {
          setError(err.message || "Could not sign in.");
        }
      } else {
        setError(err instanceof Error ? err.message : "Could not sign in.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className={`flex-1 px-5 ${isDark ? "bg-black" : "bg-white"}`}>
      <View className="flex-1 justify-center">
        <View className="mb-8 h-14 w-14 items-center justify-center rounded-2xl bg-primary">
          <Text className="text-2xl font-black text-white">H</Text>
        </View>
        <Text className={`text-[30px] font-extrabold leading-9 ${isDark ? "text-white" : "text-ink"}`}>Welcome to HouseEd</Text>
        <Text className={`mt-2 text-[15px] font-medium leading-6 ${isDark ? "text-[#C8D0DC]" : "text-slate"}`}>
          Continue your courses, bookmarks, offline lessons, and WebView content securely.
        </Text>

        <View className="mt-8 gap-3">
          <TextInput
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            placeholder="ash@gmail.com"
            placeholderTextColor="#8EA0BC"
            className={`h-[50px] rounded-control border-[1.5px] px-4 ${isDark ? "border-[#242A36] bg-[#0B0D12] text-white" : "border-border bg-white text-ink"}`}
          />
          <TextInput
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            placeholder="test@123"
            placeholderTextColor="#8EA0BC"
            className={`h-[50px] rounded-control border-[1.5px] px-4 ${isDark ? "border-[#242A36] bg-[#0B0D12] text-white" : "border-border bg-white text-ink"}`}
          />
          {error ? <Text className="text-[13px] font-semibold text-error">{error}</Text> : null}
          <Button label="Sign in" loading={loading} onPress={submit} />
          <Button
            label="Login with Google"
            variant="ghost"
            onPress={() => {
              openGoogleLogin().catch((err) => setError(err instanceof Error ? err.message : "Could not open Google login."));
            }}
          />
        </View>

        <Text className={`mt-4 text-center text-[13px] font-medium ${isDark ? "text-[#C8D0DC]" : "text-slate"}`}>
          Forgot password?{" "}
          <Link href="/(auth)/forgot-password" className="font-extrabold text-primary">
            Recover account
          </Link>
        </Text>

        <Text className={`mt-4 text-center text-[13px] font-medium ${isDark ? "text-[#C8D0DC]" : "text-slate"}`}>
          New to House of Edtech?{" "}
          <Link href="/(auth)/register" className="font-extrabold text-primary">
            Create account
          </Link>
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}
