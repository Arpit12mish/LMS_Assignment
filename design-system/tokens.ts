export const brand = {
  shortName: "HouseEd",
  fullName: "House of Edtech",
};

export const colors = {
  primary: "#2563EB",
  primaryDeep: "#1D4ED8",
  navy: "#0B1221",
  ink: "#0F172A",
  slate: "#64748B",
  softBlue: "#EFF6FF",
  canvas: "#F8FAFC",
  border: "#E2E8F0",
  success: "#16A34A",
  warning: "#F59E0B",
  error: "#DC2626",
  white: "#FFFFFF",
  darkPage: "#000000",
  darkSurface: "#0B0D12",
  darkRaised: "#111827",
  darkBorder: "#242A36",
  darkText: "#FFFFFF",
  darkMuted: "#C8D0DC",
  darkInactive: "#D1D5DB",
  darkInactiveSurface: "#E5E7EB",
};

export const typography = {
  display: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "800",
  },
  title: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "800",
  },
  section: {
    fontSize: 16.5,
    lineHeight: 22,
    fontWeight: "800",
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "600",
  },
  secondary: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
  },
  caption: {
    fontSize: 11.5,
    lineHeight: 16,
    fontWeight: "600",
  },
} as const;

export const spacing = {
  screen: 20,
  card: 16,
  row: 13,
  gap: 12,
};

export const radii = {
  card: 18,
  control: 14,
  tile: 12,
  pill: 999,
};

export const nativeWindClasses = {
  screen: "flex-1 bg-canvas",
  darkScreen: "flex-1 bg-black",
  card: "bg-white rounded-card border border-border p-4",
  darkCard: "bg-[#0B0D12] rounded-card border border-[#242A36] p-4",
  primaryButton: "h-[52px] rounded-control bg-primary items-center justify-center active:opacity-90",
  primaryButtonLabel: "text-white text-[15px] font-extrabold",
  inactiveDarkButton: "h-[52px] rounded-control bg-[#E5E7EB] items-center justify-center",
  inactiveDarkButtonLabel: "text-ink text-[15px] font-extrabold",
  input: "h-[50px] rounded-control border-[1.5px] border-border px-4 text-ink bg-white",
  darkInput: "h-[50px] rounded-control border-[1.5px] border-[#242A36] px-4 text-white bg-[#0B0D12]",
  focusedInput: "border-primary",
  sectionTitle: "text-[16.5px] font-extrabold text-ink",
  darkSectionTitle: "text-[16.5px] font-extrabold text-primary",
  secondaryText: "text-[13px] text-slate font-medium",
  darkSecondaryText: "text-[13px] text-[#C8D0DC] font-medium",
  progressTrack: "h-2 rounded-full bg-[#E8EDF3] overflow-hidden",
  darkProgressTrack: "h-2 rounded-full bg-[#1B2230] overflow-hidden",
  progressFill: "h-full bg-primary",
  offlineBanner: "flex-row items-center gap-2 px-4 py-2 bg-navy",
};
