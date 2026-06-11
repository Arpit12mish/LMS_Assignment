import { Link } from "expo-router";
import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, Text, TextInput, View } from "react-native";
import { Button } from "@/components/ui";
import { useAppStore } from "@/store/app-store";

export default function VerifyEmailScreen() {
  const { verifyEmailToken, preferences } = useAppStore();
  const isDark = preferences.darkMode;
  const [token, setToken] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!token.trim()) {
      setError("Paste the verification token from the email link.");
      return;
    }

    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      setMessage(await verifyEmailToken(token.trim()));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not verify email.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className={`flex-1 px-5 ${isDark ? "bg-black" : "bg-white"}`}>
      <View className="flex-1 justify-center">
        <Text className={`text-[30px] font-extrabold leading-9 ${isDark ? "text-white" : "text-ink"}`}>Verify email</Text>
        <Text className={`mt-2 text-[15px] font-medium leading-6 ${isDark ? "text-[#C8D0DC]" : "text-slate"}`}>
          Paste the verification token from the email verification link. The app calls `/users/verify-email/:token`.
        </Text>

        <View className="mt-8 gap-3">
          <TextInput
            autoCapitalize="none"
            value={token}
            onChangeText={setToken}
            placeholder="Verification token"
            placeholderTextColor="#8EA0BC"
            className={`h-[50px] rounded-control border-[1.5px] px-4 ${isDark ? "border-[#242A36] bg-[#0B0D12] text-white" : "border-border bg-white text-ink"}`}
          />
          {message ? <Text className="text-[13px] font-semibold text-success">{message}</Text> : null}
          {error ? <Text className="text-[13px] font-semibold text-error">{error}</Text> : null}
          <Button label="Verify email" loading={loading} onPress={submit} />
        </View>

        <Text className={`mt-6 text-center text-[13px] font-medium ${isDark ? "text-[#C8D0DC]" : "text-slate"}`}>
          Already verified?{" "}
          <Link href="/(auth)/login" className="font-extrabold text-primary">
            Sign in
          </Link>
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}
