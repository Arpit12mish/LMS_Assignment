import { Search } from "lucide-react-native";
import React from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";

interface AiSmartSearchBoxProps {
  value: string;
  onChangeText: (text: string) => void;
  onSearch: () => void;
  loading: boolean;
  isDark: boolean;
  placeholder?: string;
}

export function AiSmartSearchBox({
  value,
  onChangeText,
  onSearch,
  loading,
  isDark,
  placeholder = '"I want a beginner mobile app course"',
}: AiSmartSearchBoxProps) {
  return (
    <View className="gap-2">
      <View
        className={`flex-row items-center rounded-[14px] border px-4 ${
          isDark ? "border-[#242A36] bg-[#0B0D12]" : "border-border bg-white"
        }`}
      >
        <Search size={18} color="#8EA0BC" strokeWidth={2.2} style={{ marginRight: 10 }} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#8EA0BC"
          returnKeyType="search"
          maxLength={300}
          onSubmitEditing={onSearch}
          className={`min-w-0 flex-1 py-4 text-[14px] font-semibold ${
            isDark ? "text-white" : "text-ink"
          }`}
        />
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Search with AI"
        disabled={loading}
        onPress={onSearch}
        className={`h-[50px] items-center justify-center rounded-[14px] bg-primary ${
          loading ? "opacity-60" : ""
        }`}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text className="text-[14px] font-extrabold text-white">AI Search</Text>
        )}
      </Pressable>
    </View>
  );
}
