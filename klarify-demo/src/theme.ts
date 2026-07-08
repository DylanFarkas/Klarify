export type Theme = {
  background: string;
  surface: string;
  surfaceMuted: string;
  foreground: string;
  foregroundMuted: string;
  foregroundSubtle: string;
  border: string;
  borderStrong: string;
  primary: string;
  primaryHover: string;
  success: string;
  gridLine: string;
  gridDot: string;
};

export const lightTheme: Theme = {
  background: "#f8fafc",
  surface: "#ffffff",
  surfaceMuted: "#f1f5f9",
  foreground: "#0f172a",
  foregroundMuted: "#64748b",
  foregroundSubtle: "#94a3b8",
  border: "#e2e8f0",
  borderStrong: "#cbd5e1",
  primary: "#005bbf",
  primaryHover: "#004a9e",
  success: "#22c55e",
  gridLine: "rgba(15, 23, 42, 0.07)",
  gridDot: "rgba(0, 91, 191, 0.16)",
};

export const carbonTheme: Theme = {
  background: "#1c1c1c",
  surface: "#1e1e1e",
  surfaceMuted: "rgba(255, 255, 255, 0.04)",
  foreground: "#ffffff",
  foregroundMuted: "#9ca3af",
  foregroundSubtle: "rgba(156, 163, 175, 0.7)",
  border: "#2e2e2e",
  borderStrong: "rgba(255, 255, 255, 0.12)",
  primary: "#3ecf8e",
  primaryHover: "#32b87d",
  success: "#3ecf8e",
  gridLine: "rgba(255, 255, 255, 0.045)",
  gridDot: "rgba(62, 207, 142, 0.18)",
};

export const moscowColors = {
  must: "#f87171",
  should: "#fb923c",
  could: "#3ecf8e",
  wont: "#6b7280",
} as const;
