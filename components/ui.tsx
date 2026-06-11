import { Search } from "lucide-react-native";
import React from "react";
import { ActivityIndicator, Image, ImageBackground, Pressable, Text, TextInput, View, type DimensionValue, type TextInputProps } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppStore } from "@/store/app-store";

interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: "primary" | "dark" | "ghost" | "soft" | "danger";
  loading?: boolean;
  disabled?: boolean;
}

const buttonClass = {
  primary: "bg-primary",
  dark: "bg-navy",
  ghost: "bg-white border border-border",
  soft: "bg-softBlue",
  danger: "bg-error",
};

const labelClass = {
  primary: "text-white",
  dark: "text-white",
  ghost: "text-ink",
  soft: "text-primary",
  danger: "text-white",
};

function useDarkTheme() {
  const { preferences } = useAppStore();
  return preferences.darkMode;
}

export function Button({ label, onPress, variant = "primary", loading = false, disabled = false }: ButtonProps) {
  const isDark = useDarkTheme();
  const resolvedButtonClass =
    variant === "ghost" && isDark
      ? "bg-[#E5E7EB] border border-[#E5E7EB]"
      : variant === "soft" && isDark
        ? "bg-[#0B1D45]"
        : buttonClass[variant];
  const resolvedLabelClass = variant === "ghost" && isDark ? "text-ink" : labelClass[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled || loading}
      onPress={onPress}
      className={`h-[52px] rounded-control items-center justify-center px-4 active:opacity-90 ${resolvedButtonClass} ${
        disabled ? "opacity-50" : ""
      }`}
    >
      {loading ? <ActivityIndicator color={variant === "ghost" || variant === "soft" ? "#2563EB" : "#FFFFFF"} /> : null}
      {!loading ? <Text className={`text-[15px] font-extrabold ${resolvedLabelClass}`}>{label}</Text> : null}
    </Pressable>
  );
}

export function ScreenHeader({
  eyebrow,
  title,
  right,
  children,
  surface = "canvas",
  withBorder = false,
  minHeight,
}: {
  eyebrow?: string;
  title?: string;
  right?: React.ReactNode;
  children?: React.ReactNode;
  surface?: "canvas" | "white";
  withBorder?: boolean;
  minHeight?: number;
}) {
  const insets = useSafeAreaInsets();
  const isDark = useDarkTheme();

  return (
    <View
      className={`${isDark ? "bg-black" : surface === "white" ? "bg-white" : "bg-canvas"} px-5 pb-4 ${withBorder ? (isDark ? "border-b border-[#242A36]" : "border-b border-border") : ""}`}
      style={{ paddingTop: insets.top + 12, minHeight: insets.top + (minHeight ?? (children ? 138 : 88)) }}
    >
      {(title || eyebrow || right) ? (
        <View className="min-h-[52px] flex-row items-end justify-between gap-4">
          <View className="min-w-0 flex-1">
            {eyebrow ? <Text className={`text-[13px] font-semibold leading-5 ${isDark ? "text-[#C8D0DC]" : "text-slate"}`} numberOfLines={1}>{eyebrow}</Text> : null}
            {title ? (
              <Text className={`text-[30px] font-extrabold leading-9 ${isDark ? "text-white" : "text-ink"}`} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.82}>
                {title}
              </Text>
            ) : null}
          </View>
          {right ? <View className="shrink-0">{right}</View> : null}
        </View>
      ) : null}
      {children ? <View className={title || eyebrow || right ? "mt-4" : ""}>{children}</View> : null}
    </View>
  );
}

export function ProgressBar({ value, color = "bg-primary" }: { value: number; color?: string }) {
  const isDark = useDarkTheme();
  const width = `${Math.max(0, Math.min(100, value))}%` as DimensionValue;
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(value) }}
      className={`h-2 overflow-hidden rounded-full ${isDark ? "bg-[#1B2230]" : "bg-[#E8EDF3]"}`}
    >
      <View className={`h-full ${color}`} style={{ width }} />
    </View>
  );
}

export function OfflineBanner({ label = "Offline mode: showing cached learning data." }: { label?: string }) {
  return (
    <View className="flex-row items-center gap-2 bg-navy px-4 py-2">
      <View className="h-2 w-2 rounded-full bg-warning" />
      <Text className="text-xs font-bold text-white">{label}</Text>
    </View>
  );
}

export function CourseArt({ size = "large", label, uri }: { size?: "small" | "medium" | "large" | "hero"; label?: string; uri?: string }) {
  const sizeClass = {
    small: "h-[84px] w-[102px]",
    medium: "h-[118px] w-full",
    large: "h-[142px] w-full",
    hero: "h-[250px] w-full",
  }[size];

  return (
    <View className={`${sizeClass} overflow-hidden rounded-[16px] bg-primary`}>
      {uri ? (
        <ImageBackground
          source={{ uri }}
          resizeMode="cover"
          className="absolute inset-0"
          imageStyle={{ borderRadius: 16 }}
        />
      ) : null}
      <View className="absolute inset-0 bg-navy opacity-35" />
      <View className="absolute -right-9 top-7 h-36 w-36 rounded-full border border-white/20" />
      <View className="absolute -right-1 bottom-7 flex-row items-end gap-2">
        <View className="h-11 w-3 rounded-full bg-white/55" />
        <View className="h-14 w-3 rounded-full bg-white/65" />
        <View className="h-[72px] w-3 rounded-full bg-white/75" />
      </View>
      <View className="absolute left-0 top-0 h-full w-full opacity-20">
        <View className="absolute left-8 top-[-20px] h-[150%] w-px rotate-[32deg] bg-white" />
        <View className="absolute left-20 top-[-20px] h-[150%] w-px rotate-[32deg] bg-white" />
        <View className="absolute left-32 top-[-20px] h-[150%] w-px rotate-[32deg] bg-white" />
      </View>
      {label ? <Text className="absolute bottom-4 left-4 text-[10px] font-extrabold uppercase tracking-[2px] text-white">{label}</Text> : null}
    </View>
  );
}

export function AvatarInitials({ name, size = 48, uri }: { name?: string; size?: number; uri?: string }) {
  const initials = (name ?? "HouseEd")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  return (
    <View
      className="overflow-hidden items-center justify-center rounded-full border-2 border-white bg-primary"
      style={{ height: size, width: size }}
    >
      {uri ? (
        <Image source={{ uri }} resizeMode="cover" style={{ height: size, width: size }} />
      ) : (
        <Text className="font-black text-white" style={{ fontSize: Math.max(13, size * 0.34) }}>
          {initials || "H"}
        </Text>
      )}
    </View>
  );
}

export function IconTile({
  label,
  icon: Icon,
  tone = "blue",
  size = 38,
}: {
  label?: string;
  icon?: LucideIcon;
  tone?: "blue" | "green" | "purple" | "orange" | "red" | "slate";
  size?: number;
}) {
  const isDark = useDarkTheme();
  const styles = {
    blue: { bg: "bg-softBlue", color: "#2563EB", text: "text-primary" },
    green: { bg: "bg-green-50", color: "#16A34A", text: "text-success" },
    purple: { bg: "bg-purple-50", color: "#7C3AED", text: "text-purple-600" },
    orange: { bg: "bg-orange-50", color: "#F59E0B", text: "text-warning" },
    red: { bg: "bg-red-50", color: "#DC2626", text: "text-error" },
    slate: { bg: "bg-slate-50", color: "#64748B", text: "text-slate" },
  }[tone];
  const tileBg = isDark
    ? {
        blue: "bg-[#0B1D45]",
        green: "bg-[#0D2B1A]",
        purple: "bg-[#24113F]",
        orange: "bg-[#3A2406]",
        red: "bg-[#3B0B0B]",
        slate: "bg-[#1B2230]",
      }[tone]
    : styles.bg;
  const textClass = isDark && tone === "slate" ? "text-[#D1D5DB]" : styles.text;

  return (
    <View className={`${tileBg} items-center justify-center rounded-[10px]`} style={{ height: size, width: size }}>
      {Icon ? (
        <Icon
          size={Math.max(16, size * 0.45)}
          color={tone === "slate" && isDark ? "#D1D5DB" : styles.color}
          strokeWidth={2.4}
        />
      ) : null}
      {!Icon ? <Text className={`text-[16px] font-black ${textClass}`}>{label}</Text> : null}
    </View>
  );
}

export function SearchBox({ rightLabel, ...props }: TextInputProps & { rightLabel?: string }) {
  const isDark = useDarkTheme();
  return (
    <View className={`h-[52px] flex-row items-center rounded-[14px] border px-4 ${isDark ? "border-[#242A36] bg-[#0B0D12]" : "border-border bg-white"}`}>
        <Search size={20} color={isDark ? "#D1D5DB" : "#8EA0BC"} strokeWidth={2.2} style={{ marginRight: 12 }} />
      <TextInput
        {...props}
        placeholderTextColor="#8EA0BC"
        className={`min-w-0 flex-1 text-[15px] font-semibold ${isDark ? "text-white" : "text-ink"}`}
      />
      {rightLabel ? <Text className="ml-2 text-[13px] font-extrabold text-primary">{rightLabel}</Text> : null}
    </View>
  );
}

export function StatTile({
  icon,
  symbol,
  value,
  label,
  tone = "blue",
}: {
  icon?: LucideIcon;
  symbol?: string;
  value: string;
  label: string;
  tone?: "blue" | "green" | "purple" | "orange";
}) {
  const isDark = useDarkTheme();
  return (
    <View className={`flex-1 rounded-[16px] border p-3 ${isDark ? "border-[#242A36] bg-[#0B0D12]" : "border-border bg-white"}`}>
      <IconTile icon={icon} label={symbol} tone={tone} size={34} />
      <Text className={`mt-3 text-[25px] font-black leading-7 ${isDark ? "text-white" : "text-ink"}`}>{value}</Text>
      <Text className={`text-[12px] font-semibold ${isDark ? "text-[#C8D0DC]" : "text-slate"}`}>{label}</Text>
    </View>
  );
}

export function Pill({ label, active = false, onPress }: { label: string; active?: boolean; onPress?: () => void }) {
  const isDark = useDarkTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className={`rounded-full px-4 py-2.5 ${active ? (isDark ? "bg-primary" : "bg-ink") : isDark ? "border border-[#D1D5DB] bg-[#E5E7EB]" : "border border-border bg-white"}`}
    >
      <Text className={`text-[14px] font-bold ${active ? "text-white" : isDark ? "text-ink" : "text-slate"}`}>{label}</Text>
    </Pressable>
  );
}

export function EmptyState({ title, message, action }: { title: string; message: string; action?: React.ReactNode }) {
  const isDark = useDarkTheme();
  return (
    <View className={`items-center justify-center rounded-card border p-6 ${isDark ? "border-[#242A36] bg-[#0B0D12]" : "border-border bg-white"}`}>
      <View className={`mb-4 h-12 w-12 items-center justify-center rounded-tile ${isDark ? "bg-[#0B1D45]" : "bg-softBlue"}`}>
        <Text className="text-xl font-black text-primary">H</Text>
      </View>
      <Text className={`text-center text-lg font-extrabold ${isDark ? "text-white" : "text-ink"}`}>{title}</Text>
      <Text className={`mt-2 text-center text-[13px] font-medium leading-5 ${isDark ? "text-[#C8D0DC]" : "text-slate"}`}>{message}</Text>
      {action ? <View className="mt-4 w-full">{action}</View> : null}
    </View>
  );
}

export function FullScreenState({
  icon,
  iconTone = "blue",
  title,
  message,
  primaryAction,
  secondaryAction,
}: {
  icon?: LucideIcon;
  iconTone?: "blue" | "green" | "purple" | "orange" | "red" | "slate";
  title: string;
  message: string;
  primaryAction?: React.ReactNode;
  secondaryAction?: React.ReactNode;
}) {
  const isDark = useDarkTheme();
  return (
    <View className={`flex-1 items-center justify-center px-7 py-10 ${isDark ? "bg-black" : "bg-canvas"}`}>
      <IconTile icon={icon} tone={iconTone} size={58} />
      <Text className={`mt-5 text-center text-[18px] font-extrabold ${isDark ? "text-white" : "text-ink"}`}>{title}</Text>
      <Text className={`mt-2 max-w-[280px] text-center text-[13px] font-medium leading-5 ${isDark ? "text-[#C8D0DC]" : "text-slate"}`}>{message}</Text>
      {primaryAction ? <View className="mt-5 w-full max-w-[260px]">{primaryAction}</View> : null}
      {secondaryAction ? <View className="mt-3 w-full max-w-[260px]">{secondaryAction}</View> : null}
    </View>
  );
}

export function SkeletonCourseCard() {
  const isDark = useDarkTheme();
  return (
    <View className={`mb-3 rounded-card border p-3 ${isDark ? "border-[#242A36] bg-[#0B0D12]" : "border-border bg-white"}`}>
      <View className={`h-36 rounded-tile ${isDark ? "bg-[#2B3445]" : "bg-[#E8EDF3]"}`} />
      <View className={`mt-4 h-4 w-3/4 rounded-full ${isDark ? "bg-[#2B3445]" : "bg-[#E8EDF3]"}`} />
      <View className={`mt-2 h-3 w-1/2 rounded-full ${isDark ? "bg-[#2B3445]" : "bg-[#E8EDF3]"}`} />
    </View>
  );
}
