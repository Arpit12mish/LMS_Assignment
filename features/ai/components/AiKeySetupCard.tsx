import { Eye, EyeOff, KeyRound, Trash2 } from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";
import { clearGeminiKey, loadGeminiKey, looksLikeGeminiKey, maskKey, saveGeminiKey } from "../aiKeyStorage";
import { testGeminiKey } from "../geminiClient";

interface AiKeySetupCardProps {
  isDark: boolean;
  /** Called after save (true) or clear (false) so the parent can update its mode state */
  onKeyChanged: (hasKey: boolean) => void;
}

type ActionState = "idle" | "saving" | "testing" | "clearing";

export function AiKeySetupCard({ isDark, onKeyChanged }: AiKeySetupCardProps) {
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [showInput, setShowInput] = useState(false);
  const [revealInput, setRevealInput] = useState(false);
  const [actionState, setActionState] = useState<ActionState>("idle");
  const [msg, setMsg] = useState<{ text: string; isError: boolean; isWarn?: boolean } | null>(null);

  // When this is true the next Save press will proceed despite the format warning
  const saveAnywayRef = useRef(false);

  // Load key status on mount — never log the actual key
  useEffect(() => {
    loadGeminiKey()
      .then((key) => {
        setSavedKey(key);
        if (!key) setShowInput(true);
      })
      .catch(() => setSavedKey(null));
  }, []);

  const isBusy = actionState !== "idle";

  const clearMsg = () => setMsg(null);

  // Reset the "save anyway" gate whenever the user changes the input
  const handleInputChange = (text: string) => {
    setInputValue(text);
    saveAnywayRef.current = false;
    clearMsg();
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    const trimmed = inputValue.trim();
    if (!trimmed) {
      setMsg({ text: "Please paste a Gemini API key before saving.", isError: true });
      return;
    }

    // Format check — warn once, then allow a second press to save anyway
    if (!looksLikeGeminiKey(trimmed) && !saveAnywayRef.current) {
      saveAnywayRef.current = true;
      setMsg({
        text:
          'This does not look like a Gemini API key. Gemini keys usually start with "AIza". ' +
          "Get a key from aistudio.google.com. Press Save again to save anyway.",
        isError: false,
        isWarn: true,
      });
      return;
    }

    setActionState("saving");
    clearMsg();
    saveAnywayRef.current = false;
    try {
      await saveGeminiKey(trimmed);
      setSavedKey(trimmed);
      setInputValue("");
      setRevealInput(false);
      setShowInput(false);
      onKeyChanged(true);
      setMsg({ text: "Key saved securely in Expo SecureStore.", isError: false });
    } catch (err) {
      setMsg({ text: err instanceof Error ? err.message : "Could not save key.", isError: true });
    } finally {
      setActionState("idle");
    }
  };

  // ── Test ──────────────────────────────────────────────────────────────────
  const handleTest = async () => {
    const keyToTest = savedKey ?? inputValue.trim();
    if (!keyToTest) {
      setMsg({ text: "No key to test. Save or paste a key first.", isError: true });
      return;
    }

    if (!looksLikeGeminiKey(keyToTest)) {
      setMsg({
        text:
          'This does not look like a Gemini API key — Gemini keys start with "AIza". ' +
          "Create one at aistudio.google.com.",
        isError: false,
        isWarn: true,
      });
      // Still proceed with the test so the user gets the actual API error
    }

    setActionState("testing");
    clearMsg();
    try {
      await testGeminiKey(keyToTest);
      setMsg({ text: "Key is valid — Gemini responded successfully. AI mode is ready.", isError: false });
    } catch (err) {
      setMsg({ text: err instanceof Error ? err.message : "Key test failed.", isError: true });
    } finally {
      setActionState("idle");
    }
  };

  // ── Clear ─────────────────────────────────────────────────────────────────
  const handleClear = async () => {
    setActionState("clearing");
    clearMsg();
    try {
      await clearGeminiKey();
      setSavedKey(null);
      setInputValue("");
      setRevealInput(false);
      setShowInput(true);
      saveAnywayRef.current = false;
      onKeyChanged(false);
      setMsg({ text: "Key removed. App is now in local fallback mode.", isError: false });
    } catch (err) {
      setMsg({ text: err instanceof Error ? err.message : "Could not clear key.", isError: true });
    } finally {
      setActionState("idle");
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  const msgColor = msg?.isWarn
    ? "text-warning"
    : msg?.isError
    ? "text-error"
    : "text-success";

  return (
    <View
      className={`mb-5 rounded-[18px] border p-4 ${
        isDark ? "border-[#242A36] bg-[#0B0D12]" : "border-border bg-white"
      }`}
    >
      {/* Header row */}
      <View className="flex-row items-center gap-3">
        <View
          className={`h-[42px] w-[42px] items-center justify-center rounded-[10px] ${
            isDark ? "bg-[#24113F]" : "bg-purple-50"
          }`}
        >
          <KeyRound size={20} color="#7C3AED" strokeWidth={2.4} />
        </View>
        <View className="min-w-0 flex-1">
          <Text className={`text-[15px] font-extrabold ${isDark ? "text-white" : "text-ink"}`}>
            Gemini API Key
          </Text>
          <Text
            className={`text-[12px] font-semibold ${isDark ? "text-[#C8D0DC]" : "text-slate"}`}
          >
            {savedKey ? maskKey(savedKey) : "No key saved — local mode active"}
          </Text>
        </View>
        {savedKey ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={showInput ? "Hide key input" : "Update API key"}
            onPress={() => {
              setShowInput((v) => !v);
              clearMsg();
              saveAnywayRef.current = false;
            }}
            className={`rounded-[10px] border px-3 py-2 ${
              isDark ? "border-[#242A36] bg-black" : "border-border bg-canvas"
            }`}
          >
            <Text
              className={`text-[12px] font-extrabold ${isDark ? "text-[#C8D0DC]" : "text-slate"}`}
            >
              {showInput ? "Hide" : "Update"}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {/* Key input row */}
      {showInput ? (
        <View className="mt-4 gap-3">
          <View
            className={`h-[50px] flex-row items-center overflow-hidden rounded-[13px] border px-4 ${
              isDark ? "border-[#242A36] bg-black" : "border-border bg-canvas"
            }`}
          >
            <TextInput
              value={inputValue}
              onChangeText={handleInputChange}
              placeholder='Paste Gemini API key  (AIza…)'
              placeholderTextColor="#8EA0BC"
              secureTextEntry={!revealInput}
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
              className={`min-w-0 flex-1 text-[14px] font-semibold ${
                isDark ? "text-white" : "text-ink"
              }`}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={revealInput ? "Hide key" : "Show key"}
              hitSlop={12}
              onPress={() => setRevealInput((v) => !v)}
            >
              {revealInput ? (
                <EyeOff size={18} color="#8EA0BC" strokeWidth={2.2} />
              ) : (
                <Eye size={18} color="#8EA0BC" strokeWidth={2.2} />
              )}
            </Pressable>
          </View>

          <View className="flex-row gap-2">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Save API key"
              disabled={isBusy}
              onPress={handleSave}
              className={`h-[44px] flex-1 items-center justify-center rounded-[13px] bg-primary ${
                isBusy ? "opacity-60" : ""
              }`}
            >
              {actionState === "saving" ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text className="text-[14px] font-extrabold text-white">
                  {msg?.isWarn ? "Save Anyway" : "Save Key"}
                </Text>
              )}
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Test API key"
              disabled={isBusy}
              onPress={handleTest}
              className={`h-[44px] flex-1 items-center justify-center rounded-[13px] ${
                isDark ? "bg-[#0B1D45]" : "bg-softBlue"
              } ${isBusy ? "opacity-60" : ""}`}
            >
              {actionState === "testing" ? (
                <ActivityIndicator color="#2563EB" />
              ) : (
                <Text className="text-[14px] font-extrabold text-primary">Test Key</Text>
              )}
            </Pressable>
          </View>
        </View>
      ) : null}

      {/* Test button when key is saved but input is hidden */}
      {savedKey && !showInput ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Test saved API key"
          disabled={isBusy}
          onPress={handleTest}
          className={`mt-3 h-[44px] items-center justify-center rounded-[13px] ${
            isDark ? "bg-[#0B1D45]" : "bg-softBlue"
          } ${isBusy ? "opacity-60" : ""}`}
        >
          {actionState === "testing" ? (
            <ActivityIndicator color="#2563EB" />
          ) : (
            <Text className="text-[14px] font-extrabold text-primary">Test Saved Key</Text>
          )}
        </Pressable>
      ) : null}

      {/* Clear button */}
      {savedKey ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Clear Gemini API key"
          disabled={isBusy}
          onPress={handleClear}
          className={`mt-3 h-[44px] flex-row items-center justify-center gap-2 rounded-[13px] border ${
            isDark ? "border-[#242A36] bg-black" : "border-border bg-canvas"
          } ${isBusy ? "opacity-60" : ""}`}
        >
          {actionState === "clearing" ? (
            <ActivityIndicator color="#DC2626" />
          ) : (
            <>
              <Trash2 size={15} color="#DC2626" strokeWidth={2.4} />
              <Text className="text-[13px] font-extrabold text-error">Clear Key</Text>
            </>
          )}
        </Pressable>
      ) : null}

      {/* Status / error / warning message */}
      {msg ? (
        <Text className={`mt-3 text-[12px] font-semibold leading-4 ${msgColor}`}>
          {msg.text}
        </Text>
      ) : null}

      {/* Security disclaimer */}
      <View className={`mt-4 rounded-[12px] p-3 ${isDark ? "bg-[#1B2230]" : "bg-canvas"}`}>
        <Text
          className={`text-[11px] font-semibold leading-4 ${
            isDark ? "text-[#C8D0DC]" : "text-slate"
          }`}
        >
          Demo AI Mode: Your Gemini API key is stored locally on this device using Expo
          SecureStore. Acceptable for assignment testing. Production apps should use a
          secure backend proxy (React Native → Backend → Gemini API).
        </Text>
      </View>
    </View>
  );
}
