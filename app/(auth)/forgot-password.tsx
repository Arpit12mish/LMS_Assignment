import { Link } from "expo-router";
import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, Text, TextInput, View } from "react-native";
import { Button } from "@/components/ui";
import { useAppStore } from "@/store/app-store";

export default function ForgotPasswordScreen() {
  const { requestPasswordReset, resetPassword, preferences } = useAppStore();
  const isDark = preferences.darkMode;
  const [email, setEmail] = useState("ash@gmail.com");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("test@123");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingRequest, setLoadingRequest] = useState(false);
  const [loadingReset, setLoadingReset] = useState(false);

  const requestReset = async () => {
    if (!email.trim()) {
      setError("Enter the account email.");
      return;
    }

    setError(null);
    setMessage(null);
    setLoadingRequest(true);
    try {
      setMessage(await requestPasswordReset(email.trim()));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not request password reset.");
    } finally {
      setLoadingRequest(false);
    }
  };

  const submitReset = async () => {
    if (!resetToken.trim() || !newPassword) {
      setError("Enter reset token and new password.");
      return;
    }

    setError(null);
    setMessage(null);
    setLoadingReset(true);
    try {
      setMessage(await resetPassword(resetToken.trim(), newPassword));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reset password.");
    } finally {
      setLoadingReset(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className={`flex-1 px-5 ${isDark ? "bg-black" : "bg-white"}`}>
      <View className="flex-1 justify-center">
        <Text className={`text-[30px] font-extrabold leading-9 ${isDark ? "text-white" : "text-ink"}`}>Recover access</Text>
        <Text className={`mt-2 text-[15px] font-medium leading-6 ${isDark ? "text-[#C8D0DC]" : "text-slate"}`}>
          Request a reset email, then paste the reset token from the email link to set a new password.
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
          <Button label="Send reset email" loading={loadingRequest} onPress={requestReset} />

          <View className={`mt-4 gap-3 rounded-[16px] border p-4 ${isDark ? "border-[#242A36] bg-[#0B0D12]" : "border-border bg-canvas"}`}>
            <Text className={`text-[16px] font-extrabold ${isDark ? "text-white" : "text-ink"}`}>Reset with token</Text>
            <TextInput
              autoCapitalize="none"
              value={resetToken}
              onChangeText={setResetToken}
              placeholder="Reset token from email"
              placeholderTextColor="#8EA0BC"
              className={`h-[50px] rounded-control border-[1.5px] px-4 ${isDark ? "border-[#242A36] bg-black text-white" : "border-border bg-white text-ink"}`}
            />
            <TextInput
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="test@123"
              placeholderTextColor="#8EA0BC"
              className={`h-[50px] rounded-control border-[1.5px] px-4 ${isDark ? "border-[#242A36] bg-black text-white" : "border-border bg-white text-ink"}`}
            />
            <Button label="Reset password" loading={loadingReset} onPress={submitReset} />
          </View>

          {message ? <Text className="text-[13px] font-semibold text-success">{message}</Text> : null}
          {error ? <Text className="text-[13px] font-semibold text-error">{error}</Text> : null}
        </View>

        <Text className={`mt-6 text-center text-[13px] font-medium ${isDark ? "text-[#C8D0DC]" : "text-slate"}`}>
          Ready to sign in?{" "}
          <Link href="/(auth)/login" className="font-extrabold text-primary">
            Back to login
          </Link>
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}
