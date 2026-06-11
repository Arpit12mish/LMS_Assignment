import { Link, Redirect, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, Text, TextInput, View } from "react-native";
import { Button, ProgressBar } from "@/components/ui";
import { useAppStore } from "@/store/app-store";

export default function RegisterScreen() {
  const router = useRouter();
  const { session, register, preferences } = useAppStore();
  const isDark = preferences.darkMode;
  const [name, setName] = useState("Ash");
  const [email, setEmail] = useState("ash@gmail.com");
  const [password, setPassword] = useState("test@123");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const strength = useMemo(() => {
    let score = 0;
    if (password.length >= 8) score += 30;
    if (/[A-Z]/.test(password)) score += 25;
    if (/[0-9]/.test(password)) score += 20;
    if (/[^a-zA-Z0-9]/.test(password)) score += 25;
    return score;
  }, [password]);

  if (session) return <Redirect href="/(tabs)" />;

  const submit = async () => {
    if (!name.trim() || !email.trim() || !password) {
      setError("Enter your name, email, and password.");
      return;
    }

    if (strength < 75) {
      setError("Use a stronger password before creating your account.");
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await register(name.trim(), email.trim(), password);
      router.replace("/(tabs)");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className={`flex-1 px-5 ${isDark ? "bg-black" : "bg-white"}`}>
      <View className="flex-1 justify-center">
        <Text className={`text-[30px] font-extrabold leading-9 ${isDark ? "text-white" : "text-ink"}`}>Create your learner profile</Text>
        <Text className={`mt-2 text-[15px] font-medium leading-6 ${isDark ? "text-[#C8D0DC]" : "text-slate"}`}>
          Your token is stored in SecureStore. Learning state stays local and resilient.
        </Text>

        <View className="mt-8 gap-3">
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Ash"
            placeholderTextColor="#8EA0BC"
            className={`h-[50px] rounded-control border-[1.5px] px-4 ${isDark ? "border-[#242A36] bg-[#0B0D12] text-white" : "border-border bg-white text-ink"}`}
          />
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
          <View>
            <ProgressBar value={strength} color={strength >= 75 ? "bg-success" : "bg-warning"} />
            <Text className={`mt-1 text-[11px] font-bold ${isDark ? "text-[#C8D0DC]" : "text-slate"}`}>Password strength {strength}%</Text>
          </View>
          {error ? <Text className="text-[13px] font-semibold text-error">{error}</Text> : null}
          <Button label="Create account" loading={loading} onPress={submit} />
        </View>

        <Text className={`mt-6 text-center text-[13px] font-medium ${isDark ? "text-[#C8D0DC]" : "text-slate"}`}>
          Have a verification token?{" "}
          <Link href="/(auth)/verify-email" className="font-extrabold text-primary">
            Verify email
          </Link>
        </Text>

        <Text className={`mt-4 text-center text-[13px] font-medium ${isDark ? "text-[#C8D0DC]" : "text-slate"}`}>
          Already registered?{" "}
          <Link href="/(auth)/login" className="font-extrabold text-primary">
            Sign in
          </Link>
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}
